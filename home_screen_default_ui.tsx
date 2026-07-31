/**
 * 🌤️ 彩云天气 — 主页默认 UI
 * 
 * 设计规范：
 * · 遵循 Apple HIG 人机交互指南
 * · 使用玻璃拟态卡片 + 渐变背景
 * · 支持实时天气展示、未来预报、天气详情
 * · 与项目现有组件风格保持一致
 * 
 * 使用方式:
 *   import { HomeScreenDefaultUI } from "./home_screen_default_ui"
 *   <HomeScreenDefaultUI weather={...} location={...} future={...} />
 */

import {
  VStack,
  HStack,
  ZStack,
  ScrollView,
  Text,
  Image,
  Circle,
  RoundedRectangle,
  Spacer,
  Rectangle,
  useState,
} from "scripting"

// Animation 为全局 API
declare const Animation: any
declare const Location: any
declare const Storage: any
declare function setTimeout(handler: () => void, timeout?: number): number
declare function clearTimeout(id: number): void

// ─── 常量 ───
const LOCATION_CACHE_KEY = "Location"

// ─── 类型定义 ───

type WeatherInfo = {
  temperature?: number
  weatherIco?: string
  weatherDesc?: string
  minTemperature?: number
  maxTemperature?: number
  humidity?: string
  windStr?: string
  aqiInfo?: string
  comfort?: string
  ultraviolet?: string
  sunrise?: string
  sunset?: string
  updatedAt?: number
}

type LocationData = {
  latitude?: number
  longitude?: number
  locality?: string
  administrativeArea?: string
  subLocality?: string
  name?: string
  street?: string
  neighborhood?: string
  town?: string
  resolvedAt?: number
}

type FutureForecast = {
  week: string
  min: number
  max: number
  ico: string
}

// ─── 位置获取 Hook ───

/**
 * 从 Storage 获取缓存的位置，若无则返回 null
 */
function getCachedLocation(): LocationData | null {
  try {
    const data = Storage.get(LOCATION_CACHE_KEY) as any
    if (data && data.latitude && data.longitude) {
      return data
    }
  } catch {}
  return null
}

/**
 * 获取当前位置显示文本
 * 地理层级严格从大到小：省级 > 市级 > 区级 > 镇级 > 街道 > POI
 */
function getLocationDisplayText(loc: LocationData | null): string {
  if (!loc) return "定位中..."
  
  const name = String(loc.name || "").trim()
  const street = String(loc.street || "").trim()
  const neighborhood = String(loc.neighborhood || "").trim()
  const town = String(loc.town || "").trim()
  const subLocality = String(loc.subLocality || "").trim()
  const locality = String(loc.locality || "").trim()
  const admin = String(loc.administrativeArea || "").trim()

  // 辅助：判断两个字符串是否本质上相同
  const isSame = (a: string, b: string) => {
    if (!a || !b) return false
    const na = a.replace(/[\s·,，]/g, "")
    const nb = b.replace(/[\s·,，]/g, "")
    return na === nb || na.includes(nb) || nb.includes(na)
  }

  // 第一行：行政层级，严格从大到小
  const adminParts: string[] = []
  if (admin && !adminParts.some(p => isSame(p, admin))) adminParts.push(admin)
  if (locality && !adminParts.some(p => isSame(p, locality))) adminParts.push(locality)
  if (subLocality && !adminParts.some(p => isSame(p, subLocality))) adminParts.push(subLocality)
  if (town && !adminParts.some(p => isSame(p, town))) adminParts.push(town)

  let adminLine = adminParts.join(" · ")

  // 兜底
  if (!adminLine) {
    adminLine = name || street || neighborhood || "当前位置"
  }

  // 第二行：精细位置（POI/街道/小区）
  let fineLine = ""
  if (name && !isSame(name, subLocality) && !isSame(name, locality)) {
    fineLine = name
  } else if (street && !isSame(street, subLocality)) {
    fineLine = street
  } else if (neighborhood && !isSame(neighborhood, subLocality)) {
    fineLine = neighborhood
  }

  if (fineLine && adminLine.includes(fineLine)) {
    fineLine = ""
  }

  return fineLine ? adminLine + " · " + fineLine : adminLine
}

/**
 * 使用当前位置的 Hook
 * 优先使用传入的 location，否则从 Storage 读取缓存
 */
function useCurrentLocation(externalLocation?: LocationData): { locationText: string; isLoading: boolean } {
  const [locationText, setLocationText] = useState(() => {
    if (externalLocation && externalLocation.latitude) {
      return getLocationDisplayText(externalLocation)
    }
    const cached = getCachedLocation()
    return cached ? getLocationDisplayText(cached) : "定位中..."
  })

  const [isLoading, setIsLoading] = useState(!externalLocation && !getCachedLocation())

  // 当没有外部传入位置时，主动获取当前位置
  useState(() => {
    if (externalLocation && externalLocation.latitude) return

    const cached = getCachedLocation()
    if (cached) {
      setLocationText(getLocationDisplayText(cached))
      setIsLoading(false)
      return
    }

    // 主动请求定位
    setIsLoading(true)
    let cancelled = false
    let timerId = 0

    const requestLocation = async () => {
      try {
        if (typeof Location?.setAccuracy === "function") {
          try { await Location.setAccuracy("best") } catch {}
        }
        const live = await Location.requestCurrent({ forceRequest: true })
        if (!cancelled && live && live.latitude && live.longitude) {
          // 逆向地理编码获取地名
          try {
            const placemarks = await Location.reverseGeocode({
              latitude: live.latitude,
              longitude: live.longitude,
              locale: "zh-CN",
            })
            const pm = placemarks?.[0]
            if (pm && !cancelled) {
              const locData: LocationData = {
                latitude: live.latitude,
                longitude: live.longitude,
                locality: pm.locality || "",
                administrativeArea: pm.administrativeArea || "",
                subLocality: pm.subLocality || "",
                name: pm.name || "",
                street: pm.thoroughfare || "",
                neighborhood: (pm.areasOfInterest && pm.areasOfInterest[0]) || "",
                resolvedAt: Date.now(),
              }
              Storage.set(LOCATION_CACHE_KEY, locData)
              setLocationText(getLocationDisplayText(locData))
            }
          } catch {
            if (!cancelled) {
              setLocationText(live.latitude.toFixed(2) + ", " + live.longitude.toFixed(2))
            }
          }
        }
      } catch {
        if (!cancelled) {
          setLocationText("定位失败")
        }
      }
      if (!cancelled) setIsLoading(false)
    }

    timerId = setTimeout(requestLocation, 100)

    return () => {
      cancelled = true
      if (timerId) clearTimeout(timerId)
    }
  })

  return { locationText, isLoading }
}

// ─── 天气图标颜色映射 ───

function getWeatherIconColor(icon: string): string {
  if (!icon) return "#ffd166"
  if (icon.includes("sun") || icon.includes("sunrise") || icon.includes("sunset")) return "#ffd166"
  if (icon.includes("cloud.sun") || icon.includes("cloud.moon")) return "#ffc857"
  if (icon.includes("cloud")) return "#9bd7ff"
  if (icon.includes("rain") || icon.includes("drop")) return "#70c8ff"
  if (icon.includes("snow")) return "#d7f3ff"
  if (icon.includes("wind")) return "#b8f7d4"
  if (icon.includes("bolt")) return "#ffe066"
  return "#ffd166"
}

// ─── 天气渐变背景色 ───

function getWeatherGradient(icon: string): [string, string] {
  if (!icon) return ["#4facfe", "#00f2fe"]
  if (icon.includes("sun.max")) return ["#FFD54F", "#FF9800"]
  if (icon.includes("cloud.sun") || icon.includes("cloud.moon")) return ["#4facfe", "#00f2fe"]
  if (icon.includes("cloud.fill")) return ["#90A4AE", "#607D8B"]
  if (icon.includes("rain")) return ["#5C6BC0", "#3949AB"]
  if (icon.includes("bolt")) return ["#7E57C2", "#4527A0"]
  if (icon.includes("snow")) return ["#81D4FA", "#4FC3F7"]
  if (icon.includes("wind")) return ["#26C6DA", "#00ACC1"]
  if (icon.includes("moon")) return ["#5C6BC0", "#1A237E"]
  if (icon.includes("haze") || icon.includes("fog")) return ["#a8a096", "#7d7569"]
  return ["#4facfe", "#00f2fe"]
}

// ─── 格式化工具 ───

function formatTemperature(temp?: number): string {
  if (temp === undefined || temp === null) return "--"
  return Math.round(temp) + "°"
}

function formatUpdateTime(timestamp?: number): string {
  if (!timestamp || !Number.isFinite(timestamp)) return "--:--"
  const date = new Date(timestamp)
  const h = date.getHours()
  const m = String(date.getMinutes()).padStart(2, "0")
  return h + ":" + m
}

// ─── 子组件 ───

/**
 * 位置信息行（使用当前位置）
 */
function LocationRow({ locationText, isLoading }: { locationText: string; isLoading: boolean }) {
  return (
    <HStack spacing={4} alignment="center">
      <Image systemName="location.fill" font={12} foregroundStyle="rgba(255,255,255,0.7)" />
      <Text font="subheadline" foregroundStyle="rgba(255,255,255,0.85)" lineLimit={1}>
        {isLoading ? "定位中..." : locationText}
      </Text>
    </HStack>
  )
}

/**
 * 当前天气大卡片
 */
function CurrentWeatherCard({ weather, locationText, isLoading }: { weather?: WeatherInfo; locationText: string; isLoading: boolean }) {
  const icon = weather?.weatherIco || "sun.max.fill"
  const gradient = getWeatherGradient(icon)
  
  return (
    <VStack spacing={0}>
      <ZStack>
        <RoundedRectangle cornerRadius={24} fill={{ colors: gradient as any, startPoint: "top", endPoint: "bottom" }} frame={{ maxWidth: "infinity", minHeight: 200 }} />
        <VStack spacing={16} padding={{ horizontal: 20, vertical: 24 }}>
          {/* 顶部：位置 + 更新时间 */}
          <HStack alignment="center" frame={{ maxWidth: "infinity" }}>
            <LocationRow locationText={locationText} isLoading={isLoading} />
            <Spacer />
            <Text font="caption" foregroundStyle="rgba(255,255,255,0.6)">
              {formatUpdateTime(weather?.updatedAt)} 更新
            </Text>
          </HStack>
          
          {/* 中部：大图标 + 温度 */}
          <HStack spacing={20} alignment="center" frame={{ maxWidth: "infinity" }}>
            <VStack spacing={4} alignment="center">
              <Image
                systemName={icon}
                font={56}
                foregroundStyle="white"
                symbolEffect={{
                  effect: "breathe",
                  options: { speed: 0.7, repeat: "continuous" },
                } as any}
              />
            </VStack>
            <VStack alignment="center" spacing={2}>
              <Text font={{ name: "system", size: 64 }} foregroundStyle="white" lineLimit={1}>
                {formatTemperature(weather?.temperature)}
              </Text>
              <Text font="subheadline" foregroundStyle="rgba(255,255,255,0.85)" lineLimit={1}>
                {weather?.weatherDesc || "晴朗"}
              </Text>
            </VStack>
            <Spacer />
          </HStack>
          
          {/* 底部：最高/最低温 + 体感 */}
          <HStack spacing={16} alignment="center">
            <HStack spacing={4} alignment="center">
              <Image systemName="arrow.up" font={10} foregroundStyle="rgba(255,200,150,0.9)" />
              <Text font="caption" foregroundStyle="rgba(255,255,255,0.8)">
                {formatTemperature(weather?.maxTemperature)}
              </Text>
              <Image systemName="arrow.down" font={10} foregroundStyle="rgba(150,200,255,0.9)" />
              <Text font="caption" foregroundStyle="rgba(255,255,255,0.8)">
                {formatTemperature(weather?.minTemperature)}
              </Text>
            </HStack>
            {weather?.comfort ? (
              <>
                <Rectangle fill="rgba(255,255,255,0.3)" frame={{ width: 1, height: 12 }} />
                <Text font="caption" foregroundStyle="rgba(255,255,255,0.8)">{weather.comfort}</Text>
              </>
            ) : null}
          </HStack>
        </VStack>
      </ZStack>
    </VStack>
  )
}

/**
 * 未来预报横向卡片
 */
function ForecastCard({ future }: { future?: FutureForecast[] }) {
  const items = future?.slice(0, 5) || []
  
  return (
    // @ts-ignore
    <VStack spacing={12} padding={{ horizontal: 16, vertical: 16 }} background="secondarySystemBackground" cornerRadius={16}>
      <HStack spacing={4} alignment="center">
        <Image systemName="calendar" font={14} foregroundStyle="secondaryLabel" />
        <Text font="subheadline" foregroundStyle="secondaryLabel" fontWeight="medium">未来预报</Text>
      </HStack>
      
      <HStack spacing={0} frame={{ maxWidth: "infinity" }} alignment="top">
        {items.map((item, index) => (
          <VStack key={index} spacing={8} alignment="center" frame={{ maxWidth: "infinity" }}>
            <Text font="caption" foregroundStyle="secondaryLabel">{item.week}</Text>
            <Image systemName={item.ico} renderingMode="template" foregroundStyle="systemBlue" frame={{ width: 20, height: 20 }} />
            <Text font="caption2" foregroundStyle="tertiaryLabel">{item.min}°</Text>
            <Text font="caption" fontWeight="medium" foregroundStyle="label">{item.max}°</Text>
          </VStack>
        ))}
      </HStack>
    </VStack>
  )
}

/**
 * 天气详情网格
 */
function WeatherDetailsGrid({ weather }: { weather?: WeatherInfo }) {
  const details = [
    { icon: "humidity.fill", label: "湿度", value: weather?.humidity || "--" },
    { icon: "wind", label: "风速", value: weather?.windStr || "--" },
    { icon: "aqi.medium", label: "空气质量", value: weather?.aqiInfo || "--" },
    { icon: "sun.max", label: "紫外线", value: weather?.ultraviolet || "--" },
    { icon: "sunrise.fill", label: "日出", value: weather?.sunrise || "--" },
    { icon: "sunset.fill", label: "日落", value: weather?.sunset || "--" },
  ]
  
  return (
    // @ts-ignore
    <VStack spacing={12} padding={{ horizontal: 16, vertical: 16 }} background="secondarySystemBackground" cornerRadius={16}>
      <HStack spacing={4} alignment="center">
        <Image systemName="list.bullet.rectangle" font={14} foregroundStyle="secondaryLabel" />
        <Text font="subheadline" foregroundStyle="secondaryLabel" fontWeight="medium">详细信息</Text>
      </HStack>
      
      <HStack spacing={12} frame={{ maxWidth: "infinity" }}>
        {details.slice(0, 3).map((item, index) => (
          <VStack key={index} spacing={6} alignment="center" frame={{ maxWidth: "infinity" }}>
            <ZStack frame={{ width: 36, height: 36 }}>
              <Circle fill="systemBlue" opacity={0.12} />
              <Image systemName={item.icon} font={16} foregroundStyle="systemBlue" />
            </ZStack>
            <Text font="caption2" foregroundStyle="tertiaryLabel">{item.label}</Text>
            <Text font="caption" fontWeight="medium" foregroundStyle="label" lineLimit={1}>{item.value}</Text>
          </VStack>
        ))}
      </HStack>
      
      <HStack spacing={12} frame={{ maxWidth: "infinity" }}>
        {details.slice(3, 6).map((item, index) => (
          <VStack key={index} spacing={6} alignment="center" frame={{ maxWidth: "infinity" }}>
            <ZStack frame={{ width: 36, height: 36 }}>
              <Circle fill="systemOrange" opacity={0.12} />
              <Image systemName={item.icon} font={16} foregroundStyle="systemOrange" />
            </ZStack>
            <Text font="caption2" foregroundStyle="tertiaryLabel">{item.label}</Text>
            <Text font="caption" fontWeight="medium" foregroundStyle="label" lineLimit={1}>{item.value}</Text>
          </VStack>
        ))}
      </HStack>
    </VStack>
  )
}

/**
 * 天气预警横幅
 */
function WeatherAlertBanner({ title }: { title: string }) {
  return (
    // @ts-ignore
    <HStack spacing={8} padding={{ horizontal: 12, vertical: 10 }} background="systemRed" cornerRadius={12} frame={{ maxWidth: "infinity" }}>
      <Image systemName="exclamationmark.triangle.fill" font={14} foregroundStyle="white" />
      <Text font="caption" fontWeight="medium" foregroundStyle="white" lineLimit={2} frame={{ maxWidth: "infinity" }}>
        {title}
      </Text>
    </HStack>
  )
}

// ─── 主页导出组件 ───

/**
 * 彩云天气主页默认 UI
 * 
 * 使用方式:
 *   import { HomeScreenDefaultUI } from "./home_screen_default_ui"
 *   <HomeScreenDefaultUI weather={...} location={...} future={...} />
 */
export function HomeScreenDefaultUI(props: {
  weather?: WeatherInfo
  location?: LocationData
  future?: FutureForecast[]
  alertTitle?: string
  onRefresh?: () => void
  onSettings?: () => void
}) {
  const { weather, location, future, alertTitle } = props
  
  // 使用当前位置 Hook
  const { locationText, isLoading } = useCurrentLocation(location)
  
  return (
    <ScrollView frame={{ maxWidth: "infinity", maxHeight: "infinity" }} background="systemBackground">
      <VStack spacing={16} padding={{ horizontal: 16, vertical: 12 }}>
        {/* 天气预警（可选） */}
        {alertTitle ? <WeatherAlertBanner title={alertTitle} /> : null}
        
        {/* 当前天气大卡片 */}
        <CurrentWeatherCard weather={weather} locationText={locationText} isLoading={isLoading} />
        
        {/* 未来预报 */}
        {future && future.length > 0 ? (
          <ForecastCard future={future} />
        ) : null}
        
        {/* 详细信息网格 */}
        <WeatherDetailsGrid weather={weather} />
        
        {/* 底部留白 */}
        <Spacer frame={{ height: 20 }} />
      </VStack>
    </ScrollView>
  )
}

/**
 * 预览用默认导出
 * 使用方式：scripting-ts preview_ui home_screen_default_ui.tsx
 */
export default function Preview() {
  // 模拟数据用于预览
  const mockWeather: WeatherInfo = {
    temperature: 28,
    weatherIco: "cloud.sun.fill",
    weatherDesc: "多云转晴",
    minTemperature: 22,
    maxTemperature: 31,
    humidity: "65%",
    windStr: "东南风 3级",
    aqiInfo: "良好",
    comfort: "舒适",
    ultraviolet: "中等",
    sunrise: "05:42",
    sunset: "19:18",
    updatedAt: Date.now(),
  }
  
  const mockLocation: LocationData = {
    locality: "上海市",
    administrativeArea: "上海市",
    subLocality: "浦东新区",
    name: "陆家嘴",
  }
  
  const mockFuture: FutureForecast[] = [
    { week: "今天", min: 22, max: 31, ico: "cloud.sun.fill" },
    { week: "明天", min: 23, max: 32, ico: "sun.max.fill" },
    { week: "后天", min: 24, max: 30, ico: "cloud.rain.fill" },
    { week: "周三", min: 21, max: 27, ico: "cloud.heavyrain.fill" },
    { week: "周四", min: 20, max: 26, ico: "cloud.sun.fill" },
  ]
  
  return (
    <HomeScreenDefaultUI
      weather={mockWeather}
      location={mockLocation}
      future={mockFuture}
    />
  )
}
