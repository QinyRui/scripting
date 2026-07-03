import { VStack, HStack, Text, Spacer, Widget, fetch, Canvas } from "scripting"

// ============================================================
// 桌面组件 v12
// 左右分栏：左=圆环仪表盘，右=标题+图例
// 仿图5模板，深色主题
// ============================================================

const isTransparent = Widget.isTransparentBackground

const C = {
  bg: isTransparent ? "clear" : "#0D1117",
  card: isTransparent ? "rgba(255,255,255,0.08)" : "#161B22",
  ringBg: isTransparent ? "rgba(255,255,255,0.06)" : "#1C2128",
  cyan: "#00E5FF",
  green: "#00E676",
  yellow: "#FFD600",
  purple: "#B388FF",
  blue: "#448AFF",
  text: "#FFFFFF",
  muted: "#8B949E",
  dim: "#484F58",
  sep: isTransparent ? "rgba(255,255,255,0.08)" : "#21262D",
}

function fmt(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B"
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M"
  if (n >= 1e3) return (n / 1e3).toFixed(0) + "K"
  return n.toString()
}

// 额度专用格式化（亿为单位）
function fmtQ(n: number): string {
  if (n >= 1e8) return (n / 1e8).toFixed(1) + "亿"
  return fmt(n)
}

interface PlatformRecord {
  date: string; model: string; totalTokens: number
  inputCacheHit: number; inputCacheMiss: number; outputTokens: number; requests: number
}
interface PlatformData {
  creditsUsed: number; creditsTotal: number; creditsPercent: number
  totalTokens: number; totalRequests: number
  planName: string; validUntil: string
  records: PlatformRecord[]; lastUpdated: string
}

var STORAGE_DATA = "tokei_mimo_realtime"
var STORAGE_COOKIES = "tokei_mimo_cookies"
var STORAGE_TIME_RANGE = "tokei_mimo_time_range"  // 主应用选择的时间范围
var MIMO_BASE = "https://platform.xiaomimimo.com"

// 时间范围配置（必须与主应用 index.tsx 中的 TIME_RANGES 完全一致）
var TIME_RANGES = ["今日", "本周", "本月"]
var DEFAULT_TIME_RANGE = "本月"

function loadTimeRange(): string {
  try {
    var raw = Storage.get(STORAGE_TIME_RANGE) as string
    if (raw && TIME_RANGES.indexOf(raw) >= 0) return raw
  } catch (e) {}
  return DEFAULT_TIME_RANGE
}

var EMPTY: PlatformData = {
  creditsUsed: 0, creditsTotal: 11e9, creditsPercent: 0,
  totalTokens: 0, totalRequests: 0,
  planName: "Standard", validUntil: "--",
  records: [], lastUpdated: "",
}

function loadData(): PlatformData {
  try {
    var raw = Storage.get(STORAGE_DATA) as string
    if (raw) return JSON.parse(raw) as PlatformData
  } catch (e) {}
  return EMPTY
}

function saveData(d: PlatformData) {
  try { Storage.set(STORAGE_DATA, JSON.stringify(d)) } catch (e) {}
}

function loadCookieStr(): string {
  try {
    var raw = Storage.get(STORAGE_COOKIES)
    if (raw) return raw as string
  } catch (e) {}
  return ""
}

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

/**
 * 拉取当月每日用量明细（POST /api/v1/usage/token-plan/list）
 * 不依赖 WebView，直接用 cookie 中的 api-platform_ph 作为查询参数
 * 桌面 Widget 必须能独立拉到 records，否则今日数据全 0
 */
async function fetchUsageRecords(): Promise<PlatformRecord[]> {
  var cookieStr = loadCookieStr()
  if (!cookieStr) return []

  // 从 cookie 中提取 api-platform_ph（去引号包裹）
  var phValue = getCookieValue(cookieStr, "api-platform_ph")
  if (phValue && (phValue.startsWith('"') || phValue.startsWith("'"))) {
    phValue = phValue.replace(/^["']|["']$/g, '')
  }
  if (!phValue) return []

  try {
    var now = new Date()
    var year = now.getFullYear()
    var month = now.getMonth() + 1
    var url = MIMO_BASE + "/api/v1/usage/token-plan/list?api-platform_ph=" + encodeURIComponent(phValue)
    var res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Cookie": cookieStr,
      },
      body: JSON.stringify({ year: year, month: month }),
    })
    var json = await res.json()
    if (!json || json.code !== 0) return []

    var items: any[] = []
    var payload: any = json.data
    if (Array.isArray(payload)) {
      items = payload
    } else if (payload && Array.isArray(payload.items)) {
      items = payload.items
    }
    if (items.length === 0) return []

    var today = now.toISOString().split("T")[0]
    return items.map(function(item: any): PlatformRecord {
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
  } catch (e) {}
  return []
}

async function fetchFreshCredits(data: PlatformData): Promise<PlatformData> {
  var cookieStr = loadCookieStr()
  if (!cookieStr) return data
  try {
    var results = await Promise.all([
      fetch(MIMO_BASE + "/api/v1/tokenPlan/usage", {
        headers: { "Accept": "application/json", "Cookie": cookieStr }
      }).then(function(r: any) { return r.json() }).catch(function() { return null }),
      fetch(MIMO_BASE + "/api/v1/tokenPlan/detail", {
        headers: { "Accept": "application/json", "Cookie": cookieStr }
      }).then(function(r: any) { return r.json() }).catch(function() { return null }),
    ])
    var usageResp = results[0]
    var detailResp = results[1]
    if (usageResp && usageResp.code === 0 && usageResp.data) {
      var mu = usageResp.data.monthUsage
      if (mu && mu.items && mu.items.length > 0) {
        data.creditsUsed = mu.items[0].used || 0
        data.creditsTotal = mu.items[0].limit || 11e9
        data.creditsPercent = mu.items[0].percent || 0
      }
    }
    if (detailResp && detailResp.code === 0 && detailResp.data) {
      data.planName = detailResp.data.planName || data.planName
      data.validUntil = (detailResp.data.currentPeriodEnd || data.validUntil).split(" ")[0]
    }
    // 拉取每日 records（修复桌面 widget 今日明细全为 0 的问题）
    var records = await fetchUsageRecords()
    if (records.length > 0) {
      data.records = records
    }
    data.lastUpdated = new Date().toISOString()
    saveData(data)
  } catch (e) {}
  return data
}

async function main() {
  var data = loadData()
  try { data = await fetchFreshCredits(data) } catch (e) {}

  // 读取主应用当前选择的时间范围（联动同步）
  var timeRange = loadTimeRange()

  var now = new Date()
  var today = now.toISOString().split("T")[0]

  // 与主应用 index.tsx getFilteredRecords 保持完全一致的筛选逻辑
  var filteredRecords: PlatformRecord[]
  if (timeRange === "今日") {
    filteredRecords = data.records.filter(function(r: PlatformRecord) { return r.date === today })
  } else if (timeRange === "本周") {
    var weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString().split("T")[0]
    filteredRecords = data.records.filter(function(r: PlatformRecord) { return r.date >= weekAgo })
  } else {
    // 本月：只保留当月记录，自动过滤旧月数据
    var currentMonth = today.slice(0, 7)
    filteredRecords = data.records.filter(function(r: PlatformRecord) { return r.date.slice(0, 7) === currentMonth })
  }

  // 找出该范围内请求次数最多的模型（用于顶栏副标题）
  var modelMap: { [key: string]: number } = {}
  filteredRecords.forEach(function(r: PlatformRecord) {
    modelMap[r.model] = (modelMap[r.model] || 0) + r.requests
  })

  var topModel = ""
  var topReqCount = 0
  for (var m in modelMap) {
    if (modelMap[m] > topReqCount) {
      topModel = m
      topReqCount = modelMap[m]
    }
  }

  // 汇总该时间范围内的 Token 数据
  var todayHit = filteredRecords.reduce(function(s: number, r: PlatformRecord) { return s + r.inputCacheHit }, 0)
  var todayMiss = filteredRecords.reduce(function(s: number, r: PlatformRecord) { return s + r.inputCacheMiss }, 0)
  var todayOut = filteredRecords.reduce(function(s: number, r: PlatformRecord) { return s + r.outputTokens }, 0)
  var todayRequests = filteredRecords.reduce(function(s: number, r: PlatformRecord) { return s + r.requests }, 0)

  var creditPct = data.creditsTotal > 0 ? Math.round((data.creditsUsed / data.creditsTotal) * 100) : 0
  var totalInput = todayHit + todayMiss
  var cachePct = totalInput > 0 ? Math.round((todayHit / totalInput) * 100) : 0

  var syncTime = data.lastUpdated
    ? new Date(data.lastUpdated).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
    : "--:--"

  // 顶部主标题随主应用切换：今日用量 / 本周用量 / 本月用量
  var titleText = timeRange + "用量"

  // 模型名映射（与主应用 index.tsx MODELS 保持一致）
  var MODEL_NAMES: { [key: string]: string } = {
    "mimo-v2.5": "MiMo V2.5",
    "mimo-v2-pro": "MiMo V2 Pro",
    "mimo-v2-omni": "MiMo V2 Omni",
  }
  var topModelLabel = topModel ? (MODEL_NAMES[topModel] || topModel) : ""

  // 日均数据（大号组件柱状图用）
  var dayMap: { [key: string]: number } = {}
  filteredRecords.forEach(function(r: PlatformRecord) {
    dayMap[r.date] = (dayMap[r.date] || 0) + r.totalTokens
  })
  var dayKeys = Object.keys(dayMap).sort()
  var maxDayTokens = 0
  dayKeys.forEach(function(k) { if (dayMap[k] > maxDayTokens) maxDayTokens = dayMap[k] })

  // 模型排行数据
  var modelStats: { model: string; tokens: number; requests: number }[] = []
  var modelAgg: { [key: string]: { tokens: number; requests: number } } = {}
  filteredRecords.forEach(function(r: PlatformRecord) {
    if (!modelAgg[r.model]) modelAgg[r.model] = { tokens: 0, requests: 0 }
    modelAgg[r.model].tokens += r.totalTokens
    modelAgg[r.model].requests += r.requests
  })
  for (var mk in modelAgg) {
    modelStats.push({ model: mk, tokens: modelAgg[mk].tokens, requests: modelAgg[mk].requests })
  }
  modelStats.sort(function(a, b) { return b.tokens - a.tokens })
  var totalModelTokens = modelStats.reduce(function(s, m) { return s + m.tokens }, 0)

  // ============================================================
  // 渲染 — 根据 Widget.family 区分大号/中号
  // ============================================================
  var isLarge = Widget.family === "systemLarge"

  if (isLarge) {
    // ====== 大号组件：竖向布局 ======
    Widget.present(
      <VStack
        // @ts-ignore
        background="clear"
        // @ts-ignore
        padding={0}
        spacing={0}
      >
        {/* 内容区域，带内边距 */}
        <VStack
          // @ts-ignore
          padding={{ top: 12, bottom: 8, leading: 12, trailing: 12 }}
          spacing={0}
        >
        {/* ====== 顶部栏：标题 + 模型 + 更新时间 ====== */}
        <HStack spacing={0}>
          <Text
            // @ts-ignore
            fontSize={15}
            font="headline"
            // @ts-ignore
            foregroundStyle={C.text}
          >{titleText}</Text>
          <Spacer />
          <VStack spacing={1} alignment="trailing">
            {topModelLabel ? (
              <Text
                // @ts-ignore
                fontSize={10}
                // @ts-ignore
                foregroundStyle={C.muted}
                // @ts-ignore
                lineLimit={1}
              >{topModelLabel}</Text>
            ) : null}
            <Text
              // @ts-ignore
              fontSize={9}
              // @ts-ignore
              foregroundStyle={C.dim}
            >{syncTime}</Text>
          </VStack>
        </HStack>

        {/* 额度使用量 */}
        <HStack spacing={6}>
          <Text
            // @ts-ignore
            fontSize={12}
            font="headline"
            // @ts-ignore
            foregroundStyle={C.cyan}
          >{fmtQ(data.creditsUsed)}</Text>
          <Text
            // @ts-ignore
            fontSize={11}
            // @ts-ignore
            foregroundStyle={C.muted}
          >/ {fmtQ(data.creditsTotal)}</Text>
          <Spacer />
          <Text
            // @ts-ignore
            fontSize={11}
            // @ts-ignore
            foregroundStyle={C.muted}
          >{creditPct}%</Text>
        </HStack>
        {/* 额度进度条 */}
        <VStack
          // @ts-ignore
          frame={{ width: "100%", height: 4 }}
          // @ts-ignore
          background={C.ringBg}
          // @ts-ignore
          cornerRadius={2}
          // @ts-ignore
          padding={{ top: 3, bottom: 3 }}
        >
          <VStack
            // @ts-ignore
            frame={{ width: creditPct + "%", height: "100%" }}
            // @ts-ignore
            background={C.cyan}
            // @ts-ignore
            cornerRadius={2}
          />
        </VStack>

        {/* ====== 柱状图区域 ====== */}
        <Canvas
          // @ts-ignore
          frame={{ width: "100%", height: 110 }}
          // @ts-ignore
          opaque={false}
          draw={function(ctx: any, size: any) {
            ctx.clearRect(0, 0, size.width, size.height)
            if (dayKeys.length === 0) return
            var pad = 16
            var chartW = size.width - pad * 2
            var chartH = size.height - 22
            var barW = Math.min(24, (chartW - (dayKeys.length - 1) * 4) / dayKeys.length)
            var gap = dayKeys.length > 1 ? (chartW - barW * dayKeys.length) / (dayKeys.length - 1) : 0
            // Y轴参考线
            ctx.strokeStyle = C.dim
            ctx.lineWidth = 0.5
            for (var li = 0; li <= 3; li++) {
              var ly = pad + chartH * (1 - li / 3)
              ctx.beginPath()
              ctx.moveTo(pad, ly)
              ctx.lineTo(size.width - pad, ly)
              ctx.stroke()
              // 标签
              ctx.fillStyle = C.dim
              ctx.font = "8px system"
              ctx.textAlign = "left"
              ctx.textBaseline = "middle"
              var labelVal = Math.round((maxDayTokens / 3) * li)
              ctx.fillText(fmt(labelVal), 0, ly)
            }
            // 画柱子
            dayKeys.forEach(function(date, i) {
              var val = dayMap[date]
              var barH = maxDayTokens > 0 ? (val / maxDayTokens) * chartH : 0
              var x = pad + i * (barW + gap)
              var y = pad + chartH - barH
              // 渐变填充
              var grad = ctx.createLinearGradient(x, y, x, pad + chartH)
              grad.addColorStop(0, C.cyan)
              grad.addColorStop(1, "rgba(0,229,255,0.3)")
              ctx.fillStyle = grad
              // 圆角顶部
              var cr = Math.min(3, barW / 2)
              ctx.beginPath()
              ctx.moveTo(x, pad + chartH)
              ctx.lineTo(x, y + cr)
              ctx.quadraticCurveTo(x, y, x + cr, y)
              ctx.lineTo(x + barW - cr, y)
              ctx.quadraticCurveTo(x + barW, y, x + barW, y + cr)
              ctx.lineTo(x + barW, pad + chartH)
              ctx.closePath()
              ctx.fill()
              // 日期标签
              ctx.fillStyle = C.dim
              ctx.font = "8px system"
              ctx.textAlign = "center"
              ctx.textBaseline = "top"
              var shortDate = date.slice(5)  // MM-DD
              ctx.fillText(shortDate, x + barW / 2, pad + chartH + 4)
            })
          }}
        />

        {/* ====== Token 构成 ====== */}
        <HStack spacing={0}>
          <Text
            // @ts-ignore
            fontSize={12}
            font="headline"
            // @ts-ignore
            foregroundStyle={C.text}
          >Token 构成</Text>
          <Spacer />
          <Text
            // @ts-ignore
            fontSize={10}
            // @ts-ignore
            foregroundStyle={C.muted}
          >{fmt(totalInput + todayOut)} 总计</Text>
        </HStack>

        {/* 请求次数 */}
        <HStack spacing={6}>
          <VStack
            // @ts-ignore
            frame={{ width: 8, height: 8 }}
            // @ts-ignore
            background={C.cyan}
            // @ts-ignore
            cornerRadius={2}
          />
          <Text
            // @ts-ignore
            fontSize={11}
            // @ts-ignore
            foregroundStyle={C.muted}
          >请求次数</Text>
          <Spacer />
          <Text
            // @ts-ignore
            fontSize={11}
            // @ts-ignore
            foregroundStyle={C.text}
          >{fmt(todayRequests)}</Text>
        </HStack>

        {/* 缓存命中输入 */}
        <HStack spacing={6}>
          <VStack
            // @ts-ignore
            frame={{ width: 8, height: 8 }}
            // @ts-ignore
            background={C.blue}
            // @ts-ignore
            cornerRadius={2}
          />
          <Text
            // @ts-ignore
            fontSize={11}
            // @ts-ignore
            foregroundStyle={C.muted}
          >缓存命中输入</Text>
          <Spacer />
          <Text
            // @ts-ignore
            fontSize={11}
            // @ts-ignore
            foregroundStyle={C.text}
          >{fmt(todayHit)}</Text>
        </HStack>

        {/* 未命中缓存输入 */}
        <HStack spacing={6}>
          <VStack
            // @ts-ignore
            frame={{ width: 8, height: 8 }}
            // @ts-ignore
            background={C.purple}
            // @ts-ignore
            cornerRadius={2}
          />
          <Text
            // @ts-ignore
            fontSize={11}
            // @ts-ignore
            foregroundStyle={C.muted}
          >未命中缓存输入</Text>
          <Spacer />
          <Text
            // @ts-ignore
            fontSize={11}
            // @ts-ignore
            foregroundStyle={C.text}
          >{fmt(todayMiss)}</Text>
        </HStack>

        {/* 输出 Token */}
        <HStack spacing={6}>
          <VStack
            // @ts-ignore
            frame={{ width: 8, height: 8 }}
            // @ts-ignore
            background={C.green}
            // @ts-ignore
            cornerRadius={2}
          />
          <Text
            // @ts-ignore
            fontSize={11}
            // @ts-ignore
            foregroundStyle={C.muted}
          >输出 Token</Text>
          <Spacer />
          <Text
            // @ts-ignore
            fontSize={11}
            // @ts-ignore
            foregroundStyle={C.text}
          >{fmt(todayOut)}</Text>
        </HStack>

        {/* 分隔线 */}
        <VStack
          // @ts-ignore
          frame={{ width: "100%", height: 1 }}
          // @ts-ignore
          background={C.sep}
          // @ts-ignore
          padding={{ top: 6, bottom: 6 }}
        />

        {/* ====== 模型用量排行 ====== */}
        <HStack spacing={0}>
          <Text
            // @ts-ignore
            fontSize={12}
            font="headline"
            // @ts-ignore
            foregroundStyle={C.text}
          >模型用量排行</Text>
          <Spacer />
          <Text
            // @ts-ignore
            fontSize={10}
            // @ts-ignore
            foregroundStyle={C.muted}
          >{modelStats.length} 个模型</Text>
        </HStack>

        {modelStats.length > 0 ? modelStats.map(function(ms: any) {
          var pct = totalModelTokens > 0 ? Math.round((ms.tokens / totalModelTokens) * 100) : 0
          var shortVer = MODEL_NAMES[ms.model] ? MODEL_NAMES[ms.model].replace("MiMo ", "") : ms.model
          return (
            <VStack spacing={2} key={ms.model}>
              <HStack spacing={6}>
                <VStack
                  // @ts-ignore
                  background={C.green}
                  // @ts-ignore
                  cornerRadius={3}
                  // @ts-ignore
                  padding={{ top: 1, bottom: 1, leading: 4, trailing: 4 }}
                  alignment="center"
                >
                  <Text
                    // @ts-ignore
                    fontSize={8}
                    // @ts-ignore
                    foregroundStyle="#000"
                    font="caption2"
                  >{shortVer}</Text>
                </VStack>
                <Text
                  // @ts-ignore
                  fontSize={11}
                  font="headline"
                  // @ts-ignore
                  foregroundStyle={C.text}
                >{MODEL_NAMES[ms.model] || ms.model}</Text>
                <Spacer />
                <Text
                  // @ts-ignore
                  fontSize={11}
                  // @ts-ignore
                  foregroundStyle={C.green}
                >{pct}%</Text>
              </HStack>
              {/* 进度条 */}
              <VStack
                // @ts-ignore
                frame={{ width: "100%", height: 3 }}
                // @ts-ignore
                background={C.ringBg}
                // @ts-ignore
                cornerRadius={1.5}
              >
                <VStack
                  // @ts-ignore
                  frame={{ width: pct + "%", height: "100%" }}
                  // @ts-ignore
                  background={C.green}
                  // @ts-ignore
                  cornerRadius={1.5}
                />
              </VStack>
            </VStack>
          )
        }) : (
          <Text
            // @ts-ignore
            fontSize={10}
            // @ts-ignore
            foregroundStyle={C.dim}
          >暂无数据</Text>
        )}
        </VStack>
      </VStack>,
      { policy: "after", date: new Date(Date.now() + 15 * 60 * 1000) }
    )
  } else {
    // ====== 中号组件：左右分栏 ======
    Widget.present(
      <HStack
        // @ts-ignore
        background="clear"
        // @ts-ignore
        padding={0}
        spacing={0}
      >
      {/* ====== 左栏：圆环 + 品牌 ====== */}
      <VStack
        // @ts-ignore
        frame={{ width: 100 }}
        // @ts-ignore
        background="clear"
        // @ts-ignore
        padding={{ top: 8, bottom: 6, leading: 6, trailing: 4 }}
        spacing={2}
        alignment="center"
      >
        <Canvas
          // @ts-ignore
          frame={{ width: 80, height: 80 }}
          // @ts-ignore
          opaque={false}
          draw={function(ctx: any, size: any) {
            // 清空画布，确保完全透明
            ctx.clearRect(0, 0, size.width, size.height)
            var cx = size.width / 2
            var cy = size.height / 2

            // 外环：额度（仅进度弧）
            var r1 = 35
            var e1 = -Math.PI / 2 + (creditPct / 100) * Math.PI * 2
            ctx.beginPath()
            ctx.arc(cx, cy, r1, -Math.PI / 2, e1)
            ctx.strokeStyle = C.cyan
            ctx.lineWidth = 6
            ctx.lineCap = "round"
            ctx.stroke()

            // 中环：缓存（仅进度弧）
            var r2 = 27
            var ca = (cachePct / 100) * Math.PI * 2
            ctx.beginPath()
            ctx.arc(cx, cy, r2, -Math.PI / 2, -Math.PI / 2 + ca)
            ctx.strokeStyle = C.green
            ctx.lineWidth = 5
            ctx.lineCap = "round"
            ctx.stroke()

            // 内环：输出占比（仅进度弧）
            var r3 = 20
            var outPct = totalInput > 0 ? (todayOut / (totalInput + todayOut)) * 100 : 0
            var oa = (outPct / 100) * Math.PI * 2
            ctx.beginPath()
            ctx.arc(cx, cy, r3, -Math.PI / 2, -Math.PI / 2 + oa)
            ctx.strokeStyle = C.yellow
            ctx.lineWidth = 4
            ctx.lineCap = "round"
            ctx.stroke()

            // 中心数字
            ctx.fillStyle = C.text
            ctx.font = "bold 16px system"
            ctx.textAlign = "center"
            ctx.textBaseline = "middle"
            ctx.fillText(creditPct + "%", cx, cy)
          }}
        />
        <Text
          // @ts-ignore
          fontSize={7}
          // @ts-ignore
          foregroundStyle={C.muted}
        >{fmtQ(data.creditsUsed)}/{fmtQ(data.creditsTotal)}</Text>
      </VStack>

      {/* ====== 右栏：标题 + 图例 ====== */}
      <VStack
        // @ts-ignore
        frame={{ width: "100%" }}
        // @ts-ignore
        padding={{ top: 6, bottom: 6, leading: 6, trailing: 10 }}
        spacing={0}
      >
        {/* 标题行：今日用量/本周用量/本月用量 + 同步时间 */}
        <HStack spacing={0}>
          <Text
            // @ts-ignore
            fontSize={12}
            font="headline"
            // @ts-ignore
            foregroundStyle={C.text}
            // @ts-ignore
            lineLimit={1}
          >{titleText}</Text>
          <Spacer />
          <Text
            // @ts-ignore
            fontSize={7}
            // @ts-ignore
            foregroundStyle={C.dim}
          >{syncTime}</Text>
        </HStack>

        {/* 模型名称 */}
        {topModelLabel ? (
          <Text
            // @ts-ignore
            fontSize={8}
            // @ts-ignore
            foregroundStyle={C.muted}
            // @ts-ignore
            lineLimit={1}
          >{topModelLabel}</Text>
        ) : null}

        {/* 间隔 */}
        <VStack
          // @ts-ignore
          frame={{ width: "100%", height: 1 }}
          // @ts-ignore
          background={C.sep}
          // @ts-ignore
          padding={{ top: 3, bottom: 3 }}
        />

        {/* 图例0：请求次数 */}
        <HStack spacing={4}>
          <VStack
            // @ts-ignore
            frame={{ width: 5, height: 5 }}
            // @ts-ignore
            background={C.cyan}
            // @ts-ignore
            cornerRadius={2.5}
          />
          <Text
            // @ts-ignore
            fontSize={8}
            // @ts-ignore
            foregroundStyle={C.muted}
          >请求</Text>
          <Spacer />
          <Text
            // @ts-ignore
            fontSize={10}
            font="headline"
            // @ts-ignore
            foregroundStyle={C.text}
          >{fmt(todayRequests)}</Text>
        </HStack>

        <VStack
          // @ts-ignore
          frame={{ width: "100%", height: 1 }}
          // @ts-ignore
          background={C.sep}
          // @ts-ignore
          padding={{ top: 2, bottom: 2 }}
        />

        {/* 图例1：缓存命中 */}
        <HStack spacing={4}>
          <VStack
            // @ts-ignore
            frame={{ width: 5, height: 5 }}
            // @ts-ignore
            background={C.blue}
            // @ts-ignore
            cornerRadius={2.5}
          />
          <Text
            // @ts-ignore
            fontSize={8}
            // @ts-ignore
            foregroundStyle={C.muted}
          >缓存命中</Text>
          <Spacer />
          <Text
            // @ts-ignore
            fontSize={10}
            font="headline"
            // @ts-ignore
            foregroundStyle={C.text}
          >{fmt(todayHit)}</Text>
        </HStack>

        <VStack
          // @ts-ignore
          frame={{ width: "100%", height: 1 }}
          // @ts-ignore
          background={C.sep}
          // @ts-ignore
          padding={{ top: 2, bottom: 2 }}
        />

        {/* 图例2：未命中 */}
        <HStack spacing={4}>
          <VStack
            // @ts-ignore
            frame={{ width: 5, height: 5 }}
            // @ts-ignore
            background={C.purple}
            // @ts-ignore
            cornerRadius={2.5}
          />
          <Text
            // @ts-ignore
            fontSize={8}
            // @ts-ignore
            foregroundStyle={C.muted}
          >未命中</Text>
          <Spacer />
          <Text
            // @ts-ignore
            fontSize={10}
            font="headline"
            // @ts-ignore
            foregroundStyle={C.text}
          >{fmt(todayMiss)}</Text>
        </HStack>

        <VStack
          // @ts-ignore
          frame={{ width: "100%", height: 1 }}
          // @ts-ignore
          background={C.sep}
          // @ts-ignore
          padding={{ top: 2, bottom: 2 }}
        />

        {/* 图例3：输出 */}
        <HStack spacing={4}>
          <VStack
            // @ts-ignore
            frame={{ width: 5, height: 5 }}
            // @ts-ignore
            background={C.green}
            // @ts-ignore
            cornerRadius={2.5}
          />
          <Text
            // @ts-ignore
            fontSize={8}
            // @ts-ignore
            foregroundStyle={C.muted}
          >输出</Text>
          <Spacer />
          <Text
            // @ts-ignore
            fontSize={10}
            font="headline"
            // @ts-ignore
            foregroundStyle={C.text}
          >{fmt(todayOut)}</Text>
        </HStack>
      </VStack>
    </HStack>,
    { policy: "after", date: new Date(Date.now() + 15 * 60 * 1000) }
    )
  }
}

main()
