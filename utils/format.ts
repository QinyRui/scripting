/**
 * 🌤️ 彩云天气 - 格式化工具
 * 从 widget.tsx 拆分
 */
import { greetingText } from "./constants"

export function provideGreeting(d: Date) {
  const h = d.getHours()
  if (h < 5 || h >= 23) return greetingText.nightGreeting
  if (h < 11) return greetingText.morningGreeting
  if (h < 13) return greetingText.noonGreeting
  if (h < 18) return greetingText.afternoonGreeting
  return greetingText.nightText
}

export function getDateStr(d: Date) {
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
}

export function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`
}

export function getWindLevel(speed: number) {
  if (speed < 1) return "0级"
  if (speed < 6) return "1级"
  if (speed < 12) return "2级"
  if (speed < 20) return "3级"
  if (speed < 29) return "4级"
  if (speed < 39) return "5级"
  if (speed < 50) return "6级"
  if (speed < 62) return "7级"
  if (speed < 75) return "8级"
  if (speed < 89) return "9级"
  if (speed < 103) return "10级"
  if (speed < 118) return "11级"
  return "12级"
}

export function getWindDirection(direction: number) {
  if (direction < 22.5) return "北风"
  if (direction < 67.5) return "东北风"
  if (direction < 112.5) return "东风"
  if (direction < 157.5) return "东南风"
  if (direction < 202.5) return "南风"
  if (direction < 247.5) return "西南风"
  if (direction < 292.5) return "西风"
  if (direction < 337.5) return "西北风"
  return "北风"
}

export function airQuality(v: number) {
  if (v <= 50) return "优秀"
  if (v <= 100) return "良好"
  if (v <= 150) return "轻度"
  if (v <= 200) return "中度"
  if (v <= 300) return "重度"
  return "严重"
}

export function getWeekOfYear(d: Date) {
  const D = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = D.getUTCDay() || 7
  D.setUTCDate(D.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(D.getUTCFullYear(), 0, 1))
  return Math.ceil((((D.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

export function getDayOfYear(d: Date) {
  return Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24)
}

export function formatUpdateTime(timestamp?: number) {
  if (!timestamp || !Number.isFinite(timestamp)) return "--:--"
  const date = new Date(timestamp)
  return `${date.getHours()}:${pad(date.getMinutes())}`
}

export function getNoRainFriendlyText(now: Date) {
  const h = now.getHours()
  if (h < 5 || h >= 23) return "未来两小时不会有雨，夜深了早点休息～"
  if (h < 11) return "未来两小时不会有雨，早上出门放心哦～"
  if (h < 13) return "未来两小时不会有雨，中午安心出行哦～"
  if (h < 18) return "未来两小时不会有雨，下午出门放心哦～"
  return "未来两小时不会有雨，晚上出门放心哦～"
}

export function shortenWeatherDesc(text: string, widgetType: "medium" | "large") {
  const normalized = String(text || "").replace(/\s+/g, " ").trim()
  if (!normalized) return "..."
  const friendlyNoRainText = getNoRainFriendlyText(new Date())
  if (/未来两小时不会有雨|未来两小时不会下雨|2小时内无雨|两小时内无雨/u.test(normalized)) return friendlyNoRainText
  let restored = normalized
    .replace(/^2小时内/u, "未来两小时")
    .replace(/^两小时内/u, "未来两小时")
    .replace(/不会下雨/u, "不会有雨")
    .replace(/无雨/u, "不会有雨")

  if (widgetType === "large") return restored

  restored = restored
    .replace(/还在加班么？/u, "")
    .replace(/您/u, "")
    .replace(/呢\?*/u, "")
    .replace(/[，！？]$/u, "")
    .trim()

  if (restored.length > 25) {
    restored = restored
      .replace(/最近的降雨带在/u, "降雨带在")
      .replace(/公里外呢/u, "公里外")
  }

  return restored
}

export function getNextMidnightDate(now: Date) {
  const midnight = new Date(now)
  midnight.setHours(24, 0, 0, 0)
  return midnight
}

export function getNextWidgetReloadDate(now: Date, refreshMinutes: number, forceReload = false) {
  if (forceReload) return new Date(now.getTime() + 60 * 1000)
  const intervalDate = new Date(now.getTime() + refreshMinutes * 60 * 1000)
  const midnightDate = getNextMidnightDate(now)
  const inMidnightWindow = now.getHours() === 23 && now.getMinutes() >= 55
  const justAfterMidnight = now.getHours() === 0 && now.getMinutes() <= 5
  const midnightWindowDate = new Date(now.getTime() + (justAfterMidnight ? 2 : 1) * 60 * 1000)
  if (inMidnightWindow || justAfterMidnight) return midnightWindowDate
  return intervalDate.getTime() < midnightDate.getTime() ? intervalDate : midnightDate
}

export function getWeatherIconColor(icon: string) {
  if (icon.includes("sun") || icon.includes("sunrise") || icon.includes("sunset")) return "#ffd166"
  if (icon.includes("cloud.sun")) return "#ffc857"
  if (icon.includes("cloud")) return "#9bd7ff"
  if (icon.includes("rain") || icon.includes("drop")) return "#70c8ff"
  if (icon.includes("snow")) return "#d7f3ff"
  if (icon.includes("wind")) return "#b8f7d4"
  if (icon.includes("bolt")) return "#ffe066"
  return "#ffd166"
}
