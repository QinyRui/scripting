import {
  Script,
  Widget,
  Navigation,
  NavigationStack,
  ScrollView,
  VStack,
  HStack,
  Text,
  Image,
  Spacer,
  Divider,
  Gauge,
  ProgressView,
  Chart,
  BarChart,
  List,
  Section,
  Button,
  TextField,
  fetch,
  useState,
  useEffect
} from "scripting"

// ============================================================
// AI 用量监控仪表板（MiMo 实时数据版）
// 通过 WebViewController 登录获取 Cookie，再用 Cookie 调用平台 API
// ============================================================

// --- 全局类型声明 ---
declare const Storage: {
  get(key: string): string | undefined | null
  set(key: string, value: string): void
  remove(key: string): void
}

declare class WebViewController {
  constructor(options?: { ephemeral?: boolean })
  loadURL(url: string): Promise<boolean>
  waitForLoad(): Promise<boolean>
  evaluateJavaScript<T = any>(javascript: string): Promise<T>
  getHTML(): Promise<string | null>
  present(options?: { fullscreen?: boolean; navigationTitle?: string }): Promise<void>
  getAllCookies(): Promise<Array<{ name: string; value: string; domain: string }>>
  getCookies(url: string): Promise<Array<{ name: string; value: string; domain: string }>>
  dismiss(): void
  dispose(): void
}

// 定时器全局 API（Scripting 运行时支持，TS 类型未声明）
declare function setInterval(callback: () => void, ms: number): number
declare function clearInterval(id: number): void

// 系统语义颜色，自动跟随系统明暗模式
// "label"=主文字 "secondaryLabel"=副文字 "tertiaryLabel"=辅助文字
const COLORS: any = {
  bg: "systemBackground",
  cardBg: "secondarySystemFill",
  cardBgAlt: "tertiarySystemFill",
  accent: "#6366F1",
  accentPurple: "#8B5CF6",
  green: "#10B981",
  blue: "#3B82F6",
  orange: "#F59E0B",
  red: "#EF4444",
  cyan: "#06B6D4",
  pink: "#EC4899",
  textPrimary: "label",
  textSecondary: "secondaryLabel",
  textTertiary: "tertiaryLabel",
  divider: "separator",
}

// --- Storage Keys ---
const STORAGE_COOKIES = "tokei_mimo_cookies"
const STORAGE_DATA = "tokei_mimo_realtime"
const STORAGE_TIME_RANGE = "tokei_mimo_time_range"  // 主应用当前选中的时间范围（用于与 Widget 联动）

// --- MiMo 平台 API ---
const MIMO_BASE = "https://platform.xiaomimimo.com"
const MIMO_CONSOLE = MIMO_BASE + "/console/plan-manage?userId=3160990013"

// --- 数据结构 ---
interface PlatformRecord {
  date: string
  model: string
  totalTokens: number
  inputCacheHit: number
  inputCacheMiss: number
  outputTokens: number
  requests: number
}

interface PlatformData {
  creditsUsed: number
  creditsTotal: number
  creditsPercent: number
  totalTokens: number
  totalRequests: number
  planName: string
  validUntil: string
  records: PlatformRecord[]
  lastUpdated: string
}

// --- 模型配置 ---
const MODELS: Record<string, { name: string; short: string; color: string }> = {
  "mimo-v2.5":    { name: "MiMo V2.5",   short: "V2.5", color: "#10B981" },
  "mimo-v2-pro":  { name: "MiMo V2 Pro",  short: "Pro",  color: "#6366F1" },
  "mimo-v2-omni": { name: "MiMo V2 Omni", short: "Omni", color: "#F59E0B" },
}

// 时间范围常量（主应用与桌面组件共用，保持字符串一致）
const TIME_RANGES = ["今日", "本周", "本月"] as const
type TimeRange = typeof TIME_RANGES[number]
const DEFAULT_TIME_RANGE: TimeRange = "本月"

function loadTimeRange(): TimeRange {
  try {
    const raw = Storage.get(STORAGE_TIME_RANGE) as string | undefined
    if (raw && (TIME_RANGES as readonly string[]).indexOf(raw) >= 0) return raw as TimeRange
  } catch (e) {}
  return DEFAULT_TIME_RANGE
}

function saveTimeRange(range: TimeRange) {
  try { Storage.set(STORAGE_TIME_RANGE, range) } catch (e) {}
}

// --- 自动刷新配置 ---
const AUTO_REFRESH_MS = 15 * 60 * 1000  // Widget 刷新间隔：15 分钟
const APP_REFRESH_MS = 5 * 60 * 1000    // 主应用刷新间隔：5 分钟
const AUTO_REFRESH_KEY = "tokei_auto_refresh"

// --- 默认空数据（首次加载用） ---
const EMPTY_DATA: PlatformData = {
  creditsUsed: 0,
  creditsTotal: 11000000000,
  creditsPercent: 0,
  totalTokens: 0,
  totalRequests: 0,
  planName: "Standard",
  validUntil: "--",
  records: [],
  lastUpdated: "",
}

// ============================================================
// 工具函数
// ============================================================

function fmt(n: number): string {
  if (n >= 1000000000) return (n / 1000000000).toFixed(1) + "B"
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M"
  if (n >= 1000) return (n / 1000).toFixed(0) + "K"
  return n.toString()
}

function loadData(): PlatformData {
  try {
    const raw: string = Storage.get(STORAGE_DATA) as string
    if (raw) return JSON.parse(raw) as PlatformData
  } catch (e) {}
  return EMPTY_DATA
}

function saveData(data: PlatformData) {
  Storage.set(STORAGE_DATA, JSON.stringify(data))
}

function loadCookieStr(): string {
  try {
    const raw = Storage.get(STORAGE_COOKIES)
    if (raw) return raw as string
  } catch (e) {}
  return ""
}

function saveCookieStr(cookieStr: string) {
  Storage.set(STORAGE_COOKIES, cookieStr)
}

function hasCookies(): boolean {
  return loadCookieStr().length > 0
}

// ============================================================
// API 数据拉取（多策略：GET + WebView 拦截）
// ============================================================

/** 从 Cookie 字符串中提取指定 Cookie 值 */
function getCookieValue(cookieStr: string, name: string): string {
  const parts = cookieStr.split(";")
  for (var i = 0; i < parts.length; i++) {
    const pair = parts[i].trim().split("=")
    if (pair[0] === name) {
      return pair.slice(1).join("=")
    }
  }
  return ""
}

/** 检查 Cookie 是否有效（调用轻量级接口验证） */
async function checkCookieValid(): Promise<boolean> {
  const cookieStr = loadCookieStr()
  if (!cookieStr) return false
  try {
    const res = await fetch(MIMO_BASE + "/api/v1/tokenPlan/usage", {
      headers: { "Accept": "application/json", "Cookie": cookieStr }
    })
    const data = await res.json()
    // code === 0 表示有效，其他（如 401/403/未登录）表示过期
    return data && data.code === 0
  } catch (e) {
    return false
  }
}

/** 带 Cookie 的 GET 请求（已验证可用） */
async function apiGet(path: string): Promise<any> {
  const cookieStr = loadCookieStr()
  const url = MIMO_BASE + path
  console.log("📡 GET " + path)
  const res = await fetch(url, {
    headers: {
      "Accept": "application/json",
      ...(cookieStr ? { "Cookie": cookieStr } : {})
    }
  })
  const data = await res.json()
  console.log("📦 GET " + path + " → code=" + (data.code || "N/A"))
  return data
}

// 从 API 响应转换为 PlatformRecord[]
function parseUsageRecords(apiData: any): PlatformRecord[] {
  if (!apiData) return []
  var items: any[] = []
  if (Array.isArray(apiData)) {
    items = apiData
  } else if (apiData.items && Array.isArray(apiData.items)) {
    items = apiData.items
  }
  if (items.length === 0) return []

  console.log("📋 用量明细条数:", items.length)
  console.log("📋 首条样本:", JSON.stringify(items[0]).slice(0, 300))

  const today = new Date().toISOString().split("T")[0]
  return items.map(function(item: any) {
    return {
      date: item.date || item.day || today,
      model: item.model || item.name || "unknown",
      totalTokens: item.totalTokens || item.tokens || item.totalToken || 0,
      inputCacheHit: item.cacheHits || item.hitCacheTokens || item.inputHitToken || 0,
      inputCacheMiss: item.cacheMisses || item.missCacheTokens || item.inputMissToken || 0,
      outputTokens: item.outputTokens || item.output || item.outputToken || 0,
      requests: item.requestCount || item.requests || 0,
    }
  })
}

// ============================================================
// WebView 拦截策略：加载控制台页面，拦截 fetch 获取用量数据
// ============================================================

async function fetchUsageViaWebView(): Promise<any> {
  const vc = new WebViewController()
  try {
    console.log("🌐 [WV] 加载控制台页面...")
    await vc.loadURL(MIMO_CONSOLE)
    await vc.waitForLoad()
    console.log("📄 [WV] 页面加载完成，等待 SPA 渲染...")
    // 等待 SPA 完全加载
    await new Promise<void>(function(resolve) { setTimeout(function() { resolve() }, 6000) })

    // Step 1: 检查 performance entries 找到已成功的 API URL
    var perfEntries: any[] = []
    try {
      const perfResult = await vc.evaluateJavaScript(
        "return JSON.stringify(performance.getEntriesByType('resource')" +
        ".filter(function(e) { return e.name.indexOf('usage/token-plan') >= 0 })" +
        ".map(function(e) { return { name: e.name, duration: e.duration, transferSize: e.transferSize } }))"
      )
      console.log("📊 [WV] perf entries:", (perfResult || "[]").slice(0, 600))
      perfEntries = JSON.parse(perfResult || "[]")
    } catch (e) {
      console.log("⚠️ [WV] perf entries 读取失败:", e)
    }

    // Step 2: 注入 fetch 拦截器
    try {
      await vc.evaluateJavaScript(
        "window.__captured = [];" +
        "var _origFetch = window.fetch;" +
        "window.fetch = function() {" +
        "  var args = arguments;" +
        "  var url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url) || '';" +
        "  return _origFetch.apply(window, args).then(function(resp) {" +
        "    if (url.indexOf('usage') >= 0 || url.indexOf('token-plan') >= 0) {" +
        "      resp.clone().text().then(function(t) {" +
        "        window.__captured.push({ url: url, status: resp.status, body: t.slice(0, 8000) });" +
        "      }).catch(function() {});" +
        "    }" +
        "    return resp;" +
        "  });" +
        "};"
      )
      console.log("🐒 [WV] fetch 拦截器已注入")
    } catch (e) {
      console.log("⚠️ [WV] 拦截器注入失败:", e)
    }

    // Step 3: 读取 Cookie 和 api-platform_ph
    var documentCookie = ""
    try {
      documentCookie = await vc.evaluateJavaScript("return document.cookie") || ""
      console.log("🍪 [WV] document.cookie 长度:", documentCookie.length)
    } catch {}

    var phValue = getCookieValue(documentCookie, "api-platform_ph")
    // 也从 performance entries URL 中提取
    if (!phValue && perfEntries.length > 0) {
      for (var i = 0; i < perfEntries.length; i++) {
        const match = (perfEntries[i].name || "").match(/api-platform_ph=([^&]+)/)
        if (match) {
          phValue = decodeURIComponent(match[1])
          console.log("🔑 [WV] 从 perf URL 提取到 ph:", phValue.slice(0, 30) + "...")
          break
        }
      }
    }
    // 去除可能的引号包裹
    if (phValue && (phValue.startsWith('"') || phValue.startsWith("'"))) {
      phValue = phValue.replace(/^["']|["']$/g, '')
      console.log("🔑 [WV] ph 去引号后:", phValue.slice(0, 40) + "...")
    }
    console.log("🔑 [WV] api-platform_ph:", phValue ? phValue.slice(0, 40) + "..." : "(空)")

    // Step 4: 尝试重放已成功的 POST 请求
    if (perfEntries.length > 0) {
      const replayUrl = perfEntries[0].name
      console.log("🔄 [WV] 重放 POST:", replayUrl.slice(0, 120) + "...")
      try {
        const replayResult = await vc.evaluateJavaScript(
          "return fetch(\"" + replayUrl.replace(/"/g, '\\"') + "\", {" +
          "  method: 'POST'," +
          "  headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }," +
          "  credentials: 'include'," +
          "  body: JSON.stringify({ year: " + new Date().getFullYear() + ", month: " + (new Date().getMonth() + 1) + " })" +
          "}).then(function(r) { return r.json().then(function(d) { return JSON.stringify({s: r.status, d: d}) }) })" +
          ".catch(function(e) { return JSON.stringify({e: String(e)}) })"
        )
        console.log("📋 [WV] 重放结果:", (replayResult || "").slice(0, 600))
        try {
          const rp = JSON.parse(replayResult || "{}")
          if (rp.d && rp.d.code === 0) {
            console.log("✅ [WV] 重放成功！")
            return rp.d
          }
        } catch {}
      } catch (e) {
        console.log("⚠️ [WV] 重放异常:", e)
      }
    }

    // Step 5: 用 ph 值发起新 POST
    if (phValue) {
      const year = new Date().getFullYear()
      const month = new Date().getMonth() + 1
      console.log("📮 [WV] 使用 ph 发起 POST...")
      try {
        const postResult = await vc.evaluateJavaScript(
          "return fetch('/api/v1/usage/token-plan/list?api-platform_ph=" + encodeURIComponent(phValue) + "', {" +
          "  method: 'POST'," +
          "  headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }," +
          "  credentials: 'include'," +
          "  body: JSON.stringify({ year: " + year + ", month: " + month + " })" +
          "}).then(function(r) { return r.json().then(function(d) { return JSON.stringify({s: r.status, d: d}) }) })" +
          ".catch(function(e) { return JSON.stringify({e: String(e)}) })"
        )
        console.log("📋 [WV] ph POST 结果:", (postResult || "").slice(0, 600))
        try {
          const pp = JSON.parse(postResult || "{}")
          if (pp.d && pp.d.code === 0) {
            console.log("✅ [WV] ph POST 成功！")
            return pp.d
          }
        } catch {}
      } catch (e) {
        console.log("⚠️ [WV] ph POST 异常:", e)
      }
    }

    // Step 6: 读取拦截器捕获的响应
    await new Promise<void>(function(resolve) { setTimeout(function() { resolve() }, 2000) })
    try {
      const capturedJson = await vc.evaluateJavaScript("return JSON.stringify(window.__captured || [])")
      console.log("🐒 [WV] 拦截器捕获:", (capturedJson || "").slice(0, 600))
      const captured = JSON.parse(capturedJson || "[]")
      for (var i = 0; i < captured.length; i++) {
        if (captured[i].status === 200 && captured[i].body) {
          const bd = JSON.parse(captured[i].body)
          if (bd.code === 0) {
            console.log("✅ [WV] 从拦截器获取到数据！")
            return bd
          }
        }
      }
    } catch {}

    console.log("⚠️ [WV] 所有策略均未获取到用量明细")
    return null
  } catch (e) {
    console.log("❌ [WV] 异常:", e)
    return null
  } finally {
    try { vc.dismiss() } catch {}
    try { vc.dispose() } catch {}
  }
}

// ============================================================
// 核心数据拉取：GET 端点 + WebView 拦截
// ============================================================

async function fetchAllData(): Promise<PlatformData | null> {
  const cookieStr = loadCookieStr()
  if (!cookieStr) return null

  try {
    // Phase 1: GET 端点获取基础数据（已验证可用）
    console.log("🔍 Phase 1: 拉取基础数据 (GET)...")
    const [usageResp, detailResp, apiKeyResp] = await Promise.all([
      apiGet("/api/v1/tokenPlan/usage"),
      apiGet("/api/v1/tokenPlan/detail"),
      apiGet("/api/v1/tokenPlan/apiKey").catch(function() { return null }),
    ])
    console.log("📦 usage 响应:", JSON.stringify(usageResp).slice(0, 600))
    console.log("📦 detail 响应:", JSON.stringify(detailResp).slice(0, 600))
    console.log("📦 apiKey 响应:", JSON.stringify(apiKeyResp).slice(0, 400))

    // 提取额度信息
    var creditsUsed = 0
    var creditsTotal = 11000000000
    var creditsPercent = 0
    if (usageResp && usageResp.code === 0 && usageResp.data) {
      const mu = usageResp.data.monthUsage
      if (mu && mu.items && mu.items.length > 0) {
        creditsUsed = mu.items[0].used || 0
        creditsTotal = mu.items[0].limit || 11000000000
        creditsPercent = mu.items[0].percent || 0
      }
    }

    // 提取套餐信息
    var planName = "Standard"
    var validUntil = "--"
    if (detailResp && detailResp.code === 0 && detailResp.data) {
      planName = detailResp.data.planName || "Standard"
      validUntil = (detailResp.data.currentPeriodEnd || "--").split(" ")[0]
    }

    if (apiKeyResp && apiKeyResp.code === 0 && apiKeyResp.data) {
      console.log("🔑 apiKey:", JSON.stringify(apiKeyResp.data).slice(0, 300))
    }

    // Phase 2: 通过 WebView 拦截获取用量明细
    console.log("🔍 Phase 2: 拉取用量明细 (WebView)...")
    var listResp: any = null
    try {
      listResp = await fetchUsageViaWebView()
    } catch (e) {
      console.log("⚠️ WebView 方式失败:", e)
    }

    // 解析用量明细
    var records: PlatformRecord[] = []
    if (listResp) {
      records = parseUsageRecords(listResp.data || listResp)
      console.log("📊 解析到 records:", records.length, "条")
      if (records.length > 0) {
        console.log("📊 首条 record:", JSON.stringify(records[0]))
      }
    } else {
      console.log("📊 未获取到用量明细（仅显示额度数据）")
    }

    // 汇总
    var totalTokens = 0
    var totalRequests = 0
    for (var i = 0; i < records.length; i++) {
      totalTokens += records[i].totalTokens
      totalRequests += records[i].requests
    }

    return {
      creditsUsed: creditsUsed,
      creditsTotal: creditsTotal,
      creditsPercent: creditsPercent,
      totalTokens: totalTokens,
      totalRequests: totalRequests,
      planName: planName,
      validUntil: validUntil,
      records: records,
      lastUpdated: new Date().toISOString(),
    }
  } catch (e) {
    console.log("❌ fetchAllData 错误:", e)
    return null
  }
}
// 登录流程：WebViewController → 提取 Cookie（参照 MiMo Token Plan）
// ============================================================

/** 从 WebView 提取 Cookie 并保存为字符串 */
async function extractAndSaveCookies(vc: WebViewController): Promise<string> {
  // 优先使用 getCookies(url) 获取匹配域名的 Cookie
  var cookies = await vc.getCookies(MIMO_BASE)

  // 如果 getCookies 返回空，尝试 getAllCookies 获取所有
  if (cookies.length === 0) {
    cookies = await vc.getAllCookies()
  }

  if (cookies.length > 0) {
    const cookieStr = cookies.map(function(c) { return c.name + "=" + c.value }).join("; ")
    saveCookieStr(cookieStr)
    return cookieStr
  }

  return ""
}

/** 打开 WebView 登录：加载平台页面 → 用户登录 → 关闭 → 提取 Cookie */
async function performLogin(): Promise<boolean> {
  let vc: WebViewController | null = null
  try {
    vc = new WebViewController()
    await vc.loadURL(MIMO_CONSOLE)
    await vc.present({ navigationTitle: "小米 MiMo 登录" })

    // 用户关闭 WebView 后，提取 Cookie
    const cookieStr = await extractAndSaveCookies(vc)
    return cookieStr.length > 0
  } catch (e) {
    return false
  } finally {
    if (vc) { try { vc.dispose() } catch {} }
  }
}

/** 自动刷新 Cookie（静默方式）：加载页面 → 等待浏览器自动认证 → 提取新 Cookie
 * 注意：不使用 present()，避免弹出 WebView 界面 */
async function tryRefreshCookies(): Promise<boolean> {
  let vc: WebViewController | null = null
  try {
    vc = new WebViewController()
    await vc.loadURL(MIMO_CONSOLE)
    await vc.waitForLoad()
    // 等待页面完全加载，浏览器会自动携带已有 Cookie 重新认证
    await new Promise<void>(function(resolve) { setTimeout(function() { resolve() }, 5000) })
    const cookieStr = await extractAndSaveCookies(vc)
    return cookieStr.length > 0
  } catch (e) {
    return false
  } finally {
    if (vc) { try { vc.dispose() } catch {} }
  }
}

// ============================================================
// 子组件
// ============================================================

function StatCard({ label, value, subtitle, icon, color }: {
  label: string; value: string; subtitle: string; icon: string; color: string
}) {
  return (
    <VStack
      // @ts-ignore
      padding={16}
      spacing={8}
    >
      <HStack spacing={6}>
        <Image
          systemName={icon}
          width={16}
          height={16}
          foregroundStyle={color}
        />
        <Text
          fontSize={12}
          foregroundStyle={COLORS.textSecondary}
        >
          {label}
        </Text>
      </HStack>
      <Text
        font="title"
        foregroundStyle={COLORS.textPrimary}
      >
        {value}
      </Text>
      <Text
        fontSize={11}
        foregroundStyle={COLORS.textTertiary}
      >
        {subtitle}
      </Text>
    </VStack>
  )
}

function CreditGauge({ used, total }: { used: number; total: number }) {
  const rate = total > 0 ? used / total : 0
  const pct = Math.round(rate * 100)
  const gaugeColor = rate > 0.8 ? COLORS.red : rate > 0.6 ? COLORS.orange : COLORS.green

  return (
    <VStack
      // @ts-ignore
      padding={16}
      spacing={10}
      alignment="center"
    >
      <HStack spacing={6}>
        <Image
          systemName="bolt.fill"
          width={16}
          height={16}
          foregroundStyle={gaugeColor}
        />
        <Text
          fontSize={12}
          foregroundStyle={COLORS.textSecondary}
        >
          额度使用
        </Text>
      </HStack>
      <Gauge
        value={rate}
        min={0}
        max={1}
        label={<></>}
        currentValueLabel={
          <Text
            font="title"
            foregroundStyle={gaugeColor}
          >
            {pct}%
          </Text>
        }
      />
      <Text
        fontSize={11}
        foregroundStyle={COLORS.textTertiary}
        multilineTextAlignment="center"
      >
        {fmt(used)} / {fmt(total)}
      </Text>
    </VStack>
  )
}

function CacheHitCard({ records }: { records: PlatformRecord[] }) {
  var totalCacheHit = 0
  var totalInput = 0
  for (var i = 0; i < records.length; i++) {
    totalCacheHit += records[i].inputCacheHit
    totalInput += records[i].inputCacheHit + records[i].inputCacheMiss
  }
  const hitRate = totalInput > 0 ? totalCacheHit / totalInput : 0
  const pct = Math.round(hitRate * 100)

  return (
    <VStack
      // @ts-ignore
      padding={16}
      spacing={10}
      alignment="center"
    >
      <HStack spacing={6}>
        <Image
          systemName="bolt.badge.a.fill"
          width={16}
          height={16}
          foregroundStyle={COLORS.cyan}
        />
        <Text
          fontSize={12}
          foregroundStyle={COLORS.textSecondary}
        >
          缓存命中
        </Text>
      </HStack>
      <Gauge
        value={hitRate}
        min={0}
        max={1}
        label={<></>}
        currentValueLabel={
          <Text
            font="title"
            foregroundStyle={COLORS.cyan}
          >
            {pct}%
          </Text>
        }
      />
      <Text
        fontSize={11}
        foregroundStyle={COLORS.textTertiary}
        multilineTextAlignment="center"
      >
        {fmt(totalCacheHit)} / {fmt(totalInput)}
      </Text>
    </VStack>
  )
}

function TopModelCard({ records }: { records: PlatformRecord[] }) {
  var modelTokens: Record<string, number> = {}
  var modelReqs: Record<string, number> = {}
  for (var i = 0; i < records.length; i++) {
    const m = records[i].model
    modelTokens[m] = (modelTokens[m] || 0) + records[i].totalTokens
    modelReqs[m] = (modelReqs[m] || 0) + records[i].requests
  }
  var topModel = ""
  var topTokens = 0
  for (const m in modelTokens) {
    if (modelTokens[m] > topTokens) {
      topTokens = modelTokens[m]
      topModel = m
    }
  }
  const info = MODELS[topModel] || { name: topModel, color: COLORS.textSecondary }

  return (
    <VStack
      // @ts-ignore
      padding={16}
      spacing={8}
    >
      <HStack spacing={6}>
        <Image
          systemName="cpu"
          width={16}
          height={16}
          foregroundStyle={COLORS.accentPurple}
        />
        <Text
          fontSize={12}
          foregroundStyle={COLORS.textSecondary}
        >
          最常用模型
        </Text>
      </HStack>
      <Text
        font="headline"
        foregroundStyle={COLORS.textPrimary}
      >
        {info.name}
      </Text>
      <HStack spacing={4}>
        <Image
          systemName="circle.fill"
          width={6}
          height={6}
          foregroundStyle={info.color}
        />
        <Text
          fontSize={11}
          foregroundStyle={COLORS.textTertiary}
        >
          {fmt(topTokens)} tokens · {modelReqs[topModel] || 0} 次
        </Text>
      </HStack>
    </VStack>
  )
}

function TokenBreakdownBar({ records }: { records: PlatformRecord[] }) {
  var totalCacheHit = 0
  var totalCacheMiss = 0
  var totalOutput = 0
  for (var i = 0; i < records.length; i++) {
    totalCacheHit += records[i].inputCacheHit
    totalCacheMiss += records[i].inputCacheMiss
    totalOutput += records[i].outputTokens
  }
  const total = totalCacheHit + totalCacheMiss + totalOutput

  return (
    <VStack
      // @ts-ignore
      padding={16}
      spacing={12}
    >
      <HStack spacing={6}>
        <Image
          systemName="chart.pie.fill"
          width={16}
          height={16}
          foregroundStyle={COLORS.accent}
        />
        <Text
          fontSize={13}
          foregroundStyle={COLORS.textSecondary}
          font="headline"
        >
          Token 构成
        </Text>
        <Spacer />
        <Text
          fontSize={12}
          foregroundStyle={COLORS.textTertiary}
        >
          {fmt(total)} 总计
        </Text>
      </HStack>

      <VStack spacing={8}>
        <HStack spacing={8}>
          <Image
            systemName="square.fill"
            width={8}
            height={8}
            foregroundStyle={COLORS.blue}
          />
          <Text
            fontSize={12}
            foregroundStyle={COLORS.textSecondary}
          >
            缓存命中输入
          </Text>
          <Spacer />
          <Text
            fontSize={12}
            foregroundStyle={COLORS.textSecondary}
            font="subheadline"
          >
            {fmt(totalCacheHit)}
          </Text>
        </HStack>
        <HStack spacing={8}>
          <Image
            systemName="square.fill"
            width={8}
            height={8}
            foregroundStyle={COLORS.accent}
          />
          <Text
            fontSize={12}
            foregroundStyle={COLORS.textSecondary}
          >
            未命中缓存输入
          </Text>
          <Spacer />
          <Text
            fontSize={12}
            foregroundStyle={COLORS.textSecondary}
            font="subheadline"
          >
            {fmt(totalCacheMiss)}
          </Text>
        </HStack>
        <HStack spacing={8}>
          <Image
            systemName="square.fill"
            width={8}
            height={8}
            foregroundStyle={COLORS.green}
          />
          <Text
            fontSize={12}
            foregroundStyle={COLORS.textSecondary}
          >
            输出 Token
          </Text>
          <Spacer />
          <Text
            fontSize={12}
            foregroundStyle={COLORS.textSecondary}
            font="subheadline"
          >
            {fmt(totalOutput)}
          </Text>
        </HStack>
      </VStack>
    </VStack>
  )
}

function ModelRow({ modelId, tokens, requests, totalTokens }: {
  modelId: string; tokens: number; requests: number; totalTokens: number
}) {
  const info = MODELS[modelId] || { name: modelId, short: "?", color: COLORS.textSecondary }
  const pct = totalTokens > 0 ? Math.round((tokens / totalTokens) * 100) : 0

  return (
    <VStack spacing={8}>
      <HStack spacing={8}>
        <VStack
          // @ts-ignore
          background={info.color}
          // @ts-ignore
          cornerRadius={6}
          // @ts-ignore
          padding={6}
          alignment="center"
        >
          <Text
            fontSize={11}
            font="caption"
            foregroundStyle={COLORS.textPrimary}
          >
            {info.short}
          </Text>
        </VStack>
        <VStack spacing={2}>
          <Text
            fontSize={13}
            font="subheadline"
            foregroundStyle={COLORS.textPrimary}
          >
            {info.name}
          </Text>
          <Text
            fontSize={11}
            foregroundStyle={COLORS.textTertiary}
          >
            {fmt(tokens)} tokens · {requests} 次
          </Text>
        </VStack>
        <Spacer />
        <VStack alignment="trailing" spacing={2}>
          <Text
            fontSize={13}
            font="subheadline"
            foregroundStyle={info.color}
          >
            {pct}%
          </Text>
        </VStack>
      </HStack>
      <ProgressView
        value={pct}
        total={100}
        tint={info.color}
      />
    </VStack>
  )
}

function TimeRangeSelector({ selected, onSelect }: {
  selected: TimeRange; onSelect: (s: TimeRange) => void
}) {
  return (
    <HStack spacing={4}>
      {TIME_RANGES.map((r) => {
        const isActive = selected === r
        return (
          <Button
            key={r}
            action={() => onSelect(r)}
          >
            <VStack
              // @ts-ignore
              background={isActive ? COLORS.accent : COLORS.cardBg}
              // @ts-ignore
              cornerRadius={10}
              // @ts-ignore
              padding={{ horizontal: 14, vertical: 7 }}
              alignment="center"
            >
              <Text
                fontSize={12}
                font="subheadline"
                foregroundStyle={isActive ? "#FFFFFF" : COLORS.textSecondary}
              >
                {r}
              </Text>
            </VStack>
          </Button>
        )
      })}
    </HStack>
  )
}

function HeaderSection({ validUntil }: { validUntil: string }) {
  const now = new Date()
  const dateStr = `${now.getMonth() + 1}月${now.getDate()}日`

  return (
    <VStack spacing={4}>
      <HStack alignment="center">
        <Spacer />
        <VStack alignment="center" spacing={2}>
          <Text font="largeTitle">Xiaomi MIMO</Text>
          <Text
            fontSize={13}
            foregroundStyle={COLORS.textSecondary}
            multilineTextAlignment="center"
          >
            MiMo 实时监控 · {dateStr}
          </Text>
        </VStack>
        <Spacer />
      </HStack>
    </VStack>
  )
}

// ============================================================
// 主仪表板
// ============================================================
export default function DashboardView() {
  const [data, setData] = useState<PlatformData>(EMPTY_DATA)
  const [timeRange, setTimeRangeState] = useState<TimeRange>(loadTimeRange())
  const [syncing, setSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState("")
  const [isLoggedIn, setIsLoggedIn] = useState(hasCookies())
  const [autoRefresh, setAutoRefresh] = useState(true)
  // COLORS 已使用系统语义颜色（label/secondaryLabel 等），自动跟随系统明暗模式

  // 切换时间范围：持久化 + 触发 Widget 刷新
  const setTimeRange = (range: TimeRange) => {
    setTimeRangeState(range)
    saveTimeRange(range)
    // 立刻通知桌面组件刷新，让它读取新的时间范围
    try { Widget.reloadAll() } catch (e) {}
  }

  // 获取筛选后的记录（与 Widget 共用同一套筛选逻辑）
  function getFilteredRecords(records: PlatformRecord[]): PlatformRecord[] {
    const now = new Date()
    const today = now.toISOString().split("T")[0]
    if (timeRange === "今日") {
      return records.filter(function(r) { return r.date === today })
    }
    if (timeRange === "本周") {
      const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString().split("T")[0]
      return records.filter(function(r) { return r.date >= weekAgo })
    }
    // 本月：只保留当月记录，自动过滤旧月数据
    var currentMonth = today.slice(0, 7)  // YYYY-MM
    return records.filter(function(r) { return r.date.slice(0, 7) === currentMonth })
  }

  const filtered = getFilteredRecords(data.records)
  const totalTokens = filtered.reduce(function(s, r) { return s + r.totalTokens }, 0)
  const totalRequests = filtered.reduce(function(s, r) { return s + r.requests }, 0)

  // 模型统计
  var modelStats: Record<string, { tokens: number; requests: number }> = {}
  for (var i = 0; i < filtered.length; i++) {
    const m = filtered[i].model
    if (!modelStats[m]) modelStats[m] = { tokens: 0, requests: 0 }
    modelStats[m].tokens += filtered[i].totalTokens
    modelStats[m].requests += filtered[i].requests
  }

  // 每日趋势
  var dailyMap: Record<string, number> = {}
  for (var i = 0; i < filtered.length; i++) {
    dailyMap[filtered[i].date] = (dailyMap[filtered[i].date] || 0) + filtered[i].totalTokens
  }
  const dailyTrend = Object.entries(dailyMap)
    .sort(function(a, b) { return a[0].localeCompare(b[0]) })
    .slice(-7)
    .map(function(e) { return { label: e[0].slice(5), value: e[1] } })

  // 同步数据
  const handleSync = async () => {
    if (!hasCookies()) {
      setSyncStatus("需要先登录...")
      return
    }

    setSyncing(true)
    setSyncStatus("正在验证登录状态...")

    // 先验证 Cookie 是否有效
    let cookieValid = await checkCookieValid()
    if (!cookieValid) {
      // Cookie 过期，尝试自动刷新
      setSyncStatus("Cookie 过期，正在自动刷新...")
      const refreshed = await tryRefreshCookies()
      if (!refreshed) {
        setSyncing(false)
        setIsLoggedIn(false)
        setSyncStatus("⚠️ 自动刷新失败，请手动重新登录")
        return
      }
      // 刷新成功，再次验证
      setSyncStatus("Cookie 已刷新，验证中...")
      cookieValid = await checkCookieValid()
      if (!cookieValid) {
        setSyncing(false)
        setIsLoggedIn(false)
        setSyncStatus("⚠️ 刷新后仍无效，请手动重新登录")
        return
      }
      setSyncStatus("✅ Cookie 已自动刷新")
    }

    setSyncStatus("正在拉取实时数据...")
    const newData = await fetchAllData()
    setSyncing(false)

    if (newData) {
      saveData(newData)
      setData(newData)
      setSyncStatus("✅ 更新于 " + new Date().toLocaleTimeString("zh-CN"))
      // 同步触发 Widget 刷新
      try { Widget.reloadAll() } catch (e) {}
    } else {
      setSyncStatus("❌ 数据拉取失败，请重新登录")
    }
  }

  // 登录按钮
  const handleLogin = async () => {
    setSyncing(true)
    setSyncStatus("正在打开登录页面...")
    const ok = await performLogin()
    setSyncing(false)
    if (ok) {
      setIsLoggedIn(true)
      setSyncStatus("✅ 登录成功！正在拉取数据...")
      // 自动拉取
      handleSync()
    } else {
      setSyncStatus("❌ 登录未完成，请重试")
    }
  }

  // --- 主应用自动刷新定时器（每 5 分钟静默拉取最新数据） ---
  useEffect(function() {
    if (!autoRefresh || !isLoggedIn) return

    const timer = setInterval(async function() {
      // 静默拉取：验证 Cookie → 拉取数据 → 更新 UI
      try {
        if (!hasCookies()) return
        const cookieValid = await checkCookieValid()
        if (!cookieValid) {
          // Cookie 过期，尝试自动刷新一次
          const refreshed = await tryRefreshCookies()
          if (!refreshed) return
        }
        const newData = await fetchAllData()
        if (newData) {
          saveData(newData)
          setData(newData)
          setSyncStatus("🔄 已自动更新 · " + new Date().toLocaleTimeString("zh-CN"))
          try { Widget.reloadAll() } catch (e) {}
        }
      } catch (e) {
        // 静默失败，不打扰用户
      }
    }, APP_REFRESH_MS)

    return function() { clearInterval(timer) }
  }, [autoRefresh, isLoggedIn])

  // 退出登录
  const handleLogout = () => {
    Storage.remove(STORAGE_COOKIES)
    Storage.remove(STORAGE_DATA)
    setIsLoggedIn(false)
    setData(EMPTY_DATA)
    setSyncStatus("已退出登录")
  }

  // 切换自动刷新（控制 Widget 是否定期刷新）
  const toggleAutoRefresh = () => {
    const next = !autoRefresh
    setAutoRefresh(next)
    Storage.set(AUTO_REFRESH_KEY, next ? "1" : "0")
    if (next) {
      try { Widget.reloadAll() } catch (e) {}
      setSyncStatus("✅ 已触发 Widget 刷新")
    }
  }

  // 首次加载
  useEffect(function() {
    // 恢复自动刷新偏好
    const savedPref = Storage.get(AUTO_REFRESH_KEY)
    if (savedPref === "0") setAutoRefresh(false)

    async function initApp() {
      if (hasCookies()) {
        setIsLoggedIn(true)
        const saved = loadData()
        if (saved.records.length > 0) {
          setData(saved)
          setSyncStatus("缓存数据 · " + new Date(saved.lastUpdated).toLocaleTimeString("zh-CN"))
        }
        // 后台验证 Cookie 是否有效
        const cookieValid = await checkCookieValid()
        if (!cookieValid) {
          // Cookie 过期，尝试自动刷新
          setSyncStatus("Cookie 过期，尝试自动刷新...")
          const refreshed = await tryRefreshCookies()
          if (!refreshed) {
            setIsLoggedIn(false)
            setSyncStatus("⚠️ 自动刷新失败，请手动重新登录")
            return
          }
          // 刷新成功，再次验证
          const refreshedValid = await checkCookieValid()
          if (!refreshedValid) {
            setIsLoggedIn(false)
            setSyncStatus("⚠️ 刷新后仍无效，请手动重新登录")
            return
          }
          setSyncStatus("✅ Cookie 已自动刷新")
        }
        // Cookie 有效，自动拉取最新数据
        handleSync()
      } else {
        setSyncStatus("")
      }
    }
    initApp()
  }, [])

  // 刷新时间格式
  const lastUpdated = data.lastUpdated
    ? new Date(data.lastUpdated).toLocaleString("zh-CN", { hour: "2-digit", minute: "2-digit" })
    : "--"

  return (
    <NavigationStack>
      <VStack
        // @ts-ignore
        padding={0}
        spacing={0}
      >
        <ScrollView>
          <VStack
            // @ts-ignore
            padding={{ horizontal: 16, top: 8, bottom: 32 }}
            spacing={20}
          >
            {/* 标题区域 */}
            <HeaderSection validUntil={data.validUntil} />

            {/* 未登录：醒目的登录入口 */}
            {!isLoggedIn ? (
              <VStack
                // @ts-ignore
                background={COLORS.cardBg}
                // @ts-ignore
                cornerRadius={16}
                // @ts-ignore
                padding={28}
                spacing={16}
                alignment="center"
              >
                <Text
                  fontSize={48}
                >
                  🔐
                </Text>
                <Text
                  font="headline"
                  foregroundStyle={COLORS.textPrimary}
                  multilineTextAlignment="center"
                >
                  需要登录小米账号
                </Text>
                <Text
                  fontSize={13}
                  foregroundStyle={COLORS.textSecondary}
                  multilineTextAlignment="center"
                >
                  点击下方按钮打开 MiMo 平台
                </Text>
                <Text
                  fontSize={13}
                  foregroundStyle={COLORS.textSecondary}
                  multilineTextAlignment="center"
                >
                  登录后关闭页面即可拉取数据
                </Text>
                <Button
                  title={syncing ? "⏳ 正在打开..." : "🔑 打开登录页面"}
                  action={handleLogin}
                />
                {syncStatus ? (
                  <Text
                    fontSize={12}
                    foregroundStyle={syncing ? COLORS.blue : COLORS.textTertiary}
                    multilineTextAlignment="center"
                  >
                    {syncStatus}
                  </Text>
                ) : null}
              </VStack>
            ) : null}

            {/* 已登录：同步状态栏 + 自动刷新 */}
            {isLoggedIn ? (
              <>
                <HStack spacing={8}>
                  <Button
                    title={syncing ? "⏳ 同步中..." : "🔄 刷新数据"}
                    action={handleSync}
                  />
                  <Button
                    title={autoRefresh ? "⏱ 自动:开" : "⏱ 自动:关"}
                    action={toggleAutoRefresh}
                  />
                  <Button
                    title="🚪 退出"
                    action={handleLogout}
                  />
                </HStack>
                {syncStatus ? (
                  <Text
                    fontSize={11}
                    foregroundStyle={syncing ? COLORS.blue : COLORS.textTertiary}
                  >
                    {syncStatus}
                  </Text>
                ) : null}
                {autoRefresh ? (
                  <Text
                    fontSize={10}
                    foregroundStyle={COLORS.accent}
                  >
                    主应用每 5 分钟 · Widget 每 15 分钟自动刷新
                  </Text>
                ) : null}
              </>
            ) : null}

            {/* 时间范围选择器 */}
            <TimeRangeSelector selected={timeRange} onSelect={setTimeRange} />

            {/* 核心统计 2x2 */}
            <VStack spacing={10}>
              <HStack spacing={10}>
                <StatCard
                  label={timeRange + " Token"}
                  value={fmt(totalTokens)}
                  subtitle={`${totalRequests} 次请求`}
                  icon="character.textbox"
                  color={COLORS.accent}
                />
                <StatCard
                  label="额度已用"
                  value={fmt(data.creditsUsed)}
                  subtitle={`${Math.round(data.creditsPercent * 100)}% / ${fmt(data.creditsTotal)}`}
                  icon="dollarsign.circle.fill"
                  color={COLORS.green}
                />
              </HStack>
              <HStack spacing={10}>
                <CreditGauge used={data.creditsUsed} total={data.creditsTotal} />
                <CacheHitCard records={filtered} />
              </HStack>
            </VStack>

            {/* @ts-ignore */}
            <Divider background={COLORS.divider} />

            {/* 每日 Token 趋势 */}
            <VStack spacing={12}>
              <HStack spacing={6}>
                <Image
                  systemName="chart.bar.fill"
                  width={16}
                  height={16}
                  foregroundStyle={COLORS.blue}
                />
                <Text
                  font="headline"
                  foregroundStyle={COLORS.textPrimary}
                >
                  每日 Token 趋势
                </Text>
              </HStack>
              <VStack
                // @ts-ignore
                background={COLORS.cardBg}
                // @ts-ignore
                cornerRadius={16}
                // @ts-ignore
                padding={12}
              >
                {dailyTrend.length > 0 ? (
                  <Chart frame={{ height: 160 }}>
                    <BarChart
                      labelOnYAxis={false}
                      marks={dailyTrend.map(function(d, i) {
                        return {
                          label: d.label,
                          value: d.value,
                          foregroundStyle: i === dailyTrend.length - 1 ? "#6366F1" : "rgba(99, 102, 241, 0.4)",
                        }
                      })}
                    />
                  </Chart>
                ) : (
                  <VStack
                    // @ts-ignore
                    padding={40}
                    alignment="center"
                  >
                    <Text
                      fontSize={12}
                      foregroundStyle={COLORS.textTertiary}
                    >
                      暂无数据，点击刷新按钮拉取
                    </Text>
                  </VStack>
                )}
              </VStack>
            </VStack>

            {/* Token 构成 */}
            <TokenBreakdownBar records={filtered} />

            {/* @ts-ignore */}
            <Divider background={COLORS.divider} />

            {/* 模型用量排行 */}
            <VStack spacing={12}>
              <HStack spacing={6}>
                <Image
                  systemName="cpu"
                  width={16}
                  height={16}
                  foregroundStyle={COLORS.orange}
                />
                <Text
                  font="headline"
                  foregroundStyle={COLORS.textPrimary}
                >
                  模型用量排行
                </Text>
                <Spacer />
                <Text
                  fontSize={12}
                  foregroundStyle={COLORS.textTertiary}
                >
                  {Object.keys(modelStats).length} 个模型
                </Text>
              </HStack>

              <VStack
                // @ts-ignore
                background={COLORS.cardBg}
                // @ts-ignore
                cornerRadius={16}
                // @ts-ignore
                padding={14}
                spacing={16}
              >
                {Object.entries(modelStats)
                  .sort(function(a, b) { return b[1].tokens - a[1].tokens })
                  .map(function(entry, idx) {
                    return (
                      <VStack key={entry[0]} spacing={0}>
                        {idx > 0 && (
                          <Divider background={COLORS.divider} />
                        )}
                        <VStack padding={{ top: idx > 0 ? 12 : 0 }}>
                          <ModelRow
                            modelId={entry[0]}
                            tokens={entry[1].tokens}
                            requests={entry[1].requests}
                            totalTokens={totalTokens}
                          />
                        </VStack>
                      </VStack>
                    )
                  })
                }
              </VStack>
            </VStack>

            {/* @ts-ignore */}
            <Divider background={COLORS.divider} />

            {/* 数据来源 */}
            <VStack spacing={6} alignment="center">
              <Text
                fontSize={11}
                foregroundStyle={COLORS.textTertiary}
              >
                数据来源：MiMo 开放平台 · 实时拉取
              </Text>
              <Text
                fontSize={10}
                foregroundStyle={COLORS.textTertiary}
              >
                套餐有效期至 {data.validUntil} · 上次更新 {lastUpdated}
                {autoRefresh ? " · 自动刷新 5 分钟" : ""}
              </Text>
            </VStack>
          </VStack>
        </ScrollView>
      </VStack>
    </NavigationStack>
  )
}

// ============================================================
// 应用入口
// ============================================================
async function run() {
  await Navigation.present({ element: <DashboardView /> })
  Script.exit()
}

run()
