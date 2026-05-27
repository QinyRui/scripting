/**
 * 🌤️ 彩云天气 — 壁纸设置页（图形化重设计 + 即时生效）
 *
 * 设计理念：
 *   · 中号/大号组件壁纸分区展示，卡片式预览
 *   · 每次操作（选图/透明/清除）后立即刷新预览缩略图
 *   · 底部「保存并应用」一键同步桌面组件
 */

import {
  Text,
  VStack,
  HStack,
  Spacer,
  Button,
  Navigation,
  NavigationStack,
  List,
  Section,
  ZStack,
  Circle,
  Image,
  Widget,
  useState,
  RoundedRectangle,
} from "scripting"

declare const FileManager: any
declare const Photos: any
declare const Alert: any
declare const Location: any
declare const Pasteboard: any

// ─── 路径 ───
import { Script } from "scripting"
const scriptName = Script.name
const documentsDir = FileManager.documentsDirectory
const appGroupDir = FileManager.appGroupDocumentsDirectory
const getBgPath = (family: string) => `${documentsDir}/${scriptName}_${family}.jpg`
const getWidgetBgPath = (family: string) => `${appGroupDir}/${scriptName}_${family}.jpg`
const getWidgetBgMetaPath = (family: string) => `${appGroupDir}/${scriptName}_background_${family}.json`

// ─── 工具函数 ───
function readJson<T>(path: string): T | null {
  try {
    if (!FileManager.existsSync(path)) return null
    return JSON.parse(FileManager.readAsStringSync(path)) as T
  } catch { return null }
}

function writeJson(path: string, data: unknown) {
  FileManager.writeAsStringSync(path, JSON.stringify(data))
}

function imageToData(image: any): any {
  return image?.toJPEGData?.(0.92) || image?.toPNGData?.() || null
}

function writeImageData(path: string, image: any) {
  const data = imageToData(image)
  if (!data) throw new Error("无法读取选择的图片数据")
  FileManager.writeAsDataSync(path, data)
}

function writeBackgroundImage(family: string, image: any) {
  const versionedPath = `${appGroupDir}/${scriptName}_background_${family}_${Date.now()}.jpg`
  writeImageData(getBgPath(family), image)
  writeImageData(getWidgetBgPath(family), image)
  writeImageData(versionedPath, image)
  writeJson(getWidgetBgMetaPath(family), {
    path: versionedPath,
    fallbackPath: getWidgetBgPath(family),
    updatedAt: Date.now(),
  })
}

function hasBackgroundForFamily(family: string) {
  const meta = readJson<{ path?: string }>(getWidgetBgMetaPath(family))
  return FileManager.existsSync(getBgPath(family)) ||
    FileManager.existsSync(getWidgetBgPath(family)) ||
    Boolean(meta?.path)
}

function getActiveBgPath(family: string) {
  const metaPath = getWidgetBgMetaPath(family)
  let meta: any = null
  try {
    if (FileManager.existsSync(metaPath)) meta = JSON.parse(FileManager.readAsStringSync(metaPath))
  } catch {}
  if (meta?.path && FileManager.existsSync(meta.path)) return meta.path
  if (FileManager.existsSync(getWidgetBgPath(family))) return getWidgetBgPath(family)
  if (FileManager.existsSync(getBgPath(family))) return getBgPath(family)
  return null
}

function reloadWidgets(source = "wallpaper") {
  try {
    const controlPath = `${appGroupDir}/widget_reload_control.json`
    writeJson(controlPath, {
      requestedAt: Date.now(),
      burstUntil: Date.now() + 10 * 60 * 1000,
      source,
      scriptName,
    })
    Widget.reloadAll()
  } catch {}
}

async function showMessage(title: string, message: string) {
  const alert = new Alert()
  alert.title = title
  alert.message = message
  alert.addAction("好")
  await alert.presentAlert()
}

// ─── 透明壁纸裁剪预设 ───
type WallpaperCropPreset = {
  small: number; medium: number; large: number
  left: number; right: number
  top: number; middle: number; bottom: number
}

const wallpaperCropPresets: Record<number, WallpaperCropPreset> = {
  2796: { small: 510, medium: 1092, large: 1146, left: 99, right: 681, top: 282, middle: 918, bottom: 1554 },
  2778: { small: 510, medium: 1092, large: 1146, left: 96, right: 678, top: 246, middle: 882, bottom: 1518 },
  2688: { small: 507, medium: 1080, large: 1137, left: 81, right: 654, top: 228, middle: 858, bottom: 1488 },
  2556: { small: 474, medium: 1014, large: 1062, left: 82, right: 622, top: 270, middle: 858, bottom: 1446 },
  2532: { small: 474, medium: 1014, large: 1062, left: 78, right: 618, top: 231, middle: 819, bottom: 1407 },
  2436: { small: 465, medium: 987, large: 1035, left: 69, right: 591, top: 213, middle: 783, bottom: 1353 },
  2340: { small: 465, medium: 987, large: 1035, left: 69, right: 591, top: 231, middle: 801, bottom: 1371 },
  2208: { small: 471, medium: 1044, large: 1071, left: 99, right: 672, top: 114, middle: 696, bottom: 1278 },
  1792: { small: 338, medium: 720, large: 758, left: 54, right: 436, top: 160, middle: 580, bottom: 1000 },
  1334: { small: 296, medium: 642, large: 648, left: 54, right: 400, top: 60, middle: 412, bottom: 764 },
}

function getWallpaperCropPreset(image: any): WallpaperCropPreset {
  const height = Math.round(Math.max(image?.height || 0, image?.width || 0))
  const exact = wallpaperCropPresets[height]
  if (exact) return exact
  const base = wallpaperCropPresets[2532]
  const scale = height > 0 ? height / 2532 : 1
  return {
    small: Math.round(base.small * scale), medium: Math.round(base.medium * scale),
    large: Math.round(base.large * scale), left: Math.round(base.left * scale),
    right: Math.round(base.right * scale), top: Math.round(base.top * scale),
    middle: Math.round(base.middle * scale), bottom: Math.round(base.bottom * scale),
  }
}

// ═══════════════════════════════════════════

export function WallpaperSettingsPage() {
  const dismiss = Navigation.useDismiss()
  // 刷新种子：每次操作后 +1 触发重新渲染
  const [refreshSeed, setRefreshSeed] = useState(0)
  const [mediumChanged, setMediumChanged] = useState(false)
  const [largeChanged, setLargeChanged] = useState(false)

  const hasMediumBg = hasBackgroundForFamily("systemMedium")
  const hasLargeBg = hasBackgroundForFamily("systemLarge")
  const hasAnyChange = mediumChanged || largeChanged

  async function handlePickImage(family: "systemMedium" | "systemLarge") {
    try {
      const images = await Photos.pickPhotos(1)
      const image = images?.[0]
      if (!image) return
      writeBackgroundImage(family, image)
      if (family === "systemMedium") setMediumChanged(true)
      else setLargeChanged(true)
      setRefreshSeed(s => s + 1)
      // 即时刷新桌面组件
      reloadWidgets(`wallpaper:pick:${family}`)
    } catch (error) {
      await showMessage("选择图片失败", String((error as any)?.message || error))
    }
  }

  async function handleTransparent(family: "systemMedium" | "systemLarge") {
    try {
      const info = new Alert()
      info.title = "透明壁纸"
      info.message = "请选择一张没有图标的桌面截图。\n\n" +
        "① 长按桌面进入编辑模式\n" +
        "② 滑到空白页后截图\n" +
        "③ 回到此处选择截图"
      info.addAction("选择截图")
      info.addCancelAction("取消")
      if (await info.presentAlert() !== 0) return

      const images = await Photos.pickPhotos(1)
      const screenshot = images?.[0]
      if (!screenshot) return

      const widgetSize = family === "systemMedium" ? "medium" : "large"
      const posMenu = new Alert()
      posMenu.title = "选择桌面位置"
      posMenu.message = widgetSize === "medium" ? "中号组件放在桌面哪个位置？" : "大号组件放在桌面哪个位置？"
      const positions = widgetSize === "medium"
        ? ["左上", "右上", "左中", "右中", "左下", "右下"]
        : ["顶部", "中部", "底部"]
      positions.forEach((item) => posMenu.addAction(item))
      posMenu.addCancelAction("取消")
      const posIdx = await posMenu.presentSheet()
      if (posIdx < 0) return

      const preset = getWallpaperCropPreset(screenshot)
      const yMap = [preset.top, preset.top, preset.middle, preset.middle, preset.bottom, preset.bottom]
      const xMap = [preset.left, preset.right, preset.left, preset.right, preset.left, preset.right]
      const x = widgetSize === "medium" ? xMap[posIdx] : preset.left
      const y = widgetSize === "medium" ? yMap[posIdx] : [preset.top, preset.middle, preset.bottom][posIdx]
      const width = preset.medium
      const height = widgetSize === "medium" ? preset.small : preset.large
      const cropped = screenshot.renderedIn(
        { width, height },
        { position: { x, y }, size: { width, height } }
      ) || screenshot

      writeBackgroundImage(family, cropped)
      if (family === "systemMedium") setMediumChanged(true)
      else setLargeChanged(true)
      setRefreshSeed(s => s + 1)
      reloadWidgets(`wallpaper:transparent:${family}`)
      await showMessage("已生成透明壁纸", "透明背景已保存并同步到桌面组件。")
    } catch (error) {
      await showMessage("透明壁纸生成失败", String((error as any)?.message || error))
    }
  }

  async function handleClear(family: "systemMedium" | "systemLarge") {
    const bPath = getBgPath(family)
    const wBgPath = getWidgetBgPath(family)
    const metaPath = getWidgetBgMetaPath(family)

    if (FileManager.existsSync(bPath)) FileManager.removeSync(bPath)
    if (FileManager.existsSync(wBgPath)) FileManager.removeSync(wBgPath)
    const meta = readJson<{ path?: string }>(metaPath)
    if (meta?.path && FileManager.existsSync(meta.path)) FileManager.removeSync(meta.path)
    if (FileManager.existsSync(metaPath)) FileManager.removeSync(metaPath)

    if (family === "systemMedium") setMediumChanged(true)
    else setLargeChanged(true)
    setRefreshSeed(s => s + 1)
    reloadWidgets(`wallpaper:clear:${family}`)
  }

  async function handleSaveAndApply() {
    reloadWidgets("wallpaper-save")
    await showMessage("已保存并应用", "壁纸已同步到桌面组件。若桌面未立即变化，请长按组件编辑后返回。")
    dismiss()
  }

  function renderWallpaperCard(family: "systemMedium" | "systemLarge", title: string, subtitle: string) {
    const hasBg = family === "systemMedium" ? hasMediumBg : hasLargeBg
    const statusText = hasBg ? "已设置" : "默认"
    const statusColor = hasBg ? "#34c759" : "#8e8e93"
    const bgPath = getActiveBgPath(family)

    return (
      <VStack spacing={0} padding={0}>
        {/* 卡片标题 */}
        <HStack padding={{ horizontal: 16, vertical: 12 }} alignment="center">
          <VStack alignment="leading" spacing={2}>
            <Text font="headline" fontWeight="bold">{title}</Text>
            <Text font="caption" foregroundStyle="secondaryLabel">{subtitle}</Text>
          </VStack>
          <Spacer />
          <HStack spacing={4} alignment="center">
            <Circle fill={statusColor as any} frame={{ width: 8, height: 8 }} />
            <Text font="caption" foregroundStyle={statusColor as any}>{statusText}</Text>
          </HStack>
        </HStack>

        {/* 壁纸预览 */}
        <ZStack frame={{ height: 120 }} padding={{ horizontal: 16 }}>
          <RoundedRectangle
            cornerRadius={12}
            fill={hasBg
              ? { colors: ["#1a1a2e", "#16213e"], startPoint: "topLeading", endPoint: "bottomTrailing" }
              : { colors: ["#2d2d3a", "#1c1c2e"], startPoint: "top", endPoint: "bottom" }}
          />
          {bgPath ? (
            <ZStack frame={{ height: 120, maxWidth: "infinity" }}>
              <Image
                filePath={bgPath}
                resizable
                scaleToFill
                frame={{ height: 120, maxWidth: "infinity" }}
                clipped
              />
              <RoundedRectangle fill={{ color: "#000000", opacity: 0.4 }} cornerRadius={12} />
              <Text font="subheadline" fontWeight="bold" foregroundStyle="white">预 览</Text>
            </ZStack>
          ) : (
            <VStack alignment="center" spacing={8}>
              <Image systemName="photo.badge.plus" font={32} foregroundStyle="#555566" />
              <Text font="caption" foregroundStyle="#666677">点击下方按钮选择图片</Text>
            </VStack>
          )}
        </ZStack>

        {/* 操作按钮 */}
        <HStack spacing={8} padding={{ horizontal: 16, vertical: 12 }}>
          <HStack spacing={6} alignment="center" padding={{ horizontal: 12, vertical: 10 }}
            frame={{ maxWidth: "infinity" }}
            background={{ style: { color: "#007aff", opacity: 1 }, shape: { type: "rect", cornerRadius: 10 } }}
            onTapGesture={() => handlePickImage(family)}>
            <Image systemName="photo.on.rectangle" font={14} foregroundStyle="white" />
            <Text font="subheadline" fontWeight="medium" foregroundStyle="white">选择图片</Text>
          </HStack>

          <HStack spacing={6} alignment="center" padding={{ horizontal: 12, vertical: 10 }}
            frame={{ maxWidth: "infinity" }}
            background={{ style: { color: "#5856d6", opacity: 1 }, shape: { type: "rect", cornerRadius: 10 } }}
            onTapGesture={() => handleTransparent(family)}>
            <Image systemName="rectangle.on.rectangle" font={14} foregroundStyle="white" />
            <Text font="subheadline" fontWeight="medium" foregroundStyle="white">透明壁纸</Text>
          </HStack>

          {hasBg ? (
            <HStack spacing={6} alignment="center" padding={{ horizontal: 12, vertical: 10 }}
              background={{ style: { color: "#ff3b30", opacity: 0.85 }, shape: { type: "rect", cornerRadius: 10 } }}
              onTapGesture={() => handleClear(family)}>
              <Image systemName="trash" font={14} foregroundStyle="white" />
            </HStack>
          ) : null}
        </HStack>
      </VStack>
    )
  }

  return (
    <NavigationStack>
      <List
        navigationTitle="壁纸设置"
        navigationBarTitleDisplayMode="inline"
        toolbar={{
          cancellationAction: <Button title="返回" action={dismiss} />,
        }}
      >
        {/* 顶部提示 */}
        <Section>
          <VStack spacing={8} padding={{ vertical: 8 }}>
            <HStack spacing={8} alignment="center">
              <ZStack frame={{ width: 28, height: 28 }}>
                <Circle fill="systemTeal" opacity={0.15} />
                <Image systemName="photo.on.rectangle.angled" font={14} foregroundStyle="systemTeal" />
              </ZStack>
              <Text font="subheadline" foregroundStyle="secondaryLabel">
                选择壁纸后即时预览，点击「保存并应用」同步桌面
              </Text>
            </HStack>
            {hasAnyChange ? (
              <HStack spacing={6} alignment="center"
                padding={{ horizontal: 12, vertical: 8 }}
                background={{ style: { color: "#f59e0b", opacity: 0.12 }, shape: { type: "rect", cornerRadius: 8 } }}>
                <Image systemName="exclamationmark.circle.fill" font={12} foregroundStyle="#f59e0b" />
                <Text font="caption" foregroundStyle="#f59e0b" fontWeight="medium">已修改壁纸，请保存并应用</Text>
              </HStack>
            ) : null}
          </VStack>
        </Section>

        {/* 中号组件壁纸 */}
        <Section>
          {renderWallpaperCard("systemMedium", "中号组件壁纸", "Medium Widget · 适用于中号桌面组件")}
        </Section>

        {/* 大号组件壁纸 */}
        <Section>
          {renderWallpaperCard("systemLarge", "大号组件壁纸", "Large Widget · 适用于大号桌面组件")}
        </Section>

        {/* 透明壁纸使用说明 */}
        <Section header={<Text font="footnote" foregroundStyle="secondaryLabel">透明壁纸使用说明</Text>}>
          <VStack spacing={6} padding={{ vertical: 4 }}>
            {[
              "长按桌面进入编辑模式，滑到没有图标的空白页",
              "截图保存该空白页",
              "点击「透明壁纸」按钮选择截图，选择组件位置后自动裁剪",
              "保存后桌面组件会像透明一样融入壁纸",
            ].map((text, i) => (
              <HStack key={i} spacing={8} alignment="top">
                <ZStack frame={{ width: 18, height: 18 }}>
                  <Circle fill="systemTeal" opacity={0.15} />
                  <Text font={{ name: "system", size: 10 }} fontWeight="bold" foregroundStyle="systemTeal">
                    {i + 1}
                  </Text>
                </ZStack>
                <Text font="caption" foregroundStyle="secondaryLabel">{text}</Text>
              </HStack>
            ))}
          </VStack>
        </Section>

        {/* 保存并应用 */}
        <Section>
          <Button action={handleSaveAndApply}>
            <HStack
              alignment="center"
              spacing={8}
              padding={{ vertical: 14 }}
              frame={{ maxWidth: "infinity" }}
              background={{
                style: { color: hasAnyChange ? "#34c759" : "#007aff", opacity: 1 },
                shape: { type: "rect", cornerRadius: 12 }
              }}>
              <Image systemName="square.and.arrow.down.fill" font={16} foregroundStyle="white" />
              <Text font="headline" fontWeight="bold" foregroundStyle="white">保存并应用</Text>
            </HStack>
          </Button>
        </Section>
      </List>
    </NavigationStack>
  )
}
