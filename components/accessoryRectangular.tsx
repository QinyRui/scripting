/**
 * 🔒 锁屏矩形组件
 * 支持两种模式：
 *   - 降水模式：天气图标 + 降雨提示 + 降水量条形图 + 时间轴
 *   - 普通模式：天气图标 + 温度/预警 + 天气描述 + 今日最高/最低
 */
import { Text, Image, HStack, VStack, Spacer, Divider, UnevenRoundedRectangle } from "scripting"
import type { WeatherInfo } from "../utils/types"

// ─── 天气名称映射（skycon key → 中文名）───
const weatherTextMap: Record<string, string> = {
  CLEAR_DAY: "晴天",
  CLEAR_NIGHT: "晴天",
  PARTLY_CLOUDY_DAY: "多云",
  PARTLY_CLOUDY_NIGHT: "多云",
  CLOUDY: "阴天",
  LIGHT_HAZE: "轻度雾霾",
  MODERATE_HAZE: "中度雾霾",
  HEAVY_HAZE: "重度雾霾",
  LIGHT_RAIN: "小雨",
  MODERATE_RAIN: "中雨",
  HEAVY_RAIN: "大雨",
  STORM_RAIN: "暴雨",
  FOG: "雾",
  LIGHT_SNOW: "小雪",
  MODERATE_SNOW: "中雪",
  HEAVY_SNOW: "大雪",
  STORM_SNOW: "暴雪",
  DUST: "浮尘",
  SAND: "沙尘",
  WIND: "大风",
  ALERT: "恶劣天气",
}

// ─── 天气图标映射（skycon key → SF Symbol）───
const weatherIconMap: Record<string, string> = {
  CLEAR_DAY: "sun.max.fill",
  CLEAR_NIGHT: "moon.stars.fill",
  PARTLY_CLOUDY_DAY: "cloud.fill",
  PARTLY_CLOUDY_NIGHT: "cloud.moon.fill",
  CLOUDY: "cloud.fill",
  LIGHT_HAZE: "sun.haze.fill",
  MODERATE_HAZE: "sun.haze.fill",
  HEAVY_HAZE: "sun.haze.fill",
  LIGHT_RAIN: "cloud.drizzle.fill",
  MODERATE_RAIN: "cloud.rain.fill",
  HEAVY_RAIN: "cloud.heavyrain.fill",
  STORM_RAIN: "cloud.bolt.rain.fill",
  FOG: "cloud.fog.fill",
  LIGHT_SNOW: "snowflake",
  MODERATE_SNOW: "cloud.snow.fill",
  HEAVY_SNOW: "cloud.snow.fill",
  STORM_SNOW: "wind.snow",
  DUST: "sun.dust.fill",
  SAND: "sun.dust.fill",
  WIND: "wind",
  ALERT: "exclamationmark.triangle.fill",
}

// ─── 工具函数：压缩数组到 20 项（与 Colorful Clouds 一致）───
function compressTo20(data: number[]): number[] {
  const groupSize = Math.floor(data.length / 20)
  const result: number[] = []
  for (let i = 0; i < 20; i++) {
    const start = i * groupSize
    const end = start + groupSize
    const group = data.slice(start, end)
    const avg = group.reduce((a, b) => a + b, 0) / group.length
    result.push(avg)
  }
  return result
}

// ─── 工具函数：第一个非零值索引 ───
function firstNonZeroIndex(arr: number[]): number {
  return arr.findIndex((v: number) => v !== 0)
}

// ─── 降水条形图（锁屏版，增强可见性）───
function RainingViewRectangle({ data }: { data: number[] }) {
  const barHeight = 18
  const barSpacing = 1.5
  const barRadius = 2
  // 降水条使用明亮的雨蓝色，在深色锁屏背景上清晰可见
  const rainColor = "#4FC3F7"

  return (
    <HStack spacing={barSpacing} alignment="bottom">
      {compressTo20(data).map((length: number, index: number) => {
        // 非零值至少 3px 高度，确保小雨也可辨识
        const h = length === 0 ? 0 : length < 0.01 ? 3 : Math.max(3, barHeight * length)
        return (
          <VStack key={index} frame={{ height: barHeight + 4 }}>
            <Spacer />
            <UnevenRoundedRectangle
              topLeadingRadius={barRadius}
              topTrailingRadius={barRadius}
              bottomLeadingRadius={0}
              bottomTrailingRadius={0}
              frame={{ height: h }}
              fill={{ color: rainColor, gradient: true }}
            />
          </VStack>
        )
      })}
    </HStack>
  )
}

// ─── 标题行（图标 + 文字）───
function TitleView({ icon, titleText }: { icon: string; titleText: string }) {
  return (
    <HStack>
      <Image systemName={icon} font={14} />
      <Text font={14} fontWeight="medium" padding={{ leading: -4 }}>
        {titleText}
      </Text>
      <Spacer />
    </HStack>
  )
}

// ─── 时间轴（现在 — 60分钟）───
function TimeAxis() {
  return (
    <HStack>
      <Text font={11} foregroundStyle="rgba(255,255,255,0.6)" fontWeight="medium">
        现在
      </Text>
      <Spacer />
      <Text font={11} foregroundStyle="rgba(255,255,255,0.6)" fontWeight="medium">
        60分钟
      </Text>
    </HStack>
  )
}

// ─── 主视图（与 Colorful Clouds accessoryRectangular 完全一致）───
export function AccessoryRectangularView({ weatherInfo }: { weatherInfo: WeatherInfo }) {
  const unit = "°"

  // 从 WeatherInfo 获取数据
  const skycon = weatherInfo.skycon || "CLEAR_DAY"
  const precipitation = weatherInfo.precipitation || []
  const isAlert = (weatherInfo.alertContents?.length ?? 0) > 0
  const isPrecipitation = precipitation.some((value: number) => value !== 0)

  // 图标：有预警时显示警告图标，否则显示天气图标
  const icon = weatherIconMap[isAlert ? "ALERT" : skycon] || "sun.max.fill"

  return (
    <VStack alignment="leading" spacing={2}>
      {isPrecipitation ? (
        // ─── 降水模式 ───
        (() => {
          const chartWidth = 150
          const isRain = skycon.includes("RAIN")
          const titleText = isRain
            ? isAlert
              ? (weatherTextMap["ALERT"] || "恶劣天气") + "及" + (weatherTextMap[skycon] || "雨")
              : "正在下雨"
            : firstNonZeroIndex(precipitation) + "分钟后"

          return (
            <>
              <TitleView icon={icon} titleText={titleText} />
              <RainingViewRectangle data={precipitation} />
              <Divider frame={{ width: chartWidth }} />
              <TimeAxis />
            </>
          )
        })()
      ) : (
        // ─── 普通模式 ───
        (() => {
          const currentTemp = (weatherInfo.temperature ?? 0) + unit
          const titleText = isAlert ? (weatherTextMap["ALERT"] || "恶劣天气") : currentTemp
          const detailText = isAlert
            ? currentTemp + " " + (weatherTextMap[skycon] || "")
            : (weatherTextMap[skycon] || "")
          const maxTemp = weatherInfo.maxTemperature != null ? weatherInfo.maxTemperature + unit : ""
          const minTemp = weatherInfo.minTemperature != null ? weatherInfo.minTemperature + unit : ""

          return (
            <>
              <TitleView icon={icon} titleText={titleText} />
              <Text font={17}>{detailText}</Text>
              <Text font={17} foregroundStyle="gray" fontWeight="medium">
                {"最高" + maxTemp + " " + "最低" + minTemp}
              </Text>
            </>
          )
        })()
      )}
    </VStack>
  )
}
