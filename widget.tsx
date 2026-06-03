/**
 * 🌤️ 彩云天气(^ᴗ^)☁️ — Widget 入口
 * 主文件仅负责：初始化 → 获取数据 → 渲染视图
 */
import { Widget, Script, VStack, HStack, ZStack, Spacer, Text } from "scripting"
import type { WeatherInfo, PoetryInfo, ScheduleInfo } from "./utils/types"
import { scriptName, weatherIcos, LOCATION_CACHE_KEY } from "./utils/constants"
import { styleConfig, updateStyleConfig, getSavedStyleConfig, locationData, updateLocationData, appendDebugLog, ensureBackgroundMigrated, getSavedApiKey, hasRecentForceReloadRequest, Cache } from "./utils/storage"
import { hasValidCoordinates } from "./utils/location"
import { safeGetWeather, safeGetSchedules, refreshApiKey } from "./utils/weather"
import { safeGetLunarStr } from "./utils/lunar"
import { getNextWidgetReloadDate } from "./utils/format"

import { BackgroundLayer, InfoSide, WeatherSide, TimeInfoBar, CalendarView } from "./components/common"
import { AccessoryRectangularView } from "./components/accessoryRectangular"

declare const FileManager: any

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
