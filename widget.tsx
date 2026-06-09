import { VStack, HStack, Text, Spacer, Widget, fetch, Canvas } from "scripting"

// ============================================================
// Tokei 時計 — 桌面组件 v12
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
var MIMO_BASE = "https://platform.xiaomimimo.com"

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
    data.lastUpdated = new Date().toISOString()
    saveData(data)
  } catch (e) {}
  return data
}

async function main() {
  var data = loadData()
  try { data = await fetchFreshCredits(data) } catch (e) {}

  var now = new Date()
  var today = now.toISOString().split("T")[0]
  var todayRecords = data.records.filter(function(r: PlatformRecord) { return r.date === today })

  // 找出今日请求次数最多的模型
  var modelMap: { [key: string]: number } = {}
  todayRecords.forEach(function(r: PlatformRecord) {
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

  // 仅使用该模型的数据
  var modelRecords = topModel
    ? todayRecords.filter(function(r: PlatformRecord) { return r.model === topModel })
    : todayRecords
  var todayTokens = modelRecords.reduce(function(s: number, r: PlatformRecord) { return s + r.totalTokens }, 0)
  var todayHit = modelRecords.reduce(function(s: number, r: PlatformRecord) { return s + r.inputCacheHit }, 0)
  var todayMiss = modelRecords.reduce(function(s: number, r: PlatformRecord) { return s + r.inputCacheMiss }, 0)
  var todayOut = modelRecords.reduce(function(s: number, r: PlatformRecord) { return s + r.outputTokens }, 0)
  var todayRequests = modelRecords.reduce(function(s: number, r: PlatformRecord) { return s + r.requests }, 0)

  var creditPct = data.creditsTotal > 0 ? Math.round((data.creditsUsed / data.creditsTotal) * 100) : 0
  var totalInput = todayHit + todayMiss
  var cachePct = totalInput > 0 ? Math.round((todayHit / totalInput) * 100) : 0

  var syncTime = data.lastUpdated
    ? new Date(data.lastUpdated).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
    : "--:--"

  // ============================================================
  // 渲染 — 左右分栏
  // ============================================================
  Widget.present(
    <HStack
      // @ts-ignore
      background={C.bg}
      // @ts-ignore
      cornerRadius={isTransparent ? 0 : 22}
      // @ts-ignore
      padding={0}
      spacing={0}
    >
      {/* ====== 左栏：圆环 + 品牌 ====== */}
      <VStack
        // @ts-ignore
        frame={{ width: 130 }}
        // @ts-ignore
        background="clear"
        // @ts-ignore
        padding={{ top: 12, bottom: 10, leading: 10, trailing: 6 }}
        spacing={4}
        alignment="center"
      >
        <Canvas
          // @ts-ignore
          frame={{ width: 100, height: 100 }}
          // @ts-ignore
          opaque={false}
          draw={function(ctx: any, size: any) {
            // 清空画布，确保完全透明
            ctx.clearRect(0, 0, size.width, size.height)
            var cx = size.width / 2
            var cy = size.height / 2

            // 外环：额度（仅进度弧）
            var r1 = 46
            var e1 = -Math.PI / 2 + (creditPct / 100) * Math.PI * 2
            ctx.beginPath()
            ctx.arc(cx, cy, r1, -Math.PI / 2, e1)
            ctx.strokeStyle = C.cyan
            ctx.lineWidth = 7
            ctx.lineCap = "round"
            ctx.stroke()

            // 中环：缓存（仅进度弧）
            var r2 = 37
            var ca = (cachePct / 100) * Math.PI * 2
            ctx.beginPath()
            ctx.arc(cx, cy, r2, -Math.PI / 2, -Math.PI / 2 + ca)
            ctx.strokeStyle = C.green
            ctx.lineWidth = 6
            ctx.lineCap = "round"
            ctx.stroke()

            // 内环：输出占比（仅进度弧）
            var r3 = 29
            var outPct = totalInput > 0 ? (todayOut / (totalInput + todayOut)) * 100 : 0
            var oa = (outPct / 100) * Math.PI * 2
            ctx.beginPath()
            ctx.arc(cx, cy, r3, -Math.PI / 2, -Math.PI / 2 + oa)
            ctx.strokeStyle = C.yellow
            ctx.lineWidth = 5
            ctx.lineCap = "round"
            ctx.stroke()

            // 中心数字
            ctx.fillStyle = C.text
            ctx.font = "bold 22px system"
            ctx.textAlign = "center"
            ctx.textBaseline = "middle"
            ctx.fillText(creditPct + "%", cx, cy)
          }}
        />
        <Text
          // @ts-ignore
          fontSize={8}
          // @ts-ignore
          foregroundStyle={C.muted}
        >{fmtQ(data.creditsUsed)}/{fmtQ(data.creditsTotal)}</Text>
      </VStack>

      {/* ====== 右栏：标题 + 图例 ====== */}
      <VStack
        // @ts-ignore
        frame={{ width: "100%" }}
        // @ts-ignore
        padding={{ top: 12, bottom: 12, leading: 8, trailing: 14 }}
        spacing={0}
      >
        {/* 标题行：模型名 + 同步时间 */}
        <HStack spacing={0}>
          <Text
            // @ts-ignore
            fontSize={13}
            font="headline"
            // @ts-ignore
            foregroundStyle={C.text}
            // @ts-ignore
            lineLimit={1}
          >{topModel || "TOKEN 用量"}</Text>
          <Spacer />
          <VStack
            // @ts-ignore
            background={C.card}
            // @ts-ignore
            cornerRadius={8}
            // @ts-ignore
            padding={{ top: 4, bottom: 4, leading: 8, trailing: 8 }}
            alignment="center"
          >
            <Text
              // @ts-ignore
              fontSize={8}
              // @ts-ignore
              foregroundStyle={C.muted}
            >{syncTime}</Text>
          </VStack>
        </HStack>

        {/* 间隔 */}
        <VStack
          // @ts-ignore
          frame={{ width: "100%", height: 1 }}
          // @ts-ignore
          background={C.sep}
          // @ts-ignore
          padding={{ top: 6, bottom: 6 }}
        />

        {/* 图例0：请求次数 */}
        <HStack spacing={6}>
          <VStack
            // @ts-ignore
            frame={{ width: 7, height: 7 }}
            // @ts-ignore
            background={C.cyan}
            // @ts-ignore
            cornerRadius={3.5}
          />
          <Text
            // @ts-ignore
            fontSize={10}
            // @ts-ignore
            foregroundStyle={C.muted}
          >请求次数</Text>
          <Spacer />
          <Text
            // @ts-ignore
            fontSize={11}
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
          padding={{ top: 6, bottom: 6 }}
        />

        {/* 图例1：缓存命中 */}
        <HStack spacing={6}>
          <VStack
            // @ts-ignore
            frame={{ width: 7, height: 7 }}
            // @ts-ignore
            background={C.blue}
            // @ts-ignore
            cornerRadius={3.5}
          />
          <Text
            // @ts-ignore
            fontSize={10}
            // @ts-ignore
            foregroundStyle={C.muted}
          >缓存命中</Text>
          <Spacer />
          <Text
            // @ts-ignore
            fontSize={11}
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
          padding={{ top: 6, bottom: 6 }}
        />

        {/* 图例2：未命中 */}
        <HStack spacing={6}>
          <VStack
            // @ts-ignore
            frame={{ width: 7, height: 7 }}
            // @ts-ignore
            background={C.purple}
            // @ts-ignore
            cornerRadius={3.5}
          />
          <Text
            // @ts-ignore
            fontSize={10}
            // @ts-ignore
            foregroundStyle={C.muted}
          >未命中</Text>
          <Spacer />
          <Text
            // @ts-ignore
            fontSize={11}
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
          padding={{ top: 6, bottom: 6 }}
        />

        {/* 图例3：输出 */}
        <HStack spacing={6}>
          <VStack
            // @ts-ignore
            frame={{ width: 7, height: 7 }}
            // @ts-ignore
            background={C.green}
            // @ts-ignore
            cornerRadius={3.5}
          />
          <Text
            // @ts-ignore
            fontSize={10}
            // @ts-ignore
            foregroundStyle={C.muted}
          >输出</Text>
          <Spacer />
          <Text
            // @ts-ignore
            fontSize={11}
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

main()
