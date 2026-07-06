/**
 * 🌍 ios原生地图定位
 */

import type { LocationData } from "./types"
import { Cache, appendDebugLog } from "./storage"
import { locationCachePath, LOCATION_CACHE_KEY } from "./constants"

declare const fetch: any

// =====================
// 1. 基础工具
// =====================

export function isValid(v: any) {
  return v !== undefined && v !== null && String(v).trim() !== ""
}

export function distance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// =====================
// 2. 直辖市列表
// =====================

const MUNICIPALITIES = ["上海市", "北京市", "天津市", "重庆市"]

// =====================
// 3. Apple 逆向地理编码（主源）
// =====================

async function appleGeocode(lat: number, lon: number) {
  try {
    const placemarks = await Location.reverseGeocode({
      latitude: lat,
      longitude: lon,
      locale: "zh-CN",
    })

    const pm = placemarks?.[0]
    if (!pm) return null

    const street = pm.thoroughfare || ""
    const number = pm.subThoroughfare || ""
    const fullStreet = street + (number ? number + "号" : "")
    const poiName = pm.name || ""
    const areasOfInterest = pm.areasOfInterest || []
    const city = pm.locality || ""
    let province = pm.administrativeArea || ""

    // ⭐ 直辖市省份修正
    if (city && province && MUNICIPALITIES.includes(city) && province !== city) {
      appendDebugLog("appleGeocode: corrected province", { city, wrongProvince: province })
      province = city
    }

    return {
      source: "apple",
      province,
      city,
      district: pm.subLocality || "",
      subAdmin: pm.subAdministrativeArea || "",
      street: fullStreet,
      poiName,
      town: pm.subAdministrativeArea || "",
      neighborhood: areasOfInterest[0] || "",
      fullName: poiName || fullStreet || pm.subLocality || city || "",
    }
  } catch {
    return null
  }
}

// =====================
// 4. BigDataCloud（行政补充）
// =====================

async function bdc(lat: number, lon: number) {
  try {
    const url =
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=zh`

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 5000)
    const res = await fetch(url, { signal: controller.signal as any })
    clearTimeout(timer)
    const json = await res.json()

    if (!json?.city && !json?.locality) return null

    // ⭐ 从 localityInfo 中提取乡镇级数据
    const adminList = json.localityInfo?.administrative || []
    const town = adminList.find((a: any) => a.adminLevel >= 8 && a.adminLevel <= 9)?.name || ""

    return {
      source: "bdc",
      city: json.city || "",
      district: json.locality || "",
      province: json.principalSubdivision || "",
      town,
      fullName: json.locality || json.city || "",
    }
  } catch {
    return null
  }
}

// =====================
// 5. 评分系统
// =====================

function score(item: any) {
  let s = 0
  if (item.poiName) s += 50
  if (item.street) s += 35
  if (item.town) s += 25
  if (item.district) s += 20
  if (item.city) s += 10
  if (item.poiScore && item.poiScore < 50) s += 20
  return s
}

// =====================
// 6. 融合决策
// =====================

function merge(results: any[]) {
  const valid = results.filter(Boolean)
  if (valid.length === 0) return null
  if (valid.length === 1) return valid[0]

  // ⭐ 多源合并：以最高分来源为主体，用其他来源补全缺失字段
  valid.sort((a, b) => score(b) - score(a))
  const base = { ...valid[0] }

  for (let i = 1; i < valid.length; i++) {
    const r = valid[i]
    if (!base.street && r.street) base.street = r.street
    if (!base.poiName && r.poiName) base.poiName = r.poiName
    if (!base.neighborhood && r.neighborhood) base.neighborhood = r.neighborhood
    if (!base.town && r.town) base.town = r.town
    if (!base.district && r.district) base.district = r.district
    if (!base.city && r.city) base.city = r.city
    if (!base.province && r.province) base.province = r.province
  }

  // ⭐ 直辖市省份修正
  if (base.city && base.province) {
    if (MUNICIPALITIES.includes(base.city) && base.province !== base.city) {
      appendDebugLog("merge: corrected province for municipality", {
        city: base.city, wrongProvince: base.province,
      })
      base.province = base.city
    }
  }

  // ⭐ town 冲突解决：仅当其他来源与 base 城市一致时才覆盖
  if (base.town && valid.length > 1) {
    const otherWithTown = valid.find((r: any) => r !== base && r.town && r.town !== base.town)
    if (otherWithTown) {
      const cityMatch = !base.city || !otherWithTown.city ||
        base.city === otherWithTown.city ||
        base.city.includes(otherWithTown.city) ||
        otherWithTown.city.includes(base.city)
      if (cityMatch) {
        appendDebugLog("merge: town conflict resolved", {
          appleTown: base.town, otherTown: otherWithTown.town, kept: otherWithTown.town,
        })
        base.town = otherWithTown.town
      } else {
        appendDebugLog("merge: town conflict kept base (city mismatch)", {
          baseCity: base.city, otherCity: otherWithTown.city,
        })
      }
    }
  }

  return base
}

// =====================
// 7. 主入口
// =====================

export async function callReverseGeocode(options: {
  latitude: number
  longitude: number
}) {
  const [appleRes, bdcRes] = await Promise.allSettled([
    appleGeocode(options.latitude, options.longitude),
    bdc(options.latitude, options.longitude),
  ])

  const results = [
    appleRes.status === "fulfilled" ? appleRes.value : null,
    bdcRes.status === "fulfilled" ? bdcRes.value : null,
  ].filter(Boolean)

  if (results.length === 0) return null

  const best = merge(results)
  if (!best) return null

  appendDebugLog("location v3 result", best)
  return [best]
}

// =====================
// 8. 写入 LocationData（完全覆盖策略）
// =====================

export function applyLocation(data: LocationData, geo: any): LocationData {
  const street = geo.street || ""
  const poiName = geo.poiName || ""
  const district = geo.district || ""
  const city = geo.city || ""
  const town = geo.town || ""
  const neighborhood = geo.neighborhood || ""
  const quarter = geo.quarter || ""

  // ⭐ name 优先级：POI > 街道 > 小区 > 乡镇 > 区县
  const nameCandidates = [poiName, street, neighborhood, town]
  let name = nameCandidates.find(Boolean) || ""
  if (!name && district && district !== (data.subLocality || "")) {
    name = district
  }
  if (!name) name = city || ""

  // ⭐ 直辖市省份修正
  let province = geo.province || ""
  if (city && province && MUNICIPALITIES.includes(city) && province !== city) {
    appendDebugLog("applyLocation: corrected province", { city, wrongProvince: province })
    province = city
  }

  // ⭐ 完全覆盖策略：只保留坐标，所有地名字段完全使用新解析结果
  return {
    latitude: data.latitude,
    longitude: data.longitude,
    horizontalAccuracy: data.horizontalAccuracy || 0,

    administrativeArea: province,
    locality: city,
    subLocality: district,
    town,
    street,
    poiName,
    neighborhood,
    quarter,
    name,
    resolvedAt: Date.now(),
  }
}

// =====================
// 9. 工具函数
// =====================

/** 检查 LocationData 是否包含有效坐标 */
export function hasValidCoordinates(data: any): boolean {
  if (!data) return false
  const lat = Number(data.latitude)
  const lon = Number(data.longitude)
  return Number.isFinite(lat) && Number.isFinite(lon) && lat !== 0 && lon !== 0
}

/** 检查两个坐标是否在指定距离内（默认 3000m） */
export function isNearby(lat1: number, lon1: number, lat2: number, lon2: number, threshold = 3000): boolean {
  return distance(lat1, lon1, lat2, lon2) < threshold
}

/** 检查地名是否有意义（非空且不是纯数字或无意义值） */
export function isMeaningfulName(name: any): boolean {
  if (!name) return false
  const s = String(name).trim()
  if (s === "" || s === "0" || s === "-" || s === "--" || s === "--") return false
  return s.length >= 2
}

/** 计算两点间距离（米），与 distance 函数相同，用于外部调用 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  return distance(lat1, lon1, lat2, lon2)
}

/** 检查天气缓存是否有效（简单版本：存在且不超过 30 分钟） */
export function isWeatherCacheValid(cachedAt: number | undefined, maxAgeMs = 30 * 60 * 1000): boolean {
  if (!cachedAt) return false
  return Date.now() - cachedAt < maxAgeMs
}

// =====================
// 10. 显示文本（从大到小排列）
// =====================

/**
 * 获取当前定位的显示文本（自适应单/双行）
 * 地理层级严格从大到小：省级 > 市级 > 区级 > 镇级 > 街道 > POI
 */
export type LocationDisplay =
  | { mode: "single"; text: string }
  | { mode: "two-line"; admin: string; fine: string }

export function getDisplayLocationText(widgetType: "medium" | "large" = "medium"): LocationDisplay {
  try {
    const data = Storage.get(LOCATION_CACHE_KEY) as any
    if (!data) return { mode: "single", text: "定位中..." }

    const name = String(data.name || "").trim()
    const street = String(data.street || "").trim()
    const neighborhood = String(data.neighborhood || "").trim()
    const town = String(data.town || "").trim()
    const subLocality = String(data.subLocality || "").trim()
    const locality = String(data.locality || "").trim()
    const admin = String(data.administrativeArea || "").trim()

    // 辅助：判断两个字符串是否本质上相同
    const isSame = (a: string, b: string) => {
      if (!a || !b) return false
      const na = a.replace(/[\s·,，]/g, "")
      const nb = b.replace(/[\s·,，]/g, "")
      return na === nb || na.includes(nb) || nb.includes(na)
    }

    // ⭐ 第一行：行政层级，严格从大到小：省/直辖市 > 市/区 > 区/县 > 镇/乡 > 街道
    const adminParts: string[] = []

    // 省级（如：东京、山东省）
    if (admin && !adminParts.some(p => isSame(p, admin))) adminParts.push(admin)
    // 市级（如：墨田区、上海）
    if (locality && !adminParts.some(p => isSame(p, locality))) adminParts.push(locality)
    // 区级（如：两国、宝山区）
    if (subLocality && !adminParts.some(p => isSame(p, subLocality))) adminParts.push(subLocality)
    // 镇级（如：罗店镇）
    if (town && !adminParts.some(p => isSame(p, town))) adminParts.push(town)

    let adminLine = adminParts.join(" · ")

    // 兜底：如果所有字段都为空
    if (!adminLine) {
      if (locality) adminLine = locality
      else if (admin) adminLine = admin
      else adminLine = "定位中..."
    }

    // ⭐ 第二行（精细名）：POI / 街道 / 小区
    const fineName = name || street || neighborhood
    const fineLine = fineName && !adminParts.some(p => isSame(p, fineName)) ? fineName : ""

    // ⭐ 根据 widget 尺寸和文本总长度决定单/双行
    const cjkWidth = (s: string) => {
      let w = 0
      for (const ch of s) {
        w += /[\u4e00-\u9fff\u3400-\u4dbf\uff00-\uffef]/.test(ch) ? 1 : 0.5
      }
      return w
    }
    const threshold = widgetType === "large" ? 16 : 18
    const combinedWidth = cjkWidth(adminLine) + (fineLine ? cjkWidth(` · ${fineLine}`) : 0)

    if (fineLine && combinedWidth > threshold) {
      return { mode: "two-line", admin: adminLine, fine: fineLine }
    } else {
      const text = fineLine ? `${adminLine} · ${fineLine}` : adminLine
      return { mode: "single", text }
    }
  } catch {
    return { mode: "single", text: "定位中..." }
  }
}

// =====================
// 11. 主应用页面使用的逆向地理编码
// =====================

export async function reverseGeocodeOSM(lat: number, lon: number): Promise<any> {
  try {
    const placemarks = await Location.reverseGeocode({
      latitude: lat,
      longitude: lon,
      locale: "zh-CN",
    })

    const pm = placemarks?.[0]
    if (!pm) return null

    let administrativeArea = pm.administrativeArea || ""
    const locality = pm.locality || ""

    // ⭐ 直辖市省份修正
    if (locality && administrativeArea && MUNICIPALITIES.includes(locality) && administrativeArea !== locality) {
      administrativeArea = locality
    }

    return {
      administrativeArea,
      subAdministrativeArea: pm.subAdministrativeArea || "",
      locality,
      subLocality: pm.subLocality || "",
      thoroughfare: pm.thoroughfare || "",
      subThoroughfare: pm.subThoroughfare || "",
      neighborhood: (pm.areasOfInterest || [])[0] || "",
      quarter: "",
      name: pm.name || "",
      display_name: pm.name || pm.thoroughfare || pm.locality || "",
    }
  } catch {
    return null
  }
}

// =====================
// 12. 缓存优化
// =====================

export function loadCache() {
  return Cache.read<LocationData>(locationCachePath)
}

export function saveCache(data: LocationData) {
  Cache.write(locationCachePath, data)
}

// =====================
// 13. 对外接口
// =====================

export async function resolveLocationNameIfNeeded(data: LocationData, force = false) {

  if (!data?.latitude || !data?.longitude) return data

  const cached = loadCache()

  if (!force && cached) {
    const dist = distance(
      data.latitude,
      data.longitude,
      cached.latitude,
      cached.longitude
    )
    // 80m 内尝试复用缓存
    if (dist < 80) {
      const hasFineName = (cached.name && cached.name !== cached.town) || cached.street || cached.neighborhood
      if (hasFineName) {
        return cached
      }
    }
  }

  const geo = await callReverseGeocode({
    latitude: data.latitude,
    longitude: data.longitude,
  })

  if (!geo?.[0]) return data

  const updated = applyLocation(data, geo[0])

  saveCache(updated)

  return updated
}
