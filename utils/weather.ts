/**
 * 🌤️ 彩云天气 - 天气API/数据获取
 * 从 widget.tsx 拆分
 */
import { Widget } from "scripting"
import { handleNotifications } from "../notification_logic"
import type { WeatherInfo, LocationData, PoetryInfo, ScheduleInfo } from "./types"
import { weatherIcos, LOCATION_CACHE_KEY, weatherCachePath, locationCachePath } from "./constants"
import { Cache, appendDebugLog, getSavedApiKey, locationData, updateLocationData } from "./storage"
import { resolveLocationNameIfNeeded, hasValidCoordinates, isWeatherCacheValid, isNearby, isMeaningfulName } from "./location"
import { getWindDirection, getWindLevel, airQuality, pad } from "./format"
import { getLunarDate_Precise } from "./lunar"

declare const Location: any
declare const CalendarEvent: any
declare const fetch: any

let apiKey = getSavedApiKey()

export function refreshApiKey() { apiKey = getSavedApiKey() }

async function getJson(url: string) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return await response.json()
}

/**
 * 与 Colorful Clouds 完全一致的三级定位策略
 * 优先级：Widget 参数 > 实时定位 > Storage 缓存
 * + 逆向地理编码获取地名（v2.5 API 没有 adcodes）
 */
export async function getLocation(): Promise<{ latitude: number; longitude: number; isCurrentLocation: boolean }> {
  let location: any
  let isCurrentLocation = false
  const key = LOCATION_CACHE_KEY

  if (Widget.parameter) {
    if (Widget.parameter === "dev") {
      location = { latitude: 1, longitude: 1 }
    } else {
      try {
        location = JSON.parse(Widget.parameter)
        isCurrentLocation = false
      } catch (e) {
        throw new Error("参数错误")
      }
    }
  } else {
    location = await Location.requestCurrent()
    isCurrentLocation = true
    if (!location) {
      location = Storage.get(key)
      if (!location) throw new Error("请先授权定位")
    } else {
      Storage.set(key, location)
    }
  }

  // 逆向地理编码获取地名
  // 先加载已缓存的完整位置数据，保留已解析的地名
  const cachedLoc = Cache.read<LocationData>(locationCachePath)
  const hasCachedNames = Boolean(
    cachedLoc &&
    isNearby(location?.latitude || 0, location?.longitude || 0, cachedLoc.latitude, cachedLoc.longitude) &&
    (isMeaningfulName(cachedLoc.locality) || isMeaningfulName(cachedLoc.administrativeArea))
  )
  const baseData: LocationData = {
    latitude: location?.latitude || 0,
    longitude: location?.longitude || 0,
    locality: hasCachedNames ? (cachedLoc!.locality || "") : "",
    subLocality: hasCachedNames ? (cachedLoc!.subLocality || "") : "",
    administrativeArea: hasCachedNames ? (cachedLoc!.administrativeArea || "") : "",
    name: hasCachedNames ? (cachedLoc!.name || "") : "",
    town: hasCachedNames ? (cachedLoc!.town || "") : "",
  }
  const resolved = await resolveLocationNameIfNeeded(baseData, true)
  updateLocationData(resolved)

  return {
    latitude: location?.latitude,
    longitude: location?.longitude,
    isCurrentLocation,
  }
}

export async function safeGetWeather(forceRefresh = false): Promise<WeatherInfo> {
  const location = await getLocation()
  const cachedWeather = Cache.read<WeatherInfo>(weatherCachePath) || {}
  if (!apiKey) {
    appendDebugLog("weather skipped: missing api key, using cache")
    return cachedWeather
  }
  const url = `https://api.caiyunapp.com/v2.5/${apiKey}/${location.longitude},${location.latitude}/weather.json?alert=true`

  let data: any
  try {
    data = await getJson(url)
  } catch {
    return cachedWeather
  }

  if (!data || data.status !== "ok") return cachedWeather

  const info: WeatherInfo = {}

  if (data.result?.forecast_keypoint) info.weatherDesc = data.result.forecast_keypoint
  if (data.result?.minutely) {
    info.precipitation = data.result.minutely.precipitation || []
    info.precipitationDesc = data.result.minutely.description || ""
  }
  if (data.result?.alert?.content) info.alertWeatherTitle = data.result.alert.content.title

  const daily = data.result?.daily
  if (daily?.temperature?.[0]) {
    info.minTemperature = Math.round(daily.temperature[0].min)
    info.maxTemperature = Math.round(daily.temperature[0].max)
  }
  if (daily?.temperature && daily?.skycon) {
    info.future = []
    for (let i = 1; i <= 3; i++) {
      if (daily.temperature[i] && daily.skycon[i]) {
        const dateStr = daily.temperature[i].date
        const dayNum = parseInt(String(dateStr).split("-")[2])
        info.future.push({
          week: `${dayNum}日`,
          min: Math.round(daily.temperature[i].min),
          max: Math.round(daily.temperature[i].max),
          ico: weatherIcos[daily.skycon[i].value] || "sun.max.fill",
        })
      }
    }
  }

  const rt = data.result?.realtime
  if (rt) {
    info.bodyFeelingTemperature = Math.round(rt.apparent_temperature)
    info.weatherIco = weatherIcos[rt.skycon] || "sun.max.fill"
    info.humidity = Math.round(rt.humidity * 100) + "%"
    if (rt.wind) {
      info.windStr = `${getWindDirection(rt.wind.direction)} ${getWindLevel(rt.wind.speed)}`
    }
    if (rt.life_index?.comfort) info.comfort = rt.life_index.comfort.desc
    if (rt.life_index?.ultraviolet) info.ultraviolet = rt.life_index.ultraviolet.desc
    if (rt.air_quality?.aqi?.chn !== undefined) info.aqiInfo = airQuality(rt.air_quality.aqi.chn)
  }
  if (daily?.astro?.[0]) {
    info.sunrise = daily.astro[0].sunrise.time
    info.sunset = daily.astro[0].sunset.time
  }

  info.cachedLatitude = location.latitude
  info.cachedLongitude = location.longitude
  info.updatedAt = Date.now()
  Cache.write(weatherCachePath, info)
  appendDebugLog("weather cached with location", {
    latitude: location.latitude,
    longitude: location.longitude,
    alertCount: Array.isArray(data.result?.alert?.content) ? data.result.alert.content.length : 0
  })

  // 处理通知逻辑
  const appProfile = (Storage.get("ColorfulCloudsSetting") as any) || {}
  const notificationSettings = appProfile.notification || {}
  if (notificationSettings.Precipitation) {
    try {
      handleNotifications(data.result, location.isCurrentLocation, notificationSettings).catch(err => {
        appendDebugLog("handleNotifications background error", { message: String(err) })
      })
    } catch (err) {
      appendDebugLog("handleNotifications error", { message: String(err) })
    }
  }

  return info
}

export async function safeGetPoetry(): Promise<PoetryInfo | null> {
  try {
    return await getJson("https://v2.jinrishici.com/sentence")
  } catch {
    return null
  }
}

export async function safeGetSchedules(): Promise<ScheduleInfo[]> {
  try {
    const start = new Date()
    const end = new Date(start)
    end.setHours(23, 59, 59, 999)
    const events = await CalendarEvent.getAll(start, end)
    return events
      .slice(0, 10)
      .filter((e: any) => !String(e.title || "").startsWith("Canceled") && (e.isAllDay || e.startDate > new Date()))
      .map((e: any) => ({
        title: e.title,
        timeText: e.isAllDay ? "全天" : `${pad(e.startDate.getHours())}:${pad(e.startDate.getMinutes())}`,
      }))
  } catch {
    return []
  }
}
