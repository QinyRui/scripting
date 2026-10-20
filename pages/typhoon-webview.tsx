/**
 * 🌀 彩云天气 — 台风路径 WebView 页面
 * 原版前端格式：WebView + Leaflet 实时动态地图
 * 数据源：istrongcloud 台风可视化 API
 */

import {
  Text,
  VStack,
  HStack,
  Image,
  List,
  Section,
  Navigation,
  NavigationStack,
  Button,
  fetch,
  Script,
  useState,
} from "scripting"

import { readSavedAmapKey, saveAmapKey, amapKeyStatus } from "../amap_config"

declare const FileManager: any
declare const WebViewController: any
declare const ShareSheet: any
declare const Keychain: any

// ─── 常量 ───
const SCRIPT_NAME = "彩云天气"
const WEB_DIR = FileManager.scriptsDirectory + "/" + SCRIPT_NAME + "/web"
const ENTRY_FILE = WEB_DIR + "/index.html"

// ─── 高德地图 Key 验证 ───
const STATIC_MAP_URL = "https://restapi.amap.com/v3/staticmap"

type AmapRuntimeState = {
  processing: boolean
  configured: boolean
  masked?: string
  updatedAt?: number
  valid?: boolean
  validationError?: string
  message?: string
}

const AMAP_ERROR_TEXT: Record<string, string> = {
  USERKEY_PLAT_NOMATCH: "Key 与平台不匹配：请使用「Web服务」类型的 Key",
  INVALID_USER_KEY: "Key 无效或已被删除，请检查是否复制完整",
  USER_DAILY_QUERY_OVER_LIMIT: "该 Key 今日调用配额已用尽，请明日再试或更换 Key",
  DAILY_QUERY_OVER_LIMIT: "今日调用配额已用尽，请明日再试",
  INVALID_USER_SCODE: "安全码校验失败",
  INVALID_PARAMS: "请求参数错误",
}

function amapErrorText(info: string): string {
  if (!info) return "未知错误"
  return AMAP_ERROR_TEXT[info] || ("高德接口错误：" + info)
}

async function verifyAmapKey(key: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const url = STATIC_MAP_URL + "?location=120.5,30.5&zoom=4&size=1*1&scale=1&key=" + encodeURIComponent(key)
    const response = await fetch(url)
    const contentType = String(response.headers?.get?.("content-type") || "")
    if (contentType.includes("json")) {
      let info = ""
      try {
        info = String(((await response.json()) as { info?: string })?.info || "")
      } catch {}
      return { ok: false, error: amapErrorText(info) }
    }
    if (!response.ok) return { ok: false, error: "高德接口 HTTP " + response.status }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: "网络错误：" + String(e) }
  }
}

// ─── 主页面 ───
export function TyphoonPathPage() {
  const dismiss = Navigation.useDismiss()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const loadData = async () => {
    setLoading(true)
    setError("")
    try {
      const resp = await fetch("https://tf02.istrongcloud.com/member/v1.2/home")
      if (!resp.ok) throw new Error("台风数据服务暂时不可用")
      setLoading(false)
    } catch (e: any) {
      setError(e ? e.message || "网络请求失败" : "网络请求失败")
      setLoading(false)
    }
  }

  useState(() => { loadData() })

  const presentWebView = async () => {
    const initialKey = readSavedAmapKey()
    let amapState: AmapRuntimeState = {
      processing: !!initialKey,
      ...amapKeyStatus(),
      message: initialKey ? "正在后台验证 Key…" : undefined,
    }
    let amapOperationId = 0

    const webView = new WebViewController({ ephemeral: true })
    const allowedHosts = new Set([
      "tf02.istrongcloud.com",
      "tf03.istrongcloud.com",
      "datacenter.istrongcloud.com",
      "upy.istrongcloud.com",
      "wprd01.is.autonavi.com",
      "wprd02.is.autonavi.com",
      "wprd03.is.autonavi.com",
      "wprd04.is.autonavi.com",
    ])

    webView.shouldAllowRequest = async (request: any) => {
      if (request.url.startsWith("file:")) return request.method === "GET"
      try {
        const url = new URL(request.url)
        const isNav = ["linkActivated", "formSubmitted", "formResubmitted"].includes(request.navigationType)
        return !isNav && request.method === "GET" && url.protocol === "https:" && (!url.port || url.port === "443") && allowedHosts.has(url.hostname)
      } catch {
        return false
      }
    }

    let sharing = false
    await webView.addScriptMessageHandler("shareTyphoon", () => {
      if (sharing) return { ok: false, busy: true }
      sharing = true
      ShareSheet.present(["台风路径", "https://tf03.istrongcloud.com/member/v1.3/home"])
        .catch((err: any) => console.error("分享失败", err))
        .finally(() => { sharing = false })
      return { ok: true }
    })

    await webView.addScriptMessageHandler("getAmapKeyStatus", () => amapState)

    await webView.addScriptMessageHandler("clearAmapKey", () => {
      amapOperationId++
      saveAmapKey("")
      amapState = { processing: false, configured: false }
      return { ok: true, ...amapState }
    })

    await webView.addScriptMessageHandler("setAmapKey", (params?: { key?: string }) => {
      const key = String(params?.key || "").trim()
      if (key.length < 8) return { ok: false, message: "Key 长度不足，请检查是否完整" }
      if (amapState.processing) return { ok: false, busy: true, message: "正在验证 Key，请稍候" }

      const opId = ++amapOperationId
      amapState = { processing: true, ...amapKeyStatus(), message: "正在验证 Key…" }

      ;(async () => {
        const check = await verifyAmapKey(key)
        if (opId !== amapOperationId) return
        if (!check.ok) {
          amapState = { processing: false, ...amapKeyStatus(), valid: false, validationError: check.error || "Key 验证失败" }
          return
        }
        saveAmapKey(key)
        amapState = { processing: false, ...amapKeyStatus(), valid: true, message: "Key 已保存并验证通过" }
      })().catch((err: any) => {
        if (opId !== amapOperationId) return
        amapState = { processing: false, ...amapKeyStatus(), valid: false, validationError: String(err) }
      })

      return { ok: true, pending: true, message: "正在验证 Key…" }
    })

    try {
      const loaded = await webView.loadFile(ENTRY_FILE, WEB_DIR)
      if (!loaded) throw new Error("本地地图页面加载失败")
      await webView.present({ fullscreen: true })
    } finally {
      webView.dispose()
    }
  }

  return (
    <NavigationStack>
      <List
        navigationTitle="台风路径"
        navigationBarTitleDisplayMode="inline"
        toolbar={{ cancellationAction: <Button title="完成" action={dismiss} /> }}
      >
        <Section>
          <VStack spacing={6} alignment="center" padding={{ vertical: 16 }} frame={{ maxWidth: "infinity" }}>
            <HStack spacing={8} alignment="center">
              <Image systemName="tornado" font={28} foregroundStyle="#FF453A" />
              <Text font="title2" fontWeight="bold" foregroundStyle="label">台风路径</Text>
            </HStack>
            <Text font="subheadline" foregroundStyle="secondaryLabel" multilineTextAlignment="center" frame={{ maxWidth: "infinity" }}>
              实时动态地图 · 多机构预报路径 · 气象图层
            </Text>
            <Button action={presentWebView}>
              <HStack alignment="center" spacing={6} padding={{ horizontal: 24, vertical: 10 }} background="#FF453A" clipShape={{ type: "rect", cornerRadius: 20 }}>
                <Image systemName="map" font={14} foregroundStyle="white" />
                <Text foregroundStyle="white" fontWeight="bold">打开台风地图</Text>
              </HStack>
            </Button>
            <Text font="caption2" foregroundStyle="tertiaryLabel" multilineTextAlignment="center">
              数据来源：中国气象局 / 四创科技
            </Text>
          </VStack>
        </Section>

        <Section header={<Text font="footnote" foregroundStyle="secondaryLabel">功能介绍</Text>}>
          <VStack spacing={10} padding={{ vertical: 4 }}>
            <HStack spacing={8} alignment="firstTextBaseline">
              <Image systemName="tropicalstorm" font={18} foregroundStyle="#FF4050" frame={{ width: 24, height: 18 }} />
              <VStack alignment="leading" spacing={2} frame={{ maxWidth: "infinity" }}>
                <Text font="subheadline" fontWeight="medium" foregroundStyle="label">实时台风路径</Text>
                <Text font="caption" foregroundStyle="secondaryLabel" multilineTextAlignment="leading" frame={{ maxWidth: "infinity" }}>动态显示台风历史轨迹和多机构预报路径</Text>
              </VStack>
            </HStack>
            <HStack spacing={8} alignment="firstTextBaseline">
              <Image systemName="cloud.rain" font={18} foregroundStyle="#39A7F8" frame={{ width: 24, height: 18 }} />
              <VStack alignment="leading" spacing={2} frame={{ maxWidth: "infinity" }}>
                <Text font="subheadline" fontWeight="medium" foregroundStyle="label">气象图层</Text>
                <Text font="caption" foregroundStyle="secondaryLabel" multilineTextAlignment="leading" frame={{ maxWidth: "infinity" }}>雷达、云图、风场、浪场、温度、数值预报</Text>
              </VStack>
            </HStack>
            <HStack spacing={8} alignment="firstTextBaseline">
              <Image systemName="globe.asia.australia" font={18} foregroundStyle="#30D158" frame={{ width: 24, height: 18 }} />
              <VStack alignment="leading" spacing={2} frame={{ maxWidth: "infinity" }}>
                <Text font="subheadline" fontWeight="medium" foregroundStyle="label">多机构预报</Text>
                <Text font="caption" foregroundStyle="secondaryLabel" multilineTextAlignment="leading" frame={{ maxWidth: "infinity" }}>中国、日本、美国、韩国、中国台湾、中国香港</Text>
              </VStack>
            </HStack>
            <HStack spacing={8} alignment="firstTextBaseline">
              <Image systemName="clock.arrow.circlepath" font={18} foregroundStyle="#FF9F0A" frame={{ width: 24, height: 18 }} />
              <VStack alignment="leading" spacing={2} frame={{ maxWidth: "infinity" }}>
                <Text font="subheadline" fontWeight="medium" foregroundStyle="label">历史台风</Text>
                <Text font="caption" foregroundStyle="secondaryLabel" multilineTextAlignment="leading" frame={{ maxWidth: "infinity" }}>查询历史台风路径和详细信息</Text>
              </VStack>
            </HStack>
          </VStack>
        </Section>

        {loading ? (
          <Section>
            <VStack alignment="center" spacing={6} padding={{ vertical: 16 }} frame={{ maxWidth: "infinity" }}>
              <Image systemName="arrow.clockwise" font={18} foregroundStyle="#8C7CFF" />
              <Text font="caption" foregroundStyle="secondaryLabel" frame={{ maxWidth: "infinity" }} multilineTextAlignment="center">正在检测台风数据服务…</Text>
            </VStack>
          </Section>
        ) : error ? (
          <Section>
            <VStack alignment="center" spacing={6} padding={{ vertical: 16 }} frame={{ maxWidth: "infinity" }}>
              <Image systemName="exclamationmark.triangle" font={18} foregroundStyle="systemOrange" />
              <Text font="caption" foregroundStyle="systemOrange" frame={{ maxWidth: "infinity" }} multilineTextAlignment="center">{error}</Text>
              <Button action={loadData}>
                <Text foregroundStyle="systemBlue" fontWeight="medium">重新检测</Text>
              </Button>
            </VStack>
          </Section>
        ) : null}
      </List>
    </NavigationStack>
  )
}
