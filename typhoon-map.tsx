/**
 * 🌀 彩云天气 — 台风预警路线地图组件
 * 数据源：istrongcloud 台风可视化 API
 * 
 * 使用方式:
 *   <HomeTyphoonAlert /> — 自动获取并显示台风
 *   <TyphoonAlertCard typhoons={data} /> — 显示指定台风数据
 */

import {
  VStack,
  HStack,
  ZStack,
  Text,
  Image,
  Circle,
  Spacer,
  useState,
  useObservable,
} from "scripting"

import {
  Map,
  MapPolyline,
  Marker,
  MapCircle,
  fetch,
} from "scripting"

declare const MapCameraPosition: any
declare function setTimeout(handler: () => void, timeout?: number): number
declare function clearTimeout(id: number): void

// ─── 常量 ───
const HOME_URL = "https://tf02.istrongcloud.com/member/v1.2/home"

// ─── 类型定义 ───

export type TyphoonPoint = {
  time: string
  lng: number
  lat: number
  speed: number
  power: number
  pressure: number
  strong: string
  radius7?: number
  radius10?: number
  radius12?: number
  forecast?: any[]
}

export type TyphoonPath = {
  tfbh: string
  name: string
  ename?: string
  points: TyphoonPoint[]
}

// ─── 工具函数 ───

/** 根据风速获取台风等级颜色 */
function getTyphoonColor(speed: number): string {
  if (speed >= 51) return "#FF0000"
  if (speed >= 42) return "#FA5EFF"
  if (speed >= 33) return "#FF7800"
  if (speed >= 25) return "#FFD83A"
  if (speed >= 17) return "#39A7F8"
  return "#00C400"
}

/** 根据风速获取台风等级名称 */
function getTyphoonLevel(speed: number): string {
  if (speed >= 51) return "超强台风"
  if (speed >= 42) return "强台风"
  if (speed >= 33) return "台风"
  if (speed >= 25) return "强热带风暴"
  if (speed >= 17) return "热带风暴"
  return "热带低压"
}

/** 计算地图区域 */
function calculateRegion(points: TyphoonPoint[]): { center: { latitude: number; longitude: number }; span: { latitudeDelta: number; longitudeDelta: number } } {
  if (!points || points.length === 0) {
    return {
      center: { latitude: 25, longitude: 120 },
      span: { latitudeDelta: 10, longitudeDelta: 10 },
    }
  }
  
  let minLat = points[0].lat
  let maxLat = points[0].lat
  let minLon = points[0].lng
  let maxLon = points[0].lng
  
  for (const p of points) {
    if (p.lat < minLat) minLat = p.lat
    if (p.lat > maxLat) maxLat = p.lat
    if (p.lng < minLon) minLon = p.lng
    if (p.lng > maxLon) maxLon = p.lng
  }
  
  const centerLat = (minLat + maxLat) / 2
  const centerLon = (minLon + maxLon) / 2
  const latDelta = Math.max((maxLat - minLat) * 1.3, 2)
  const lonDelta = Math.max((maxLon - minLon) * 1.3, 2)
  
  return {
    center: { latitude: centerLat, longitude: centerLon },
    span: { latitudeDelta: latDelta, longitudeDelta: lonDelta },
  }
}

// ─── 数据获取 ───

/** 从 istrongcloud API 获取台风数据 */
async function fetchTyphoonData(): Promise<TyphoonPath[] | null> {
  try {
    const resp = await fetch(HOME_URL)
    const html = await resp.text()
    const match = html.match(/typhoons_data = ([\s\S]*?)[;|<]/)
    if (!match) return null
    const arr: TyphoonPath[] = JSON.parse(match[1])
    if (!arr || arr.length === 0) return null
    return arr
  } catch (e) {
    return null
  }
}

// ─── Hook ───

/** 自动获取台风数据 */
function useTyphoonData(): { typhoons: TyphoonPath[] | null; loading: boolean } {
  const [typhoons, setTyphoons] = useState<TyphoonPath[] | null>(null)
  const [loading, setLoading] = useState(true)

  useState(() => {
    let cancelled = false
    const load = async () => {
      try {
        const data = await fetchTyphoonData()
        if (!cancelled && data && data.length > 0) {
          setTyphoons(data)
        }
      } catch {}
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  })

  return { typhoons, loading }
}

/** 动态路径动画 */
function useAnimatedPath(points: TyphoonPoint[], delay: number = 150) {
  const [count, setCount] = useState(1)
  
  useState(() => {
    if (!points || points.length <= 1) return
    let idx = 1
    let timer = 0
    const tick = () => {
      if (idx < points.length) {
        setCount(idx + 1)
        idx++
        timer = setTimeout(tick, delay)
      }
    }
    timer = setTimeout(tick, delay)
    return () => { if (timer) clearTimeout(timer) }
  })
  
  return count
}

// ─── 组件 ───

/** 台风地图 */
export function TyphoonMap(props: { typhoons: TyphoonPath[]; height?: number }) {
  const { typhoons, height = 200 } = props
  
  if (!typhoons || typhoons.length === 0) return null
  
  const main = typhoons[0]
  const points = main.points || []
  const visibleCount = useAnimatedPath(points, 120)
  const visiblePoints = points.slice(0, visibleCount)
  
  const region = calculateRegion(points)
  const camera = useObservable(MapCameraPosition.region({ center: region.center, span: region.span }))
  
  const current = visiblePoints[visiblePoints.length - 1]
  const color = current ? getTyphoonColor(current.speed) : "#FF3B30"
  const level = current ? getTyphoonLevel(current.speed) : ""
  
  const pathCoords = visiblePoints.map((p) => ({ latitude: p.lat, longitude: p.lng }))
  const forecastPoints = points.slice(visibleCount)
  const forecastCoords = forecastPoints.map((p) => ({ latitude: p.lat, longitude: p.lng }))
  
  // @ts-ignore
  return (
    <ZStack frame={{ maxWidth: "infinity", height }}>
      <Map cameraPosition={camera} mapStyle={{ style: "standard", showsTraffic: false }}>
        {pathCoords.length > 1 ? (
          <MapPolyline coordinates={pathCoords} strokeColor={color} strokeStyle={{ lineWidth: 3 }} contourStyle="geodesic" />
        ) : null}
        {forecastCoords.length > 1 ? (
          <MapPolyline coordinates={forecastCoords} strokeColor={color} strokeStyle={{ lineWidth: 2, dash: [6, 4] }} contourStyle="geodesic" />
        ) : null}
        {visiblePoints.slice(0, -1).map((p, i) => (
          <Marker key={i} coordinate={{ latitude: p.lat, longitude: p.lng }} tint={getTyphoonColor(p.speed)} />
        ))}
        {current ? (
          <>
            <Marker coordinate={{ latitude: current.lat, longitude: current.lng }} tint={color} />
            {current.radius7 && current.radius7 > 0 ? (
              <MapCircle center={{ latitude: current.lat, longitude: current.lng }} radius={current.radius7 * 1000} fillColor={color} strokeColor={color} />
            ) : null}
          </>
        ) : null}
        {typhoons.slice(1).map((t, i) => {
          const coords = t.points.map((p) => ({ latitude: p.lat, longitude: p.lng }))
          const c = t.points[t.points.length - 1]
          return <MapPolyline key={i} coordinates={coords} strokeColor={c ? getTyphoonColor(c.speed) : "#00C400"} strokeStyle={{ lineWidth: 2 }} contourStyle="geodesic" />
        })}
      </Map>
      
      {/* 右上角信息 */}
      <VStack frame={{ maxWidth: "infinity", maxHeight: "infinity" }}>
        <HStack frame={{ maxWidth: "infinity" }}>
          <Spacer />
          <VStack padding={{ top: 8, trailing: 8 }}>
            <HStack spacing={6} padding={{ horizontal: 10, vertical: 6 }} background={"systemBackground" as any} opacity={0.9}>
              <Circle fill={{ color: color, opacity: 0.3 } as any} frame={{ width: 16, height: 16 }} />
              <VStack alignment="leading" spacing={0}>
                <Text font="caption2" fontWeight="bold" foregroundStyle="label">{main.name}</Text>
                <Text font="caption2" foregroundStyle="secondaryLabel">{level}</Text>
              </VStack>
            </HStack>
          </VStack>
        </HStack>
        <Spacer />
      </VStack>
    </ZStack>
  )
}

/** 台风预警卡片 */
export function TyphoonAlertCard(props: { typhoons: TyphoonPath[] }) {
  const { typhoons } = props
  if (!typhoons || typhoons.length === 0) return null
  
  const main = typhoons[0]
  const last = main.points[main.points.length - 1]
  const color = last ? getTyphoonColor(last.speed) : "#FF3B30"
  const level = last ? getTyphoonLevel(last.speed) : ""
  
  // @ts-ignore
  return (
    <VStack spacing={0}>
      <TyphoonMap typhoons={typhoons} height={180} />
      <HStack spacing={8} padding={{ horizontal: 12, vertical: 10 }} background={["secondarySystemBackground"] as any}>
        <ZStack frame={{ width: 28, height: 28 }}>
          <Circle fill={{ color: color, opacity: 0.15 } as any} />
          <Image systemName="hurricane" font={14} foregroundStyle={color as any} />
        </ZStack>
        <VStack alignment="leading" spacing={1} frame={{ maxWidth: "infinity" }}>
          <Text font="caption" fontWeight="bold" foregroundStyle="label">{main.name + " · " + level}</Text>
          <Text font="caption2" foregroundStyle="secondaryLabel">
            {last ? "风速 " + last.speed + "米/秒 | 气压 " + last.pressure + "hPa" : "暂无数据"}
          </Text>
        </VStack>
      </HStack>
    </VStack>
  )
}

/** 主页台风预警（自动获取） */
export function HomeTyphoonAlert() {
  const { typhoons, loading } = useTyphoonData()
  if (loading || !typhoons || typhoons.length === 0) return null
  
  // @ts-ignore
  return (
    <VStack spacing={0}>
      <TyphoonAlertCard typhoons={typhoons} />
    </VStack>
  )
}

// ─── 预览 ───

export default function Preview() {
  const mock: TyphoonPath[] = [
    {
      tfbh: "202613",
      name: "白海豚",
      points: [
        { time: "2026-07-27T14:00:00", lng: 176.9, lat: 13.2, speed: 18, power: 8, pressure: 998, strong: "热带风暴", radius7: 250 },
        { time: "2026-07-28T08:00:00", lng: 172.9, lat: 13.1, speed: 28, power: 10, pressure: 982, strong: "强热带风暴", radius7: 300 },
        { time: "2026-07-28T23:00:00", lng: 170.4, lat: 13.5, speed: 48, power: 15, pressure: 945, strong: "强台风", radius7: 350 },
        { time: "2026-07-29T08:00:00", lng: 169.2, lat: 14.1, speed: 58, power: 17, pressure: 925, strong: "超强台风", radius7: 350 },
        { time: "2026-07-29T20:00:00", lng: 167.7, lat: 15.2, speed: 60, power: 17, pressure: 920, strong: "超强台风", radius7: 350 },
        { time: "2026-07-30T08:00:00", lng: 165.8, lat: 16.4, speed: 65, power: 18, pressure: 910, strong: "超强台风", radius7: 400 },
        { time: "2026-07-30T20:00:00", lng: 163.9, lat: 17.4, speed: 60, power: 17, pressure: 920, strong: "超强台风", radius7: 400 },
        { time: "2026-07-31T08:00:00", lng: 162.0, lat: 18.2, speed: 60, power: 17, pressure: 920, strong: "超强台风", radius7: 400 },
        { time: "2026-07-31T20:00:00", lng: 160.2, lat: 19.1, speed: 60, power: 17, pressure: 920, strong: "超强台风", radius7: 400 },
      ],
    },
  ]
  
  return (
    <VStack spacing={16} padding={{ horizontal: 16, vertical: 20 }}>
      <TyphoonAlertCard typhoons={mock} />
    </VStack>
  )
}
