/**
 * 🌤️ 彩云天气(^ᴗ^)☁️ — Widget 入口
 * 主文件仅负责：初始化 → 获取数据 → 渲染视图
 */
import { Widget, Script, VStack, HStack, ZStack, Spacer, Text, Image, RoundedRectangle, Rectangle } from "scripting"
import type { WeatherInfo, PoetryInfo, ScheduleInfo } from "./utils/types"
import { scriptName, weatherIcos, LOCATION_CACHE_KEY } from "./utils/constants"
import { styleConfig, updateStyleConfig, getSavedStyleConfig, locationData, updateLocationData, appendDebugLog, ensureBackgroundMigrated, getSavedApiKey, hasRecentForceReloadRequest, Cache } from "./utils/storage"
import { hasValidCoordinates } from "./utils/location"
import { safeGetWeather, safeGetSchedules, refreshApiKey } from "./utils/weather"
import { safeGetLunarStr } from "./utils/lunar"
import { getNextWidgetReloadDate } from "./utils/format"

import { BackgroundLayer, InfoSide, WeatherSide, TimeInfoBar, CalendarView, isSystemTransparentMode, getReadabilityShadow } from "./components/common"
import { AccessoryRectangularView } from "./components/accessoryRectangular"
import { getDisplayLocationText } from "./utils/location"
import { shortenWeatherDesc, getWeatherIconColor } from "./utils/format"

declare const FileManager: any

// ─── 小号组件视图（降水卡片风格） ───
function SmallWidgetView(props: { weatherInfo: WeatherInfo }) {
  const cityStr = getDisplayLocationText("medium")
  const cityName = cityStr.mode === "two-line" ? cityStr.admin : cityStr.text
  const wIco = props.weatherInfo.weatherIco || "sun.max.fill"
  const wDesc = shortenWeatherDesc(props.weatherInfo.alertWeatherTitle || props.weatherInfo.weatherDesc || "...", "medium")
  const precipitation = props.weatherInfo.precipitation || []
  const data = precipitation.slice(0, 60)
  const hasRain = data.some(v => v > 0.02)
  const future = props.weatherInfo.future || []
  // 透明/模糊模式下添加文字阴影确保可读性
  const shadow = getReadabilityShadow()

  return (
    <VStack alignment="leading" spacing={0} padding={{ top: 12, leading: 14, trailing: 14, bottom: 10 }}>
      {/* 顶部：位置 + 天气图标 */}
      <HStack alignment="center" spacing={3}>
        <Image systemName="paperplane.fill" font={9} renderingMode="template" foregroundStyle={"rgba(255,255,255,0.85)" as any} frame={{ width: 10, height: 10 }} />
        <Text font={11} foregroundStyle={"rgba(255,255,255,0.85)" as any} lineLimit={1} minScaleFactor={0.7} shadow={shadow}>{cityName}</Text>
        <Spacer />
        <Image systemName={wIco} renderingMode="template" foregroundStyle={getWeatherIconColor(wIco)} frame={{ width: 20, height: 20 }} />
      </HStack>

      {/* 天气描述 */}
      <Text font={11} foregroundStyle={"rgba(255,255,255,0.95)" as any} lineLimit={1} minScaleFactor={0.6} padding={{ top: 1 }} shadow={shadow}>{wDesc}</Text>

      {/* 分隔线 */}
      <VStack frame={{ maxWidth: "infinity", height: 1 }} padding={{ top: 10, bottom: 8 }}>
        <Rectangle fill="rgba(255,255,255,0.18)" frame={{ maxWidth: "infinity", maxHeight: "infinity" }} />
      </VStack>

      {/* 降水柱状图 或 未来3天预报 */}
      {hasRain ? (
        <VStack alignment="leading" spacing={0}>
          <ZStack alignment="bottomLeading" frame={{ height: 40, maxWidth: "infinity" }}>
            <HStack spacing={0.8} alignment="bottom" frame={{ maxWidth: "infinity" }}>
              {data.map((val, i) => {
                const norm = data.length > 0 ? val / Math.max(...data, 0.01) : 0
                const h = val <= 0.015 ? 0 : Math.max(2, Math.round(norm * 32))
                if (h <= 0) return <RoundedRectangle key={i} cornerRadius={1} fill="clear" frame={{ width: 2, height: 0 }} />
                const color = norm < 0.3 ? "rgba(160,230,255,0.5)" : norm < 0.6 ? "rgba(85,200,255,0.8)" : "rgba(42,165,255,1)"
                return <RoundedRectangle key={i} cornerRadius={1} fill={color} frame={{ width: 2, height: h }} />
              })}
            </HStack>
          </ZStack>
          <HStack padding={{ top: 2 }}>
            <Text font={8} foregroundStyle={"rgba(255,255,255,0.45)" as any} shadow={shadow}>现在</Text>
            <Spacer />
            <Text font={8} foregroundStyle={"rgba(255,255,255,0.45)" as any} shadow={shadow}>60分钟</Text>
          </HStack>
        </VStack>
      ) : future.length >= 3 ? (
        <HStack spacing={0} alignment="center" frame={{ maxWidth: "infinity" }}>
          {future.slice(0, 3).map((item, index) => (
            <VStack key={index} spacing={2} alignment="center" frame={{ maxWidth: "infinity" }}>
              <Text font={9} foregroundStyle={"rgba(255,255,255,0.65)" as any} lineLimit={1} shadow={shadow}>{item.week || "--"}</Text>
              <Image systemName={item.ico} renderingMode="template" foregroundStyle="white" frame={{ width: 16, height: 16 }} />
              <HStack spacing={1} alignment="center">
                <Text font={9} foregroundStyle={"rgba(255,255,255,0.95)" as any} lineLimit={1} shadow={shadow}>{item.min + "°"}</Text>
                <Text font={9} foregroundStyle={"rgba(255,255,255,0.45)" as any} lineLimit={1} shadow={shadow}>/</Text>
                <Text font={9} foregroundStyle={"rgba(255,255,255,0.95)" as any} lineLimit={1} shadow={shadow}>{item.max + "°"}</Text>
              </HStack>
            </VStack>
          ))}
        </HStack>
      ) : (
        <VStack alignment="center" spacing={0} frame={{ maxWidth: "infinity", minHeight: 40 }}>
          <Spacer />
          <Text font={10} foregroundStyle={"rgba(255,255,255,0.5)" as any} shadow={shadow}>暂无降水</Text>
          <Spacer />
        </VStack>
      )}
    </VStack>
  )
}

// ─── 中号组件视图 ───
function MediumWidgetView(props: { weatherInfo: WeatherInfo; lunarStr: string; poetry: PoetryInfo | null; schedules: ScheduleInfo[] }) {
  return (
    <HStack alignment="center" spacing={5} padding={{ top: 6, leading: 8, trailing: 10, bottom: 6 }}>
      <VStack frame={{ width: 202, alignment: "leading" }}>
        <InfoSide weatherInfo={props.weatherInfo} lunarStr={props.lunarStr} poetry={props.poetry} schedules={props.schedules} widgetType="medium" />
      </VStack>
      <Spacer />
      <VStack frame={{ width: 100, maxHeight: "infinity", alignment: "center" }}>
        <WeatherSide weatherInfo={props.weatherInfo} widgetType="medium" />
      </VStack>
    </HStack>
  )
}

// ─── 大号组件视图 ───
function LargeWidgetView(props: { weatherInfo: WeatherInfo; lunarStr: string; poetry: PoetryInfo | null; schedules: ScheduleInfo[] }) {
  return (
    <VStack alignment="leading" spacing={0} padding={{ top: 8, bottom: 1 }}>
      <VStack padding={{ leading: 8, trailing: 4 }}>
        <HStack alignment="top" spacing={0} frame={{ minHeight: 110 }}>
          <InfoSide weatherInfo={props.weatherInfo} lunarStr={props.lunarStr} poetry={props.poetry} schedules={props.schedules} widgetType="large" />
          <Spacer minLength={4} />
          <WeatherSide weatherInfo={props.weatherInfo} widgetType="large" />
        </HStack>
        <VStack frame={{ height: 2 }} />
        <TimeInfoBar />
      </VStack>
      <VStack frame={{ height: 1 }} />
      <VStack padding={{ leading: 4, trailing: 4 }}>
        <CalendarView />
      </VStack>
    </VStack>
  )
}

// ─── 错误视图 ───
function ErrorWidgetView({ message }: { message: string }) {
  return (
    <VStack alignment="leading" spacing={6} padding={12} background="#3b0d0d">
      <Text font="headline">⚠️ 组件运行出错</Text>
      <Text font="caption" lineLimit={4}>{message}</Text>
    </VStack>
  )
}

// ─── 根视图 ───
function WidgetRoot(props: { weatherInfo: WeatherInfo; lunarStr: string; poetry: PoetryInfo | null; schedules: ScheduleInfo[] }) {
  const family = Widget.family
  const skycon = props.weatherInfo.weatherIco ? Object.keys(weatherIcos).find(k => weatherIcos[k] === props.weatherInfo.weatherIco) : "CLEAR_DAY"

  // 锁屏组件：独立渲染，不使用背景层
  if (family === "accessoryRectangular") {
    return <AccessoryRectangularView weatherInfo={props.weatherInfo} />
  }

  return (
    <ZStack alignment="topLeading" widgetURL={Script.createOpenURLScheme(scriptName)}>
      <BackgroundLayer family={family} skycon={skycon} />
      {family === "systemLarge" ? (
        <LargeWidgetView {...props} />
      ) : family === "systemSmall" ? (
        <SmallWidgetView weatherInfo={props.weatherInfo} />
      ) : (
        <MediumWidgetView {...props} />
      )}
    </ZStack>
  )
}

// ─── 主入口 ───
async function main() {
  await ensureBackgroundMigrated()
  refreshApiKey()
  const cachedLocation = Storage.get(LOCATION_CACHE_KEY) as any
  if (cachedLocation && hasValidCoordinates(cachedLocation)) {
    updateLocationData(cachedLocation)
  }
  updateStyleConfig(getSavedStyleConfig())

  appendDebugLog("widget render start", {
    styleConfig,
    savedLocation: locationData,
    apiKeyExists: Boolean(getSavedApiKey()),
  })
  const refreshMinutesRaw = parseInt(String(styleConfig.refreshInterval || 60), 10)
  const refreshMinutes = Number.isNaN(refreshMinutesRaw) ? 60 : Math.max(5, refreshMinutesRaw)
  const now = new Date()
  const forceRefreshRequested = hasRecentForceReloadRequest(now.getTime())
  const reloadDate = getNextWidgetReloadDate(now, refreshMinutes, forceRefreshRequested)
  const [weatherInfo, schedules] = await Promise.all([
    safeGetWeather(forceRefreshRequested),
    safeGetSchedules(),
  ])
  const poetry = null
  const lunarStr = safeGetLunarStr()
  appendDebugLog("widget render payload", {
    weatherInfo,
    lunarStr,
    scheduleCount: schedules.length,
    forceRefreshRequested,
    reloadDate: reloadDate.toISOString(),
  })
  Widget.present(
    <WidgetRoot weatherInfo={weatherInfo} lunarStr={lunarStr} poetry={poetry} schedules={schedules} />,
    {
      reloadPolicy: { policy: "after", date: reloadDate },
      relevance: { score: 50, duration: refreshMinutes * 60 },
    },
  )
}

main().catch((error) => {
  Widget.present(<ErrorWidgetView message={String(error?.message || error)} />)
})
