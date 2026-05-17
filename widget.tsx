import { VStack, HStack, ZStack, Text, Spacer, Divider, Widget, fetch, Image, Rectangle, Circle, Capsule, Notification, gradient, type Color } from "scripting"
import { getNinebotInfo, doSign, autoOpenBlindBoxes, type NinebotWidgetData } from './api'
import { getStorage, setStorage } from './utils/storage'

// 扩展数据接口
interface ExtendedNinebotData extends NinebotWidgetData {
  waitingBoxDesc: string
  stats: {
    signStreakMax: number
  }
}

// 全局配置 - 科技颗粒风
const Config = {
  spacing: { xs: 2, sm: 4, md: 6, lg: 8, xl: 12 },
  colors: {
    bg1: "#0A0E1A" as Color,
    bg2: "#0D1526" as Color,
    panel: "#111B2E" as Color,
    panelStroke: "#1A2A4A" as Color,
    textPrimary: "#E8F0FE" as Color,
    textSecondary: "#8BA3C7" as Color,
    textTertiary: "#4A6A8A" as Color,
    cyan: "#00E5FF" as Color,
    cyanDim: "#005F6B" as Color,
    accent: "#FFD60A" as Color,
    success: "#00FF9D" as Color,
    warning: "#FF6B35" as Color,
    info: "#00B4D8" as Color,
    purple: "#B388FF" as Color,
    particle1: "#00E5FF" as Color,
    particle2: "#00B4D8" as Color,
    particle3: "#1A2A4A" as Color,
    particle4: "#B388FF" as Color,
  }
}

// 颗粒坐标生成
const particlePositions = (count: number, seed: number) => {
  const positions: Array<{x: number, y: number, size: number, color: Color}> = []
  let s = seed
  const rand = () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647 }
  const colors = [Config.colors.particle1, Config.colors.particle2, Config.colors.particle3, Config.colors.particle4]
  for (let i = 0; i < count; i++) {
    positions.push({
      x: rand() * 100,
      y: rand() * 100,
      size: 1 + rand() * 2.5,
      color: colors[Math.floor(rand() * colors.length)]
    })
  }
  return positions
}

const getBlindBoxColor = (awardDays: number): Color => {
  if (awardDays === 7) return Config.colors.success
  if (awardDays === 666) return Config.colors.warning
  return Config.colors.info
}

// --- 科技基础组件 ---

const ParticleLayer = ({ count = 12, seed = 42, width = 160, height = 160 }: { count?: number, seed?: number, width?: number, height?: number }) => {
  const particles = particlePositions(count, seed)
  return (
    <ZStack frame={{ width, height }}>
      {particles.map((p, i) => (
        <Circle
          key={i}
          fill={p.color}
          frame={{ width: p.size, height: p.size }}
          offset={{ x: p.x * width / 100 - width / 2, y: p.y * height / 100 - height / 2 }}
        />
      ))}
    </ZStack>
  )
}

const TechPanel = ({ children, padding = 8 }: { children: any, padding?: number }) => (
  <ZStack frame={{ maxWidth: "infinity" }}>
    <Rectangle
      fill={Config.colors.panel}
      stroke={{ shapeStyle: Config.colors.panelStroke, strokeStyle: { lineWidth: 0.5 } }}
    />
    <VStack padding={padding} spacing={Config.spacing.sm} frame={{ maxWidth: "infinity" }}>
      {children}
    </VStack>
  </ZStack>
)

const BrandTitle = ({ fontSize = 12 }: { fontSize?: number }) => (
  <Text
    font={fontSize}
    fontWeight="black"
    foregroundStyle={gradient("linear", {
      colors: [Config.colors.cyan, Config.colors.accent],
      startPoint: "leading",
      endPoint: "trailing"
    })}
  >
    九号电动车
  </Text>
)

const SignStatusIndicator = ({ isSigned, size = 70 }: { isSigned: boolean, size?: number }) => (
  <ZStack frame={{ width: size, height: size }} alignment="center">
    <Circle
      fill={Config.colors.bg2}
      stroke={{
        shapeStyle: isSigned ? Config.colors.success : Config.colors.cyan,
        strokeStyle: { lineWidth: 2, lineCap: "round" }
      }}
    />
    <Circle
      stroke={{
        shapeStyle: isSigned ? Config.colors.success : Config.colors.cyanDim,
        strokeStyle: { lineWidth: 0.5 }
      }}
      frame={{ width: size * 0.75, height: size * 0.75 }}
    />
    <VStack alignment="center" spacing={1}>
      <Image
        systemName={isSigned ? "checkmark.circle.fill" : "calendar.badge.clock"}
        font={size * 0.32}
        fontWeight="bold"
        foregroundStyle={{ color: isSigned ? Config.colors.success : Config.colors.cyan, opacity: 1 }}
      />
      <Text
        font={size * 0.14}
        fontWeight="bold"
        foregroundStyle={{ color: isSigned ? Config.colors.success : Config.colors.cyan, opacity: 1 }}
      >
        {isSigned ? "已签到" : "未签到"}
      </Text>
    </VStack>
  </ZStack>
)

const BlindBoxRing = ({ boxes, size = 55 }: { boxes: Array<{ awardDays: number, leftDaysToOpen: number }>, size?: number }) => {
  const pendingBoxes = boxes.filter(box => box.leftDaysToOpen > 0)
  const count = pendingBoxes.length
  const strokeWidth = size / 8

  return (
    <ZStack frame={{ width: size, height: size }} alignment="center">
      <Circle stroke={{ shapeStyle: Config.colors.panelStroke, strokeStyle: { lineWidth: strokeWidth } }} />
      {count > 0 ? (
        pendingBoxes.map((box, index) => {
          const angle = 1 / count
          const gap = count > 1 ? 0.05 : 0
          return (
            <Circle
              key={index}
              stroke={{
                shapeStyle: getBlindBoxColor(box.awardDays),
                strokeStyle: { lineWidth: strokeWidth, lineCap: "round" }
              }}
              trim={{ from: index * angle + gap / 2, to: (index + 1) * angle - gap / 2 }}
            />
          )
        })
      ) : (
        <Circle stroke={{ shapeStyle: Config.colors.success, strokeStyle: { lineWidth: strokeWidth } }} />
      )}
      <VStack alignment="center" spacing={-2}>
        <Text font={size * 0.35} fontWeight="bold" foregroundStyle={{ color: Config.colors.textPrimary, opacity: 1 }}>
          {count || boxes.length}
        </Text>
        <Text font={size * 0.18} fontWeight="medium" foregroundStyle={{ color: Config.colors.textTertiary, opacity: 1 }}>待开</Text>
      </VStack>
    </ZStack>
  )
}

const CurrentStreakBadge = ({ streak, fontSize = 10 }: { streak: number, fontSize?: number }) => (
  <ZStack alignment="center">
    <Capsule
      fill={Config.colors.bg2}
      stroke={{ shapeStyle: Config.colors.cyan, strokeStyle: { lineWidth: 0.8, lineCap: "round" } }}
    />
    <HStack spacing={Config.spacing.xs} alignment={"center"} padding={{ horizontal: 6, vertical: 4 }}>
      <Image systemName="bolt.fill" font={fontSize + 1} foregroundStyle={{ color: Config.colors.cyan, opacity: 1 }} />
      <Text font={fontSize} fontWeight={"bold"} foregroundStyle={{ color: Config.colors.textPrimary, opacity: 1 }}>
        连续 {streak} 天
      </Text>
    </HStack>
  </ZStack>
)

const BlindBoxAnalysisRow = ({ box }: { box: { awardDays: number, leftDaysToOpen: number } }) => {
  const color = getBlindBoxColor(box.awardDays)
  const progress = (box.awardDays - box.leftDaysToOpen) / box.awardDays

  return (
    <VStack alignment="leading" spacing={2}>
      <HStack spacing={Config.spacing.xs} alignment="center">
        <Text font={10} fontWeight="bold" foregroundStyle={{ color: Config.colors.textPrimary, opacity: 1 }}>
          {box.awardDays}天盲盒
        </Text>
        <Spacer />
        <Text font={9} foregroundStyle={{ color: Config.colors.textTertiary, opacity: 1 }}>
          剩{box.leftDaysToOpen}天
        </Text>
      </HStack>
      <ZStack frame={{ height: 3.5, maxWidth: "infinity" }} alignment="leading">
        <Capsule fill={Config.colors.panelStroke} />
        <HStack spacing={0}>
          <Capsule fill={color} frame={{ height: 3.5, width: 80 * progress }} />
          <Spacer />
        </HStack>
      </ZStack>
    </VStack>
  )
}

const DataTag = ({ label, value, color }: { label: string, value: string | number, color?: Color }) => (
  <HStack spacing={3} alignment="center">
    <Circle fill={color || Config.colors.cyan} frame={{ width: 3, height: 3 }} />
    <Text font={9} foregroundStyle={{ color: Config.colors.textSecondary, opacity: 1 }}>{label}</Text>
    <Text font={10} fontWeight="bold" foregroundStyle={{ color: color || Config.colors.textPrimary, opacity: 1 }}>{value}</Text>
  </HStack>
)

// --- 尺寸适配视图 ---

const SmallWidgetView = ({ info }: { info: ExtendedNinebotData }) => (
  <ZStack
    frame={{ maxWidth: "infinity", maxHeight: "infinity" }}
    widgetBackground={Config.colors.bg1}
  >
    <ParticleLayer count={8} seed={7} width={160} height={160} />
    <VStack
      padding={Config.spacing.md}
      spacing={Config.spacing.sm}
      alignment="center"
      frame={{ maxWidth: "infinity", maxHeight: "infinity" }}
    >
      <BrandTitle fontSize={10} />
      <Spacer />
      <SignStatusIndicator isSigned={info.isSigned} size={55} />
      <VStack spacing={1} alignment="center">
        <Text font={12} fontWeight="bold" foregroundStyle={{ color: Config.colors.cyan, opacity: 1 }}>LV.{info.level}</Text>
        <Text font={8} foregroundStyle={{ color: Config.colors.textTertiary, opacity: 1 }}>EXP {info.experience}</Text>
      </VStack>
      <Spacer />
      <CurrentStreakBadge streak={info.consecutiveDays} fontSize={8} />
    </VStack>
  </ZStack>
)

const MediumContent = ({ info }: { info: ExtendedNinebotData }) => {
  const pendingBoxes = info.notOpenedBoxesDetail.filter(box => box.leftDaysToOpen > 0)

  return (
    <HStack
      padding={Config.spacing.lg}
      frame={{ maxWidth: "infinity", maxHeight: "infinity" }}
      spacing={Config.spacing.md}
    >
      <VStack alignment={"center"} frame={{ width: 100 }} spacing={Config.spacing.sm}>
        <BrandTitle fontSize={11} />
        <Spacer />
        <SignStatusIndicator isSigned={info.isSigned} size={60} />
        <Spacer />
        <CurrentStreakBadge streak={info.consecutiveDays} fontSize={9} />
      </VStack>

      <Rectangle fill={Config.colors.panelStroke} frame={{ width: 0.5, maxHeight: "infinity" }} />

      <VStack frame={{ maxWidth: "infinity" }} alignment={"leading"} spacing={Config.spacing.md}>
        <TechPanel padding={6}>
          <HStack alignment="center">
            <Text font={12} fontWeight={"bold"} foregroundStyle={{ color: Config.colors.textPrimary, opacity: 1 }}>账户资产</Text>
            <Spacer />
            <Text font={8} foregroundStyle={{ color: Config.colors.textTertiary, opacity: 1 }}>
              {new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </HStack>
          <HStack spacing={Config.spacing.sm} alignment="center">
            <DataTag label="等级" value={`LV.${info.level}`} color={Config.colors.cyan} />
            <DataTag label="N币" value={info.nCoin} color={Config.colors.accent} />
            <DataTag label="补签" value={info.signCardsNum} color={Config.colors.info} />
          </HStack>
          <Text font={8} foregroundStyle={{ color: Config.colors.textTertiary, opacity: 1 }}>经验值 {info.experience}</Text>
        </TechPanel>

        <TechPanel padding={6}>
          <Text font={11} fontWeight={"bold"} foregroundStyle={{ color: Config.colors.textPrimary, opacity: 1 }}>🎁 待开盲盒</Text>
          <HStack spacing={Config.spacing.md} alignment={"center"}>
            <BlindBoxRing boxes={info.notOpenedBoxesDetail} size={42} />
            <VStack alignment="leading" spacing={Config.spacing.sm} frame={{ maxWidth: "infinity" }}>
              {pendingBoxes.length > 0 ? (
                pendingBoxes.slice(0, 2).map((box, i) => (
                  <BlindBoxAnalysisRow key={i} box={box} />
                ))
              ) : (
                <Text font={10} foregroundStyle={{ color: Config.colors.success, opacity: 1 }}>所有盲盒已就绪</Text>
              )}
            </VStack>
          </HStack>
        </TechPanel>
      </VStack>
    </HStack>
  )
}

const MediumWidgetView = ({ info }: { info: ExtendedNinebotData }) => (
  <ZStack
    frame={{ maxWidth: "infinity", maxHeight: "infinity" }}
    widgetBackground={Config.colors.bg1}
  >
    <ParticleLayer count={14} seed={21} width={340} height={160} />
    <MediumContent info={info} />
  </ZStack>
)

const LargeWidgetView = ({ info }: { info: ExtendedNinebotData }) => {
  const uniqueHistory = info.openedBoxesDetail
    .sort((a, b) => parseInt(b.openedTime) - parseInt(a.openedTime))
    .reduce((acc, current) => {
      const exists = acc.find(item => item.awardDays === current.awardDays)
      if (!exists) {
        acc.push(current)
      }
      return acc
    }, [] as typeof info.openedBoxesDetail)
    .slice(0, 5)

  return (
    <ZStack
      frame={{ maxWidth: "infinity", maxHeight: "infinity" }}
      widgetBackground={Config.colors.bg1}
    >
      <ParticleLayer count={20} seed={42} width={340} height={340} />
      <VStack
        padding={Config.spacing.xl}
        spacing={Config.spacing.lg}
        frame={{ maxWidth: "infinity", maxHeight: "infinity" }}
      >
        <MediumContent info={info} />
        <Rectangle fill={Config.colors.panelStroke} frame={{ height: 0.5, maxWidth: "infinity" }} />
        <TechPanel padding={8}>
          <Text font={13} fontWeight="bold" foregroundStyle={{ color: Config.colors.textPrimary, opacity: 1 }}>📜 最近开启记录</Text>
          {uniqueHistory.map((box, i) => (
            <HStack key={i} spacing={Config.spacing.md} alignment="center">
              <ZStack frame={{ width: 26, height: 26 }}>
                <Circle fill={Config.colors.bg2} stroke={{ shapeStyle: Config.colors.panelStroke, strokeStyle: { lineWidth: 0.5 } }} />
                <Text font={11}>🎁</Text>
              </ZStack>
              <VStack alignment="leading" spacing={1}>
                <Text font={11} fontWeight="medium" foregroundStyle={{ color: Config.colors.textPrimary, opacity: 1 }}>获得 {box.awardDays} 天奖励</Text>
                <Text font={9} foregroundStyle={{ color: Config.colors.textTertiary, opacity: 1 }}>
                  {new Date(parseInt(box.openedTime)).toLocaleDateString()}
                </Text>
              </VStack>
              <Spacer />
              <Text font={10} fontWeight="bold" foregroundStyle={{ color: Config.colors.success, opacity: 1 }}>已入账</Text>
            </HStack>
          ))}
          {uniqueHistory.length === 0 && (
            <Text font={11} foregroundStyle={{ color: Config.colors.textTertiary, opacity: 1 }}>暂无开启记录</Text>
          )}
        </TechPanel>
      </VStack>
    </ZStack>
  )
}

// --- 数据获取与入口 ---

const fetchWidgetData = async (): Promise<ExtendedNinebotData> => {
  try {
    let auth = getStorage("ninebot.authorization") || ""
    let devId = getStorage("ninebot.deviceId") || ""
    
    // Get settings to check if auto sign is enabled
    const settingsStr = getStorage("ninebotSettings")
    const settings = typeof settingsStr === 'string' ? JSON.parse(settingsStr) : (settingsStr || {})
    
    let baseData = await getNinebotInfo(auth, devId)
    
    // 自动签到
    if (settings.autoSign) {
      const now = new Date()
      const currentHours = now.getHours()
      const currentMinutes = now.getMinutes()
      const currentTimeStr = `${currentHours.toString().padStart(2, '0')}:${currentMinutes.toString().padStart(2, '0')}`
      const targetTimeStr = settings.autoSignTime || "00:30"
      
      if (currentTimeStr >= targetTimeStr) {
        if (!baseData.isSigned) {
          const signResult = await doSign(auth, devId)
          if (signResult.success) {
             baseData = await getNinebotInfo(auth, devId)
             try {
               await Notification.schedule({
                 title: "🛴 九号自动签到成功",
                 body: `已连续签到 ${baseData.consecutiveDays} 天。当前 N币: ${baseData.nCoin}`,
               })
               const todayDateStr = `${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}`
               setStorage("ninebotLastSignNotifyDate", todayDateStr)
             } catch (e) {
             }
          }
        } else {
           const lastNotifyDate = getStorage("ninebotLastSignNotifyDate")
           const todayDateStr = `${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}`
           if (lastNotifyDate !== todayDateStr) {
             try {
               await Notification.schedule({
                 title: "🛴 九号今日已签到",
                 body: `您今日已完成签到。连续签到 ${baseData.consecutiveDays} 天。`,
               })
               setStorage("ninebotLastSignNotifyDate", todayDateStr)
             } catch (e) {
             }
           }
        }
      }
    }

    // 自动开启盲盒
    if (settings.autoOpenBlindBox && baseData.notOpenedBlindBoxCount > 0) {
      const openResult = await autoOpenBlindBoxes(auth, devId)
      if (openResult.openSuccess > 0 || openResult.receiveSuccess > 0) {
         baseData = await getNinebotInfo(auth, devId)
      }
    }

    const signStreakMax = Math.max(getStorage('ninebotMaxSignStreak') || 0, baseData.consecutiveDays)
    setStorage('ninebotMaxSignStreak', signStreakMax)
    return {
      ...baseData,
      waitingBoxDesc: `${baseData.notOpenedBlindBoxCount}个待开`,
      stats: { signStreakMax }
    }
  } catch (error) {
    const cached = getStorage('ninebotWidgetCache') as ExtendedNinebotData | null
    if (cached) return cached
    throw error
  }
}

(async () => {
  try {
    const info = await fetchWidgetData()
    const family = Widget.family
    
    let view = <MediumWidgetView info={info} />
    if (family === "systemSmall") view = <SmallWidgetView info={info} />
    if (family === "systemLarge") view = <LargeWidgetView info={info} />

    Widget.present(view, { 
      policy: "after", 
      date: new Date(Date.now() + 1000 * 60 * 15)
    })
  } catch (error) {
    Widget.present(
      <VStack padding={12} alignment={"center"} spacing={8} widgetBackground={"#0A0E1A" as Color}>
        <Text font={12} fontWeight={"bold"} foregroundStyle={{ color: "#FF3B30" as Color, opacity: 1 }}>加载失败</Text>
        <Text font={10} foregroundStyle={{ color: "#4A6A8A" as Color, opacity: 1 }}>{(error as Error).message}</Text>
      </VStack>
    )
  }
})()
