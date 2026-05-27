/**
 * 🌤️ 彩云天气 - 缓存/配置/样式
 * 从 widget.tsx 拆分
 */
import { Device } from "scripting"
import type { StyleConfig, LocationData } from "./types"
import {
  scriptName,
  documentsDir,
  appGroupDir,
  keyCachePath,
  keyCachePathAppGroup,
  locCachePath,
  styleCachePath,
  styleCachePathAppGroup,
  weatherCachePath,
  locationCachePath,
  widgetDebugLogPath,
  widgetReloadControlPath,
  getBgMetaPath,
  getPreferredBgPath,
  getLegacyBgPath,
  LOCATION_CACHE_KEY,
} from "./constants"

declare const FileManager: any

// ─── 通用文件操作 ───
export const Cache = {
  read<T = any>(path: string): T | null {
    if (!FileManager.existsSync(path)) return null
    try {
      return JSON.parse(FileManager.readAsStringSync(path)) as T
    } catch {
      return null
    }
  },
  write(path: string, data: any) {
    FileManager.writeAsStringSync(path, JSON.stringify(data))
  },
}

export function readJson<T>(path: string): T | null {
  if (!FileManager.existsSync(path)) return null
  try {
    return JSON.parse(FileManager.readAsStringSync(path)) as T
  } catch {
    return null
  }
}

// ─── 调试日志 ───
export function appendDebugLog(message: string, payload?: unknown) {
  try {
    const line = `[${new Date().toISOString()}] ${message}${payload !== undefined ? ` ${JSON.stringify(payload)}` : ""}`
    console.log(line)
    const current = FileManager.existsSync(widgetDebugLogPath) ? FileManager.readAsStringSync(widgetDebugLogPath) : ""
    const next = `${current}${current ? "\n" : ""}${line}`
    const rows = next.split("\n")
    FileManager.writeAsStringSync(widgetDebugLogPath, rows.slice(-120).join("\n"))
  } catch {}
}

// ─── 刷新控制 ───
export function getWidgetReloadControl() {
  return readJson<{
    requestedAt?: number
    source?: string
    scriptName?: string
  }>(widgetReloadControlPath)
}

export function hasRecentForceReloadRequest(now: number) {
  const control = getWidgetReloadControl()
  if (!control?.requestedAt) return false
  const burstUntil = Number((control as any).burstUntil || 0)
  if (burstUntil && now <= burstUntil) return true
  return now - Number(control.requestedAt) <= 10 * 60 * 1000
}

// ─── API Key ───
export function getSavedApiKey(): string | null {
  const appGroupKey = readJson<{ apiKey?: string }>(keyCachePathAppGroup)?.apiKey
  if (appGroupKey && String(appGroupKey).trim()) return String(appGroupKey).trim()

  const documentKey = readJson<{ apiKey?: string }>(keyCachePath)?.apiKey
  if (documentKey && String(documentKey).trim()) {
    Cache.write(keyCachePathAppGroup, { apiKey: String(documentKey).trim() })
    return String(documentKey).trim()
  }
  return null
}

// ─── 设备指纹 ───
export function getDeviceId(): string {
  try {
    return `${Device.model}-${Device.screen.width}x${Device.screen.height}@${Device.screen.scale}-${Device.systemVersion}`
  } catch {
    return "unknown"
  }
}

// ─── 样式配置 ───
export function getSavedStyleConfig(): StyleConfig {
  const documentStyle = readJson<StyleConfig>(styleCachePath)
  const appGroupStyle = readJson<StyleConfig>(styleCachePathAppGroup)

  if (documentStyle) {
    Cache.write(styleCachePathAppGroup, documentStyle)
    return documentStyle
  }
  if (appGroupStyle) return appGroupStyle

  return { global: { size: 1.0 } }
}

// ─── 模块级状态（可变）───
export let styleConfig = getSavedStyleConfig()
export function updateStyleConfig(v: StyleConfig) { styleConfig = v }

export let locationData: LocationData = { latitude: 0, longitude: 0, locality: "等待定位", subLocality: "" }
export function updateLocationData(v: LocationData) { locationData = v }

// ─── 样式工具 ───
export function s(size: number, type?: string) {
  let scale = 1.0
  if (type && styleConfig[type] && styleConfig[type].size !== undefined) {
    scale = styleConfig[type].size
  } else if (styleConfig.global && styleConfig.global.size !== undefined) {
    scale = styleConfig.global.size
  }
  return Math.round(size * scale)
}

export function isReadableConfiguredColor(value: string) {
  const color = String(value || "").trim().toLowerCase()
  if (!color || color === "transparent") return false
  if (color.startsWith("rgba")) {
    const parts = color.match(/[\d.]+/g)?.map(Number) || []
    const alpha = parts[3] ?? 1
    if (alpha < 0.35) return false
    const [r = 255, g = 255, b = 255] = parts
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.28
  }
  if (color.startsWith("rgb")) {
    const [r = 255, g = 255, b = 255] = color.match(/[\d.]+/g)?.map(Number) || []
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.28
  }
  if (/^#[0-9a-f]{3}$/i.test(color)) {
    const r = parseInt(color[1] + color[1], 16)
    const g = parseInt(color[2] + color[2], 16)
    const b = parseInt(color[3] + color[3], 16)
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.28
  }
  if (/^#[0-9a-f]{6}$/i.test(color)) {
    const r = parseInt(color.slice(1, 3), 16)
    const g = parseInt(color.slice(3, 5), 16)
    const b = parseInt(color.slice(5, 7), 16)
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.28
  }
  return true
}

export function c(defaultColor: string, type?: string) {
  const configuredColor = type && styleConfig[type] && styleConfig[type].color ? String(styleConfig[type].color) : ""
  if (configuredColor && isReadableConfiguredColor(configuredColor)) return configuredColor
  return defaultColor
}

export function clampLayoutOffset(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(-8, Math.min(8, value))
}

export function offsetStyle(widgetType: "medium" | "large", sideType: "left" | "right") {
  const offset = styleConfig.layout?.[widgetType]?.[sideType]
  const x = clampLayoutOffset(offset?.x || 0)
  const y = clampLayoutOffset(offset?.y || 0)
  return {
    padding: {
      leading: x > 0 ? x : 0,
      trailing: x < 0 ? -x : 0,
      top: y > 0 ? y : 0,
      bottom: y < 0 ? -y : 0,
    },
  }
}

// ─── 背景图 ───
export function getBackgroundPath(family: string) {
  const meta = readJson<{ path?: string; fallbackPath?: string }>(getBgMetaPath(family))
  if (meta?.path && FileManager.existsSync(meta.path)) return meta.path
  if (meta?.fallbackPath && FileManager.existsSync(meta.fallbackPath)) return meta.fallbackPath
  if (FileManager.existsSync(getPreferredBgPath(family))) return getPreferredBgPath(family)
  if (FileManager.existsSync(getLegacyBgPath(family))) return getLegacyBgPath(family)
  return null
}

export async function ensureBackgroundMigrated() {
  const families = ["systemMedium", "systemLarge"]
  for (const family of families) {
    try {
      const preferred = getPreferredBgPath(family)
      const legacy = getLegacyBgPath(family)
      const meta = getBgMetaPath(family)
      if (!FileManager.existsSync(preferred) && FileManager.existsSync(legacy)) {
        FileManager.copyFileSync(legacy, preferred)
      }
      if (!FileManager.existsSync(meta) && FileManager.existsSync(preferred)) {
        Cache.write(meta, {
          path: preferred,
          fallbackPath: preferred,
          updatedAt: Date.now(),
        })
      }
    } catch {}
  }
}
