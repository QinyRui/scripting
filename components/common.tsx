/**
 * 🌤️ 彩云天气 - 共享 UI 组件
 * 从 widget.tsx 拆分
 */
import {
  Widget,
  Script,
  VStack,
  HStack,
  ZStack,
  Spacer,
  Text,
  Image,
  Circle,
  Rectangle,
  RoundedRectangle,
} from "scripting"
import type { WeatherInfo, WeatherFuture, PoetryInfo, ScheduleInfo } from "../utils/types"
import { weatherIcos, weekTitle, weekTitleShort, colorMode, weatherBackgrounds } from "../utils/constants"
import { s, c, offsetStyle, styleConfig, getBackgroundPath, appendDebugLog } from "../utils/storage"
import { getDisplayLocationText } from "../utils/location"
import {
  provideGreeting,
  getDateStr,
  shortenWeatherDesc,
  getWeatherIconColor,
  formatUpdateTime,
  getWeekOfYear,
  getDayOfYear,
} from "../utils/format"
import {
  getPrimaryCountdownText,
  getSecondaryCountdownText,
  getLunarDate_Precise,
  getSolarTerm,
  getMonthGrid,
  getYiJiSimple,
  safeGetLunarStr,
} from "../utils/lunar"
import { zodiacAnimals } from "../utils/constants"

// ─── 通用文本组件 ───
export function SectionText(props: { text: string | string[]; font?: number; color?: string; lineLimit?: number; opacity?: number; minScaleFactor?: number; fixedSize?: boolean | { horizontal?: boolean; vertical?: boolean }; layoutPriority?: number }) {
  return (
    <Text
      styledText={{
        content: Array.isArray(props.text) ? props.text.join("") : props.text,
        font: props.font,
        foregroundColor: props.color as any,
      }}
      lineLimit={props.lineLimit}
      opacity={props.opacity}
      minScaleFactor={props.minScaleFactor}
      {...(props.fixedSize !== undefined ? { fixedSize: props.fixedSize as any } : {})}
      {...(props.layoutPriority !== undefined ? { layoutPriority: props.layoutPriority } : {})}
    />
  )
}

// ─── 背景层 ───
export function BackgroundLayer({ family, skycon }: { family: string; skycon?: string }) {
  const backgroundPath = getBackgroundPath(family)
  if (!colorMode && backgroundPath) {
    return (
      <Image
        filePath={backgroundPath}
        resizable
        scaleToFill
        frame={{ maxWidth: "infinity", maxHeight: "infinity" }}
      />
    )
  }
  const colors = (skycon && weatherBackgrounds[skycon]) || ["#000000", "#000000"]
  return (
    <Rectangle
      fill={{ colors: colors as any, startPoint: "top", endPoint: "bottom" }}
      frame={{ maxWidth: "infinity", maxHeight: "infinity" }}
    />
  )
}

// ─── 未来预报 ───
export function ForecastView({ future, widgetType }: { future: WeatherFuture[]; widgetType: "medium" | "large" }) {
  const labelFont = s(widgetType === "medium" ? 9 : 10, "weather")
  const iconSize = widgetType === "medium" ? 14 : 16
  const tempFont = s(widgetType === "medium" ? 9 : 10, "weather")
  const itemSpacing = widgetType === "medium" ? 10 : 20
  return (
    <HStack spacing={itemSpacing}>
      {future.slice(0, 3).map((item, index) => (
        <VStack key={index} spacing={2} alignment="center">
          <SectionText text={item.week || "-"} font={labelFont} color="white" />
          <Image systemName={item.ico} frame={{ width: iconSize, height: iconSize }} />
          <HStack spacing={1} alignment="center" frame={{ minWidth: 35 }}>
            <SectionText text={String(item.min)} font={tempFont} color="white" minScaleFactor={0.8} lineLimit={1} />
            <SectionText text="/" font={tempFont} color="white" minScaleFactor={0.8} lineLimit={1} />
            <SectionText text={`${item.max}°`} font={tempFont} color="white" minScaleFactor={0.8} lineLimit={1} />
          </HStack>
        </VStack>
      ))}
    </HStack>
  )
}

// ─── 虚线分割 ───
function DashedDivider({ widgetType }: { widgetType: "medium" | "large" }) {
  const dashCount = widgetType === "medium" ? 22 : 26
  return (
    <HStack spacing={2} padding={{ top: 1, bottom: 1 }}>
      {Array.from({ length: dashCount }).map((_, index) => (
        <Rectangle key={index} fill={{ color: "#ffffff" as any, opacity: 0.34 }} frame={{ width: 3, height: 1 }} />
      ))}
    </HStack>
  )
}

// ─── 倒计时行 ───
function CompactCountdownRow({ icon, text, accent, widgetType }: { icon: string; text: string; accent: string; widgetType: "medium" | "large" }) {
  return (
    <HStack spacing={3} frame={{ maxWidth: widgetType === "medium" ? 200 : 195, alignment: "leading" }}>
      <SectionText text={icon} font={s(widgetType === "medium" ? 8 : 9, "timeInfo")} color={accent} lineLimit={1} />
      <SectionText text={text} font={s(widgetType === "medium" ? 8 : 9, "timeInfo")} color={c("rgba(255,255,255,0.78)", "timeInfo")} lineLimit={1} />
    </HStack>
  )
}

// ─── 倒计时区块 ───
function BottomCountdownBlock({ primary, secondary, widgetType }: { primary: string; secondary: string; widgetType: "medium" | "large" }) {
  if (!primary && !secondary) return null
  return (
    <VStack alignment="leading" spacing={1} padding={{ top: widgetType === "medium" ? 1 : 2 }}>
      <DashedDivider widgetType={widgetType} />
      {primary ? <CompactCountdownRow icon="▣" text={primary} accent="#ffd166" widgetType={widgetType} /> : null}
      {secondary ? <CompactCountdownRow icon="♥" text={secondary} accent="#ff8fab" widgetType={widgetType} /> : null}
    </VStack>
  )
}

// ─── 降水柱状图 ───
export function RainingBarChart({ precipitation, widgetType }: { precipitation: number[]; widgetType: "medium" | "large" }) {
  if (!precipitation || precipitation.length === 0) return null
  const data = precipitation.slice(0, 60)
  const chartHeight = widgetType === "medium" ? 30 : 36
  const chartStyle = styleConfig.weatherChart?.style === "caiyun" ? "caiyun" : "apple"
  const barSpacing = 0.8
  const barWidth = 2.5
  const labelColor = chartStyle === "caiyun" ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.42)"

  const getSmoothedValue = (index: number) => {
    const weights = [0.03, 0.06, 0.12, 0.2, 0.26, 0.2, 0.12, 0.06, 0.03]
    let sum = 0
    let weightSum = 0
    for (let offset = -4; offset <= 4; offset++) {
      const i = index + offset
      if (i >= 0 && i < data.length) {
        const w = weights[offset + 4]
        sum += (data[i] || 0) * w
        weightSum += w
      }
    }
    return sum / weightSum
  }

  const getBarColor = (val: number): string => {
    if (chartStyle === "caiyun") {
      if (val < 0.1) return "rgba(150, 225, 255, 0.7)"
      if (val < 0.3) return "rgba(120, 210, 255, 0.85)"
      if (val < 0.6) return "rgba(80, 185, 255, 0.95)"
      return "rgba(45, 160, 255, 1)"
    }
    if (val < 0.1) return "rgba(140, 215, 255, 0.6)"
    if (val < 0.3) return "rgba(100, 195, 255, 0.8)"
    if (val < 0.6) return "rgba(65, 170, 255, 0.95)"
    return "rgba(35, 140, 255, 1)"
  }

  const hasRain = data.some(v => v > 0.02)
  if (!hasRain) return null

  return (
    <VStack alignment="leading" spacing={4} padding={{ top: 2 }}>
      <ZStack alignment="bottomLeading" frame={{ height: chartHeight }}>
        <HStack spacing={barSpacing} alignment="bottom">
          {data.map((_, i) => {
            const smoothed = getSmoothedValue(i)
            if (smoothed <= 0.02) return <RoundedRectangle key={i} cornerRadius={barWidth / 2} fill="clear" frame={{ width: barWidth, height: 0 }} />
            let h = Math.sqrt(smoothed) * chartHeight * 0.95
            h = Math.max(4, Math.min(chartHeight - 1, h))
            const barColor = getBarColor(smoothed)
            return (
              <RoundedRectangle key={i} cornerRadius={barWidth / 2} fill={{ color: barColor as any, opacity: 1 }} frame={{ width: barWidth, height: h }} />
            )
          })}
        </HStack>
      </ZStack>
      <HStack>
        <SectionText text="现在" font={s(7, "weather")} color={labelColor} />
        <Spacer />
        <SectionText text="10分钟" font={s(7, "weather")} color={labelColor} />
        <Spacer />
        <SectionText text="20分钟" font={s(7, "weather")} color={labelColor} />
        <Spacer />
        <SectionText text="30分钟" font={s(7, "weather")} color={labelColor} />
        <Spacer />
        <SectionText text="40分钟" font={s(7, "weather")} color={labelColor} />
        <Spacer />
        <SectionText text="50分钟" font={s(7, "weather")} color={labelColor} />
      </HStack>
    </VStack>
  )
}

// ─── 天气指标行 ───
function WeatherMetricLine({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <HStack spacing={3}>
      <SectionText text={label} font={s(9, "weather")} color={c("rgba(255,255,255,0.58)", "weather")} lineLimit={1} />
      <SectionText text={value || "--"} font={s(10, "weather")} color={color || c("rgba(255,255,255,0.95)", "weather")} lineLimit={1} />
    </HStack>
  )
}

// ─── 左侧信息面板 ───
export function InfoSide({ weatherInfo, lunarStr, poetry, schedules, widgetType }: { weatherInfo: WeatherInfo; lunarStr: string; poetry: PoetryInfo | null; schedules: ScheduleInfo[]; widgetType: "medium" | "large" }) {
  const currentDate = new Date()
  const cityStr = getDisplayLocationText()
  const wDescText = shortenWeatherDesc(weatherInfo.alertWeatherTitle || weatherInfo.weatherDesc || "...", widgetType)

  const isRaining = weatherInfo.precipitation && weatherInfo.precipitation.some(v => v > 0.02)
  const showPrecipitationChart = isRaining && weatherInfo.precipitationDesc && !weatherInfo.precipitationDesc.includes("无雨")

  const primaryCountdownText = getPrimaryCountdownText(currentDate)
  const secondaryCountdownText = getSecondaryCountdownText(currentDate)
  const leftWidth = widgetType === "medium" ? 210 : 200
  const dateLineText = [getDateStr(currentDate), weekTitle[currentDate.getDay()], lunarStr || ""]
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .join("/")
  const locationLineLimit = 1

  appendDebugLog("widget info summary", {
    cityStr,
    primaryCountdownText,
    secondaryCountdownText,
  })

  return (
    <VStack alignment="leading" spacing={widgetType === "medium" ? 1 : 2} frame={{ width: leftWidth, alignment: "leading" }} {...offsetStyle(widgetType, "left")}>
      <SectionText text={provideGreeting(currentDate)} font={s(widgetType === "medium" ? 21 : 19, "greeting")} color={c("#ffffff", "greeting")} lineLimit={1} />
      <HStack spacing={3} frame={{ width: leftWidth, alignment: "leading" }} padding={{ top: 1 }}>
        <SectionText text={dateLineText} font={s(widgetType === "medium" ? 12 : 13, "date")} color={c("#ffcc99", "date")} lineLimit={1} />
      </HStack>
      <HStack spacing={2} alignment="center" frame={{ width: leftWidth, alignment: "leading" }} padding={{ top: 0, bottom: 0 }}>
        <Image systemName="mappin.and.ellipse" font={s(widgetType === "medium" ? 8.5 : 9.5, "info")} renderingMode="template" foregroundStyle={c("rgba(255,255,255,0.92)", "info") as any} />
        <SectionText text={cityStr} font={s(widgetType === "medium" ? 8.5 : 9.5, "info")} color={c("rgba(255,255,255,0.92)", "info")} lineLimit={locationLineLimit} />
      </HStack>
      <Spacer minLength={widgetType === "medium" ? 0 : 1} />
      <HStack alignment="top" spacing={widgetType === "medium" ? 6 : 8} frame={{ width: leftWidth, alignment: "leading" }}>
        {showPrecipitationChart ? (
          <RainingBarChart precipitation={weatherInfo.precipitation!} widgetType={widgetType} />
        ) : (
          weatherInfo.future && weatherInfo.future.length > 0 ? <ForecastView future={weatherInfo.future} widgetType={widgetType} /> : <Spacer />
        )}
      </HStack>
      <VStack alignment="leading" spacing={0} frame={{ width: leftWidth, alignment: "leading" }} padding={{ top: 2 }}>
        <SectionText text={wDescText} font={s(widgetType === "medium" ? 10 : 13, "weather")} color={c("#ffffff", "weather")} lineLimit={0} minScaleFactor={0.5} />
      </VStack>
      <Spacer minLength={widgetType === "medium" ? 1 : 2} />
      <BottomCountdownBlock primary={primaryCountdownText} secondary={secondaryCountdownText} widgetType={widgetType} />
    </VStack>
  )
}

// ─── 右侧天气面板 ───
export function WeatherSide({ weatherInfo, widgetType }: { weatherInfo: WeatherInfo; widgetType: "medium" | "large" }) {
  const wIco = weatherInfo.weatherIco || "sun.max.fill"
  const wTemp = weatherInfo.bodyFeelingTemperature !== undefined ? weatherInfo.bodyFeelingTemperature : "-"
  const lineColor = c("#ffffff", "weather")
  const iconSize = widgetType === "medium" ? 27 : 30
  const temperatureFont = s(widgetType === "medium" ? 18 : 20, "weatherLarge")
  const updateFont = s(widgetType === "medium" ? 8 : 9, "weather")
  const updateText = `更新 ${formatUpdateTime(weatherInfo.updatedAt)}`
  return (
    <VStack alignment="trailing" spacing={widgetType === "medium" ? 3 : 4} frame={{ minWidth: widgetType === "medium" ? 100 : 120, alignment: "trailing" }} {...offsetStyle(widgetType, "right")}>
      <HStack spacing={5} padding={{ bottom: widgetType === "medium" ? 1 : 2 }}>
        <Image systemName={wIco} renderingMode="template" foregroundStyle={getWeatherIconColor(wIco) as any} frame={{ width: iconSize, height: iconSize }} />
        <Text font={temperatureFont} lineLimit={1}>{`${wTemp}°C`}</Text>
      </HStack>
      <VStack alignment="trailing" spacing={widgetType === "medium" ? 1 : 2}>
        <WeatherMetricLine label="风力" value={weatherInfo.windStr || "--"} />
        <WeatherMetricLine label="湿度" value={weatherInfo.humidity || "--"} />
        <WeatherMetricLine label="体感" value={weatherInfo.comfort || "--"} />
        <WeatherMetricLine label="紫外线" value={weatherInfo.ultraviolet || "--"} />
        <WeatherMetricLine label="空气" value={weatherInfo.aqiInfo || "--"} />
      </VStack>
      <VStack alignment="trailing" spacing={widgetType === "medium" ? 2 : 3} padding={{ top: widgetType === "medium" ? 2 : 4 }}>
        <HStack spacing={7} padding={{ top: 1, bottom: 1 }}>
          <SectionText text={`↑${weatherInfo.maxTemperature ?? "-"}°`} font={s(10, "weather")} color={c("#ff6b6b", "weather")} />
          <SectionText text={`↓${weatherInfo.minTemperature ?? "-"}°`} font={s(10, "weather")} color={c("#72e38a", "weather")} />
        </HStack>
        <HStack spacing={widgetType === "medium" ? 8 : 4}>
          <HStack spacing={2}>
            <Image systemName="sunrise.fill" renderingMode="template" foregroundStyle={"#ffcc66" as any} frame={{ width: 10, height: 10 }} />
            <SectionText text={weatherInfo.sunrise || "--:--"} font={s(9, "weather")} color={lineColor} />
          </HStack>
          <HStack spacing={2}>
            <Image systemName="sunset.fill" renderingMode="template" foregroundStyle={"#ff8a5c" as any} frame={{ width: 10, height: 10 }} />
            <SectionText text={weatherInfo.sunset || "--:--"} font={s(9, "weather")} color={lineColor} />
          </HStack>
        </HStack>
        <SectionText text={updateText} font={updateFont} color={c("rgba(255,255,255,0.58)", "weather")} lineLimit={1} />
      </VStack>
    </VStack>
  )
}

// ─── 宜忌组件 ───
function YiJiBlock({ title, circleColor, list, textColor }: { title: string; circleColor: string; list: string[]; textColor: string }) {
  return (
    <HStack spacing={5} alignment="center">
      <ZStack frame={{ width: 24, height: 24 }}>
        <Circle fill={{ color: circleColor as any, opacity: 0.96 }} />
        <SectionText text={title} font={s(13, "timeInfo")} color="#ffffff" lineLimit={1} />
      </ZStack>
      <VStack alignment="leading" spacing={1}>
        <SectionText text={list.slice(0, 3).join("  ")} font={s(8, "timeInfo")} color={c(textColor, "timeInfo")} lineLimit={1} />
        {list.length > 3 ? <SectionText text={list.slice(3, 6).join("  ")} font={s(8, "timeInfo")} color={c(textColor, "timeInfo")} lineLimit={1} /> : null}
      </VStack>
    </HStack>
  )
}

// ─── 时间信息栏 ───
export function TimeInfoBar() {
  const currentDate = new Date()
  const lunarObj = getLunarDate_Precise(currentDate)
  const zodiac = zodiacAnimals[(currentDate.getFullYear() - 4) % 12]
  const weekNumber = getWeekOfYear(currentDate)
  const dayOfYear = getDayOfYear(currentDate)
  const yiList = getYiJiSimple(currentDate, 0)
  const jiList = getYiJiSimple(currentDate, 1)
  return (
    <HStack spacing={4} padding={{ horizontal: 0 }} alignment="center">
      <VStack alignment="leading" spacing={1} frame={{ minWidth: 86, alignment: "leading" }}>
        <SectionText text={`${zodiac}年 ${lunarObj.month}${lunarObj.day}`} font={s(11, "timeInfo")} color={c("#99ccff", "timeInfo")} lineLimit={1} />
        <SectionText text={`第${weekNumber}周 · 第${dayOfYear}天`} font={s(9, "timeInfo")} color={c("#ffcc99", "timeInfo")} lineLimit={1} />
      </VStack>
      <Spacer minLength={4} />
      <YiJiBlock title="宜" circleColor="#D32F2F" list={yiList} textColor="#ff7777" />
      <Spacer minLength={4} />
      <YiJiBlock title="忌" circleColor="#333333" list={jiList} textColor="#ffffff" />
    </HStack>
  )
}

// ─── 月历视图 ───
export function CalendarView() {
  const currentDate = new Date()
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const monthGrid = getMonthGrid(year, month)
  return (
    <VStack alignment="leading" spacing={1} frame={{ maxWidth: "infinity" }}>
      <HStack spacing={0} frame={{ maxWidth: "infinity" }}>
        {weekTitleShort.map((day, idx) => (
          <VStack frame={{ maxWidth: "infinity" }} alignment="center">
            <Text
              styledText={{ content: day, font: s(12, "calendar"), foregroundColor: (idx === 0 || idx === 6 ? c("#ff6666", "calendar") : c("rgba(255,255,255,0.82)", "calendar")) as any }}
              lineLimit={1}
            />
          </VStack>
        ))}
      </HStack>
      {monthGrid.map((week) => (
        <HStack spacing={0} frame={{ maxWidth: "infinity" }}>
          {week.map((dayData, dayIndex) => {
            const isWeekend = dayIndex === 0 || dayIndex === 6
            const dayColor = isWeekend ? c("#ff6666", "calendar") : c("#ffffff", "calendar")
            if (dayData === null) {
              return (
                <VStack spacing={0} frame={{ maxWidth: "infinity" }} alignment="center">
                  <SectionText text=" " font={s(12, "calendar")} lineLimit={1} />
                </VStack>
              )
            }
            const dateObj = new Date(year, month, dayData)
            const isToday = dateObj.getDate() === currentDate.getDate() && dateObj.getMonth() === currentDate.getMonth()
            const lunar = getLunarDate_Precise(dateObj)
            const lunarStr = getSolarTerm(dateObj) || lunar.day
            return (
              <VStack spacing={0} frame={{ maxWidth: "infinity" }} alignment="center">
                {isToday ? (
                  <ZStack frame={{ width: s(18, "calendar"), height: s(18, "calendar") }}>
                    <Circle fill={{ color: "#ffcc00", opacity: 1 }} />
                    <SectionText text={String(dayData)} font={s(12, "calendar")} color={c("#000000", "calendar")} lineLimit={1} />
                  </ZStack>
                ) : (
                  <SectionText text={String(dayData)} font={s(12, "calendar")} color={dayColor} lineLimit={1} />
                )}
                <SectionText text={lunarStr} font={s(7, "calendar")} color={c("rgba(255,255,255,0.6)", "calendar")} lineLimit={1} />
              </VStack>
            )
          })}
        </HStack>
      ))}
    </VStack>
  )
}

