/**
 * 🌤️ 彩云天气 - 定位与地理编码
 * 从 widget.tsx 拆分
 */
import type { LocationData } from "./types"
import { locationData, updateLocationData, appendDebugLog, Cache } from "./storage"
import { weatherCachePath, locationCachePath, LOCATION_CACHE_KEY } from "./constants"
import type { WeatherInfo } from "./types"

declare const Location: any
declare const fetch: any

// ─── 辅助 ───
export function isMeaningfulName(value: any) {
  const text = String(value || "").trim()
  return Boolean(text && text !== "定位中" && text !== "等待定位" && text !== "定位失败")
}

function placemarkHasDetailedAddress(placemark: any) {
  if (!placemark) return false
  const province = placemark.administrativeArea || placemark.state
  const city = placemark.locality || placemark.city
  const district = placemark.subLocality || placemark.subAdministrativeArea || placemark.district
  const fine = placemark.neighborhood || placemark.quarter || placemark.thoroughfare || placemark.name || placemark.subLocality

  const hasRegion = isMeaningfulName(province) || isMeaningfulName(city) || isMeaningfulName(district)
  return Boolean(hasRegion && isMeaningfulName(fine))
}

// ─── 逆向地理编码 ───
interface GeoNameCache {
  latitude: number
  longitude: number
  administrativeArea?: string
  locality?: string
  subLocality?: string
  name?: string
  town?: string
  resolvedAt?: number
}

/** 从 locationCachePath 读取上次成功解析的地名 */
function loadCachedGeoNames(): GeoNameCache | null {
  try {
    return Cache.read<GeoNameCache>(locationCachePath)
  } catch { return null }
}

/** 判断缓存坐标与当前坐标的距离是否在可复用范围内（<5km） */
export function isNearby(lat1: number, lon1: number, lat2?: number, lon2?: number): boolean {
  if (!lat2 || !lon2) return false
  // 简化计算：0.05°≈5km
  return Math.abs(lat1 - lat2) < 0.05 && Math.abs(lon1 - lon2) < 0.05
}
export async function callReverseGeocode(options: { latitude: number; longitude: number; locale?: string }): Promise<any[] | null> {
  const nativeFn = (typeof Location !== "undefined" && Location.reverseGeocode) ? Location.reverseGeocode : (globalThis as any)?.reverseGeocode
  let nativeResult: any[] | null = null
  if (typeof nativeFn === "function") {
    try {
      nativeResult = await nativeFn(options)
      return nativeResult
    } catch {}
  }

  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(String(options.latitude))}&lon=${encodeURIComponent(String(options.longitude))}&accept-language=zh-CN&zoom=18&addressdetails=1`
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error("请求超时")), 5000)
  })

  try {
    const fetchPromise = fetch(url, {
      headers: {
        "User-Agent": "Scripting-CaiyunWeather-Widget/1.0",
        "Accept-Language": "zh-CN,zh;q=0.9",
      },
    })
    const response = await Promise.race([fetchPromise, timeoutPromise])
    if (!response.ok) throw new Error(`位置名称解析失败 HTTP ${response.status}`)
    const json = await response.json()
    const address = json?.address || {}
    const city = address.city || address.municipality || ""
    const town = address.town || address.village || address.suburb || ""
    const area = address.city_district || address.district || address.county || ""
    const block = address.neighbourhood || address.quarter || address.suburb || address.residential || address.city_block || address.hamlet || ""
    const road = address.road || address.pedestrian || address.footway || address.cycleway || address.path || ""
    const poi = address.amenity || address.building || address.shop || address.office || address.tourism || ""
    const fineName = road || block || poi || json?.name || ""
    const displayName = poi || block || road || area || city || json?.display_name || ""
    if (!city && !area && !displayName && !address.state) return nativeResult
    return [{
      locality: city || address.state || "",
      administrativeArea: address.state || city || "",
      subAdministrativeArea: address.county || "",
      subLocality: area,
      town: town,
      neighborhood: block,
      quarter: address.quarter || "",
      thoroughfare: road,
      subThoroughfare: address.house_number || "",
      name: displayName,
    }]
  } catch (error) {
    appendDebugLog("OpenStreetMap reverse geocode failed, trying backup service", {
      latitude: options.latitude,
      longitude: options.longitude,
      error: String(error),
    })
    try {
      const backupUrl = `https://apis.map.qq.com/ws/geocoder/v1/?location=${options.latitude},${options.longitude}&key=OB4BZ-D4WMT-UUUQA-MSPIE-6T6E5-KABBR&get_poi=0`
      const backupTimeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("备用服务请求超时")), 3000)
      })
      const backupFetchPromise = fetch(backupUrl, {
        headers: {
          "User-Agent": "Scripting-CaiyunWeather-Widget/1.0",
          "Accept-Language": "zh-CN,zh;q=0.9",
        },
      })
      const backupResponse = await Promise.race([backupFetchPromise, backupTimeoutPromise])
      if (backupResponse.ok) {
        const backupJson = await backupResponse.json()
        if (backupJson?.result?.address_component) {
          const comp = backupJson.result.address_component
          return [{
            locality: comp.city || comp.province || "",
            administrativeArea: comp.province || comp.city || "",
            subAdministrativeArea: comp.county || "",
            subLocality: comp.district || "",
            name: backupJson.result.formatted_addresses?.recommend || "",
          }]
        }
      }
    } catch (backupError) {
      appendDebugLog("Backup geocode service also failed", { error: String(backupError) })
    }

    // ─── 回退：使用缓存的地名 ───
    if (nativeResult) return nativeResult
    const cached = loadCachedGeoNames()
    if (cached && isNearby(options.latitude, options.longitude, cached.latitude, cached.longitude)) {
      appendDebugLog("geocode fallback: using cached location name", {
        cachedLat: cached.latitude,
        cachedLon: cached.longitude,
        name: cached.locality || cached.administrativeArea || cached.name,
      })
      return [{
        locality: cached.locality || "",
        administrativeArea: cached.administrativeArea || "",
        subAdministrativeArea: cached.subLocality || "",
        subLocality: cached.subLocality || "",
        name: cached.name || "",
        town: cached.town || "",
      }]
    }
    throw error
  }
}

// ─── 坐标工具 ───
export function hasValidCoordinates(data?: Partial<LocationData> | null) {
  return Boolean(
    data &&
    Number.isFinite(Number(data.latitude)) &&
    Number.isFinite(Number(data.longitude)) &&
    (Number(data.latitude) !== 0 || Number(data.longitude) !== 0)
  )
}

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export function isWeatherCacheValid(cachedWeather: WeatherInfo | null, currentLat: number, currentLon: number): boolean {
  if (!cachedWeather || !cachedWeather.cachedLatitude || !cachedWeather.cachedLongitude) return false
  if (!cachedWeather.updatedAt) return false
  const age = Date.now() - cachedWeather.updatedAt
  if (age > 30 * 60 * 1000) return false
  const distance = calculateDistance(
    cachedWeather.cachedLatitude,
    cachedWeather.cachedLongitude,
    currentLat,
    currentLon
  )
  appendDebugLog("weather cache location check", {
    cachedLat: cachedWeather.cachedLatitude,
    cachedLon: cachedWeather.cachedLongitude,
    currentLat,
    currentLon,
    distance: Math.round(distance),
    valid: distance < 5000
  })
  return distance < 5000
}

// ─── 地名解析 ───
function applyPlacemarkToLocationData(base: LocationData, placemark: any): LocationData {
  const province = String(placemark.administrativeArea || "").trim()
  const city = String(placemark.locality || "").trim()
  const district = String(placemark.subLocality || "").trim()
  const street = String(placemark.thoroughfare || "").trim()
  const streetNumber = String(placemark.subThoroughfare || "").trim()
  const poiName = String(placemark.name || "").trim()

  let streetName = street
  if (streetNumber) {
    streetName = street.includes(streetNumber) ? street : `${street}${streetNumber}`
  }

  let fineName = poiName
  if (!fineName && streetName) {
    fineName = streetName
  }

  return {
    ...base,
    administrativeArea: province,
    subAdministrativeArea: String(placemark.subAdministrativeArea || ""),
    locality: city,
    subLocality: district,
    town: String(placemark.town || "").trim(),
    neighborhood: "",
    quarter: "",
    street: streetName,
    name: fineName || streetName || district || city || province,
    resolvedAt: Date.now(),
  }
}

export async function resolveLocationNameIfNeeded(data: LocationData, force = false) {
  if (!hasValidCoordinates(data)) return data
  if (!force && (isMeaningfulName(data.locality) || isMeaningfulName(data.administrativeArea))) return data
  try {
    const placemarks = await callReverseGeocode({ latitude: Number(data.latitude), longitude: Number(data.longitude), locale: "zh-CN" })
    if (placemarks?.[0]) {
      const resolved = applyPlacemarkToLocationData(data, placemarks[0])
      Cache.write(locationCachePath, resolved)
      appendDebugLog("resolved cached location name", resolved)
      return resolved
    }
  } catch (error) {
    appendDebugLog("reverse geocode cached location failed", {
      message: String((error as any)?.message || error),
      data,
    })
  }
  return data
}

// ─── 显示文本构建 ───
export function getDisplayLocationText() {
  const loc = locationData
  if (!loc) return "未知位置"

  const hasLocationName = isMeaningfulName(loc.administrativeArea) ||
                          isMeaningfulName(loc.locality) ||
                          isMeaningfulName(loc.subLocality) ||
                          isMeaningfulName(loc.name)

  if (!hasLocationName) {
    return "请在主应用设置位置"
  }

  const province = String(loc.administrativeArea || "").trim()
  const city = String(loc.locality || "").trim()
  const district = String(loc.subLocality || loc.subAdministrativeArea || "").trim()

  const parts = []
  if (province && province !== "未知省市") parts.push(province)
  if (city && city !== province && city !== "未知省市") parts.push(city)
  if (district && district !== city && district !== province) parts.push(district)

  const town = String(loc.town || "").trim()
  if (town && !parts.includes(town)) parts.push(town)

  const candidates = [
    String(loc.neighborhood || "").trim(),
    String(loc.quarter || "").trim(),
    String(loc.street || "").trim(),
    String(loc.name || "").trim()
  ].filter(Boolean)

  const uniqueCandidates: string[] = []
  for (const item of candidates) {
    if (parts.includes(item)) continue
    if (uniqueCandidates.includes(item)) continue
    if (uniqueCandidates.some(existing => existing.includes(item))) continue
    const idx = uniqueCandidates.findIndex(existing => item.includes(existing))
    if (idx !== -1) {
      uniqueCandidates[idx] = item
    } else {
      uniqueCandidates.push(item)
    }
  }

  parts.push(...uniqueCandidates)

  return parts.join("-") || "未知位置"
}
