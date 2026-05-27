/**
 * 🌤️ 彩云天气 - 类型定义
 * 从 widget.tsx 拆分，集中管理所有 TypeScript 类型
 */

export type LayoutOffset = { x?: number; y?: number }

export type StyleConfig = {
  refreshInterval?: string | number
  weatherChart?: {
    style?: "apple" | "caiyun"
  }
  layout?: {
    medium?: {
      left?: LayoutOffset
      right?: LayoutOffset
    }
    large?: {
      left?: LayoutOffset
      right?: LayoutOffset
    }
  }
  global?: { size?: number }
  [key: string]: any
}

export type WeatherFuture = {
  week: string
  min: number
  max: number
  ico: string
}

export type WeatherInfo = {
  alertWeatherTitle?: string
  weatherDesc?: string
  minTemperature?: number
  maxTemperature?: number
  future?: WeatherFuture[]
  bodyFeelingTemperature?: number
  weatherIco?: string
  humidity?: string
  windStr?: string
  comfort?: string
  ultraviolet?: string
  aqiInfo?: string
  sunrise?: string
  sunset?: string
  updatedAt?: number
  precipitation?: number[]
  precipitationDesc?: string
  /** 缓存时的坐标，用于验证缓存是否有效 */
  cachedLatitude?: number
  cachedLongitude?: number
}

export type PoetryInfo = {
  data?: {
    content?: string
    origin?: {
      dynasty?: string
      author?: string
    }
  }
}

export type ScheduleInfo = {
  title: string
  timeText: string
}

export type LocationData = {
  latitude: number
  longitude: number
  administrativeArea?: string
  subAdministrativeArea?: string
  locality: string
  subLocality: string
  town?: string
  street?: string
  neighborhood?: string
  quarter?: string
  name?: string
  horizontalAccuracy?: number
  resolvedAt?: number
}
