/**
 * 🌀 彩云天气 — 台风实时监控页面（仅主应用）
 * 数据源：istrongcloud 台风可视化 API
 */
import {
  Text,
  VStack,
  HStack,
  Spacer,
  Image,
  List,
  Section,
  Navigation,
  NavigationStack,
  ZStack,
  Circle,
  Button,
  Divider,
  fetch,
  Script,
  useState,
} from "scripting"

declare const FileManager: any

// ─── 常量 ───
const HOME_URL = "https://tf02.istrongcloud.com/member/v1.2/home"
const TC_URL = "https://tf02.istrongcloud.com/data/enComplex2/currMergerTC.json"
const LATEST_URL = "https://data.istrongcloud.com/data/latest.json"
const MAP_URLS = [
  "https://upy.istrongcloud.com/applet/typhoon/screenshot/wxPosterAll.png",
  "https://tf.istrongcloud.com/tcScreenshot/active/poster/result.png",
]

// ─── 类型 ───
interface TyphoonPoint {
  time: string
  lon: number
  lat: number
  speed: number
  power: number
  pressure: number
  strong: string
  radius7?: number
  radius10?: number
  radius12?: number
}

interface TyphoonItem {
  tfbh: string
  name: string
  ename?: string
  points: TyphoonPoint[]
  land?: Array<{ land_time: string; position: string }>
}

interface LatestItem {
  tfbh: string
  update_time: string
  strong: string
  location: string
  trend: string
}

interface TCItem {
  ident: string
  name: string
  ename: string
  points: TyphoonPoint[]
}

// ─── 工具函数 ───
function getTyphoonColor(speed: number): string {
  if (speed >= 51) return "#FF0000"
  if (speed >= 42) return "#FA5EFF"
  if (speed >= 33) return "#FF7800"
  if (speed >= 25) return "#FFD83A"
  if (speed >= 17) return "#39A7F8"
  return "#00C400"
}

function getTyphoonLevel(speed: number): string {
  if (speed >= 51) return "超强台风"
  if (speed >= 42) return "强台风"
  if (speed >= 33) return "台风"
  if (speed >= 25) return "强热带风暴"
  if (speed >= 17) return "热带风暴"
  return "热带低压"
}

function formatDate(time: string): string {
  const d = new Date(time)
  const m = d.getMonth() + 1
  const day = d.getDate()
  const h = String(d.getHours()).padStart(2, "0")
  return m + "月" + day + "日" + h + "时"
}

function formatSpeed(item: TyphoonPoint, latest?: LatestItem | null): string {
  const strongText = latest ? latest.strong : (item.strong || getTyphoonLevel(item.speed))
  return item.speed + "米/秒，" + item.power + "级，" + strongText
}

function formatRadius(tf: TyphoonItem): string {
  const last = tf.points[tf.points.length - 1]
  const r7 = last.radius7 || 0
  const r10 = last.radius10 || 0
  const r12 = last.radius12 || 0
  return r7 + "km-7级，" + r10 + "km-10级，" + r12 + "km-12级"
}

function formatLand(tf: TyphoonItem): string {
  const lands = tf.land
  if (!lands || !lands.length) return "暂无登陆信息"
  const last = lands[lands.length - 1]
  return formatDate(last.land_time) + "，在" + last.position + "登陆"
}

// ─── 数据获取 ───
async function fetchTyphoonData() {
  try {
    const results = await Promise.all([
      fetch(HOME_URL).then((r: any) => r.text()),
      fetch(TC_URL + "?random=" + Date.now()).then((r: any) => r.json()).catch(() => null),
      fetch(LATEST_URL).then((r: any) => r.json()).catch(() => null),
    ])
    const homeHtml = results[0]
    const tcResp = results[1]
    const latestResp = results[2]

    const match = homeHtml.match(/typhoons_data = ([\s\S]*?)[;|<]/)
    if (!match) return null
    const arr: TyphoonItem[] = JSON.parse(match[1])
    if (!arr.length) return null

    let tcItems: TCItem[] = []
    if (tcResp && Array.isArray(tcResp)) {
      tcItems = tcResp
    } else if (tcResp && tcResp.data) {
      tcItems = Array.isArray(tcResp.data) ? tcResp.data : []
    }

    const tf = arr[0]
    const typhoon = tf.points[tf.points.length - 1]

    const latestArr: LatestItem[] = (latestResp && Array.isArray(latestResp)) ? latestResp : []
    const latest = latestArr.find((item: LatestItem) => item.tfbh === tf.tfbh) || null

    // 获取台风路径地图 URL
    let mapImage: string | null = null
    for (const url of MAP_URLS) {
      try {
        const ts = Date.now()
        const resp = await fetch(url + "?r=" + ts)
        if (resp.ok) {
          mapImage = url + "?r=" + ts
          break
        }
      } catch {}
    }

    return { arr, tf, typhoon, latest, tcItems, mapImage }
  } catch (e) {
    return null
  }
}

// ─── 信息行组件 ───
function InfoRow(props: { label: string; value: string; color: string }) {
  return (
    <HStack spacing={0} alignment="top" padding={{ vertical: 6 }}>
      <Text
        font="subheadline"
        fontWeight="bold"
        foregroundStyle={props.color as any}
        frame={{ width: 72 }}
      >
        {props.label}
      </Text>
      <Text
        font="subheadline"
        foregroundStyle="label"
        lineLimit={0}
        frame={{ maxWidth: "infinity" }}
      >
        {props.value}
      </Text>
    </HStack>
  )
}

// ─── 台风详情卡片 ───
function TyphoonDetailCard(props: {
  tf: TyphoonItem
  typhoon: TyphoonPoint
  latest: LatestItem | null
  allTyphoons: TyphoonItem[]
}) {
  const tf = props.tf
  const tp = props.typhoon
  const latest = props.latest
  const color = getTyphoonColor(tp.speed)
  const timeText = latest ? formatDate(latest.update_time) : formatDate(tp.time)
  const nameText = tf.tfbh + " " + tf.name

  return (
    <VStack spacing={0}>
      <HStack spacing={10} alignment="center" padding={{ horizontal: 16, vertical: 12 }}>
        <HStack
          spacing={6}
          alignment="center"
          padding={{ horizontal: 10, vertical: 6 }}
          background={{ style: { color: "#FF3B30", opacity: 1 }, shape: { type: "rect", cornerRadius: 20 } }}
        >
          <Image systemName="hurricane" font={13} foregroundStyle="white" />
          <Text font="subheadline" fontWeight="bold" foregroundStyle="white">
            {nameText}
          </Text>
        </HStack>
        <Text font="subheadline" foregroundStyle="secondaryLabel">
          {timeText}
        </Text>
        <Spacer />
        {props.allTyphoons.map((item: TyphoonItem, idx: number) => {
          const lastPt = item.points[item.points.length - 1]
          const isCurrent = item.tfbh === tf.tfbh
          const itemColor = isCurrent ? color : getTyphoonColor(lastPt ? lastPt.speed : 0)
          return (
            <Image key={idx} systemName="hurricane" font={16} foregroundStyle={itemColor as any} />
          )
        })}
      </HStack>

      <Divider />

      <VStack spacing={0} padding={{ horizontal: 16, vertical: 4 }}>
        <InfoRow
          label="中心位置"
          value={"东经" + tp.lon + "°　北纬" + tp.lat + "°"}
          color="#00C400"
        />
        <InfoRow
          label="风速风力"
          value={formatSpeed(tp, latest)}
          color="#39A7F8"
        />
        <InfoRow
          label={tp.radius7 && tp.radius7 > 0 ? "风圈半径" : "登陆信息"}
          value={tp.radius7 && tp.radius7 > 0 ? formatRadius(tf) : formatLand(tf)}
          color="#FFD83A"
        />
        <InfoRow
          label="参考位置"
          value={latest ? latest.location : "暂无数据"}
          color="#FF7800"
        />
        <InfoRow
          label="未来趋势"
          value={latest ? latest.trend : "暂无数据"}
          color="#8C7CFF"
        />
      </VStack>
    </VStack>
  )
}

// ─── 热带气旋等级表 ───
const LEVEL_DATA = [
  { label: "热带低压", code: "TD", color: "#00C400", agency: "中国" },
  { label: "热带风暴", code: "TS", color: "#39A7F8", agency: "日本" },
  { label: "强热带风暴", code: "STS", color: "#FFD83A", agency: "韩国" },
  { label: "台风", code: "TY", color: "#FF7800", agency: "美国" },
  { label: "强台风", code: "STY", color: "#FA5EFF", agency: "中国台湾" },
  { label: "超强台风", code: "SuperTY", color: "#FF0000", agency: "中国香港" },
]

function LevelSection() {
  return (
    <VStack spacing={0} padding={{ horizontal: 16, vertical: 4 }}>
      {LEVEL_DATA.map((item, idx) => (
        <HStack key={idx} spacing={0} alignment="center" padding={{ vertical: 7 }}>
          <Image systemName="hurricane" font={15} foregroundStyle={item.color as any} />
          <Text font="subheadline" fontWeight="medium" foregroundStyle="label" frame={{ width: 130 }}>
            {item.label + " (" + item.code + ")"}
          </Text>
          <Spacer />
          <Text font="subheadline" foregroundStyle="secondaryLabel" frame={{ width: 60 }}>
            ---
          </Text>
          <Text font="subheadline" foregroundStyle="label" frame={{ width: 70 }}>
            {item.agency}
          </Text>
        </HStack>
      ))}
    </VStack>
  )
}

// ─── 无台风空状态 ───
function EmptyView() {
  return (
    <VStack alignment="center" spacing={8} padding={{ vertical: 40 }} frame={{ maxWidth: "infinity" }}>
      <ZStack frame={{ width: 56, height: 56 }}>
        <Circle fill={{ color: "#8C7CFF", opacity: 0.12 } as any} />
        <Image systemName="hurricane" font={28} foregroundStyle="#8C7CFF" />
      </ZStack>
      <Text font="headline" foregroundStyle="label">当前无活跃台风</Text>
      <Text font="subheadline" foregroundStyle="secondaryLabel" multilineTextAlignment="center">
        西北太平洋暂无活跃热带气旋活动
      </Text>
    </VStack>
  )
}

function LoadingView() {
  return (
    <VStack
      alignment="center"
      spacing={10}
      padding={{ vertical: 60 }}
      frame={{ maxWidth: "infinity" }}
    >
      <Image systemName="arrow.triangle.2.circlepath" font={28} foregroundStyle="#8C7CFF" />
      <Text
        font="subheadline"
        foregroundStyle="secondaryLabel"
        multilineTextAlignment="center"
        frame={{ maxWidth: "infinity" }}
      >
        正在获取台风数据…
      </Text>
    </VStack>
  )
}

function ErrorView(props: { message: string }) {
  return (
    <VStack
      alignment="center"
      spacing={8}
      padding={{ vertical: 40 }}
      frame={{ maxWidth: "infinity" }}
    >
      <Image systemName="exclamationmark.triangle" font={28} foregroundStyle="systemOrange" />
      <Text
        font="headline"
        foregroundStyle="label"
        multilineTextAlignment="center"
        frame={{ maxWidth: "infinity" }}
      >
        加载失败
      </Text>
      <Text
        font="subheadline"
        foregroundStyle="secondaryLabel"
        multilineTextAlignment="center"
        frame={{ maxWidth: "infinity" }}
      >
        {props.message}
      </Text>
    </VStack>
  )
}

// ─── 主页面 ───
export function TyphoonMonitorPage() {
  const dismiss = Navigation.useDismiss()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [data, setData] = useState<any>(null)
  const [empty, setEmpty] = useState(false)

  const loadData = async () => {
    setLoading(true)
    setError("")
    setEmpty(false)
    try {
      const result = await fetchTyphoonData()
      if (result) {
        setData(result)
      } else {
        setEmpty(true)
      }
    } catch (e: any) {
      setError(e ? e.message || "网络请求失败" : "网络请求失败")
    }
    setLoading(false)
  }

  useState(() => { loadData() })

  return (
    <NavigationStack>
      <List
        navigationTitle="台风监控"
        navigationBarTitleDisplayMode="inline"
        toolbar={{ cancellationAction: <Button title="完成" action={dismiss} /> }}
      >
        <Section>
          <VStack spacing={10} alignment="center" padding={{ vertical: 16 }} frame={{ maxWidth: "infinity" }}>
            <ZStack frame={{ width: 52, height: 52 }}>
              <Circle fill={{ colors: ["#FF3B30", "#FF6B35"], startPoint: "top", endPoint: "bottom" }} />
              <Image systemName="hurricane" font={26} foregroundStyle="white" />
            </ZStack>
            <VStack alignment="center" spacing={2}>
              <Text font="headline" foregroundStyle="label">台风实时监控</Text>
              <Text font="caption" foregroundStyle="secondaryLabel">
                数据来源：中国气象局 / istrongcloud
              </Text>
            </VStack>
          </VStack>
        </Section>

        {loading ? (
          <Section><LoadingView /></Section>
        ) : empty ? (
          <Section>
            <EmptyView />
            <Button action={loadData}>
              <HStack alignment="center" spacing={6} padding={{ vertical: 10 }} frame={{ maxWidth: "infinity" }}>
                <Image systemName="arrow.clockwise" font={14} foregroundStyle="systemBlue" />
                <Text foregroundStyle="systemBlue" fontWeight="medium">刷新</Text>
              </HStack>
            </Button>
          </Section>
        ) : error ? (
          <Section>
            <ErrorView message={error} />
            <Button action={loadData}>
              <HStack alignment="center" spacing={6} padding={{ vertical: 10 }} frame={{ maxWidth: "infinity" }}>
                <Image systemName="arrow.clockwise" font={14} foregroundStyle="systemBlue" />
                <Text foregroundStyle="systemBlue" fontWeight="medium">重新加载</Text>
              </HStack>
            </Button>
          </Section>
        ) : data ? (
          <>
            {/* 台风路径地图 */}
            {data.mapImage ? (
              <Section header={<Text font="footnote" foregroundStyle="secondaryLabel">台风路径</Text>}>
                <VStack alignment="center" padding={{ vertical: 8 }}>
                  <Image
                    imageUrl={data.mapImage}
                    resizable={true}
                    frame={{ maxWidth: "infinity", height: 280 }}
                  />
                </VStack>
              </Section>
            ) : null}

            {/* 台风详情 */}
            <Section>
              <TyphoonDetailCard
                tf={data.tf}
                typhoon={data.typhoon}
                latest={data.latest}
                allTyphoons={data.arr}
              />
            </Section>

            {/* 其他活跃台风 */}
            {data.arr.length > 1 ? (
              <Section header={<Text font="footnote" foregroundStyle="secondaryLabel">其他活跃台风</Text>}>
                <VStack spacing={0}>
                  {data.arr.slice(1).map((item: TyphoonItem, idx: number) => {
                    const lastPt = item.points[item.points.length - 1]
                    const color = lastPt ? getTyphoonColor(lastPt.speed) : "#00C400"
                    return (
                      <HStack key={idx} spacing={10} alignment="center" padding={{ vertical: 8 }}>
                        <ZStack frame={{ width: 28, height: 28 }}>
                          <Circle fill={{ color: color, opacity: 0.15 } as any} />
                          <Image systemName="hurricane" font={14} foregroundStyle={color as any} />
                        </ZStack>
                        <VStack alignment="leading" spacing={1} frame={{ maxWidth: "infinity" }}>
                          <Text font="subheadline" fontWeight="bold">
                            {item.tfbh + " " + item.name}
                          </Text>
                          <Text font="caption" foregroundStyle="secondaryLabel">
                            {lastPt ? "风速 " + lastPt.speed + "米/秒，" + lastPt.power + "级" : "暂无数据"}
                          </Text>
                        </VStack>
                      </HStack>
                    )
                  })}
                </VStack>
              </Section>
            ) : null}

            {/* 热带气旋等级说明 */}
            <Section header={<Text font="footnote" foregroundStyle="secondaryLabel">热带气旋等级、预报机构</Text>}>
              <LevelSection />
            </Section>
          </>
        ) : (
          <Section><EmptyView /></Section>
        )}
      </List>
    </NavigationStack>
  )
}