/**
 * 🌤️ 彩云天气 — 字体大小/颜色设置页（图形化重设计 + 即时生效）
 *
 * 设计理念：
 *   · 顶部大图标 + 说明
 *   · 字体大小：使用 Picker 直接选择预设比例，选择即生效 + 预览
 *   · 字体颜色：色块网格 + 当前选中高亮，点击即生效
 *   · 底部实时预览文字效果
 */

import {
  Text,
  VStack,
  HStack,
  Spacer,
  Button,
  Picker,
  Navigation,
  NavigationStack,
  NavigationLink,
  List,
  Section,
  ZStack,
  Circle,
  Image,
  Widget,
  useState,
  ScrollView,
  Divider,
  RoundedRectangle,
} from "scripting"

declare const FileManager: any

// ─── 路径 ───
import { Script } from "scripting"
const scriptName = Script.name
const documentsDir = FileManager.documentsDirectory
const appGroupDir = FileManager.appGroupDocumentsDirectory
const styleCachePath = `${documentsDir}/caiyun_style_config_v3.json`
const styleCachePathAppGroup = `${appGroupDir}/caiyun_style_config_v3.json`

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

function ensureStyleConfig(): any {
  return readJson(styleCachePath) || readJson(styleCachePathAppGroup) || { global: { size: 1.0 } }
}

function writeStyleConfig(cfg: any) {
  writeJson(styleCachePath, cfg)
  writeJson(styleCachePathAppGroup, cfg)
}

function reloadWidgets(source = "font-settings") {
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

// ─── 预设数据 ───
const SIZE_OPTIONS = [50, 60, 70, 80, 90, 100, 110, 120, 130]

const fontSizeKeys: Record<string, string> = {
  global: "全局基准",
  greeting: "问候语 / 大标题",
  date: "公历日期",
  lunar: "农历日期",
  info: "基础信息",
  weather: "天气详情",
  weatherLarge: "主温度",
  poetry: "诗词预报",
  timeInfo: "时间条 / 宜忌",
  calendar: "月历",
  solar: "节气",
}

const fontColorKeys: Record<string, string> = {
  greeting: "问候语 / 大标题",
  date: "公历日期",
  lunar: "农历日期",
  info: "基础信息",
  weather: "天气详情",
  weatherLarge: "主温度",
  poetry: "诗词预报",
  timeInfo: "时间条 / 宜忌",
  calendar: "月历",
  solar: "节气",
}

const colorPresets = [
  { name: "默认", value: "" },
  { name: "白色", value: "#ffffff" },
  { name: "黑色", value: "#000000" },
  { name: "红色", value: "#ff5555" },
  { name: "绿色", value: "#55ff55" },
  { name: "蓝色", value: "#99ccff" },
  { name: "橙色", value: "#ffcc99" },
  { name: "黄色", value: "#ffcc00" },
  { name: "紫色", value: "#d4aaff" },
  { name: "灰色", value: "#888888" },
  { name: "青色", value: "#80ffff" },
]

// ═══════════════════════════════════════════
//  字体大小设置子页
// ═══════════════════════════════════════════

export function FontSizeSubPage() {
  const dismiss = Navigation.useDismiss()
  const [cfg, setCfg] = useState(() => ensureStyleConfig())
  const keys = Object.keys(fontSizeKeys)
  const [activeKey, setActiveKey] = useState(keys[0])

  function getPercent(key: string) {
    if (cfg[key]?.size !== undefined) return Math.round(cfg[key].size * 100)
    if (cfg.global?.size) return Math.round(cfg.global.size * 100)
    return 100
  }

  function setPercent(key: string, percent: number) {
    const next = { ...cfg }
    if (!next[key]) next[key] = {}
    next[key] = { ...next[key], size: percent / 100 }
    setCfg(next)
    // 即时保存 + 刷新
    writeStyleConfig(next)
    reloadWidgets(`font-size:${key}`)
  }

  function resetAll() {
    const next = { ...cfg }
    for (const k of keys) {
      if (next[k]) delete next[k].size
    }
    setCfg(next)
    writeStyleConfig(next)
    reloadWidgets("font-size:reset")
  }

  const currentPercent = getPercent(activeKey)

  return (
    <NavigationStack>
      <List
        navigationTitle="字体大小"
        navigationBarTitleDisplayMode="inline"
        toolbar={{
          cancellationAction: <Button title="完成" action={dismiss} />,
        }}
      >
        {/* ── 顶部说明 + 实时预览 ── */}
        <Section>
          <VStack spacing={12} alignment="center" padding={{ vertical: 16 }}>
            <ZStack frame={{ width: 48, height: 48 }}>
              <Circle fill={{ colors: ["#a855f7", "#7c3aed"], startPoint: "top", endPoint: "bottom" }} />
              <Image systemName="textformat.size" font={22} foregroundStyle="white" />
            </ZStack>
            <Text font="subheadline" foregroundStyle="secondaryLabel">
              选择区域后调整大小，修改即时生效
            </Text>
            {/* 实时预览 */}
            <VStack spacing={2} alignment="center" padding={12}
              background={{ style: "secondarySystemBackground", shape: { type: "rect", cornerRadius: 12 } }}
              frame={{ maxWidth: "infinity" }}>
              <Text font={{ name: "system", size: Math.round(24 * currentPercent / 100) }}
                fontWeight="bold" foregroundStyle="label">
                示例文字 Abc 123
              </Text>
              <Text font={{ name: "system", size: Math.round(14 * currentPercent / 100) }}
                foregroundStyle="secondaryLabel">
                当前 {activeKey}：{currentPercent}%
              </Text>
            </VStack>
          </VStack>
        </Section>

        {/* ── 区域选择 ── */}
        <Section header={<Text font="footnote" foregroundStyle="secondaryLabel">选择调整区域</Text>}>
          <VStack spacing={6}>
            {keys.map((key) => {
              const pct = getPercent(key)
              const isActive = key === activeKey
              const isDefault = pct === 100
              return (
                <HStack
                  key={key}
                  spacing={10}
                  alignment="center"
                  padding={{ horizontal: 12, vertical: 10 }}
                  background={{
                    style: isActive ? { color: "#7c3aed", opacity: 0.12 } : "clear",
                    shape: { type: "rect", cornerRadius: 10 }
                  }}
                  onTapGesture={() => setActiveKey(key)}
                >
                  {isActive ? (
                    <Image systemName="checkmark.circle.fill" font={16} foregroundStyle="#7c3aed" />
                  ) : (
                    <ZStack frame={{ width: 16, height: 16 }}>
                      <Circle fill="clear" stroke={{ color: "separator", opacity: 0.3 }} />
                    </ZStack>
                  )}
                  <Text font="subheadline" fontWeight={isActive ? "bold" : "regular"}
                    foregroundStyle={isActive ? "#7c3aed" : "label"}>
                    {fontSizeKeys[key]}
                  </Text>
                  <Spacer />
                  <Text font="caption" fontWeight="medium"
                    foregroundStyle={isDefault ? "secondaryLabel" : "#7c3aed"}>
                    {pct}%
                  </Text>
                </HStack>
              )
            })}
          </VStack>
        </Section>

        {/* ── 比例选择器 ── */}
        <Section header={<Text font="footnote" foregroundStyle="secondaryLabel">调整比例</Text>}>
          <ScrollView axes="horizontal">
            <HStack spacing={8} padding={{ horizontal: 4, vertical: 8 }}>
              {SIZE_OPTIONS.map((pct) => {
                const isSelected = pct === currentPercent
                return (
                  <Button key={pct} action={() => setPercent(activeKey, pct)}>
                    <ZStack
                      frame={{ width: 52, height: 52 }}
                      alignment="center"
                    >
                      <RoundedRectangle
                        cornerRadius={12}
                        fill={isSelected ? { color: "#7c3aed", opacity: 1 } : "secondarySystemBackground" as any}
                      />
                      <Text
                        font={{ name: "system", size: 14 }}
                        fontWeight="bold"
                        foregroundStyle={isSelected ? "white" : "label"}>
                        {pct}
                      </Text>
                    </ZStack>
                  </Button>
                )
              })}
            </HStack>
          </ScrollView>
          <Text font="caption2" foregroundStyle="tertiaryLabel" padding={{ top: 4 }}>
            100 为默认大小，40-130 为可调范围
          </Text>
        </Section>

        {/* ── 恢复默认 ── */}
        <Section>
          <Button action={resetAll}>
            <HStack alignment="center" spacing={8} padding={{ vertical: 12 }} frame={{ maxWidth: "infinity" }}>
              <Image systemName="arrow.uturn.backward" font={14} foregroundStyle="systemRed" />
              <Text foregroundStyle="systemRed" fontWeight="medium">全部恢复默认大小</Text>
            </HStack>
          </Button>
        </Section>
      </List>
    </NavigationStack>
  )
}

// ═══════════════════════════════════════════
//  字体颜色设置子页
// ═══════════════════════════════════════════

export function FontColorSubPage() {
  const dismiss = Navigation.useDismiss()
  const [cfg, setCfg] = useState(() => ensureStyleConfig())
  const keys = Object.keys(fontColorKeys)
  const [activeKey, setActiveKey] = useState(keys[0])

  function getColor(key: string) {
    return cfg[key]?.color || ""
  }

  function setColor(key: string, color: string) {
    const next = { ...cfg }
    if (!next[key]) next[key] = {}
    if (color) {
      next[key] = { ...next[key], color }
    } else {
      const { color: _, ...rest } = next[key]
      next[key] = rest
    }
    setCfg(next)
    // 即时保存 + 刷新
    writeStyleConfig(next)
    reloadWidgets(`font-color:${key}`)
  }

  function resetAll() {
    const next = { ...cfg }
    for (const k of keys) {
      if (next[k]) delete next[k].color
    }
    setCfg(next)
    writeStyleConfig(next)
    reloadWidgets("font-color:reset")
  }

  const currentColor = getColor(activeKey)

  return (
    <NavigationStack>
      <List
        navigationTitle="字体颜色"
        navigationBarTitleDisplayMode="inline"
        toolbar={{
          cancellationAction: <Button title="完成" action={dismiss} />,
        }}
      >
        {/* ── 顶部说明 + 预览 ── */}
        <Section>
          <VStack spacing={12} alignment="center" padding={{ vertical: 16 }}>
            <ZStack frame={{ width: 48, height: 48 }}>
              <Circle fill={{ colors: ["#ec4899", "#be185d"], startPoint: "top", endPoint: "bottom" }} />
              <Image systemName="paintpalette.fill" font={22} foregroundStyle="white" />
            </ZStack>
            <Text font="subheadline" foregroundStyle="secondaryLabel">
              选择区域后挑选颜色，修改即时生效
            </Text>
            {/* 实时预览 */}
            <VStack spacing={4} alignment="center" padding={12}
              background={{ style: "secondarySystemBackground", shape: { type: "rect", cornerRadius: 12 } }}
              frame={{ maxWidth: "infinity" }}>
              <Text font="title3" fontWeight="bold"
                foregroundStyle={currentColor || "label" as any}>
                示例文字预览
              </Text>
              <Text font="caption" foregroundStyle="secondaryLabel">
                当前 {fontColorKeys[activeKey]}：{currentColor || "系统默认"}
              </Text>
            </VStack>
          </VStack>
        </Section>

        {/* ── 区域选择 ── */}
        <Section header={<Text font="footnote" foregroundStyle="secondaryLabel">选择调整区域</Text>}>
          <VStack spacing={6}>
            {keys.map((key) => {
              const c = getColor(key)
              const isActive = key === activeKey
              return (
                <HStack
                  key={key}
                  spacing={10}
                  alignment="center"
                  padding={{ horizontal: 12, vertical: 10 }}
                  background={{
                    style: isActive ? { color: "#be185d", opacity: 0.10 } : "clear",
                    shape: { type: "rect", cornerRadius: 10 }
                  }}
                  onTapGesture={() => setActiveKey(key)}
                >
                  {isActive ? (
                    <Image systemName="checkmark.circle.fill" font={16} foregroundStyle="#be185d" />
                  ) : (
                    <ZStack frame={{ width: 16, height: 16 }}>
                      <Circle fill="clear" stroke={{ color: "separator", opacity: 0.3 }} />
                    </ZStack>
                  )}
                  <Text font="subheadline" fontWeight={isActive ? "bold" : "regular"}
                    foregroundStyle={isActive ? "#be185d" : "label"}>
                    {fontColorKeys[key]}
                  </Text>
                  <Spacer />
                  <ZStack frame={{ width: 20, height: 20 }}>
                    <Circle fill={(c || "systemBlue") as any} />
                    <Circle fill="clear" stroke={{ color: "separator", opacity: 0.3 }} />
                  </ZStack>
                </HStack>
              )
            })}
          </VStack>
        </Section>

        {/* ── 色块选择器 ── */}
        <Section header={<Text font="footnote" foregroundStyle="secondaryLabel">选择颜色</Text>}>
          <ScrollView axes="horizontal">
            <HStack spacing={10} padding={{ horizontal: 4, vertical: 8 }}>
              {colorPresets.map((preset) => {
                const isSelected = currentColor === preset.value ||
                  (!currentColor && preset.value === "")
                return (
                  <Button key={preset.value} action={() => setColor(activeKey, preset.value)}>
                    <VStack spacing={4} alignment="center">
                      <ZStack frame={{ width: 44, height: 44 }}>
                        {preset.value ? (
                          <Circle fill={preset.value as any} />
                        ) : (
                          <Circle fill="systemBlue" opacity={0.3} />
                        )}
                        {isSelected && (
                          <ZStack alignment="center" frame={{ maxWidth: "infinity", maxHeight: "infinity" }}>
                            <Image systemName="checkmark" font={16} fontWeight="bold"
                              foregroundStyle={preset.value === "#000000" ? "white" : "black"} />
                          </ZStack>
                        )}
                        <Circle fill="clear" stroke={{ color: "separator", opacity: 0.3 }} />
                      </ZStack>
                      <Text font="caption2" foregroundStyle="secondaryLabel">{preset.name}</Text>
                    </VStack>
                  </Button>
                )
              })}
            </HStack>
          </ScrollView>
        </Section>

        {/* ── 自定义颜色输入 ── */}
        <Section header={<Text font="footnote" foregroundStyle="secondaryLabel">自定义 Hex 颜色</Text>}>
          <HStack spacing={8} alignment="center" padding={{ vertical: 4 }}>
            <ZStack frame={{ width: 28, height: 28 }}>
              <Circle fill={currentColor || "systemBlue" as any} opacity={0.8} />
              <Circle fill="clear" stroke={{ color: "separator", opacity: 0.3 }} />
            </ZStack>
            <Text font="subheadline" foregroundStyle="secondaryLabel">
              {currentColor || "#默认"}
            </Text>
          </HStack>
        </Section>

        {/* ── 恢复默认 ── */}
        <Section>
          <Button action={resetAll}>
            <HStack alignment="center" spacing={8} padding={{ vertical: 12 }} frame={{ maxWidth: "infinity" }}>
              <Image systemName="arrow.uturn.backward" font={14} foregroundStyle="systemRed" />
              <Text foregroundStyle="systemRed" fontWeight="medium">全部恢复默认颜色</Text>
            </HStack>
          </Button>
        </Section>
      </List>
    </NavigationStack>
  )
}

// ═══════════════════════════════════════════
//  字体设置主页（大小 + 颜色入口）
// ═══════════════════════════════════════════

export function FontSettingsPage() {
  const [cfg] = useState(() => ensureStyleConfig())

  // 统计自定义项数量
  const sizeKeys = Object.keys(fontSizeKeys)
  const colorKeys = Object.keys(fontColorKeys)
  const customSizeCount = sizeKeys.filter((k) => cfg[k]?.size !== undefined).length
  const customColorCount = colorKeys.filter((k) => cfg[k]?.color).length

  const sizeText = customSizeCount > 0 ? `${customSizeCount} 项已调整` : "默认"
  const colorText = customColorCount > 0 ? `${customColorCount} 项已调整` : "默认"

  return (
    <NavigationStack>
      <List
        navigationTitle="字体设置"
        navigationBarTitleDisplayMode="inline"
      >
        {/* 顶部说明 */}
        <Section>
          <VStack spacing={8} alignment="center" padding={{ vertical: 16 }} frame={{ maxWidth: "infinity" }}>
            <ZStack frame={{ width: 60, height: 60 }} alignment="center">
              <Circle fill={{ colors: ["#8b5cf6", "#6d28d9"], startPoint: "top", endPoint: "bottom" }} />
              <Image systemName="textformat.abc" font={28} foregroundStyle="white" />
            </ZStack>
            <Text font="subheadline" foregroundStyle="secondaryLabel" multilineTextAlignment="center">自定义字体大小与颜色，选择即生效</Text>
          </VStack>
        </Section>

        {/* 字体大小 */}
        <Section>
          <NavigationLink destination={<FontSizeSubPage />}>
            <HStack spacing={12} alignment="center" padding={{ vertical: 4 }}>
              <ZStack frame={{ width: 36, height: 36 }}>
                <Circle fill="systemPurple" opacity={0.15} />
                <Image systemName="textformat.size" font={17} foregroundStyle="systemPurple" />
              </ZStack>
              <VStack alignment="leading" spacing={1} frame={{ maxWidth: "infinity" }}>
                <Text fontWeight="bold">字体大小</Text>
                <Text font="caption" foregroundStyle="secondaryLabel">调整各区域显示比例</Text>
              </VStack>
              <Text font="subheadline" foregroundStyle="secondaryLabel">{sizeText}</Text>
            </HStack>
          </NavigationLink>
        </Section>

        {/* 字体颜色 */}
        <Section>
          <NavigationLink destination={<FontColorSubPage />}>
            <HStack spacing={12} alignment="center" padding={{ vertical: 4 }}>
              <ZStack frame={{ width: 36, height: 36 }}>
                <Circle fill="systemPink" opacity={0.15} />
                <Image systemName="paintpalette.fill" font={17} foregroundStyle="systemPink" />
              </ZStack>
              <VStack alignment="leading" spacing={1} frame={{ maxWidth: "infinity" }}>
                <Text fontWeight="bold">字体颜色</Text>
                <Text font="caption" foregroundStyle="secondaryLabel">自定义各区域文字颜色</Text>
              </VStack>
              <Text font="subheadline" foregroundStyle="secondaryLabel">{colorText}</Text>
            </HStack>
          </NavigationLink>
        </Section>
      </List>
    </NavigationStack>
  )
}
