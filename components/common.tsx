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
  getLunarFestivalCountdownText,
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
  // 透明背景模式：当用户在 Scripting 中开启透明背景时，不渲染任何背景
  if (Widget.isTransparentBackground) {
    return <></>
  }
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

// ─── 倒计时行（图形化前缀，使用 SF Symbols） ───
function CompactCountdownRow({ icon, text, accent, widgetType }: { icon: string; text: string; accent: string; widgetType: "medium" | "large" }) {
  // 用 font 控制 SF Symbols 渲染尺寸（项目其他地方都用 font）；中号 9 / 大号 10，略小于或等于文字 8/9pt
  const iconFont = widgetType === "medium" ? 9 : 10
  return (
    <HStack spacing={3} alignment="center" frame={{ maxWidth: widgetType === "medium" ? 200 : 195, alignment: "leading" }}>
      {/* 图形化前缀：SF Symbols 染色图标 */}
      <Image
        systemName={icon}
        font={iconFont}
        renderingMode="template"
        foregroundStyle={accent as any}
      />
      <SectionText text={text} font={s(widgetType === "medium" ? 8 : 9, "timeInfo")} color={c("rgba(255,255,255,0.78)", "timeInfo")} lineLimit={1} />
    </HStack>
  )
}

// ─── 倒计时区块（三行：节气 / 阳历节日 / 农历节日） ───
function BottomCountdownBlock({ primary, secondary, tertiary, widgetType }: { primary: string; secondary: string; tertiary: string; widgetType: "medium" | "large" }) {
  if (!primary && !secondary && !tertiary) return null
  return (
    <VStack alignment="leading" spacing={1} padding={{ top: widgetType === "medium" ? 1 : 2 }}>
      <DashedDivider widgetType={widgetType} />
      {primary ? <CompactCountdownRow icon="sun.max.fill" text={primary} accent="#ffd166" widgetType={widgetType} /> : null}
      {secondary ? <CompactCountdownRow icon="heart.fill" text={secondary} accent="#ff8fab" widgetType={widgetType} /> : null}
      {tertiary ? <CompactCountdownRow icon="moon.stars.fill" text={tertiary} accent="#ff7a5a" widgetType={widgetType} /> : null}
    </VStack>
  )
}

// ─── 降水柱状图（克制矮柱 + 网格线在上方） ───
export function RainingBarChart({ precipitation, widgetType }: { precipitation: number[]; widgetType: "medium" | "large" }) {
  if (!precipitation || precipitation.length === 0) return null
  const data = precipitation.slice(0, 60)
  const hasRain = data.some(v => v > 0.02)
  if (!hasRain) return null

  const isMedium = widgetType === "medium"
  // 图表总高度（含网格 + 柱子），保持紧凑
  const chartHeight = isMedium ? 26 : 32
  // 柱子最大高度只占图表区域的 55%，上方留给网格线
  const maxBarArea = Math.round(chartHeight * 0.55)
  const barWidth = 2.6
  const barSpacing = 1.0
  const gridLineCount = 3
  const chartStyle = styleConfig.weatherChart?.style === "caiyun" ? "caiyun" : "apple"
  const labelColor = chartStyle === "caiyun" ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.38)"
  const gridLineColor = "rgba(255,255,255,0.32)"

  // ① 归一化：以数据最大值为 1.0
  const maxVal = Math.max(...data)
  const safeMax = maxVal > 0 ? maxVal : 1

  // ② 轻度 3 点平滑
  const getSmoothedValue = (index: number) => {
    let sum = 0
    let count = 0
    for (let offset = -1; offset <= 1; offset++) {
      const i = index + offset
      if (i >= 0 && i < data.length) {
        sum += (data[i] || 0)
        count++
      }
    }
    return count > 0 ? sum / count : 0
  }

  // ③ 柱高：用 power 1.5 压低小值，让未下雨时段保持最矮
  //    当 norm < 0.12 时压到 2px 最小值（几乎平线）
  //    norm >= 0.12 时用 1.5 次幂从 minBar 拉升到 maxBarArea
  const minBar = 2
  const getBarHeight = (raw: number): number => {
    if (raw <= 0.015) return 0
    const norm = Math.min(1, raw / safeMax)
    if (norm < 0.12) return minBar
    // 将 norm 0.12~1.0 映射到 minBar~maxBarArea，再施加 1.5 次幂
    const remapped = (norm - 0.12) / 0.88
    const curved = Math.pow(remapped, 1.5)
    let h = minBar + curved * (maxBarArea - minBar)
    return Math.max(minBar, Math.min(maxBarArea, Math.round(h)))
  }

  // ④ 颜色按归一化强度分 5 级
  const getBarColor = (norm: number): string => {
    if (chartStyle === "caiyun") {
      if (norm < 0.15) return "rgba(170, 235, 255, 0.55)"
      if (norm < 0.35) return "rgba(125, 218, 255, 0.72)"
      if (norm < 0.55) return "rgba(85, 200, 255, 0.85)"
      if (norm < 0.8) return "rgba(50, 175, 255, 0.93)"
      return "rgba(30, 150, 255, 1)"
    }
    if (norm < 0.15) return "rgba(160, 230, 255, 0.48)"
    if (norm < 0.35) return "rgba(115, 212, 255, 0.65)"
    if (norm < 0.55) return "rgba(75, 190, 255, 0.8)"
    if (norm < 0.8) return "rgba(42, 165, 255, 0.92)"
    return "rgba(25, 140, 255, 1)"
  }

  // 大号组件不显示虚线网格，节省视图数
  const dashCount = isMedium ? 32 : 0

  return (
    <VStack alignment="leading" spacing={2} padding={{ top: 0 }}>
      {/* 柱状图区域 */}
      <ZStack alignment="bottomLeading" frame={{ height: chartHeight, maxWidth: "infinity" }}>
        {/* 水平虚线网格（仅中号显示） */}
        {isMedium && Array.from({ length: gridLineCount }).map((_, i) => {
          const y = Math.round((chartHeight / (gridLineCount + 1)) * (i + 1))
          return (
            <VStack key={`grid-${i}`} alignment="leading" spacing={0} padding={{ top: y }} frame={{ maxWidth: "infinity" }}>
              <HStack spacing={3} alignment="center">
                {Array.from({ length: dashCount }).map((_, di) => (
                  <Rectangle key={di} fill={{ color: gridLineColor as any, opacity: 1 }} frame={{ width: 3.5, height: 0.6 }} />
                ))}
              </HStack>
            </VStack>
          )
        })}
        {/* 降水柱：从底部向上生长 */}
        <HStack spacing={barSpacing} alignment="bottom" padding={{ top: 0 }}>
          {data.map((_, i) => {
            const raw = getSmoothedValue(i)
            const norm = Math.min(1, raw / safeMax)
            const h = getBarHeight(raw)
            if (h <= 0) return <RoundedRectangle key={i} cornerRadius={barWidth / 2} fill="clear" frame={{ width: barWidth, height: 0 }} />
            return (
              <RoundedRectangle
                key={i}
                cornerRadius={barWidth / 2}
                fill={{ color: getBarColor(norm) as any, opacity: 1 }}
                frame={{ width: barWidth, height: h }}
              />
            )
          })}
        </HStack>
      </ZStack>
      {/* 时间刻度标签 */}
      <HStack padding={{ top: 0 }}>
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
  const cityStr = getDisplayLocationText(widgetType)
  const wDescText = shortenWeatherDesc(weatherInfo.alertWeatherTitle || weatherInfo.weatherDesc || "...", widgetType)
  const isRaining = weatherInfo.precipitation && weatherInfo.precipitation.some(v => v > 0.02)
  const showPrecipitationChart = isRaining && weatherInfo.precipitationDesc && !weatherInfo.precipitationDesc.includes("无雨")

  const primaryCountdownText = getPrimaryCountdownText(currentDate)
  const secondaryCountdownText = getSecondaryCountdownText(currentDate)
  const tertiaryCountdownText = getLunarFestivalCountdownText(currentDate)
  const leftWidth = widgetType === "medium" ? 210 : 200
  const dateLineText = [getDateStr(currentDate), weekTitle[currentDate.getDay()], lunarStr || ""]
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .join("/")
  // 地理位置默认 lineLimit=1，精细行 lineLimit=2（超长时允许折行）
  const locationLineLimit = 1
  const fineLocationLineLimit = 2
  // 超长阈值与阈值判断都在 location.ts 中完成，这里仅依据 mode 渲染
  const isTwoLine = cityStr.mode === "two-line"

  appendDebugLog("widget info summary", {
    cityStr,
    primaryCountdownText,
    secondaryCountdownText,
    tertiaryCountdownText,
  })

  return (
    <VStack alignment="leading" spacing={widgetType === "medium" ? 1 : 2} frame={{ width: leftWidth, alignment: "leading" }} {...offsetStyle(widgetType, "left")}>
      <SectionText text={provideGreeting(currentDate)} font={s(widgetType === "medium" ? 18 : 17, "greeting")} color={c("#ffffff", "greeting")} />
      <HStack spacing={3} frame={{ width: leftWidth, alignment: "leading" }} padding={{ top: 1 }}>
        <SectionText text={dateLineText} font={s(widgetType === "medium" ? 12 : 13, "date")} color={c("#ffcc99", "date")} lineLimit={1} />
      </HStack>
      {/* 地理位置：自适应单/双行（超长自动转二行） */}
      {isTwoLine ? (
        // 双行模式：行政层级 + 精细位置（缩进表示层级）
        <VStack alignment="leading" spacing={0} frame={{ width: leftWidth, alignment: "leading" }} padding={{ top: 0, bottom: 0 }}>
          <HStack spacing={2} alignment="center" frame={{ width: leftWidth, alignment: "leading" }}>
            <Image systemName="paperplane.circle.fill" font={s(widgetType === "medium" ? 8.5 : 9.5, "info")} renderingMode="template" foregroundStyle={c("rgba(255,255,255,0.92)", "info") as any} />
            <SectionText text={cityStr.admin} font={s(widgetType === "medium" ? 8.5 : 9.5, "info")} color={c("rgba(255,255,255,0.92)", "info")} lineLimit={locationLineLimit} minScaleFactor={0.7} />
          </HStack>
          <HStack spacing={2} alignment="top" frame={{ width: leftWidth, alignment: "leading" }} padding={{ leading: 13, top: 0 }}>
            <SectionText text={cityStr.fine} font={s(widgetType === "medium" ? 9.5 : 10.5, "info")} color={c("rgba(255,255,255,0.82)", "info")} lineLimit={fineLocationLineLimit} minScaleFactor={0.8} />
          </HStack>
        </VStack>
      ) : (
        // 单行模式：📍 完整地址
        <HStack spacing={2} alignment="center" frame={{ width: leftWidth, alignment: "leading" }} padding={{ top: 0, bottom: 0 }}>
          <Image systemName="paperplane.circle.fill" font={s(widgetType === "medium" ? 8.5 : 9.5, "info")} renderingMode="template" foregroundStyle={c("rgba(255,255,255,0.92)", "info") as any} />
          <SectionText text={cityStr.text} font={s(widgetType === "medium" ? 8.5 : 9.5, "info")} color={c("rgba(255,255,255,0.92)", "info")} lineLimit={locationLineLimit} minScaleFactor={0.7} />
        </HStack>
      )}
      <Spacer minLength={widgetType === "medium" ? 0 : 1} />
      <HStack alignment="top" spacing={widgetType === "medium" ? 6 : 8} frame={{ width: leftWidth, alignment: "leading" }}>
        {showPrecipitationChart ? (
          <RainingBarChart precipitation={weatherInfo.precipitation!} widgetType={widgetType} />
        ) : (
          weatherInfo.future && weatherInfo.future.length > 0 ? <ForecastView future={weatherInfo.future} widgetType={widgetType} /> : <Spacer />
        )}
      </HStack>
      <HStack alignment="leading" spacing={2} frame={{ width: leftWidth, alignment: "leading" }} padding={{ top: 2 }}>
        <Image systemName="speaker.wave.2.bubble" font={s(widgetType === "medium" ? 8 : 10, "weather")} renderingMode="template" foregroundStyle={c("rgba(255,255,255,0.7)", "weather") as any} />
        <SectionText text={wDescText} font={s(widgetType === "medium" ? 10 : 13, "weather")} color={c("#ffffff", "weather")} lineLimit={0} minScaleFactor={0.5} />
      </HStack>
      <Spacer minLength={widgetType === "medium" ? 1 : 2} />
      <BottomCountdownBlock primary={primaryCountdownText} secondary={secondaryCountdownText} tertiary={tertiaryCountdownText} widgetType={widgetType} />
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

