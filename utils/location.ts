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
  appendDebugLog("reverse geocode start", { latitude: options.latitude, longitude: options.longitude })

  // ─── 第1优先：BigDataCloud（免费、无需key、国内可用） ───
  try {
    const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${options.latitude}&longitude=${options.longitude}&localityLanguage=zh`
    const bdcResp = await Promise.race([
      fetch(bdcUrl, { headers: { "User-Agent": "CaiyunWeather/1.0" } }),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("bdc timeout")), 8000)),
    ])
    if (bdcResp.ok) {
      const bdcJson = await bdcResp.json()
      if (bdcJson.city || bdcJson.locality || bdcJson.principalSubdivision) {
        // 从 localityInfo 中提取更详细的地名
        const admins = bdcJson.localityInfo?.administrative || []
        const town = admins.find((a: any) => a.adminLevel === 8)?.name || ""
        appendDebugLog("bigdatacloud reverseGeocode succeeded", { city: bdcJson.city, locality: bdcJson.locality })
        return [{
          locality: bdcJson.city || "",
          administrativeArea: bdcJson.principalSubdivision || bdcJson.city || "",
          subAdministrativeArea: bdcJson.locality || "",
          subLocality: bdcJson.locality || "",
          town: town,
          neighborhood: "",
          quarter: "",
          thoroughfare: "",
          subThoroughfare: "",
          name: bdcJson.locality || bdcJson.city || bdcJson.principalSubdivision || "",
        }]
      }
    }
    appendDebugLog("bigdatacloud reverseGeocode empty, trying next service", { status: bdcResp.ok ? "ok" : "fail" })
  } catch (err) {
    appendDebugLog("bigdatacloud reverseGeocode failed", { error: String(err) })
  }

  // ─── 第2优先：高德地图 ───
  try {
    const amapUrl = `https://restapi.amap.com/v3/geocode/regeo?key=c90e620d06144fcb7e08dfc48ea95d4c&location=${options.longitude},${options.latitude}&language=zh_CN&extensions=base`
    const amapResp = await Promise.race([
      fetch(amapUrl, { headers: { "User-Agent": "CaiyunWeather/1.0" } }),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("amap timeout")), 8000)),
    ])
    if (amapResp.ok) {
      const amapJson = await amapResp.json()
      if (amapJson.status === "1" && amapJson.regeocode) {
        const comp = amapJson.regeocode.addressComponent || {}
        const addr = amapJson.regeocode.formatted_address || ""
        appendDebugLog("amap reverseGeocode succeeded", { address: addr })
        return [{
          locality: comp.city || comp.province || "",
          administrativeArea: comp.province || comp.city || "",
          subAdministrativeArea: comp.district || "",
          subLocality: comp.district || "",
          town: comp.township || "",
          neighborhood: comp.neighborhood || "",
          quarter: "",
          thoroughfare: comp.streetNumber?.street || "",
          subThoroughfare: comp.streetNumber?.number || "",
          name: addr || comp.district || comp.city || comp.province || "",
        }]
      }
    }
  } catch (err) {
    appendDebugLog("amap reverseGeocode failed", { error: String(err) })
  }

  // ─── 第3优先：缓存的地名 ───
  const cached = loadCachedGeoNames()
  if (cached && isNearby(options.latitude, options.longitude, cached.latitude, cached.longitude)) {
    appendDebugLog("geocode fallback: using cached location name")
    return [{
      locality: cached.locality || "",
      administrativeArea: cached.administrativeArea || "",
      subAdministrativeArea: cached.subLocality || "",
      subLocality: cached.subLocality || "",
      name: cached.name || "",
      town: cached.town || "",
    }]
  }

  appendDebugLog("all reverse geocode services failed")
  return null
}

// ─── 独立的逆向地理编码（供主应用直接调用，优先BigDataCloud） ───
export async function reverseGeocodeOSM(latitude: number, longitude: number): Promise<any> {
  // 优先 BigDataCloud（免费、无需key、国内可用）
  try {
    const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=zh`
    const bdcResp = await Promise.race([
      fetch(bdcUrl, { headers: { "User-Agent": "CaiyunWeather/1.0" } }),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("bdc timeout")), 8000)),
    ])
    if (bdcResp.ok) {
      const bdcJson = await bdcResp.json()
      if (bdcJson.city || bdcJson.locality || bdcJson.principalSubdivision) {
        const admins = bdcJson.localityInfo?.administrative || []
        const town = admins.find((a: any) => a.adminLevel === 8)?.name || ""
        appendDebugLog("reverseGeocodeOSM: bigdatacloud succeeded", { city: bdcJson.city, locality: bdcJson.locality })
        return {
          locality: bdcJson.city || "",
          administrativeArea: bdcJson.principalSubdivision || bdcJson.city || "",
          subAdministrativeArea: bdcJson.locality || "",
          subLocality: bdcJson.locality || "",
          town: town,
          neighborhood: "",
          quarter: "",
          thoroughfare: "",
          subThoroughfare: "",
          name: bdcJson.locality || bdcJson.city || bdcJson.principalSubdivision || "",
        }
      }
    }
  } catch (error) {
    appendDebugLog("reverseGeocodeOSM: bigdatacloud failed", { error: String(error) })
  }
  // 回退到 OpenStreetMap
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(String(latitude))}&lon=${encodeURIComponent(String(longitude))}&accept-language=zh-CN&zoom=18&addressdetails=1`
    const response = await Promise.race([
      fetch(url, { headers: { "User-Agent": "CaiyunWeather/1.0", "Accept-Language": "zh-CN,zh;q=0.9" } }),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("osm timeout")), 10000)),
    ])
    if (response.ok) {
      const json = await response.json()
      const address = json?.address || {}
      const city = address.city || address.municipality || ""
      const area = address.city_district || address.district || address.county || ""
      const road = address.road || ""
      const block = address.neighbourhood || address.quarter || address.suburb || ""
      const poi = address.amenity || address.building || ""
      const displayName = poi || block || road || area || city || json?.display_name || ""
      if (city || area || displayName) {
        appendDebugLog("reverseGeocodeOSM: osm succeeded")
        return {
          locality: city || address.state || "",
          administrativeArea: address.state || city || "",
          subAdministrativeArea: address.county || "",
          subLocality: area,
          town: address.town || address.village || address.suburb || "",
          neighborhood: block,
          quarter: address.quarter || "",
          thoroughfare: road,
          subThoroughfare: address.house_number || "",
          name: displayName,
        }
      }
    }
  } catch (error) {
    appendDebugLog("reverseGeocodeOSM: osm failed", { error: String(error) })
  }
  return null
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
    return "当前位置"
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
