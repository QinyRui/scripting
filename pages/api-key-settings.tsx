/**
 * 🌤️ 彩云天气 — API Key 设置页（图形化重设计）
 *
 * 设计理念：
 *   · 顶部大图标 + 标题，营造品牌感
 *   · 输入框带圆角卡片 + 内嵌图标，对齐 iOS 原生美学
 *   · 底部"保存"按钮高亮，保存后即时同步桌面组件
 *   · 显示已保存 Token 脱敏预览，让用户心中有数
 */

import {
  Text,
  VStack,
  HStack,
  Spacer,
  Button,
  TextField,
  Navigation,
  NavigationStack,
  List,
  Section,
  ZStack,
  Circle,
  Image,
  Link,
  Widget,
  useState,
} from "scripting"

declare const FileManager: any
declare const Storage: any

// ─── 文件路径（与 constants.ts 保持一致）───
import { Script } from "scripting"
const scriptName = Script.name
const documentsDir = FileManager.documentsDirectory
const appGroupDir = FileManager.appGroupDocumentsDirectory
const keyCachePath = `${documentsDir}/caiyun_api_token.json`
const keyCachePathAppGroup = `${appGroupDir}/caiyun_api_token.json`

function readJson<T>(path: string): T | null {
  try {
    if (!FileManager.existsSync(path)) return null
    return JSON.parse(FileManager.readAsStringSync(path)) as T
  } catch {
    return null
  }
}

function writeJson(path: string, data: unknown) {
  FileManager.writeAsStringSync(path, JSON.stringify(data))
}

function writeApiKey(apiKey: string) {
  const payload = { apiKey: apiKey.trim() }
  writeJson(keyCachePath, payload)
  writeJson(keyCachePathAppGroup, payload)
}

function maskToken(token: string): string {
  if (!token || token.length < 8) return token || "未设置"
  return token.slice(0, 4) + "····" + token.slice(-4)
}

// ─── 重新加载桌面组件 ───
function reloadWidgets(source = "api-key") {
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

export function ApiKeySettingsPage() {
  const dismiss = Navigation.useDismiss()
  const savedKey = readJson<{ apiKey?: string }>(keyCachePath)?.apiKey || ""
  const [apiKey, setApiKey] = useState(savedKey)
  const [showSuccess, setShowSuccess] = useState(false)

  const hasKey = Boolean(apiKey && apiKey.trim())
  const hasChanged = apiKey.trim() !== savedKey.trim()

  function save() {
    writeApiKey(apiKey)
    reloadWidgets()
    setShowSuccess(true)
    // 1.2 秒后自动关闭
    setTimeout(() => {
      dismiss()
    }, 1200)
  }

  return (
    <NavigationStack>
      <List
        navigationTitle="API Key"
        navigationBarTitleDisplayMode="inline"
        toolbar={{
          cancellationAction: <Button title="取消" action={dismiss} />,
          confirmationAction: <Button title="保存" action={save} />,
        }}
      >
        {/* ── 顶部品牌区 ── */}
        <Section>
          <VStack spacing={16} alignment="center" padding={{ vertical: 24 }} frame={{ maxWidth: "infinity" }}>
            {/* 大图标 */}
            <ZStack frame={{ width: 72, height: 72 }}>
              <Circle fill={{ colors: ["#f59e0b", "#f97316"], startPoint: "top", endPoint: "bottom" }} />
              <Image systemName="key.fill" font={32} foregroundStyle="white" />
            </ZStack>

            <VStack spacing={4} alignment="center">
              <Text font="title3" fontWeight="bold">彩云天气 Token</Text>
              <Text font="subheadline" foregroundStyle="secondaryLabel">
                用于获取实时天气数据{"\n"}保存后将立即同步到桌面组件
              </Text>
            </VStack>

            {/* 已保存状态标签 */}
            {hasKey && !hasChanged ? (
              <HStack spacing={6} alignment="center"
                padding={{ horizontal: 14, vertical: 6 }}
                background={{ style: { color: "#34c759", opacity: 0.12 }, shape: { type: "rect", cornerRadius: 20 } }}>
                <Image systemName="checkmark.circle.fill" font={12} foregroundStyle="#34c759" />
                <Text font="caption" fontWeight="medium" foregroundStyle="#34c759">
                  已保存 · {maskToken(savedKey)}
                </Text>
              </HStack>
            ) : hasChanged ? (
              <HStack spacing={6} alignment="center"
                padding={{ horizontal: 14, vertical: 6 }}
                background={{ style: { color: "#f59e0b", opacity: 0.12 }, shape: { type: "rect", cornerRadius: 20 } }}>
                <Image systemName="pencil.circle.fill" font={12} foregroundStyle="#f59e0b" />
                <Text font="caption" fontWeight="medium" foregroundStyle="#f59e0b">
                  有修改，请保存
                </Text>
              </HStack>
            ) : (
              <HStack spacing={6} alignment="center"
                padding={{ horizontal: 14, vertical: 6 }}
                background={{ style: { color: "#8e8e93", opacity: 0.12 }, shape: { type: "rect", cornerRadius: 20 } }}>
                <Image systemName="exclamationmark.circle" font={12} foregroundStyle="#8e8e93" />
                <Text font="caption" fontWeight="medium" foregroundStyle="#8e8e93">
                  尚未设置
                </Text>
              </HStack>
            )}
          </VStack>
        </Section>

        {/* ── 输入区域 ── */}
        <Section
          header={<Text font="footnote" foregroundStyle="secondaryLabel">Token 信息</Text>}>
          <VStack spacing={12} padding={{ vertical: 4 }}>
            <HStack spacing={10} alignment="center"
              padding={{ horizontal: 12, vertical: 10 }}
              background={{ style: "secondarySystemBackground", shape: { type: "rect", cornerRadius: 12 } }}>
              <ZStack frame={{ width: 28, height: 28 }}>
                <Circle fill="systemYellow" opacity={0.15} />
                <Image systemName="lock.fill" font={13} foregroundStyle="systemYellow" />
              </ZStack>
              <TextField
                title=""
                prompt="粘贴你的彩云天气 Token"
                value={apiKey}
                onChanged={setApiKey}
                autofocus
              />
            </HStack>
          </VStack>
        </Section>

        {/* ── 操作按钮 ── */}
        <Section>
          <Button action={save}>
            <HStack
              alignment="center"
              spacing={8}
              padding={{ vertical: 14 }}
              frame={{ maxWidth: "infinity" }}
              background={{
                style: { color: hasChanged ? "#34c759" : "#007aff", opacity: 1 },
                shape: { type: "rect", cornerRadius: 12 }
              }}>
              <Image
                systemName={showSuccess ? "checkmark.seal.fill" : "square.and.arrow.down.fill"}
                font={16}
                foregroundStyle="white"
              />
              <Text font="headline" fontWeight="bold" foregroundStyle="white">
                {showSuccess ? "保存成功 ✓" : "保存并同步"}
              </Text>
            </HStack>
          </Button>
        </Section>

        {/* ── 获取 Token 说明 ── */}
        <Section
          header={<Text font="footnote" foregroundStyle="secondaryLabel">如何获取</Text>}>
          <VStack spacing={8} alignment="leading" padding={{ vertical: 4 }} frame={{ maxWidth: "infinity" }}>
            {[
              { step: "1", text: "访问彩云天气开放平台注册账号" },
              { step: "2", text: "创建应用后获取 Token" },
              { step: "3", text: "粘贴到上方输入框并保存" },
            ].map((item) => (
              <HStack key={item.step} spacing={10} alignment="top">
                <ZStack frame={{ width: 20, height: 20 }}>
                  <Circle fill="systemBlue" opacity={0.15} />
                  <Text font={{ name: "system", size: 11 }} fontWeight="bold" foregroundStyle="systemBlue">
                    {item.step}
                  </Text>
                </ZStack>
                <Text font="subheadline" foregroundStyle="secondaryLabel">{item.text}</Text>
              </HStack>
            ))}
          </VStack>
        </Section>

        {/* ── 申请彩云 Token ── */}
        <Section>
          <Link url="https://platform.caiyunapp.com/login">
            <HStack
              alignment="center"
              spacing={10}
              padding={{ vertical: 14 }}
              frame={{ maxWidth: "infinity" }}
              background={{
                style: { color: "#007aff", opacity: 0.08 },
                shape: { type: "rect", cornerRadius: 12 }
              }}>
              <Image
                systemName="globe.asia.australia.fill"
                font={16}
                foregroundStyle="systemCyan"
              />
              <Text font="headline" fontWeight="bold" foregroundStyle="systemCyan">
                申请彩云 Token
              </Text>
              <Spacer />
              <Image
                systemName="arrow.up.right"
                font={14}
                foregroundStyle="tertiaryLabel"
              />
            </HStack>
          </Link>
        </Section>
      </List>
    </NavigationStack>
  )
}
