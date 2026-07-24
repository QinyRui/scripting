import { SettingView, profile } from "./pages/setting"
import { safeGetWeather } from "./utils/weather"
import { clearAllNotifications } from "./notification_logic"
import { ApiKeySettingsPage } from "./pages/api-key-settings"
import { FontSettingsPage, FontSizeSubPage, FontColorSubPage } from "./pages/font-settings"
import { WallpaperSettingsPage } from "./pages/wallpaper-settings"
import { NotificationSettingsPage } from "./pages/notification-settings"
import { LayoutSettingsPage } from "./pages/layout-settings"
import { TyphoonMonitorPage } from "./pages/typhoon-monitor"
import { WeatherHeroIcon } from "./components/weather-hero"
import { useReleaseNotesSheet } from "./components/what-is-new"
import { reverseGeocodeOSM } from "./utils/location"
import {
  Script,
  Navigation,
  NavigationStack,
  List,
  Section,
  Button,
  Text,
  Link,
  NavigationLink,
  VStack,
  HStack,
  Spacer,
  Label,
  Widget,
  TextField,
  Toggle,
  ScrollView,
  ZStack,
  Circle,
  Rectangle,
  RoundedRectangle,
  Image,
  useState,
  Menu,
  Picker,
  DisclosureGroup,
  Divider,
  Notification,
} from "scripting"

declare const openURL: (url: string) => Promise<boolean>

declare const fetch: any
declare const FileManager: any
declare const Location: any
declare const Alert: any
declare const Pasteboard: any
declare function pickFromMap(): Promise<any>


type MenuItem = {
  icon: string
  title: string
  action?: string
  url?: string
  note?: string
}

type LocationConfig = {
  lockLocation?: boolean
  locationData?: {
    latitude?: number
    longitude?: number

    administrativeArea?: string
    subAdministrativeArea?: string

    locality?: string
    subLocality?: string

    street?: string
    neighborhood?: string
    quarter?: string

    subThoroughfare?: string
    horizontalAccuracy?: number

    name?: string
    resolvedAt?: number
  }
}

type LayoutOffset = { x?: number; y?: number }

type StyleConfig = {
  refreshInterval?: string | number
  weatherChart?: {
    style?: "apple" | "caiyun"
  }
  layout?: {
    medium?: {
      left?: LayoutOffset
      right?: LayoutOffset
    }
    large?: {
      left?: LayoutOffset
      right?: LayoutOffset
    }
  }
  [key: string]: unknown
}

type WeatherFuture = {
  week: string
  min: number
  max: number
  ico: string
}

type WeatherInfo = {
  alertWeatherTitle?: string
  weatherDesc?: string
  minTemperature?: number
  maxTemperature?: number
  future?: WeatherFuture[]
  bodyFeelingTemperature?: number
  weatherIco?: string
  humidity?: string
  windStr?: string
  comfort?: string
  ultraviolet?: string
  aqiInfo?: string
  sunrise?: string
  sunset?: string
  updatedAt?: number
}

type StatusInfo = {
  readinessBadge: string
  apiKeyText: string
  refreshText: string
  backgroundText: string
  fontSizeText: string
  fontColorText: string
  layoutText: string
  chartStyleText: string
  recommendations: string[]
  cachedWeather?: WeatherInfo | null
}

const scriptName = Script.name
const actionUrl = (action: string) => Script.createRunURLScheme(scriptName, { action })

const fm = FileManager
const documentsDir = FileManager.documentsDirectory
const appGroupDir = FileManager.appGroupDocumentsDirectory
const keyCachePath = `${documentsDir}/caiyun_api_token.json`
const keyCachePathAppGroup = `${appGroupDir}/caiyun_api_token.json`
const locCachePath = `${documentsDir}/caiyun_location_config.json`
const styleCachePath = `${documentsDir}/caiyun_style_config_v3.json`
const styleCachePathAppGroup = `${appGroupDir}/caiyun_style_config_v3.json`
const locationCachePath = `${appGroupDir}/cache_loc.json`
const weatherCachePath = `${appGroupDir}/cache_weather.json`
const getBgPath = (family: string) => `${documentsDir}/${scriptName}_${family}.jpg`
const getWidgetBgPath = (family: string) => `${appGroupDir}/${scriptName}_${family}.jpg`
const getWidgetBgMetaPath = (family: string) => `${appGroupDir}/${scriptName}_background_${family}.json`
const locationDebugLogPath = `${documentsDir}/caiyun_location_debug.log`
const SETTING_KEY = "ColorfulCloudsSetting"

function appendLocationDebugLog(title: string, payload?: any) {
  try {
    const time = new Date().toLocaleString("zh-CN")
    const body = payload === undefined
      ? ""
      : (typeof payload === "string" ? payload : JSON.stringify(payload, null, 2))
    const line = `\n[${time}] ${title}${body ? `\n${body}` : ""}\n`
    const prev = FileManager.existsSync(locationDebugLogPath)
      ? FileManager.readAsStringSync(locationDebugLogPath)
      : ""
    FileManager.writeAsStringSync(locationDebugLogPath, `${prev}${line}`)
  } catch {}
}

const styleItems: MenuItem[] = [
  { icon: "textformat.size", title: "调节字体大小", action: "font-size" },
  { icon: "paintpalette", title: "调节字体颜色", action: "font-color" },
]

const layoutItems: MenuItem[] = [
  { icon: "triangle.righthalf.inset.filled", title: "布局调整 (X/Y 轴偏移)", action: "layout" },
  { icon: "photo.on.rectangle", title: "透明壁纸", action: "transparent-background" },
  { icon: "trash", title: "清除背景", action: "clear-background" },
]

const sizeGuideItems: MenuItem[] = [
  { icon: "rectangle.lefthalf.inset.filled", title: "中号组件布局特点", note: "中号只显示顶部信息区，适合重点检查左侧信息和右侧天气温度是否对齐。" },
  { icon: "rectangle.grid.1x2.fill", title: "大号组件布局特点", note: "大号会在顶部信息区下方继续显示时间栏与整月日历，适合检查下半区是否被遮挡或过密。" },
]



function writeApiKey(apiKey: string) {
  const payload = { apiKey: apiKey.trim() }
  writeJson(keyCachePath, payload)
  writeJson(keyCachePathAppGroup, payload)
}

function writeLocationCaches(locationConfig: LocationConfig) {
  // 附加设备指纹，widget 读取时可校验是否同一台设备
  const ownerDeviceId = `${Device.model}-${Device.screen.width}x${Device.screen.height}@${Device.screen.scale}-${Device.systemVersion}`
  const configWithFingerprint = { ...locationConfig, ownerDeviceId }
  writeJson(locCachePath, configWithFingerprint)
  // Write to both locCachePath and AppGroup to be sure.
  const appGroupLocConfigPath = `${appGroupDir}/caiyun_location_config.json`
  if (appGroupDir) {
    writeJson(appGroupLocConfigPath, configWithFingerprint)
  }
  
  // appGroupDir 也写入完整的 locationData，确保 widget 读取时字段一致
  const fullLocationData = {
    ...(locationConfig.locationData || {}),
    ownerDeviceId,
  }
  writeJson(locationCachePath, fullLocationData)
}

function getCurrentLocationInfo() {
  const currentLocation = (globalThis as any)?.location
  if (currentLocation && typeof currentLocation.latitude === "number" && typeof currentLocation.longitude === "number") {
    return currentLocation
  }
  return null
}

const TARGET_LOCATION_ACCURACY_METERS = 20
const LOCATION_ACCURACY_LABEL = `20米内`

function getLocationAccuracyValue(location: any) {
  const raw = Number(location?.horizontalAccuracy ?? location?.accuracy ?? 0)
  return Number.isFinite(raw) && raw > 0 ? raw : 0
}

function formatLocationAccuracyText(location: any) {
  const acc = getLocationAccuracyValue(location)
  if (!acc) return "未获取到定位精度"
  return acc <= TARGET_LOCATION_ACCURACY_METERS
    ? `已达到${LOCATION_ACCURACY_LABEL}（±${Math.round(acc)}m）`
    : `当前精度约±${Math.round(acc)}m，未达到${LOCATION_ACCURACY_LABEL}`
}

async function requestCurrentLocationInfo() {
  try {
    if (typeof Location?.setAccuracy === "function") {
      try {
        await Location.setAccuracy("best")
        console.log("[Location Debug] setAccuracy=best")
        appendLocationDebugLog("setAccuracy", { value: "best", targetMeters: TARGET_LOCATION_ACCURACY_METERS })
      } catch (setError) {
        const setMessage = String((setError as any)?.message || setError)
        console.log(`[Location Debug] setAccuracy error=${setMessage}`)
        appendLocationDebugLog("setAccuracy error", setMessage)
      }
    }
    const live = await Promise.race([
      Location.requestCurrent({ forceRequest: true }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout requesting location")), 10000))
    ])
    const accuracy = getLocationAccuracyValue(live)
    console.log(`[Location Debug] requestCurrentLocationInfo live=${JSON.stringify(live)}`)
    console.log(`[Location Debug] accuracyStatus=${formatLocationAccuracyText(live)}`)
    appendLocationDebugLog("requestCurrentLocationInfo live", live)
    appendLocationDebugLog("requestCurrentLocationInfo accuracy", {
      accuracy,
      targetMeters: TARGET_LOCATION_ACCURACY_METERS,
      reached: accuracy > 0 ? accuracy <= TARGET_LOCATION_ACCURACY_METERS : false,
    })
    if (live && typeof live.latitude === "number" && typeof live.longitude === "number") return live
  } catch (error) {
    const message = String((error as any)?.message || error)
    console.log(`[Location Debug] requestCurrentLocationInfo error=${message}`)
    appendLocationDebugLog("requestCurrentLocationInfo error", message)
  }
  const fallback = getCurrentLocationInfo()
  console.log(`[Location Debug] requestCurrentLocationInfo fallback=${JSON.stringify(fallback)}`)
  appendLocationDebugLog("requestCurrentLocationInfo fallback", fallback)
  return fallback
}

function formatLocationDataForDisplay(loc: any): string {
  if (!loc) return "未知位置"
  const province = String(loc.administrativeArea || "").trim()
  const city = String(loc.locality || "").trim()
  const district = String(loc.subLocality || loc.subAdministrativeArea || "").trim()
  const street = String(loc.street || "").trim()
  const name = String(loc.name || "").trim()

  const detail = [street, name]
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .find((item, index, arr) => arr.indexOf(item) === index) || ""

  const parts = []
  if (province) parts.push(province)
  if (city && city !== province) parts.push(city)
  if (district && district !== city && district !== province) parts.push(district)
  if (detail && detail !== district && detail !== city && detail !== province) parts.push(detail)

  return parts.join("-") || "尚未设置位置"
}

const statusInfo = loadStatusInfo()
let hasPromptedApiKey = false


function formatUpdateTime(timestamp?: number) {
  if (!timestamp || !Number.isFinite(timestamp)) return "--:--"
  const date = new Date(timestamp)
  return `${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`
}

function ConfigPage() {
  const dismiss = Navigation.useDismiss()
  const [statusInfo, setStatusInfo] = useState(() => loadStatusInfo())
  const [chartStyle, setChartStyle] = useState<"apple" | "caiyun">(() => {
    const sc = ensureStyleConfig() as any
    return sc.weatherChart?.style === "caiyun" ? "caiyun" : "apple"
  })

  // 通知相关的状态
  const [isPrecipitationEnabled, setIsPrecipitationEnabled] = useState(profile.notification.Precipitation)
  const [isExtremeWeatherEnabled, setIsExtremeWeatherEnabled] = useState(profile.notification.ExtremeWeather)
  const [isUselessNotificationEnabled, setIsUselessNotificationEnabled] = useState(profile.notification.isUselessNotify)
  const [isLocalNotifyEnabled, setIsLocalNotifyEnabled] = useState(profile.notification.isLocalNotify)
  const [isSurroundNotifyEnabled, setIsSurroundNotifyEnabled] = useState(profile.notification.isSurroundNotify)
  const [notificationInterval, setNotificationInterval] = useState<number>(profile.notification.NotificationInterval)

  const timeGapList = [0, 5, 10, 15, 30]

  // 更新内容 Sheet（九号APP同款）
  const releaseNotes = useReleaseNotesSheet()

  // 首次使用时自动提示输入 API Key（延迟到 UI 渲染完成后）
  useState(() => {
    if (!hasPromptedApiKey && statusInfo.apiKeyText === "未设置") {
      hasPromptedApiKey = true
      setTimeout(() => {
        inputApiKey().then(() => setStatusInfo(loadStatusInfo()))
      }, 600)
    }
  })

  function updateChartStyle(nextStyle: "apple" | "caiyun") {
    const sc = ensureStyleConfig() as any
    sc.weatherChart = {
      ...(sc.weatherChart || {}),
      style: nextStyle,
    }
    writeStyleConfig(sc)
    setChartStyle(nextStyle)
    reloadWidgets()
    setStatusInfo(loadStatusInfo())
  }

  const saveNotificationProfile = (
    precip: boolean,
    extreme: boolean,
    local: boolean,
    surround: boolean,
    useless: boolean,
    interval: number
  ) => {
    profile.notification = {
      Precipitation: precip,
      ExtremeWeather: extreme,
      isLocalNotify: local,
      isSurroundNotify: surround,
      isUselessNotify: useless,
      NotificationInterval: interval,
      TemperatureChange: profile.notification.TemperatureChange,
      AirPollution: profile.notification.AirPollution,
      StrongWind: profile.notification.StrongWind,
      TyphoonAlert: profile.notification.TyphoonAlert,
      EarthquakeAlert: profile.notification.EarthquakeAlert,
    }
    Storage.set(SETTING_KEY, profile)
  }

  return (
    <ZStack frame={{ maxWidth: "infinity", maxHeight: "infinity" }}>
      <NavigationStack sheet={releaseNotes.sheet}>
        <List navigationBarTitleDisplayMode="inline">
        <Section>
          <VStack spacing={24} padding={{ vertical: 20 }}>
            {/* 天气变化轮播动画：晴/云/雨/雪/风/夜 */}
            <WeatherHeroIcon />

            <HStack spacing={0} alignment="top" frame={{ maxWidth: "infinity" }}>
              <HomeQuickButton icon="rectangle.expand.vertical" title="中号预览" subtitle="Medium" action="preview-medium" tint="systemBlue" />
              <HomeQuickButton icon="rectangle.grid.1x2.fill" title="大号预览" subtitle="Large" action="preview-large" tint="systemOrange" />
            </HStack>
          </VStack>
        </Section>

        <Section header={<Text font="headline">基础配置</Text>}>
          {/* API Key — present() 模态展示，dismiss 后即时刷新状态 */}
          <HStack
            padding={16} spacing={12} alignment="center"
            onTapGesture={async () => {
              await Navigation.present(<ApiKeySettingsPage />)
              setStatusInfo(loadStatusInfo())
            }}>
            <ZStack frame={{ width: 32, height: 32 }}><Circle fill="systemYellow" opacity={0.15} /><Image systemName="key.fill" foregroundStyle="systemYellow" font={16} /></ZStack>
            <Text fontWeight="bold">API Key</Text>
            <Spacer />
            <Text font="subheadline" foregroundStyle="secondaryLabel" lineLimit={1}>{statusInfo.apiKeyText}</Text>
            <Image systemName="chevron.right" font={12} foregroundStyle="tertiaryLabel" />
          </HStack>
        </Section>

        {/* 与 Colorful Clouds 一致的「获取位置」板块 */}
        <Section header={<HStack spacing={6} alignment="center"><Image systemName="location.fill" foregroundStyle="systemBlue" font="headline" /><Text font="headline">获取位置</Text></HStack>} footer={<Text attributedString="· 获取后填入桌面小组件参数栏，可为小组件设定天气位置" />}>
          <Button action={async () => {
            try {
              let location = await Location.pickFromMap()
              if (!location) {
                location = await Location.requestCurrent()
              }
              if (!location) {
                throw new Error("无法获取当前位置，请确认 Scripting 已允许使用定位权限")
              }
              // 用 OpenStreetMap 逆向地理编码获取地名（绕过原生API）
              let resolvedNames: any = {}
              try {
                const geo = await reverseGeocodeOSM(location.latitude, location.longitude)
                if (geo) {
                  const t = String(geo.thoroughfare || "").trim()
                  const st = String(geo.subThoroughfare || "").trim()
                  const street = t && st ? (t.includes(st) ? t : `${t}${st}`) : (t || st)
                  const poiName = geo.name || ""
                  const fineName = poiName || street || geo.subLocality || geo.locality || "已选位置"
                  resolvedNames = {
                    administrativeArea: geo.administrativeArea || "",
                    locality: geo.locality || "",
                    subLocality: geo.subLocality || "",
                    neighborhood: geo.neighborhood || "",
                    quarter: geo.quarter || "",
                    street,
                    subThoroughfare: geo.subThoroughfare || "",
                    name: fineName,
                  }
                }
              } catch {}
              writeLocationCaches({
                lockLocation: false,
                locationData: {
                  latitude: location.latitude,
                  longitude: location.longitude,
                  ...resolvedNames,
                  horizontalAccuracy: location.horizontalAccuracy || 0,
                  resolvedAt: Date.now(),
                },
              })
              // 同步写入 Storage，确保小组件 getLocation() 回退时用到正确坐标和地名
              Storage.set("Location", {
                latitude: location.latitude,
                longitude: location.longitude,
                ...resolvedNames,
                resolvedAt: Date.now(),
              })
              reloadWidgets()
              await Pasteboard.setString(JSON.stringify(location))
              await Dialog.alert({
                title: "已拷贝经纬度",
                message: `经度: ${location.longitude}\n纬度: ${location.latitude}`,
              })
            } catch (error) {
              await showMessage("定位失败", String((error as any)?.message || error))
            }
          }}>
            <Text>获取经纬度</Text>
          </Button>
        </Section>

        <Section header={<Text font="headline">小组件</Text>} footer={<Text font="caption" foregroundStyle="secondaryLabel">· 实际刷新频率由系统决定</Text>}>
          <HStack padding={16} spacing={12} alignment="center">
            <ZStack frame={{ width: 32, height: 32 }}>
              <Circle fill="systemBlue" opacity={0.15} />
              <Image systemName="clock.fill" foregroundStyle="systemBlue" font={16} />
            </ZStack>
            <Text fontWeight="bold">刷新时间间隔</Text>
            <Spacer />
            <Picker
              title=""
              pickerStyle="menu"
              value={statusInfo.refreshText === "自动" ? 0 : parseInt(statusInfo.refreshText)}
              onChanged={(val: number) => {
                const styleConfig = ensureStyleConfig()
                styleConfig.refreshInterval = val
                writeStyleConfig(styleConfig)
                reloadWidgets()
                setStatusInfo(loadStatusInfo())
              }}
            >
              {[0, 5, 10, 15, 30, 60].map((item) => (
                <Text key={item} tag={item}>{item === 0 ? "自动" : `${item} 分钟`}</Text>
              ))}
            </Picker>
          </HStack>
        </Section>

        <Section header={<Text font="headline">通知</Text>}>
          <NavigationLink destination={<NotificationSettingsPage />}>
            <HStack padding={16} spacing={12} alignment="center">
              <ZStack frame={{ width: 32, height: 32 }}><Circle fill="systemGreen" opacity={0.15} /><Image systemName="bell.badge.fill" foregroundStyle="systemGreen" font={16} /></ZStack>
              <Text fontWeight="bold">通知设置</Text>
              <Spacer />
              <Text font="subheadline" foregroundStyle="secondaryLabel" lineLimit={1}>{isPrecipitationEnabled ? "已开启" : "已关闭"}</Text>
            </HStack>
          </NavigationLink>
        </Section>

        <Section header={<Text font="headline">外观设计</Text>}>
          {/* 字体大小 — present() 模态展示，dismiss 后即时刷新状态 */}
          <HStack
            padding={16} spacing={12} alignment="center"
            onTapGesture={async () => {
              await Navigation.present(<FontSizeSubPage />)
              setStatusInfo(loadStatusInfo())
            }}>
            <ZStack frame={{ width: 32, height: 32 }}><Circle fill="systemPurple" opacity={0.15} /><Image systemName="textformat.size" foregroundStyle="systemPurple" font={16} /></ZStack>
            <Text fontWeight="bold">字体大小</Text>
            <Spacer />
            <Text font="subheadline" foregroundStyle="secondaryLabel" lineLimit={1}>{statusInfo.fontSizeText}</Text>
            <Image systemName="chevron.right" font={12} foregroundStyle="tertiaryLabel" />
          </HStack>
          {/* 字体颜色 — present() 模态展示，dismiss 后即时刷新状态 */}
          <HStack
            padding={16} spacing={12} alignment="center"
            onTapGesture={async () => {
              await Navigation.present(<FontColorSubPage />)
              setStatusInfo(loadStatusInfo())
            }}>
            <ZStack frame={{ width: 32, height: 32 }}><Circle fill="systemPink" opacity={0.15} /><Image systemName="paintpalette.fill" foregroundStyle="systemPink" font={16} /></ZStack>
            <Text fontWeight="bold">字体颜色</Text>
            <Spacer />
            <Text font="subheadline" foregroundStyle="secondaryLabel" lineLimit={1}>{statusInfo.fontColorText}</Text>
            <Image systemName="chevron.right" font={12} foregroundStyle="tertiaryLabel" />
          </HStack>
          <NavigationLink destination={<WallpaperSettingsPage />}>
            <HStack padding={16} spacing={12} alignment="center">
              <ZStack frame={{ width: 32, height: 32 }}><Circle fill="systemTeal" opacity={0.15} /><Image systemName="photo.on.rectangle" foregroundStyle="systemTeal" font={16} /></ZStack>
              <Text fontWeight="bold">壁纸设置</Text>
              <Spacer />
              <Text font="subheadline" foregroundStyle="secondaryLabel" lineLimit={1}>{statusInfo.backgroundText}</Text>
            </HStack>
          </NavigationLink>
          <NavigationLink destination={<LayoutSettingsPage />}>
            <HStack padding={16} spacing={12} alignment="center">
              <ZStack frame={{ width: 32, height: 32 }}><Circle fill="systemOrange" opacity={0.15} /><Image systemName="slider.horizontal.3" foregroundStyle="systemOrange" font={16} /></ZStack>
              <Text fontWeight="bold">布局偏移</Text>
              <Spacer />
              <Text font="subheadline" foregroundStyle="secondaryLabel" lineLimit={1}>{statusInfo.layoutText}</Text>
            </HStack>
          </NavigationLink>
          <VStack alignment="leading" spacing={12} padding={16}>
            <HStack spacing={12} alignment="center">
              <ZStack frame={{ width: 32, height: 32 }}>
                <Circle fill="systemIndigo" opacity={0.15} />
                <Image systemName="chart.bar.xaxis" foregroundStyle="systemIndigo" font={16} />
              </ZStack>
              <VStack alignment="leading" spacing={2} frame={{ maxWidth: "infinity" }}>
                <Text fontWeight="bold">实时图表风格</Text>
                <Text font="caption" foregroundStyle="secondaryLabel">选择更像 Apple 天气或更像彩云天气的动态降水图</Text>
              </VStack>
            </HStack>

            <HStack spacing={12} frame={{ maxWidth: "infinity" }}>
              <ChartStylePreviewCard
                title="A · Apple"
                subtitle="克制、平滑"
                selected={chartStyle === "apple"}
                accent="#7dd3fc"
                bars={[10, 12, 11, 9, 8, 9, 11, 13, 12, 10]}
                labelTone="rgba(255,255,255,0.42)"
                onTap={() => updateChartStyle("apple")}
              />
              <ChartStylePreviewCard
                title="B · 彩云"
                subtitle="明亮、突出"
                selected={chartStyle === "caiyun"}
                accent="#38bdf8"
                bars={[8, 10, 9, 8, 10, 14, 16, 13, 12, 14]}
                labelTone="rgba(255,255,255,0.5)"
                onTap={() => updateChartStyle("caiyun")}
              />
            </HStack>
          </VStack>


        </Section>

        {/* 台风实时监控 */}
        <Section header={<Text font="headline">实用工具</Text>}>
          <NavigationLink destination={<TyphoonMonitorPage />}>
            <HStack padding={{ vertical: 8 }} spacing={12} alignment="center">
              <ZStack frame={{ width: 32, height: 32 }}>
                <Circle fill="systemRed" opacity={0.15} />
                <Image systemName="hurricane" foregroundStyle="systemRed" font={16} />
              </ZStack>
              <Text fontWeight="bold">台风实时监控</Text>
            </HStack>
          </NavigationLink>
        </Section>

      </List>
    </NavigationStack>
    <VStack frame={{ maxWidth: "infinity", maxHeight: "infinity" }} padding={20}>
      <Spacer />
      <HStack frame={{ maxWidth: "infinity" }}>
        <Spacer />
        <Button action={() => Navigation.present(<AboutDetailView />)}>
          <ZStack frame={{ width: 44, height: 44 }}>
            <Circle fill="#2c2c2e" />
            <Image systemName="info" font={20} foregroundStyle="#aeaeb2" />
          </ZStack>
        </Button>
        <Spacer />
      </HStack>
    </VStack>
  </ZStack>
  )
}

function AboutDetailView() {
  const dismiss = Navigation.useDismiss()
  return (
    <ScrollView frame={{ maxWidth: Infinity, maxHeight: Infinity }} background="systemBackground">
      <VStack spacing={0}>
        <HStack padding={16} alignment="center">
        <Button action={dismiss}>
          <HStack padding={{ horizontal: 16, vertical: 8 }} background={{ style: "secondarySystemBackground", shape: { type: "rect", cornerRadius: 20 } }}>
            <Text font="headline">关闭</Text>
          </HStack>
        </Button>
        <Spacer />
        <Text font="headline">详情介绍</Text>
        <Spacer />
        <Spacer frame={{ width: 60 }} />
      </HStack>

      <VStack spacing={40} padding={20}>
        <VStack spacing={16} alignment="center">
          <ZStack frame={{ width: 100, height: 100 }}>
            <Circle fill={{ colors: ["#4facfe", "#00f2fe"], startPoint: "top", endPoint: "bottom" }} />
            <Image systemName="cloud.sun.fill" font={40} foregroundStyle="white" />
          </ZStack>
          <VStack spacing={4} alignment="center">
            <Text font="title" fontWeight="bold">彩云天气</Text>
            <Text font="subheadline" foregroundStyle="secondaryLabel">精准、实时、美观</Text>
          </VStack>
          <HStack spacing={12} alignment="center">
            <Text font="caption" fontWeight="bold" foregroundStyle="systemBlue" padding={{ horizontal: 12, vertical: 4 }} background={{ style: "secondarySystemBackground", shape: { type: "rect", cornerRadius: 8 } }}>v3.1.1</Text>
            <Text font="caption" foregroundStyle="secondaryLabel" padding={{ horizontal: 12, vertical: 4 }} background={{ style: "secondarySystemBackground", shape: { type: "rect", cornerRadius: 8 } }}>By QinyRui</Text>
          </HStack>
        </VStack>

        <VStack spacing={24}>
          <HStack spacing={20} alignment="top">
            <HStack spacing={16} frame={{ maxWidth: Infinity }} alignment="center">
              <ZStack frame={{ width: 44, height: 44 }}><Circle fill="yellow" opacity={0.2} /><Image systemName="location.fill" foregroundStyle="yellow" /></ZStack>
              <VStack alignment="leading" spacing={2}><Text fontWeight="bold">精准定位</Text><Text font="caption" foregroundStyle="secondaryLabel">街道级气象数据</Text></VStack>
            </HStack>
            <HStack spacing={16} frame={{ maxWidth: Infinity }} alignment="center">
              <ZStack frame={{ width: 44, height: 44 }}><Circle fill="green" opacity={0.2} /><Image systemName="clock.fill" foregroundStyle="green" /></ZStack>
              <VStack alignment="leading" spacing={2}><Text fontWeight="bold">分钟级降水</Text><Text font="caption" foregroundStyle="secondaryLabel">降雨趋势早知道</Text></VStack>
            </HStack>
          </HStack>
          <HStack spacing={20} alignment="top">
            <HStack spacing={16} frame={{ maxWidth: Infinity }} alignment="center">
              <ZStack frame={{ width: 44, height: 44 }}><Circle fill="blue" opacity={0.2} /><Image systemName="photo.on.rectangle" foregroundStyle="blue" /></ZStack>
              <VStack alignment="leading" spacing={2}><Text fontWeight="bold">透明组件</Text><Text font="caption" foregroundStyle="secondaryLabel">沉浸式桌面体验</Text></VStack>
            </HStack>
            <HStack spacing={16} frame={{ maxWidth: Infinity }} alignment="center">
              <ZStack frame={{ width: 44, height: 44 }}><Circle fill="purple" opacity={0.2} /><Image systemName="paintpalette.fill" foregroundStyle="purple" /></ZStack>
              <VStack alignment="leading" spacing={2}><Text fontWeight="bold">高度定制</Text><Text font="caption" foregroundStyle="secondaryLabel">字体颜色随心换</Text></VStack>
            </HStack>
          </HStack>
        </VStack>

        <VStack alignment="leading" spacing={16} padding={20} background={{ style: "secondarySystemBackground", shape: { type: "rect", cornerRadius: 20 } }}>
          <HStack alignment="center">
            <VStack alignment="leading" spacing={4}>
              <Text font="headline">加入社区</Text>
              <Text font="caption" foregroundStyle="secondaryLabel">获取技术支持</Text>
            </VStack>
            <Spacer />
            <Image systemName="bubble.left.and.bubble.right.fill" font={24} foregroundStyle="systemBlue" />
          </HStack>
          <Link url="https://t.me/JiuHaoAPP">
            <HStack spacing={8} alignment="center">
              <Image systemName="paperplane.fill" foregroundStyle="systemBlue" />
              <Text fontWeight="bold" foregroundStyle="systemBlue">Telegram 频道</Text>
            </HStack>
          </Link>
          
          <HStack spacing={0} padding={{ top: 12 }}>
            <Spacer />
            <VStack frame={{ maxWidth: "infinity", height: 1 }} background="separator" />
            <Spacer />
          </HStack>
          
          <HStack spacing={8} alignment="center" onTapGesture={() => Navigation.present(<FeatureGuidePage />)}>
            <Image systemName="wand.and.stars" foregroundStyle="systemYellow" />
            <Text fontWeight="bold" foregroundStyle="systemYellow">设置引导</Text>
          </HStack>
        </VStack>
      </VStack>

      <Spacer />
      <VStack frame={{ maxWidth: Infinity }} alignment="center" padding={20}>
        <Text font="caption2" foregroundStyle="tertiaryLabel">© 2025 QinyRui. All rights reserved.</Text>
      </VStack>
      </VStack>
    </ScrollView>
  )
}


function HomeQuickButton({ icon, title, subtitle, action, tint }: { icon: string; title: string; subtitle: string; action: string; tint: string }) {
  return (
    <HStack spacing={12} frame={{ maxWidth: "infinity" }} alignment="center" padding={{ vertical: 8, horizontal: 4 }} onTapGesture={() => handleAction(action)}>
      <ZStack frame={{ width: 44, height: 44 }}>
        <Circle fill={tint as any} opacity={0.2} />
        <Image systemName={icon} foregroundStyle={tint as any} font={20} />
      </ZStack>
      <VStack alignment="leading" spacing={2} frame={{ maxWidth: "infinity" }}>
        <Text fontWeight="bold" foregroundStyle="label" lineLimit={1}>{title}</Text>
        <Text font="caption" foregroundStyle="secondaryLabel" lineLimit={1}>{subtitle}</Text>
      </VStack>
    </HStack>
  )
}




function ChartStylePreviewCard({
  title,
  subtitle,
  selected,
  accent,
  bars,
  labelTone,
  onTap,
}: {
  title: string
  subtitle: string
  selected: boolean
  accent: string
  bars: number[]
  labelTone: string
  onTap: () => void
}) {
  return (
    <ZStack frame={{ maxWidth: "infinity" }} onTapGesture={onTap}>
      <RoundedRectangle
        cornerRadius={16}
        fill={selected ? "rgba(99,102,241,0.14)" as any : "secondarySystemBackground" as any}
        frame={{ maxWidth: "infinity", maxHeight: "infinity" }}
      />
      {selected ? (
        <RoundedRectangle
          cornerRadius={16}
          fill={{ color: "#6366f1", opacity: 0.18 }}
          frame={{ maxWidth: "infinity", maxHeight: "infinity" }}
        />
      ) : null}
      <VStack spacing={10} frame={{ maxWidth: "infinity" }} padding={12}>
        <ZStack frame={{ maxWidth: "infinity", height: 72 }}>
          <RoundedRectangle cornerRadius={12} fill={{ colors: ["#2b1f38", "#1c1630"], startPoint: "top", endPoint: "bottom" }} />
          <VStack spacing={0} padding={{ horizontal: 8, vertical: 8 }} frame={{ maxWidth: "infinity", maxHeight: "infinity" }}>
            <Spacer />
            <HStack spacing={2} alignment="bottom" frame={{ maxWidth: "infinity", maxHeight: "infinity" }}>
              {bars.map((height, index) => (
                <RoundedRectangle
                  key={index}
                  cornerRadius={1.4}
                  fill={accent as any}
                  opacity={selected ? 1 : 0.88}
                  frame={{ maxWidth: "infinity", height }}
                />
              ))}
            </HStack>
            <HStack padding={{ top: 6 }}>
              <Text font={{ name: "system", size: 7 }} foregroundStyle={labelTone as any}>现在</Text>
              <Spacer />
              <Text font={{ name: "system", size: 7 }} foregroundStyle={labelTone as any}>30分钟</Text>
              <Spacer />
              <Text font={{ name: "system", size: 7 }} foregroundStyle={labelTone as any}>60分钟</Text>
            </HStack>
          </VStack>
        </ZStack>

        <HStack alignment="center" frame={{ maxWidth: "infinity" }}>
          <VStack alignment="leading" spacing={2} frame={{ maxWidth: "infinity" }}>
            <Text fontWeight="bold">{title}</Text>
            <Text font="caption" foregroundStyle="secondaryLabel">{subtitle}</Text>
          </VStack>
          {selected ? (
            <ZStack frame={{ width: 22, height: 22 }}>
              <Circle fill="#6366f1" />
              <Image systemName="checkmark" font={11} foregroundStyle="white" />
            </ZStack>
          ) : null}
        </HStack>
      </VStack>
    </ZStack>
  )
}

function renderLinkRow(item: MenuItem) {
  const url = item.url || actionUrl(item.action || "")
  return (
    <Link url={url}>
      <VStack alignment="leading" spacing={2}>
        <Label title={item.title} systemImage={item.icon} />
        {item.note ? <Text>{item.note}</Text> : null}
      </VStack>
    </Link>
  )
}

function renderInfoRow(item: MenuItem) {
  return (
    <VStack alignment="leading" spacing={2}>
      <Label title={item.title} systemImage={item.icon} />
      {item.note ? <Text>{item.note}</Text> : null}
    </VStack>
  )
}

function renderActionValueRow(icon: string, title: string, value: string, action: string) {
  return (
    <Link url={actionUrl(action)}>
      <HStack alignment="center">
        <Label title={title} systemImage={icon} />
        <Spacer />
        <Text>{value}</Text>
      </HStack>
    </Link>
  )
}


function RefreshSettingsPage() {
  const dismiss = Navigation.useDismiss()
  const styleConfig = ensureStyleConfig()
  const currentVal = String(styleConfig.refreshInterval || "60")
  const [minutes, setMinutes] = useState(currentVal)

  function save(val: string) {
    const next = parseInt(val.trim())
    if (!Number.isNaN(next)) {
      styleConfig.refreshInterval = next
      writeStyleConfig(styleConfig)
      reloadWidgets()
      setMinutes(val)
    }
  }

  return (
    <NavigationStack>
      <List
        navigationTitle="刷新时间间隔"
        navigationBarTitleDisplayMode="inline"
        toolbar={{
          cancellationAction: <Button title="取消" action={dismiss} />,
        }}
      >
        <Section>
          {["自动", "5 分钟", "10 分钟", "15 分钟", "30 分钟"].map((label) => (
            <Button key={label} action={() => {
              const val = label === "自动" ? "60" : label.replace(" 分钟", "")
              save(val)
            }}>
              <HStack>
                <Text>{label}</Text>
                <Spacer />
                { (label === "自动" && minutes === "60") || (label.replace(" 分钟", "") === minutes) ? <Image systemName="checkmark" foregroundStyle="systemBlue" /> : null }
              </HStack>
            </Button>
          ))}
        </Section>
      </List>
    </NavigationStack>
  )
}



function LocationSettingsPage() {
  const dismiss = Navigation.useDismiss()

  async function setLocation() {
    try {
      // 与 Colorful Clouds 完全一致：先地图选点，失败则 GPS
      let location = await Location.pickFromMap()

      if (!location) {
        location = await Location.requestCurrent()
      }

      if (!location) {
        throw new Error("无法获取当前位置，请确认 Scripting 已允许使用定位权限")
      }

      // 用 OpenStreetMap 逆向地理编码获取地名（绕过原生API）
      let resolvedNames: any = {}
      try {
        const geo = await reverseGeocodeOSM(location.latitude, location.longitude)
        if (geo) {
          const t = String(geo.thoroughfare || "").trim()
          const st = String(geo.subThoroughfare || "").trim()
          const street = t && st ? (t.includes(st) ? t : `${t}${st}`) : (t || st)
          const poiName = geo.name || ""
          const fineName = poiName || street || geo.subLocality || geo.locality || "已选位置"
          resolvedNames = {
            administrativeArea: geo.administrativeArea || "",
            locality: geo.locality || "",
            subLocality: geo.subLocality || "",
            neighborhood: geo.neighborhood || "",
            quarter: geo.quarter || "",
            street,
            subThoroughfare: geo.subThoroughfare || "",
            name: fineName,
          }
        }
      } catch {}

      writeLocationCaches({
        lockLocation: false,
        locationData: {
          latitude: location.latitude,
          longitude: location.longitude,
          ...resolvedNames,
          horizontalAccuracy: location.horizontalAccuracy || 0,
          resolvedAt: Date.now(),
        },
      })
      // 同步写入 Storage，确保小组件 getLocation() 回退时用到正确坐标和地名
      Storage.set("Location", {
        latitude: location.latitude,
        longitude: location.longitude,
        ...resolvedNames,
        resolvedAt: Date.now(),
      })
      reloadWidgets()

      // 与 Colorful Clouds 一致：复制经纬度到剪贴板
      await Pasteboard.setString(JSON.stringify(location))
      await showMessage("已拷贝经纬度", `经度: ${location.longitude}\n纬度: ${location.latitude}`)
    } catch (error) {
      await showMessage("定位失败", String((error as any)?.message || error))
    }
  }

  return (
    <NavigationStack>
      <List
        navigationTitle="定位设置"
        toolbar={{
          topBarTrailing: [
            <Button action={dismiss}>
              <Text>保存</Text>
            </Button>,
          ],
        }}
      >
        <Section
          header={<Text>获取位置</Text>}
          footer={<Text attributedString="· 获取后填入桌面小组件参数栏，可为小组件设定天气位置" />}>
          <Button action={setLocation}>
            <Text>获取经纬度</Text>
          </Button>
        </Section>
      </List>
    </NavigationStack>
  )
}


function hasBackgroundForFamily(family: string) {
  const meta = readJson<{ path?: string }>(getWidgetBgMetaPath(family))
  return fm.existsSync(getBgPath(family)) || fm.existsSync(getWidgetBgPath(family)) || Boolean(meta?.path)
}

function BackgroundSettingsPage() {
  const dismiss = Navigation.useDismiss()
  const [refreshSeed, setRefreshSeed] = useState(0)
  const [mediumChanged, setMediumChanged] = useState(false)
  const [largeChanged, setLargeChanged] = useState(false)

  const hasMediumBg = hasBackgroundForFamily("systemMedium")
  const hasLargeBg = hasBackgroundForFamily("systemLarge")
  const hasAnyChange = mediumChanged || largeChanged

  async function handlePickImage(family: "systemMedium" | "systemLarge") {
    try {
      const images = await Photos.pickPhotos(1)
      const image = images?.[0]
      if (!image) return
      writeBackgroundImage(family, image)
      if (family === "systemMedium") setMediumChanged(true)
      else setLargeChanged(true)
      setRefreshSeed(s => s + 1)
    } catch (error) {
      await showMessage("选择图片失败", String((error as any)?.message || error))
    }
  }

  async function handleTransparent(family: "systemMedium" | "systemLarge") {
    await transparentBackground(family)
    if (family === "systemMedium") setMediumChanged(true)
    else setLargeChanged(true)
    setRefreshSeed(s => s + 1)
  }

  async function handleClear(family: "systemMedium" | "systemLarge") {
    await clearBackground(family)
    if (family === "systemMedium") setMediumChanged(true)
    else setLargeChanged(true)
    setRefreshSeed(s => s + 1)
  }

  async function handleSaveAndApply() {
    reloadWidgets("background-save")
    await showMessage("已保存并应用", "壁纸已同步到桌面组件。若桌面未立即变化，请长按组件编辑后返回，或删除后重新添加。")
    dismiss()
  }

  function getActiveBgPath(family: string) {
    const metaPath = getWidgetBgMetaPath(family)
    let meta: any = null
    try {
      if (fm.existsSync(metaPath)) meta = JSON.parse(fm.readAsStringSync(metaPath))
    } catch {}
    if (meta?.path && fm.existsSync(meta.path)) return meta.path
    if (fm.existsSync(getWidgetBgPath(family))) return getWidgetBgPath(family)
    if (fm.existsSync(getBgPath(family))) return getBgPath(family)
    return null
  }

  function renderWallpaperCard(family: "systemMedium" | "systemLarge", title: string, subtitle: string) {
    const hasBg = family === "systemMedium" ? hasMediumBg : hasLargeBg
    const statusText = hasBg ? "已设置壁纸" : "使用默认背景"
    const statusColor = hasBg ? "#34c759" : "#8e8e93"
    const bgPath = getActiveBgPath(family)

    return (
      <VStack spacing={0} padding={0}>
        {/* 卡片标题栏 */}
        <HStack padding={{ horizontal: 16, vertical: 12 }} alignment="center">
          <VStack alignment="leading" spacing={2}>
            <Text font="headline" fontWeight="bold">{title}</Text>
            <Text font="caption" foregroundStyle="secondaryLabel">{subtitle}</Text>
          </VStack>
          <Spacer />
          <HStack spacing={4} alignment="center">
            <Circle fill={statusColor as any} frame={{ width: 8, height: 8 }} />
            <Text font="caption" foregroundStyle={statusColor as any}>{statusText}</Text>
          </HStack>
        </HStack>

        {/* 壁纸预览区域 */}
        <ZStack frame={{ height: 120 }} padding={{ horizontal: 16 }}>
          <RoundedRectangle
            fill={hasBg ? { colors: ["#1a1a2e", "#16213e"], startPoint: "topLeading", endPoint: "bottomTrailing" } : { colors: ["#2d2d3a", "#1c1c2e"], startPoint: "top", endPoint: "bottom" }}
            cornerRadius={12}
          />
          {bgPath ? (
            <ZStack frame={{ height: 120, maxWidth: "infinity" }}>
              <Image
                filePath={bgPath}
                resizable
                scaleToFill
                frame={{ height: 120, maxWidth: "infinity" }}
                clipped
              />
              <RoundedRectangle fill={{ color: "#000000", opacity: 0.4 }} cornerRadius={12} />
              <Text font="subheadline" fontWeight="bold" foregroundStyle="white">预 览</Text>
            </ZStack>
          ) : (
            <VStack alignment="center" spacing={8}>
              <Image
                systemName="photo.badge.plus"
                font={32}
                foregroundStyle="#555566"
              />
              <Text font="caption" foregroundStyle="#666677">点击下方按钮选择图片</Text>
            </VStack>
          )}
        </ZStack>

        {/* 操作按钮区域 */}
        <HStack spacing={8} padding={{ horizontal: 16, vertical: 12 }}>
          {/* 选择图片按钮 */}
          <HStack
            spacing={6}
            alignment="center"
            padding={{ horizontal: 12, vertical: 10 }}
            frame={{ maxWidth: "infinity" }}
            background={{ style: { color: "#007aff", opacity: 1 }, shape: { type: "rect", cornerRadius: 10 } }}
            onTapGesture={() => handlePickImage(family)}
          >
            <Image systemName="photo.on.rectangle" font={14} foregroundStyle="white" />
            <Text font="subheadline" fontWeight="medium" foregroundStyle="white">选择图片</Text>
          </HStack>

          {/* 透明壁纸按钮 */}
          <HStack
            spacing={6}
            alignment="center"
            padding={{ horizontal: 12, vertical: 10 }}
            frame={{ maxWidth: "infinity" }}
            background={{ style: { color: "#5856d6", opacity: 1 }, shape: { type: "rect", cornerRadius: 10 } }}
            onTapGesture={() => handleTransparent(family)}
          >
            <Image systemName="rectangle.on.rectangle" font={14} foregroundStyle="white" />
            <Text font="subheadline" fontWeight="medium" foregroundStyle="white">透明壁纸</Text>
          </HStack>

          {/* 清除按钮 */}
          {hasBg ? (
            <HStack
              spacing={6}
              alignment="center"
              padding={{ horizontal: 12, vertical: 10 }}
              background={{ style: { color: "#ff3b30", opacity: 0.85 }, shape: { type: "rect", cornerRadius: 10 } }}
              onTapGesture={() => handleClear(family)}
            >
              <Image systemName="trash" font={14} foregroundStyle="white" />
            </HStack>
          ) : null}
        </HStack>
      </VStack>
    )
  }

  return (
    <NavigationStack>
      <List
        navigationTitle="壁纸设置"
        navigationBarTitleDisplayMode="inline"
        toolbar={{
          cancellationAction: <Button title="返回" action={dismiss} />,
        }}
      >
        {/* 顶部使用说明 */}
        <Section>
          <VStack spacing={8} padding={{ vertical: 8 }}>
            <HStack spacing={8} alignment="center">
              <ZStack frame={{ width: 28, height: 28 }}>
                <Circle fill="systemBlue" opacity={0.15} />
                <Image systemName="info.circle.fill" font={14} foregroundStyle="systemBlue" />
              </ZStack>
              <Text font="subheadline" foregroundStyle="secondaryLabel">
                选择壁纸后点击底部「保存并应用」同步到桌面组件
              </Text>
            </HStack>
            {hasAnyChange ? (
              <HStack spacing={6} alignment="center" padding={{ horizontal: 12, vertical: 8 }} background={{ style: { color: "#ff9500", opacity: 0.12 }, shape: { type: "rect", cornerRadius: 8 } }}>
                <Image systemName="exclamationmark.circle.fill" font={12} foregroundStyle="systemOrange" />
                <Text font="caption" foregroundStyle="systemOrange" fontWeight="medium">已选择壁纸，请点击保存并应用</Text>
              </HStack>
            ) : null}
          </VStack>
        </Section>

        {/* 中号组件壁纸卡片 */}
        <Section>
          {renderWallpaperCard("systemMedium", "中号组件壁纸", "Medium Widget · 适用于中号桌面组件")}
        </Section>

        {/* 大号组件壁纸卡片 */}
        <Section>
          {renderWallpaperCard("systemLarge", "大号组件壁纸", "Large Widget · 适用于大号桌面组件")}
        </Section>

        {/* 透明壁纸使用说明 */}
        <Section header={<Text font="caption" foregroundStyle="secondaryLabel">透明壁纸使用说明</Text>}>
          <VStack spacing={6} padding={{ vertical: 4 }}>
            <HStack spacing={8} alignment="top">
              <Text font="caption" foregroundStyle="systemBlue">①</Text>
              <Text font="caption" foregroundStyle="secondaryLabel">长按桌面进入编辑模式，滑到没有图标的空白页</Text>
            </HStack>
            <HStack spacing={8} alignment="top">
              <Text font="caption" foregroundStyle="systemBlue">②</Text>
              <Text font="caption" foregroundStyle="secondaryLabel">截图保存该空白页</Text>
            </HStack>
            <HStack spacing={8} alignment="top">
              <Text font="caption" foregroundStyle="systemBlue">③</Text>
              <Text font="caption" foregroundStyle="secondaryLabel">点击「透明壁纸」按钮选择截图，选择组件位置后自动裁剪</Text>
            </HStack>
            <HStack spacing={8} alignment="top">
              <Text font="caption" foregroundStyle="systemBlue">④</Text>
              <Text font="caption" foregroundStyle="secondaryLabel">保存后桌面组件会像透明一样融入壁纸</Text>
            </HStack>
          </VStack>
        </Section>

        {/* 保存并应用按钮 */}
        <Section>
          <Button action={handleSaveAndApply}>
            <HStack
              alignment="center"
              spacing={8}
              padding={{ vertical: 14 }}
              frame={{ maxWidth: "infinity" }}
              background={{ style: { color: hasAnyChange ? "#34c759" : "#007aff", opacity: 1 }, shape: { type: "rect", cornerRadius: 10 } }}
            >
              <Image systemName="square.and.arrow.down.fill" font={16} foregroundStyle="white" />
              <Text font="headline" fontWeight="bold" foregroundStyle="white">
                保存并应用
              </Text>
            </HStack>
          </Button>
        </Section>
      </List>
    </NavigationStack>
  )
}

const fontSizeKeys: Record<string, string> = {
  global: "全局基准",
  greeting: "问候语/大标题",
  date: "公历日期",
  lunar: "农历日期",
  info: "基础信息(电量/位置)",
  weather: "天气详情/描述",
  weatherLarge: "主天气大温度",
  poetry: "诗词与未来预报",
  timeInfo: "底部时间条/宜忌",
  calendar: "月历区域",
  solar: "节气信息",
}

const fontColorKeys: Record<string, string> = {
  greeting: "问候语/大标题",
  date: "公历日期",
  lunar: "农历日期",
  info: "基础信息(电量/位置)",
  weather: "天气详情/描述",
  weatherLarge: "主天气大温度",
  poetry: "诗词与未来预报",
  timeInfo: "底部时间条/宜忌",
  calendar: "月历区域",
  solar: "节气信息",
}

const colorPresets = [
  { name: "白色", value: "#ffffff" },
  { name: "黑色", value: "#000000" },
  { name: "红色", value: "#ff5555" },
  { name: "绿色", value: "#55ff55" },
  { name: "蓝色", value: "#99ccff" },
  { name: "橙色", value: "#ffcc99" },
  { name: "黄色", value: "#ffcc00" },
  { name: "紫色", value: "#d4aaff" },
  { name: "灰色", value: "#888888" },
  { name: "青色", value: "#80ffff" },
]

function FontSizeSettingsPage() {
  const dismiss = Navigation.useDismiss()
  const [styleConfig, setStyleConfig] = useState(() => ensureStyleConfig() as any)
  const keys = Object.keys(fontSizeKeys)

  function getSizePercent(key: string) {
    if (styleConfig[key] && styleConfig[key].size !== undefined) return Math.round(styleConfig[key].size * 100)
    if (styleConfig.global && styleConfig.global.size) return Math.round(styleConfig.global.size * 100)
    return 100
  }

  function updateSize(key: string, val: string) {
    const num = parseFloat(val)
    const next = { ...styleConfig }
    if (!next[key]) next[key] = {}
    if (!Number.isNaN(num) && num >= 40 && num <= 130) {
      next[key] = { ...next[key], size: num / 100 }
    }
    setStyleConfig(next)
  }

  function resetAll() {
    const next = { ...styleConfig }
    for (const k of keys) {
      if (next[k]) delete next[k].size
    }
    setStyleConfig(next)
  }

  function save() {
    writeStyleConfig(styleConfig)
    reloadWidgets("font-size")
    dismiss()
  }

  function renderSizeRow(key: string, name: string) {
    const currentSizePercent = getSizePercent(key)
    return (
      <VStack
        key={key}
        padding={16}
        spacing={12}
        background={{ style: "secondarySystemBackground", shape: { type: "rect", cornerRadius: 16 } }}
      >
        <HStack alignment="center">
          <Text font="headline" fontWeight="bold">{name}</Text>
          <Spacer />
          <Text font="headline" fontWeight="bold" foregroundStyle="systemBlue">{currentSizePercent}%</Text>
        </HStack>
        
        <HStack spacing={12} alignment="center">
          <Text font="subheadline" foregroundStyle="secondaryLabel">比例:</Text>
          <TextField
            label={<Text>大小</Text>}
            prompt="100"
            value={currentSizePercent.toString()}
            onChanged={(v: string) => updateSize(key, v)}
          />
        </HStack>
      </VStack>
    )
  }

  return (
    <NavigationStack>
      <List
        navigationTitle="字体大小"
        navigationBarTitleDisplayMode="inline"
        toolbar={{
          cancellationAction: <Button title="返回" action={dismiss} />,
        }}
      >
        <Section>
          <VStack spacing={8} padding={{ vertical: 8 }}>
            <HStack spacing={8} alignment="top">
              <ZStack frame={{ width: 28, height: 28 }}>
                <Circle fill="systemPurple" opacity={0.15} />
                <Image systemName="textformat.size" font={14} foregroundStyle="systemPurple" />
              </ZStack>
              <Text font="subheadline" foregroundStyle="secondaryLabel" lineLimit={2}>
                输入比例值(40-130)调整各区域字体大小
              </Text>
            </HStack>
          </VStack>
        </Section>

        <Section>
          <VStack spacing={16}>
            {keys.map((key) => renderSizeRow(key, fontSizeKeys[key]))}
          </VStack>
        </Section>

        <Section>
          <Button action={resetAll}>
             <HStack
              alignment="center"
              spacing={8}
              padding={{ vertical: 14 }}
              frame={{ maxWidth: "infinity" }}
              background={{ style: { color: "#ff3b30", opacity: 0.85 }, shape: { type: "rect", cornerRadius: 10 } }}
            >
              <Image systemName="trash.fill" font={16} foregroundStyle="white" />
              <Text font="headline" fontWeight="bold" foregroundStyle="white">
                全部恢复默认大小
              </Text>
            </HStack>
          </Button>
        </Section>

        <Section>
          <Button action={save}>
            <HStack
              alignment="center"
              spacing={8}
              padding={{ vertical: 14 }}
              frame={{ maxWidth: "infinity" }}
              background={{ style: { color: "#34c759", opacity: 1 }, shape: { type: "rect", cornerRadius: 10 } }}
            >
              <Image systemName="square.and.arrow.down.fill" font={16} foregroundStyle="white" />
              <Text font="headline" fontWeight="bold" foregroundStyle="white">
                保存并应用
              </Text>
            </HStack>
          </Button>
        </Section>
      </List>
    </NavigationStack>
  )
}

function FontColorSettingsPage() {
  const dismiss = Navigation.useDismiss()
  const [styleConfig, setStyleConfig] = useState(() => ensureStyleConfig() as any)
  const keys = Object.keys(fontColorKeys)

  function getColor(key: string) {
    return styleConfig[key]?.color || ""
  }

  function setColor(key: string, color: string) {
    const next = { ...styleConfig }
    if (!next[key]) next[key] = {}
    if (color) {
      next[key] = { ...next[key], color }
    } else {
      const { color: _, ...rest } = next[key]
      next[key] = rest
    }
    setStyleConfig(next)
  }

  function save() {
    writeStyleConfig(styleConfig)
    reloadWidgets("font-color")
    dismiss()
  }

  function renderColorRow(key: string, name: string) {
    const currentColor = getColor(key)
    return (
      <VStack
        key={key}
        padding={16}
        spacing={12}
        background={{ style: "secondarySystemBackground", shape: { type: "rect", cornerRadius: 16 } }}
      >
        <HStack alignment="center">
          <Text font="headline" fontWeight="bold">{name}</Text>
          <Spacer />
          <ZStack frame={{ width: 24, height: 24 }}>
            <Circle fill={currentColor || "clear"} />
            <Circle fill="clear" stroke={{ color: "separator", opacity: 1 }} />
          </ZStack>
        </HStack>
        
        <HStack spacing={12} alignment="center">
          <Text font="subheadline" foregroundStyle="secondaryLabel">Hex:</Text>
          <TextField
            label={<Text>颜色</Text>}
            prompt="#ffffff (留空为默认)"
            value={currentColor}
            onChanged={(v: string) => setColor(key, v)}
          />
        </HStack>

        <ScrollView axes="horizontal">
          <HStack spacing={12} padding={{ vertical: 4 }}>
            {colorPresets.map((preset) => (
              <Button key={preset.value} action={() => setColor(key, preset.value)}>
                <VStack spacing={4} alignment="center">
                  <ZStack frame={{ width: 36, height: 36 }}>
                    <Circle fill={preset.value as any} />
                    {currentColor === preset.value && (
                      <Circle fill="clear" stroke={{ color: "systemBlue", opacity: 1 }} />
                    )}
                    <Circle fill="clear" stroke={{ color: "separator", opacity: 1 }} />
                  </ZStack>
                  <Text font="caption2" foregroundStyle="secondaryLabel">{preset.name}</Text>
                </VStack>
              </Button>
            ))}
          </HStack>
        </ScrollView>
      </VStack>
    )
  }

  return (
    <NavigationStack>
      <List
        navigationTitle="字体颜色"
        navigationBarTitleDisplayMode="inline"
        toolbar={{
          cancellationAction: <Button title="返回" action={dismiss} />,
        }}
      >
        <Section>
          <VStack spacing={8} padding={{ vertical: 8 }}>
            <HStack spacing={8} alignment="center">
              <ZStack frame={{ width: 28, height: 28 }}>
                <Circle fill="systemPurple" opacity={0.15} />
                <Image systemName="paintpalette.fill" font={14} foregroundStyle="systemPurple" />
              </ZStack>
              <Text font="subheadline" foregroundStyle="secondaryLabel">
                选择下方预设色块或输入Hex代码修改区域颜色
              </Text>
            </HStack>
          </VStack>
        </Section>

        <Section>
          <VStack spacing={16}>
            {keys.map((key) => renderColorRow(key, fontColorKeys[key]))}
          </VStack>
        </Section>

        <Section>
          <Button action={() => {
            const next = { ...styleConfig }
            for (const k of keys) {
              if (next[k]) delete next[k].color
            }
            setStyleConfig(next)
          }}>
             <HStack
              alignment="center"
              spacing={8}
              padding={{ vertical: 14 }}
              frame={{ maxWidth: "infinity" }}
              background={{ style: { color: "#ff3b30", opacity: 0.85 }, shape: { type: "rect", cornerRadius: 10 } }}
            >
              <Image systemName="trash.fill" font={16} foregroundStyle="white" />
              <Text font="headline" fontWeight="bold" foregroundStyle="white">
                全部恢复默认颜色
              </Text>
            </HStack>
          </Button>
        </Section>

        <Section>
          <Button action={save}>
            <HStack
              alignment="center"
              spacing={8}
              padding={{ vertical: 14 }}
              frame={{ maxWidth: "infinity" }}
              background={{ style: { color: "#34c759", opacity: 1 }, shape: { type: "rect", cornerRadius: 10 } }}
            >
              <Image systemName="square.and.arrow.down.fill" font={16} foregroundStyle="white" />
              <Text font="headline" fontWeight="bold" foregroundStyle="white">
                保存并应用
              </Text>
            </HStack>
          </Button>
        </Section>
      </List>
    </NavigationStack>
  )
}

function FeatureGuidePage() {
  const dismiss = Navigation.useDismiss()
  return (
    <NavigationStack>
      <List
        navigationTitle="设置引导"
        navigationBarTitleDisplayMode="inline"
        toolbar={{
          cancellationAction: <Button title="返回" action={dismiss} />,
        }}
      >
        <Section>
          <VStack alignment="leading" spacing={4}>
            <Text>推荐操作流程</Text>
            {statusInfo.recommendations.map((text: string, index: number) => (
              <VStack alignment="leading" spacing={4} key={index}>
                <Label title={`步骤 ${index + 1}`} systemImage={`${index + 1}.circle.fill`} />
                <Text>{text}</Text>
              </VStack>
            ))}
            <Text>按顺序完成基础配置，可减少大多数首次使用问题。</Text>
          </VStack>
        </Section>
        
        <Section title="尺寸说明">
            {sizeGuideItems.map((item, index) => <VStack key={index}>{renderInfoRow(item)}</VStack>)}
        </Section>

        <Section title="快捷入口">
          <NavigationLink destination={<ApiKeySettingsPage />}>
            <Label title="设置 API Key" systemImage="key.fill" />
          </NavigationLink>
          <NavigationLink destination={<LocationSettingsPage />}>
            <Label title="设置定位" systemImage="mappin.and.ellipse" />
          </NavigationLink>
          <NavigationLink destination={<RefreshSettingsPage />}>
            <Label title="设置刷新频率" systemImage="clock.fill" />
          </NavigationLink>
          <Text>遇到问题时，可以快速跳转到对应设置项。</Text>
        </Section>
      </List>
    </NavigationStack>
  )
}

function loadStatusInfo(): StatusInfo {
  const apiConfig = readJson<{ apiKey?: string }>(keyCachePath)
  const locationConfig = readJson<LocationConfig>(locCachePath)
  const styleConfig = readJson<StyleConfig>(styleCachePath) || {}

  const hasApiKey = Boolean(apiConfig?.apiKey && String(apiConfig.apiKey).trim())
  const hasLocation = Boolean(locationConfig?.locationData?.locality || locationConfig?.locationData?.latitude || locationConfig?.lockLocation === false)
  const hasRefresh = styleConfig.refreshInterval !== undefined && styleConfig.refreshInterval !== null && String(styleConfig.refreshInterval) !== ""
  const hasBackground = hasBackgroundForFamily("systemMedium") || hasBackgroundForFamily("systemLarge")

  const readyCount = [hasApiKey, hasLocation, hasRefresh].filter(Boolean).length
  const readinessBadge = readyCount === 3 ? "已就绪" : readyCount === 2 ? "接近完成" : readyCount === 1 ? "待完善" : "未开始"
  
  const apiKeyText = hasApiKey ? "已设置" : "未设置"
  const refreshText = styleConfig.refreshInterval ? `${styleConfig.refreshInterval} 分钟` : "自动"
  const backgroundText = hasBackground ? "已更换" : "默认"

  const sizeKeys = ["global", "greeting", "date", "lunar", "info", "weather", "weatherLarge", "poetry", "timeInfo", "calendar", "solar"]
  const colorKeys = ["greeting", "date", "lunar", "info", "weather", "weatherLarge", "poetry", "timeInfo", "calendar", "solar"]
  const customSizeCount = sizeKeys.filter((key) => Boolean((styleConfig as any)?.[key]?.size !== undefined)).length
  const customColorCount = colorKeys.filter((key) => Boolean((styleConfig as any)?.[key]?.color)).length
  const layoutEntries = [
    styleConfig.layout?.medium?.left,
    styleConfig.layout?.medium?.right,
    styleConfig.layout?.large?.left,
    styleConfig.layout?.large?.right,
  ]
  const customLayoutCount = layoutEntries.filter((item) => Boolean((item?.x || 0) || (item?.y || 0))).length

  const fontSizeText = customSizeCount > 0 ? `${customSizeCount} 项已调整` : "默认"
  const fontColorText = customColorCount > 0 ? `${customColorCount} 项已调整` : "默认"
  const layoutText = customLayoutCount > 0 ? `${customLayoutCount} 处已偏移` : "默认"
  
  const chartStyleText = styleConfig.weatherChart?.style === "caiyun" ? "B · 彩云" : "A · Apple"
  
  const recommendations: string[] = []
  if (!hasApiKey) recommendations.push("先设置 API Key，用以加载天气数据。")
  if (!hasLocation) recommendations.push("然后设置定位，确保城市信息正确。")
  recommendations.push("每次修改字体、颜色、背景或布局后，立即重新预览中号和大号组件。")
  recommendations.push("若应用内预览正确但桌面未更新，属于正常现象，请等待 iOS 下一次 Widget 刷新。")

  let cachedWeather: WeatherInfo | null = null
  try {
    if (fm.existsSync(weatherCachePath)) {
      const raw = fm.readAsStringSync(weatherCachePath)
      if (raw) cachedWeather = JSON.parse(raw)
    }
  } catch {}

  return {
    readinessBadge,
    apiKeyText,
    refreshText,
    backgroundText,
    fontSizeText,
    fontColorText,
    layoutText,
    chartStyleText,
    recommendations,
    cachedWeather,
  }
}

function readJson<T>(path: string): T | null {
  try {
    if (!fm.existsSync(path)) return null
    return JSON.parse(fm.readAsStringSync(path)) as T
  } catch {
    return null
  }
}

function writeJson(path: string, data: unknown) {
  fm.writeAsStringSync(path, JSON.stringify(data))
}

function writeStyleConfig(styleConfig: StyleConfig) {
  writeJson(styleCachePath, styleConfig)
  writeJson(styleCachePathAppGroup, styleConfig)
}

function ensureStyleConfig() {
  return readJson<StyleConfig>(styleCachePath) || readJson<StyleConfig>(styleCachePathAppGroup) || { global: { size: 1.0 } }
}

function sanitizeStyleConfig(styleConfig: StyleConfig): StyleConfig {
  const next: any = { ...(styleConfig || { global: { size: 1.0 } }) }
  if (!next.global) next.global = { size: 1.0 }
  if (!next.layout) next.layout = {}
  if (!next.layout.medium) next.layout.medium = {}
  if (!next.layout.large) next.layout.large = {}
  next.layout.medium.left = { x: 0, y: 0 }
  next.layout.medium.right = { x: 0, y: 0 }
  next.layout.large.left = { x: 0, y: 0 }
  next.layout.large.right = { x: 0, y: 0 }
  next.layoutFixedAt = Date.now()
  return next as StyleConfig
}

function writeWidgetReloadControl(source = "index") {
  try {
    writeJson(`${appGroupDir}/widget_reload_control.json`, {
      requestedAt: Date.now(),
      burstUntil: Date.now() + 10 * 60 * 1000,
      source,
      scriptName,
      revision: "large-layout-safe-v2",
    })
  } catch {}
}

function forceDesktopWidgetSync(source = "index") {
  const styleConfig = sanitizeStyleConfig(ensureStyleConfig())
  writeStyleConfig(styleConfig)
  writeWidgetReloadControl(source)
  try {
    Widget.reloadAll()
  } catch {}
}

function reloadWidgets(source = "index") {
  forceDesktopWidgetSync(source)
}

async function previewWidget(family: "systemMedium" | "systemLarge") {
  reloadWidgets(`preview:${family}`)
  try {
    await Widget.preview({ family: family })
  } catch (error) {
    const alert = new Alert()
    alert.title = "预览失败"
    alert.message = String(error)
    alert.addAction("确定")
    await alert.presentAlert()
  } finally {
    // Reload desktop widgets again explicitly after preview finishes or fails, to ensure changes are synced
    reloadWidgets(`post-preview:${family}`)
  }
}

async function inputApiKey() {
  const current = readJson<{ apiKey?: string }>(keyCachePath)?.apiKey || ""
  const alert = new Alert()
  alert.title = "API Key"
  alert.addTextField("输入 Token", current)
  alert.addAction("保存")
  alert.addCancelAction("取消")
  if (await alert.presentAlert() === 0) {
    writeApiKey(alert.textFieldValue(0) || "")
    reloadWidgets()
  }
}

async function setupRefreshInterval() {
  const styleConfig = ensureStyleConfig()
  const alert = new Alert()
  alert.title = "⏱️ 设置刷新频率"
  const currentVal = styleConfig.refreshInterval || "60"
  alert.message = `当前: ${currentVal} 分钟\n(注意: iOS系统限制最小刷新间隔通常为15-30分钟，设置过低也无法突破系统省电限制)`
  alert.addTextField("输入分钟数", String(currentVal))
  alert.addAction("保存")
  alert.addCancelAction("取消")
  if (await alert.presentAlert() === 0) {
    const val = parseInt(alert.textFieldValue(0))
    if (!Number.isNaN(val)) {
      styleConfig.refreshInterval = val
      writeStyleConfig(styleConfig)
      reloadWidgets()
    }
  }
}

async function setupLocation() {
  try {
    let l = await pickFromMap()

    if (!l) {
      l = await requestCurrentLocationInfo()
    }

    if (!l) {
      throw new Error("无法获取位置")
    }

    const g = await Location.reverseGeocode({
      latitude: l.latitude,
      longitude: l.longitude,
      locale: "zh-CN",
    })

    const geo = g?.[0] || {}
    const t = String(geo.thoroughfare || "").trim()
    const st = String(geo.subThoroughfare || "").trim()
    const street = t && st ? (t.includes(st) ? t : `${t}${st}`) : (t || st)
    const poiName = geo.name || ""
    const fineName = poiName || street || geo.subLocality || geo.locality || "已选位置"

    // ⭐ 直辖市省份修正：Apple 地图偶尔返回错误的 administrativeArea
    const municipalities = ["上海市", "北京市", "天津市", "重庆市"]
    let adminArea = geo.administrativeArea || ""
    const loc = geo.locality || ""
    if (loc && adminArea && municipalities.includes(loc) && adminArea !== loc) {
      adminArea = loc
    }

    writeLocationCaches({
      lockLocation: false,
      locationData: {
        latitude: l.latitude,
        longitude: l.longitude,
        administrativeArea: adminArea,
        locality: loc,
        subLocality: geo.subLocality || "",
        neighborhood: "",
        quarter: "",
        street,
        subThoroughfare: geo.subThoroughfare || "",
        horizontalAccuracy: l.horizontalAccuracy || 0,
        name: fineName,
        resolvedAt: Date.now(),
      },
    })
    // 同步写入 Storage，确保小组件 getLocation() 回退时用到正确坐标
    Storage.set("Location", {
      latitude: l.latitude,
      longitude: l.longitude,
      locality: loc,
      subLocality: geo.subLocality || "",
      administrativeArea: adminArea,
      subAdministrativeArea: "",
      town: "",
      street: street || "",
      neighborhood: "",
      quarter: "",
      name: fineName,
      resolvedAt: Date.now(),
    })

    appendLocationDebugLog("Map Pick Location", {
      latitude: l.latitude,
      longitude: l.longitude,
      geo,
    })

    try {
      await Pasteboard.setString(JSON.stringify({
        latitude: l.latitude,
        longitude: l.longitude,
        timestamp: l.timestamp || Date.now(),
      }))
    } catch {}

    reloadWidgets("location-map-pick")
    await showMessage("已拷贝经纬度", `经度: ${l.longitude}\n纬度: ${l.latitude}`)
  } catch (e) {
    await showMessage("定位失败", String((e as any)?.message || e))
  }
}

async function changeBackground(family: string = "systemLarge") {
  try {
    const images = await Photos.pickPhotos(1)
    const image = images?.[0]
    if (!image) return
    writeBackgroundImage(family, image)
    reloadWidgets()
    await showMessage("背景已保存", "已写入桌面组件共享目录。若桌面未立即变化，请长按组件编辑后返回，或删除后重新添加。")
  } catch (error) {
    await showMessage("背景设置失败", String((error as any)?.message || error))
  }
}

async function showMessage(title: string, message: string) {
  const alert = new Alert()
  alert.title = title
  alert.message = message
  alert.addAction("好")
  await alert.presentAlert()
}


function imageToData(image: any): any {
  return image?.toJPEGData?.(0.92) || image?.toPNGData?.() || null
}

function writeImageData(path: string, image: any) {
  const data = imageToData(image)
  if (!data) throw new Error("无法读取选择的图片数据")
  fm.writeAsDataSync(path, data)
}

function writeBackgroundImage(family: string, image: any) {
  const versionedWidgetBgPath = `${appGroupDir}/${scriptName}_background_${family}_${Date.now()}.jpg`
  writeImageData(getBgPath(family), image)
  writeImageData(getWidgetBgPath(family), image)
  writeImageData(versionedWidgetBgPath, image)
  writeJson(getWidgetBgMetaPath(family), {
    path: versionedWidgetBgPath,
    fallbackPath: getWidgetBgPath(family),
    updatedAt: Date.now(),
  })
}

async function clearBackground(family: string = "systemLarge") {
  const bPath = getBgPath(family)
  const wBgPath = getWidgetBgPath(family)
  const metaPath = getWidgetBgMetaPath(family)

  if (fm.existsSync(bPath)) fm.removeSync(bPath)
  if (fm.existsSync(wBgPath)) fm.removeSync(wBgPath)
  const meta = readJson<{ path?: string }>(metaPath)
  if (meta?.path && fm.existsSync(meta.path)) fm.removeSync(meta.path)
  if (fm.existsSync(metaPath)) fm.removeSync(metaPath)
  reloadWidgets()
  await showMessage("已清除背景", "已恢复默认背景。")
}

type WallpaperCropPreset = {
  small: number
  medium: number
  large: number
  left: number
  right: number
  top: number
  middle: number
  bottom: number
}

const wallpaperCropPresets: Record<number, WallpaperCropPreset> = {
  2796: { small: 510, medium: 1092, large: 1146, left: 99, right: 681, top: 282, middle: 918, bottom: 1554 },
  2778: { small: 510, medium: 1092, large: 1146, left: 96, right: 678, top: 246, middle: 882, bottom: 1518 },
  2688: { small: 507, medium: 1080, large: 1137, left: 81, right: 654, top: 228, middle: 858, bottom: 1488 },
  2556: { small: 474, medium: 1014, large: 1062, left: 82, right: 622, top: 270, middle: 858, bottom: 1446 },
  2532: { small: 474, medium: 1014, large: 1062, left: 78, right: 618, top: 231, middle: 819, bottom: 1407 },
  2436: { small: 465, medium: 987, large: 1035, left: 69, right: 591, top: 213, middle: 783, bottom: 1353 },
  2340: { small: 465, medium: 987, large: 1035, left: 69, right: 591, top: 231, middle: 801, bottom: 1371 },
  2208: { small: 471, medium: 1044, large: 1071, left: 99, right: 672, top: 114, middle: 696, bottom: 1278 },
  1792: { small: 338, medium: 720, large: 758, left: 54, right: 436, top: 160, middle: 580, bottom: 1000 },
  1334: { small: 296, medium: 642, large: 648, left: 54, right: 400, top: 60, middle: 412, bottom: 764 },
  1136: { small: 282, medium: 584, large: 622, left: 30, right: 332, top: 59, middle: 399, bottom: 399 },
}

function getWallpaperCropPreset(image: any): WallpaperCropPreset {
  const height = Math.round(Math.max(image?.height || 0, image?.width || 0))
  const exact = wallpaperCropPresets[height]
  if (exact) return exact
  const base = wallpaperCropPresets[2532]
  const scale = height > 0 ? height / 2532 : 1
  return {
    small: Math.round(base.small * scale),
    medium: Math.round(base.medium * scale),
    large: Math.round(base.large * scale),
    left: Math.round(base.left * scale),
    right: Math.round(base.right * scale),
    top: Math.round(base.top * scale),
    middle: Math.round(base.middle * scale),
    bottom: Math.round(base.bottom * scale),
  }
}

async function transparentBackground(family: "systemMedium" | "systemLarge" = "systemLarge") {
  try {
    const info = new Alert()
    info.title = "透明壁纸"
    info.message = "请选择一张没有图标的桌面截图。\n建议：长按桌面进入编辑模式，滑到空白页后截图，再回到这里选择该截图。"
    info.addAction("选择截图")
    info.addCancelAction("取消")
    if (await info.presentAlert() !== 0) return

    const images = await Photos.pickPhotos(1)
    const screenshot = images?.[0]
    if (!screenshot) return

    const widgetSize = family === "systemMedium" ? "medium" : "large"

    const posMenu = new Alert()
    posMenu.title = "选择桌面位置"
    posMenu.message = widgetSize === "medium" ? "选择中号组件放在桌面的哪个位置" : "选择大号组件放在桌面的哪个位置"
    const positions = widgetSize === "medium" ? ["左上", "右上", "左中", "右中", "左下", "右下"] : ["顶部", "中部", "底部"]
    positions.forEach((item) => posMenu.addAction(item))
    posMenu.addCancelAction("取消")
    const posIdx = await posMenu.presentSheet()
    if (posIdx < 0) return

    const preset = getWallpaperCropPreset(screenshot)
    const yMap = [preset.top, preset.top, preset.middle, preset.middle, preset.bottom, preset.bottom]
    const xMap = [preset.left, preset.right, preset.left, preset.right, preset.left, preset.right]
    const x = widgetSize === "medium" ? xMap[posIdx] : preset.left
    const y = widgetSize === "medium" ? yMap[posIdx] : [preset.top, preset.middle, preset.bottom][posIdx]
    const width = preset.medium
    const height = widgetSize === "medium" ? preset.small : preset.large
    const cropped = screenshot.renderedIn(
      { width, height },
      { position: { x, y }, size: { width, height } }
    ) || screenshot

    writeBackgroundImage(family, cropped)
    reloadWidgets()

    const done = new Alert()
    done.title = "已生成透明壁纸"
    done.message = "透明背景已保存到组件共享目录。请回桌面查看；如果没立即变化，可长按组件编辑后返回或重新添加组件。"
    done.addAction("完成")
    await done.presentAlert()
  } catch (error) {
    const alert = new Alert()
    alert.title = "透明壁纸生成失败"
    alert.message = String((error as any)?.message || error)
    alert.addAction("好")
    await alert.presentAlert()
  }
}

function ensureLayoutConfig(styleConfig: any) {
  if (!styleConfig.layout) styleConfig.layout = {}
  if (!styleConfig.layout.medium) styleConfig.layout.medium = { left: { x: 0, y: 0 }, right: { x: 0, y: 0 } }
  if (!styleConfig.layout.large) styleConfig.layout.large = { left: { x: 0, y: 0 }, right: { x: 0, y: 0 } }
  if (!styleConfig.layout.medium.left) styleConfig.layout.medium.left = { x: 0, y: 0 }
  if (!styleConfig.layout.medium.right) styleConfig.layout.medium.right = { x: 0, y: 0 }
  if (!styleConfig.layout.large.left) styleConfig.layout.large.left = { x: 0, y: 0 }
  if (!styleConfig.layout.large.right) styleConfig.layout.large.right = { x: 0, y: 0 }
  return styleConfig
}

async function adjustLayoutOffset(widgetType: "medium" | "large", sideType: "left" | "right") {
  const styleConfig = ensureLayoutConfig(ensureStyleConfig() as any)
  const current = styleConfig.layout[widgetType][sideType] || { x: 0, y: 0 }
  const input = new Alert()
  input.title = `📏 ${widgetType === "medium" ? "中号" : "大号"}${sideType === "left" ? "左侧" : "右侧"}偏移`
  input.message = `请输入 X/Y 轴偏移值（-60~60）\n当前值：X=${current.x || 0}px, Y=${current.y || 0}px`
  input.addTextField("X轴偏移", String(current.x || 0))
  input.addTextField("Y轴偏移", String(current.y || 0))
  input.addAction("保存")
  input.addAction("恢复默认 (0,0)")
  input.addCancelAction("取消")
  const res = await input.presentAlert()
  if (res === 0) {
    let x = parseInt(input.textFieldValue(0)) || 0
    let y = parseInt(input.textFieldValue(1)) || 0
    x = Math.max(-60, Math.min(60, x))
    y = Math.max(-60, Math.min(60, y))
    styleConfig.layout[widgetType][sideType] = { x, y }
    writeStyleConfig(styleConfig)
    reloadWidgets()
  } else if (res === 1) {
    styleConfig.layout[widgetType][sideType] = { x: 0, y: 0 }
    writeStyleConfig(styleConfig)
    reloadWidgets()
  }
}

async function resetAllLayoutOffsets() {
  const styleConfig = ensureLayoutConfig(ensureStyleConfig() as any)
  styleConfig.layout.medium.left = { x: 0, y: 0 }
  styleConfig.layout.medium.right = { x: 0, y: 0 }
  styleConfig.layout.large.left = { x: 0, y: 0 }
  styleConfig.layout.large.right = { x: 0, y: 0 }
  writeStyleConfig(styleConfig)
  reloadWidgets()
}

async function setupFontSize() {
  const styleConfig = ensureStyleConfig() as any
  const fontKeys: Record<string, string> = {
    global: "🌍 全局基准",
    greeting: "👋 问候语/大标题",
    date: "📅 公历日期",
    lunar: "🌙 农历日期",
    info: "🔋 基础信息(电量/位置)",
    weather: "☁️ 天气详情/描述",
    weatherLarge: "🌡️ 主天气大温度",
    poetry: "📜 诗词与未来预报",
    timeInfo: "⏳ 底部时间条/宜忌",
    calendar: "🗓️ 月历区域",
    solar: "🌾 节气信息",
  }
  const menu = new Alert()
  menu.title = "🔠 调节字体大小"
  menu.message = "当前值 (100为默认)"
  const keys = Object.keys(fontKeys)
  for (const key of keys) {
    let sVal = 100
    if (styleConfig[key] && styleConfig[key].size !== undefined) sVal = Math.round(styleConfig[key].size * 100)
    else if (styleConfig.global && styleConfig.global.size) sVal = Math.round(styleConfig.global.size * 100)
    menu.addAction(`${fontKeys[key]} [${sVal}%]`)
  }
  menu.addAction("↩️ 全部恢复默认大小")
  menu.addCancelAction("取消")
  const idx = await menu.presentSheet()
  if (idx === keys.length) {
    for (const k in styleConfig) {
      if (styleConfig[k]) delete styleConfig[k].size
    }
    writeStyleConfig(styleConfig)
    reloadWidgets("font-size:reset")
    return
  }
  if (idx < 0) return
  const key = keys[idx]
  const input = new Alert()
  input.title = `大小调整: ${fontKeys[key]}`
  input.message = "请输入 40 到 130 之间的数字\n(100 为标准大小)"
  const currentSize = styleConfig[key] && styleConfig[key].size !== undefined ? Math.round(styleConfig[key].size * 100) : 100
  input.addTextField("数值", String(currentSize))
  input.addAction("保存")
  input.addAction("恢复默认 (100%)")
  input.addCancelAction("返回")
  const res = await input.presentAlert()
  if (res === 0) {
    let value = parseFloat(input.textFieldValue(0))
    if (!Number.isNaN(value)) {
      value = Math.max(40, Math.min(130, value))
      if (!styleConfig[key]) styleConfig[key] = {}
      styleConfig[key].size = value / 100
      writeStyleConfig(styleConfig)
      reloadWidgets(`font-size:${key}`)
    }
  } else if (res === 1) {
    if (styleConfig[key]) delete styleConfig[key].size
    writeStyleConfig(styleConfig)
    reloadWidgets(`font-size:${key}:reset`)
  }
}

async function setupFontColor() {
  const styleConfig = ensureStyleConfig() as any
  const fontKeys: Record<string, string> = {
    greeting: "👋 问候语/大标题",
    date: "📅 公历日期",
    lunar: "🌙 农历日期",
    info: "🔋 基础信息(电量/位置)",
    weather: "☁️ 天气详情/描述",
    weatherLarge: "🌡️ 主天气大温度",
    poetry: "📜 诗词与未来预报",
    timeInfo: "⏳ 底部时间条/宜忌",
    calendar: "🗓️ 月历区域",
    solar: "🌾 节气信息",
  }
  const presets = [
    { n: "⚪ 白色", v: "#ffffff" },
    { n: "⚫ 黑色", v: "#000000" },
    { n: "🔴 红色", v: "#ff5555" },
    { n: "🟢 绿色", v: "#55ff55" },
    { n: "🔵 蓝色", v: "#99ccff" },
    { n: "🟠 橙色", v: "#ffcc99" },
    { n: "🟡 黄色", v: "#ffcc00" },
    { n: "🟣 紫色", v: "#d4aaff" },
    { n: "🔘 灰色", v: "#888888" },
    { n: "🧼 青色", v: "#80ffff" },
    { n: "↩️ 恢复默认颜色", v: "default" },
    { n: "✏️ 自定义代码...", v: "custom" },
  ]
  const sectionMenu = new Alert()
  sectionMenu.title = "🎨 调节字体颜色"
  sectionMenu.message = "点击选择要修改的区域"
  const keys = Object.keys(fontKeys)
  for (const key of keys) {
    sectionMenu.addAction(`${fontKeys[key]} [${styleConfig[key]?.color ? "自定义" : "默认"}]`)
  }
  sectionMenu.addCancelAction("取消")
  const idx = await sectionMenu.presentSheet()
  if (idx < 0) return
  const key = keys[idx]
  const menu = new Alert()
  menu.title = `颜色选择: ${fontKeys[key]}`
  for (const preset of presets) menu.addAction(preset.n)
  menu.addCancelAction("返回")
  const colorIdx = await menu.presentSheet()
  if (colorIdx < 0) return
  const selected = presets[colorIdx]
  if (!styleConfig[key]) styleConfig[key] = {}
  if (selected.v === "custom") {
    const custom = new Alert()
    custom.title = "输入颜色代码"
    custom.message = "请输入 Hex 颜色代码 (例如 #FFFFFF)"
    custom.addTextField("Hex Code", styleConfig[key]?.color || "")
    custom.addAction("保存")
    custom.addCancelAction("取消")
    if (await custom.presentAlert() === 0) {
      let value = custom.textFieldValue(0).trim()
      if (value) {
        if (!value.startsWith("#")) value = `#${value}`
        styleConfig[key].color = value
        writeStyleConfig(styleConfig)
        reloadWidgets(`font-color:${key}:custom`)
      }
    }
    return
  }
  if (selected.v === "default") delete styleConfig[key].color
  else styleConfig[key].color = selected.v
  writeStyleConfig(styleConfig)
  reloadWidgets(`font-color:${key}`)
}

async function setupLayout() {
  const typeMenu = new Alert()
  typeMenu.title = "📐 布局调整"
  typeMenu.message = "支持中/大组件左侧、右侧区域单独调整 X/Y 轴偏移"
  typeMenu.addAction("中号组件 (Medium)")
  typeMenu.addAction("大号组件 (Large)")
  typeMenu.addCancelAction("取消")
  const typeIdx = await typeMenu.presentSheet()
  if (typeIdx < 0) return
  const widgetType = typeIdx === 0 ? "medium" : "large"

  const sideMenu = new Alert()
  sideMenu.title = `🔧 ${widgetType === "medium" ? "中号" : "大号"}组件 - 选择区域`
  sideMenu.addAction("左侧区域（日期/诗词/日程）")
  sideMenu.addAction("右侧区域（天气详情）")
  sideMenu.addCancelAction("返回")
  const sideIdx = await sideMenu.presentSheet()
  if (sideIdx < 0) return
  await adjustLayoutOffset(widgetType, sideIdx === 0 ? "left" : "right")
}

/** 需要在设置完成后自动弹出预览的 action 列表 */
const AUTO_PREVIEW_ACTIONS = new Set([
  "font-size",
  "font-color",
  "layout",
  "change-background",
  "clear-background",
  "transparent-background",
])

async function handleAction(action: string) {
  if (action === "preview-medium") return previewWidget("systemMedium")
  if (action === "preview-large") return previewWidget("systemLarge")
  if (action === "api-key") return inputApiKey()
  if (action === "location") return setupLocation()
  if (action === "refresh") return setupRefreshInterval()
  if (action === "font-size") await setupFontSize()
  else if (action === "font-color") await setupFontColor()
  else if (action === "layout") await setupLayout()
  else if (action === "change-background") await changeBackground()
  else if (action === "clear-background") await clearBackground()
  else if (action === "transparent-background") await transparentBackground()
  else if (action === "refresh-weather-background") {
    reloadWidgets("force-refresh")
  }
  // 设置完成后自动弹出组件预览，让用户立即看到效果
  if (AUTO_PREVIEW_ACTIONS.has(action)) {
    await previewWidget("systemMedium")
  }
}


async function run() {
  // 启动时清除所有遗留通知（防止旧版本代码调度的通知继续弹出）
  clearAllNotifications().catch(() => {})

  const action = Script.queryParameters?.action
  forceDesktopWidgetSync(action ? `open:${action}` : "open:index")
  if (action) {
    await handleAction(action)
    Script.exit()
    return
  }
  await Navigation.present(<ConfigPage />)
  Script.exit()
}

run().catch((error) => {
  const alert = new Alert()
  alert.title = "彩云天气启动失败"
  alert.message = String((error as any)?.message || error || "未知错误")
  alert.addCancelAction("知道了")
  alert.presentAlert().catch(() => {})
})

export default function Preview() {
  return <ConfigPage />
}
