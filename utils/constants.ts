/**
 * 🌤️ 彩云天气 - 常量与路径
 * 从 widget.tsx 拆分
 */
import { Script } from "scripting"

declare const FileManager: any

// ─── 基础配置 ───
export const colorMode = false
export const bgColorStr = "#000000"

// ─── 星期/历法数组 ───
export const weekTitle = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"]
export const weekTitleShort = ["日", "一", "二", "三", "四", "五", "六"]
export const zodiacAnimals = ["鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"]
export const heavenlyStems = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]
export const earthlyBranches = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]
export const yellowBlackDays = ["建", "除", "满", "平", "定", "执", "破", "危", "成", "收", "开", "闭"]
export const twentyEightMansions = ["角", "亢", "氐", "房", "心", "尾", "箕", "斗", "牛", "女", "虚", "危", "室", "壁", "奎", "娄", "胃", "昴", "毕", "觜", "参", "井", "鬼", "柳", "星", "张", "翼", "轸"]
export const solarTerms = ["小寒", "大寒", "立春", "雨水", "惊蛰", "春分", "清明", "谷雨", "立夏", "小满", "芒种", "夏至", "小暑", "大暑", "立秋", "处暑", "白露", "秋分", "寒露", "霜降", "立冬", "小雪", "大雪", "冬至"]
export const solarTermOffsets = [0, 21208, 42467, 63836, 85337, 107014, 128867, 150921, 173149, 195551, 218072, 240693, 263343, 285989, 308563, 331033, 353350, 375494, 397447, 419210, 440795, 462224, 483532, 504758]

// ─── 问候语 ───
export const greetingText = {
  lateNightGreeting: "✦ 夜阑卧听风吹雨",
  morningGreeting: "◌ 晨光熹微，万物初醒",
  forenoonGreeting: "◉ 日出东方，光芒万丈",
  noonGreeting: "☀ 午后暖阳，恰是温柔",
  afternoonGreeting: "☽ 日暮西山，余晖犹在",
  nightGreeting: "✦ 星河入梦，晚安"
}

// ─── 天气图标映射 ───
export const weatherIcos: Record<string, string> = {
  CLEAR_DAY: "sun.max.fill",
  CLEAR_NIGHT: "moon.fill",
  PARTLY_CLOUDY_DAY: "cloud.sun.fill",
  PARTLY_CLOUDY_NIGHT: "cloud.moon.fill",
  CLOUDY: "cloud.fill",
  LIGHT_HAZE: "sun.haze.fill",
  MODERATE_HAZE: "sun.haze.fill",
  HEAVY_HAZE: "sun.haze.fill",
  LIGHT_RAIN: "cloud.drizzle.fill",
  MODERATE_RAIN: "cloud.rain.fill",
  HEAVY_RAIN: "cloud.rain.fill",
  STORM_RAIN: "cloud.heavyrain.fill",
  FOG: "cloud.fog.fill",
  LIGHT_SNOW: "cloud.snow.fill",
  MODERATE_SNOW: "cloud.snow.fill",
  HEAVY_SNOW: "cloud.snow.fill",
  STORM_SNOW: "wind.snow.fill",
  DUST: "cloud.dust.fill",
  SAND: "cloud.dust.fill",
  WIND: "wind",
  SUNSET: "sunset.fill",
  SUNRISE: "sunrise.fill",
}

// ─── 农历数据 ───
export const lunarInfo = [0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,0x06566,0x0d4a0,0x0ea50,0x06e95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,0x06ca0,0x0b550,0x15355,0x04da0,0x0a5d0,0x14573,0x052d0,0x0a9a8,0x0e950,0x06aa0,0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b5a0,0x195a6,0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x05ac0,0x0ab60,0x096d5,0x092e0,0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,0x05aa0,0x076a3,0x096d0,0x04bd7,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0]

// ─── 天气背景色 ───
export const weatherBackgrounds: Record<string, string[]> = {
  CLEAR_DAY: ["#4facfe", "#00f2fe"],
  CLEAR_NIGHT: ["#1e3c72", "#2a5298"],
  PARTLY_CLOUDY_DAY: ["#89f7fe", "#66a6ff"],
  PARTLY_CLOUDY_NIGHT: ["#485563", "#29323c"],
  CLOUDY: ["#757f9a", "#adadad"],
  LIGHT_HAZE: ["#a8a096", "#7d7569"],
  MODERATE_HAZE: ["#a8a096", "#7d7569"],
  HEAVY_HAZE: ["#a8a096", "#7d7569"],
  LIGHT_RAIN: ["#6190e8", "#a7bfe8"],
  MODERATE_RAIN: ["#4b6cb7", "#182848"],
  HEAVY_RAIN: ["#2c3e50", "#000000"],
  STORM_RAIN: ["#0f2027", "#203a43", "#2c5364"],
  FOG: ["#e6e9f0", "#eef1f5"],
  LIGHT_SNOW: ["#e6e9f0", "#eef1f5"],
  MODERATE_SNOW: ["#cfd9df", "#e2ebf0"],
  HEAVY_SNOW: ["#bdc3c7", "#2c3e50"],
  STORM_SNOW: ["#2c3e50", "#000000"],
  DUST: ["#ba8b02", "#181818"],
  SAND: ["#ba8b02", "#181818"],
  WIND: ["#556270", "#4ecdc4"],
}

// ─── 文件路径 ───
export const scriptName = Script.name
export const documentsDir = FileManager.documentsDirectory
export const appGroupDir = FileManager.appGroupDocumentsDirectory
export const keyCachePath = `${documentsDir}/caiyun_api_token.json`
export const keyCachePathAppGroup = `${appGroupDir}/caiyun_api_token.json`
export const locCachePath = `${documentsDir}/caiyun_location_config.json`
export const styleCachePath = `${documentsDir}/caiyun_style_config_v3.json`
export const styleCachePathAppGroup = `${appGroupDir}/caiyun_style_config_v3.json`
export const getPreferredBgPath = (family: string) => `${appGroupDir}/${scriptName}_${family}.jpg`
export const getBgMetaPath = (family: string) => `${appGroupDir}/${scriptName}_background_${family}.json`
export const getLegacyBgPath = (family: string) => `${documentsDir}/${scriptName}_${family}.jpg`
export const weatherCachePath = `${appGroupDir}/cache_weather.json`
export const locationCachePath = `${appGroupDir}/cache_loc.json`
export const widgetDebugLogPath = `${appGroupDir}/widget_debug.log`
export const widgetReloadControlPath = `${appGroupDir}/widget_reload_control.json`

// ─── Storage Key（与 Colorful Clouds 一致）───
export const LOCATION_CACHE_KEY = "Location"
