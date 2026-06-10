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

/**
 * ⭐ iOS 原生逆向地理编码（主源）
 * 使用 Apple 地图数据（中国区由高德提供），精确到街道级别
 * 无需 API Key，免费且可靠
 */
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

    return {
      source: "apple",
      province: pm.administrativeArea || "",
      city: pm.locality || "",
      district: pm.subLocality || "",
      subAdmin: pm.subAdministrativeArea || "",
      street: fullStreet,
      poiName: poiName,
      town: pm.subAdministrativeArea || "",
      neighborhood: areasOfInterest[0] || "",
      fullName:
        poiName ||
        fullStreet ||
        pm.subLocality ||
        pm.locality ||
        "",
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

    const res = await fetch(url)
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
// 6. ⭐ 评分系统（核心）
// =====================

function score(item: any) {
  let s = 0

  if (item.poiName) s += 50       // POI 最重要
  if (item.street) s += 35        // 街道
  if (item.town) s += 25          // 乡镇
  if (item.district) s += 20      // 区
  if (item.city) s += 10          // 城市

  if (item.poiScore && item.poiScore < 50) {
    s += 20 // 距离近的 POI 加权
  }

  return s
}

// =====================
// 7. 融合决策（关键）
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
    // 用其他来源补全缺失字段
    if (!base.street && r.street) base.street = r.street
    if (!base.poiName && r.poiName) base.poiName = r.poiName
    if (!base.neighborhood && r.neighborhood) base.neighborhood = r.neighborhood
    if (!base.town && r.town) base.town = r.town
    if (!base.district && r.district) base.district = r.district
    if (!base.city && r.city) base.city = r.city
  }

  return base
}

// =====================
// 8. 主入口（升级版）
// =====================

export async function callReverseGeocode(options: {
  latitude: number
  longitude: number
}) {

  // ⭐ 并行请求：Apple 原生（主源） + BDC（补充乡镇数据）
  const [appleRes, bdcRes] = await Promise.all([
    appleGeocode(options.latitude, options.longitude),
    bdc(options.latitude, options.longitude),
  ])

  const best = merge([appleRes, bdcRes])

  if (!best) return null

  appendDebugLog("location v3 result", best)

  return [best]
}

// =====================
// 9. 写入 LocationData
// =====================

export function applyLocation(data: LocationData, geo: any): LocationData {
  const street = geo.street || ""
  const poiName = geo.poiName || ""
  const district = geo.district || ""
  const city = geo.city || ""
  const town = geo.town || ""
  const neighborhood = geo.neighborhood || ""
  const quarter = geo.quarter || ""

  // ⭐ name 优先级：POI > 街道 > 小区 > 乡镇 > 区县（避免与 subLocality 重复）
  const nameCandidates = [poiName, street, neighborhood, town]
  let name = nameCandidates.find(Boolean) || ""
  if (!name && district && district !== (data.subLocality || "")) {
    name = district
  }
  if (!name) name = city || ""

  return {
    ...data,

    administrativeArea: geo.province || data.administrativeArea || "",
    locality: geo.city || data.locality || "",
    subLocality: geo.district || data.subLocality || "",

    // ⭐ 不覆盖已有数据：新值为空时保留旧值
    town: town || data.town || "",
    street: street || data.street || "",
    poiName: poiName || data.poiName || "",
    neighborhood: neighborhood || data.neighborhood || "",
    quarter: quarter || data.quarter || "",

    name,

    resolvedAt: Date.now(),
  }
}

// =====================
// 10. 工具函数（缺失的导出）
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

/**
 * 获取当前定位的显示文本
 * 从 storage 中读取已解析的地名数据，按优先级拼接
 * 自动去重：当 name 与 subLocality 相同时不重复显示
 */
export function getDisplayLocationText(): string {
  try {
    const data = Storage.get(LOCATION_CACHE_KEY) as any
    if (!data) return "定位中..."

    const name = String(data.name || "").trim()
    const street = String(data.street || "").trim()
    const neighborhood = String(data.neighborhood || "").trim()
    const town = String(data.town || "").trim()
    const subLocality = String(data.subLocality || "").trim()
    const locality = String(data.locality || "").trim()
    const admin = String(data.administrativeArea || "").trim()

    // 辅助：判断两个字符串是否本质上相同（去空格后一致，或互相包含）
    const isSame = (a: string, b: string) => {
      if (!a || !b) return false
      const na = a.replace(/[\s·,，]/g, "")
      const nb = b.replace(/[\s·,，]/g, "")
      return na === nb || na.includes(nb) || nb.includes(na)
    }

    // 辅助：拼接两段不重复的文本
    const joinDistinct = (a: string, b: string, sep = " · ") => {
      if (!a) return b
      if (!b) return a
      if (isSame(a, b)) return a
      return `${a}${sep}${b}`
    }

    // ⭐ 中文地址习惯从大到小：市 · 区 · 镇 · 精细名
    // 先收集所有层级，再去重拼接
    const parts: string[] = []

    // 行政区划：市 > 区 > 镇（从大到小，去重）
    if (locality && !parts.some(p => isSame(p, locality))) parts.push(locality)
    if (subLocality && !parts.some(p => isSame(p, subLocality))) parts.push(subLocality)
    if (town && !isSame(town, subLocality) && !parts.some(p => isSame(p, town))) parts.push(town)

    // 精细名（POI / 街道 / 小区）追加在最后
    const fineName = name || street || neighborhood
    if (fineName && !parts.some(p => isSame(p, fineName))) parts.push(fineName)

    if (parts.length > 0) return parts.join(" · ")
    if (locality) {
      if (isSame(locality, admin)) return locality
      return joinDistinct(locality, admin)
    }
    if (admin) return admin

    return "定位中..."
  } catch {
    return "定位中..."
  }
}

/**
 * ⭐ iOS 原生逆向地理编码（返回 Apple CLPlacemark 风格的字段）
 * 用于主应用页面设置定位时的地名解析
 */
export async function reverseGeocodeOSM(lat: number, lon: number): Promise<any> {
  try {
    const placemarks = await Location.reverseGeocode({
      latitude: lat,
      longitude: lon,
      locale: "zh-CN",
    })

    const pm = placemarks?.[0]
    if (!pm) return null

    return {
      administrativeArea: pm.administrativeArea || "",
      subAdministrativeArea: pm.subAdministrativeArea || "",
      locality: pm.locality || "",
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
// 11. 缓存优化
// =====================

export function loadCache() {
  return Cache.read<LocationData>(locationCachePath)
}

export function saveCache(data: LocationData) {
  Cache.write(locationCachePath, data)
}

// =====================
// 12. 对外接口
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
      // ⭐ 需要有精细地名（name 与 town 不同）才复用缓存
      // 如果 name 缺失或等于 town，说明之前解析不够精确（Apple 可能失败过），需要重新解析
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