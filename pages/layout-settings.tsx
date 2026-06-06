/**
 * 🌤️ 彩云天气 — 布局偏移设置页（图形化重设计 + 即时生效）
 *
 * 设计理念：
 *   · 中号/大号分区，左右区域独立调节
 *   · 可视化偏移值显示（X/Y 数值卡片）
 *   · 每次修改即时保存并刷新桌面组件
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
  Divider,
} from "scripting"

declare const FileManager: any
declare const Alert: any

// ─── 路径 ───
import { Script } from "scripting"
const scriptName = Script.name
const documentsDir = FileManager.documentsDirectory
const appGroupDir = FileManager.appGroupDocumentsDirectory
const styleCachePath = `${documentsDir}/caiyun_style_config_v3.json`
const styleCachePathAppGroup = `${appGroupDir}/caiyun_style_config_v3.json`

function readJson<T>(path: string): T | null {
  try {
    if (!FileManager.existsSync(path)) return null
    return JSON.parse(FileManager.readAsStringSync(path)) as T
  } catch { return null }
}

function writeJson(path: string, data: unknown) {
  FileManager.writeAsStringSync(path, JSON.stringify(data))
}

function ensureStyleConfig(): any {
  return readJson(styleCachePath) || readJson(styleCachePathAppGroup) || { global: { size: 1.0 } }
}

function writeStyleConfig(cfg: any) {
  writeJson(styleCachePath, cfg)
  writeJson(styleCachePathAppGroup, cfg)
}

function ensureLayoutConfig(cfg: any) {
  if (!cfg.layout) cfg.layout = {}
  if (!cfg.layout.medium) cfg.layout.medium = { left: { x: 0, y: 0 }, right: { x: 0, y: 0 } }
  if (!cfg.layout.large) cfg.layout.large = { left: { x: 0, y: 0 }, right: { x: 0, y: 0 } }
  if (!cfg.layout.medium.left) cfg.layout.medium.left = { x: 0, y: 0 }
  if (!cfg.layout.medium.right) cfg.layout.medium.right = { x: 0, y: 0 }
  if (!cfg.layout.large.left) cfg.layout.large.left = { x: 0, y: 0 }
  if (!cfg.layout.large.right) cfg.layout.large.right = { x: 0, y: 0 }
  return cfg
}

function reloadWidgets(source = "layout") {
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

// ─── 偏移值显示组件 ──
function OffsetCard({
  label,
  icon,
  accent,
  offset,
  onAdjust,
}: {
  label: string
  icon: string
  accent: string
  offset: { x: number; y: number }
  onAdjust: () => void
}) {
  const hasOffset = (offset.x || 0) !== 0 || (offset.y || 0) !== 0

  return (
    <HStack
      spacing={12}
      alignment="center"
      padding={{ horizontal: 16, vertical: 12 }}
      onTapGesture={onAdjust}
    >
      <ZStack frame={{ width: 36, height: 36 }}>
        <Circle fill={accent as any} opacity={0.15} />
        <Image systemName={icon} font={17} foregroundStyle={accent as any} />
      </ZStack>
      <VStack alignment="leading" spacing={2} frame={{ maxWidth: "infinity" }}>
        <Text fontWeight="bold">{label}</Text>
        <HStack spacing={8} alignment="center">
          <Text font="caption" foregroundStyle={hasOffset ? accent as any : "secondaryLabel"}>
            X: {offset.x || 0}
          </Text>
          <Text font="caption" foregroundStyle="tertiaryLabel">·</Text>
          <Text font="caption" foregroundStyle={hasOffset ? accent as any : "secondaryLabel"}>
            Y: {offset.y || 0}
          </Text>
        </HStack>
      </VStack>
      <ZStack frame={{ width: 24, height: 24 }}>
        <Circle fill={hasOffset ? accent as any : "clear" as any} opacity={0.15} />
        <Text font={{ name: "system", size: 11 }} fontWeight="bold"
          foregroundStyle={hasOffset ? accent as any : "secondaryLabel" as any}>
          ✎
        </Text>
      </ZStack>
      <Image systemName="chevron.right" font={12} foregroundStyle="tertiaryLabel" />
    </HStack>
  )
}

export function LayoutSettingsPage() {
  const dismiss = Navigation.useDismiss()
  const [cfg, setCfg] = useState(() => ensureLayoutConfig(ensureStyleConfig()))

  const mediumLeft = cfg.layout?.medium?.left || { x: 0, y: 0 }
  const mediumRight = cfg.layout?.medium?.right || { x: 0, y: 0 }
  const largeLeft = cfg.layout?.large?.left || { x: 0, y: 0 }
  const largeRight = cfg.layout?.large?.right || { x: 0, y: 0 }

  // 统计已偏移的数量
  const offsetCount = [
    mediumLeft, mediumRight, largeLeft, largeRight,
  ].filter((o) => (o.x || 0) !== 0 || (o.y || 0) !== 0).length

  async function adjustOffset(widgetType: "medium" | "large", sideType: "left" | "right") {
    const current = cfg.layout[widgetType][sideType] || { x: 0, y: 0 }
    const input = new Alert()
    input.title = `${widgetType === "medium" ? "中号" : "大号"}${sideType === "left" ? "左侧" : "右侧"}偏移`
    input.message = `请输入 X/Y 轴偏移值（-60~60）\n当前：X=${current.x || 0}px, Y=${current.y || 0}px`
    input.addTextField("X轴偏移", String(current.x || 0))
    input.addTextField("Y轴偏移", String(current.y || 0))
    input.addAction("保存")
    input.addAction("恢复默认")
    input.addCancelAction("取消")
    const res = await input.presentAlert()

    const next = { ...cfg }
    ensureLayoutConfig(next)

    if (res === 0) {
      let x = parseInt(input.textFieldValue(0)) || 0
      let y = parseInt(input.textFieldValue(1)) || 0
      x = Math.max(-60, Math.min(60, x))
      y = Math.max(-60, Math.min(60, y))
      next.layout[widgetType][sideType] = { x, y }
    } else if (res === 1) {
      next.layout[widgetType][sideType] = { x: 0, y: 0 }
    } else {
      return
    }

    setCfg(next)
    writeStyleConfig(next)
    reloadWidgets(`layout:${widgetType}:${sideType}`)
  }

  async function resetAll() {
    const next = { ...cfg }
    ensureLayoutConfig(next)
    next.layout.medium.left = { x: 0, y: 0 }
    next.layout.medium.right = { x: 0, y: 0 }
    next.layout.large.left = { x: 0, y: 0 }
    next.layout.large.right = { x: 0, y: 0 }
    setCfg(next)
    writeStyleConfig(next)
    reloadWidgets("layout:reset")
  }

  return (
    <NavigationStack>
      <List
        navigationTitle="布局偏移"
        navigationBarTitleDisplayMode="inline"
        toolbar={{
          cancellationAction: <Button title="完成" action={dismiss} />,
        }}
      >
        {/* ── 顶部说明 ── */}
        <Section>
          <VStack spacing={12} alignment="center" padding={{ vertical: 16 }}>
            <ZStack frame={{ width: 56, height: 56 }}>
              <Circle fill={{ colors: ["#6366f1", "#4f46e5"], startPoint: "top", endPoint: "bottom" }} />
              <Image systemName="triangle.righthalf.inset.filled" font={24} foregroundStyle="white" />
            </ZStack>
            <VStack spacing={4} alignment="center" frame={{ maxWidth: "infinity" }}>
              <Text font="title3" fontWeight="bold">布局微调</Text>
              <Text font="subheadline" foregroundStyle="secondaryLabel">
                调整组件内各区域的位置偏移{"\n"}修改即时生效
              </Text>
            </VStack>
            {offsetCount > 0 ? (
              <HStack spacing={6} alignment="center"
                padding={{ horizontal: 14, vertical: 6 }}
                background={{ style: { color: "#6366f1", opacity: 0.12 }, shape: { type: "rect", cornerRadius: 20 } }}>
                <Image systemName="slider.horizontal.3" font={11} foregroundStyle="#6366f1" />
                <Text font="caption" fontWeight="medium" foregroundStyle="#6366f1">
                  {offsetCount} 处已偏移
                </Text>
              </HStack>
            ) : (
              <HStack spacing={6} alignment="center"
                padding={{ horizontal: 14, vertical: 6 }}
                background={{ style: { color: "#8e8e93", opacity: 0.12 }, shape: { type: "rect", cornerRadius: 20 } }}>
                <Text font="caption" fontWeight="medium" foregroundStyle="#8e8e93">
                  全部默认
                </Text>
              </HStack>
            )}
          </VStack>
        </Section>

        {/* ── 中号组件 ── */}
        <Section header={<Text font="footnote" foregroundStyle="secondaryLabel">中号组件 (Medium)</Text>}>
          <VStack spacing={0}>
            <OffsetCard
              label="左侧区域"
              icon="text.alignleft"
              accent="#6366f1"
              offset={mediumLeft}
              onAdjust={() => adjustOffset("medium", "left")}
            />
            <Divider padding={{ leading: 60 }} />
            <OffsetCard
              label="右侧区域"
              icon="text.alignright"
              accent="#8b5cf6"
              offset={mediumRight}
              onAdjust={() => adjustOffset("medium", "right")}
            />
          </VStack>
        </Section>

        {/* ── 大号组件 ── */}
        <Section header={<Text font="footnote" foregroundStyle="secondaryLabel">大号组件 (Large)</Text>}>
          <VStack spacing={0}>
            <OffsetCard
              label="左侧区域"
              icon="text.alignleft"
              accent="#6366f1"
              offset={largeLeft}
              onAdjust={() => adjustOffset("large", "left")}
            />
            <Divider padding={{ leading: 60 }} />
            <OffsetCard
              label="右侧区域"
              icon="text.alignright"
              accent="#8b5cf6"
              offset={largeRight}
              onAdjust={() => adjustOffset("large", "right")}
            />
          </VStack>
        </Section>

        {/* ── 布局说明 ── */}
        <Section header={<Text font="footnote" foregroundStyle="secondaryLabel">调整说明</Text>}>
          <VStack spacing={6} padding={{ vertical: 4 }}>
            <Text font="caption" foregroundStyle="secondaryLabel">
              · 中号组件：左侧包含日期/诗词，右侧包含天气详情
            </Text>
            <Text font="caption" foregroundStyle="secondaryLabel">
              · 大号组件：在中号基础上增加时间栏与月历
            </Text>
            <Text font="caption" foregroundStyle="secondaryLabel">
              · 偏移值范围 -60~60 像素，正值向右/下偏移
            </Text>
          </VStack>
        </Section>

        {/* ── 恢复默认 ── */}
        <Section>
          <Button action={resetAll}>
            <HStack alignment="center" spacing={8} padding={{ vertical: 12 }} frame={{ maxWidth: "infinity" }}>
              <Image systemName="arrow.uturn.backward" font={14} foregroundStyle="systemRed" />
              <Text foregroundStyle="systemRed" fontWeight="medium">恢复全部默认偏移</Text>
            </HStack>
          </Button>
        </Section>
      </List>
    </NavigationStack>
  )
}
