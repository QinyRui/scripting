import { VStack, HStack, ZStack, Text, Spacer, Widget, Image, Rectangle, Circle, Capsule, Notification, gradient, type Color } from "scripting"
import { getNinebotInfo, doSign, autoOpenBlindBoxes, refreshVehicleData, getMyAchievement, type NinebotWidgetData, type VehicleInfo, type AchievementInfo } from './api'
import { getStorage, setStorage } from './utils/storage'

// 不再需要 CalendarNotificationTrigger / DateComponents（盲盒通知已移除）

// ==================== 通知存储 key（仅保留签到通知）====================
// 盲盒与任务通知已移除

// ==================== 当前脚本名（用于 tapAction.runScript）====================
const CURRENT_SCRIPT_NAME = "九号APP签到"

interface ExtendedNinebotData extends NinebotWidgetData {
  waitingBoxDesc: string
  stats: { signStreakMax: number }
  vehicle: VehicleInfo | null
}

// ========================
// 主题系统
// ========================

const isTransparent = Widget.isTransparentBackground

const Theme = {
  transparent: isTransparent,
  colors: isTransparent ? {
    bg: "clear" as Color,
    card: "rgba(255,255,255,0.08)" as Color,
    cardStroke: "rgba(255,255,255,0.15)" as Color,
    text1: "#FFFFFF" as Color,
    text2: "rgba(255,255,255,0.7)" as Color,
    text3: "rgba(255,255,255,0.4)" as Color,
    cyan: "#00E5FF" as Color,
    cyanGlow: "rgba(0,229,255,0.2)" as Color,
    green: "#34C759" as Color,
    greenGlow: "rgba(52,199,89,0.25)" as Color,
    orange: "#FF9500" as Color,
    red: "#FF3B30" as Color,
    redGlow: "rgba(255,59,48,0.2)" as Color,
    purple: "#BF5AF2" as Color,
    purpleGlow: "rgba(191,90,242,0.2)" as Color,
    yellow: "#FFD60A" as Color,
    yellowGlow: "rgba(255,214,10,0.15)" as Color,
  } : {
    bg: "#000000" as Color,
    card: "#141822" as Color,
    cardStroke: "#1E2640" as Color,
    text1: "#F0F4FF" as Color,
    text2: "#8899BB" as Color,
    text3: "#4A5A7A" as Color,
    cyan: "#00E5FF" as Color,
    cyanGlow: "rgba(0,229,255,0.15)" as Color,
    green: "#34C759" as Color,
    greenGlow: "rgba(52,199,89,0.15)" as Color,
    orange: "#FF9500" as Color,
    red: "#FF3B30" as Color,
    redGlow: "rgba(255,59,48,0.15)" as Color,
    purple: "#BF5AF2" as Color,
    purpleGlow: "rgba(191,90,242,0.12)" as Color,
    yellow: "#FFD60A" as Color,
    yellowGlow: "rgba(255,214,10,0.1)" as Color,
  }
}

// ========================
// 基于显示尺寸的自适应缩放
// ========================

const DS = Widget.displaySize
const W = DS.width
const H = DS.height

/** 缩放工具：基于基准值(大号宽度345)进行缩放 */
const S = (base: number) => Math.round(base * W / 345)

/** 字体缩放 */
const fs = (base: number) => Math.max(6, Math.round(base * W / 345))

// ========================
// 视觉效果组件
// ========================

/** 环形扩散脉冲 — 签到成功 */
const RingPulseEffect = ({ color = Theme.colors.green, size }: { color?: Color, size: number }) => {
  const layers = 3
  return (
    <ZStack frame={{ width: size, height: size }} alignment="center">
      {Array.from({ length: layers }, (_, i) => (
        <Circle
          key={i}
          stroke={{ shapeStyle: color, strokeStyle: { lineWidth: Math.max(0.5, S(2) - i * 0.5) } }}
          frame={{ width: size * (1 + i * 0.22), height: size * (1 + i * 0.22) }}
          opacity={Math.max(0.06, 0.45 - i * 0.15)}
        />
      ))}
    </ZStack>
  )
}

/** 电流扫描光束 */
const ScanBeam = ({ width, color = Theme.colors.green }: { width: number, color?: Color }) => (
  <ZStack frame={{ width, height: S(8) }} alignment="center">
    <Rectangle fill={color} frame={{ height: S(10), maxWidth: "infinity" }} opacity={0.04} />
    <Rectangle fill={color} frame={{ height: S(1), maxWidth: "infinity" }} opacity={0.4} />
    <Circle fill={color} frame={{ width: S(4), height: S(4) }} offset={{ x: -width * 0.15, y: 0 }} opacity={0.9} />
    <Circle fill={color} frame={{ width: S(2), height: S(2) }} offset={{ x: -width * 0.25, y: 0 }} opacity={0.5} />
  </ZStack>
)

// ========================
// 核心 UI 组件
// ========================

/** 中心图标路径 */
const NINEBOT_LOGO_PATH = "/var/mobile/Library/Mobile Documents/iCloud~com~thomfang~Scripting/Documents/scripts/九号APP签到/photos/LOUGO.png"
const VEHICLE_IMG_PATH = "/var/mobile/Library/Mobile Documents/iCloud~com~thomfang~Scripting/Documents/scripts/九号APP签到/photos/ninebot-vehicle-transparent.png"

/** 签到核心仪表盘 — 彩色渐变环（基于时间旋转）+ 光晕 + 九号logo */
const StatusDashboard = ({ isSigned, size }: { isSigned: boolean, size: number }) => {
  const iconSize = size * 0.55
  // ═══ 基于当前时间计算旋转角度（每圈不同速度）═══
  const now = Date.now() / 1000  // 秒级时间戳
  const rot1 = (now * 8) % 360    // 青色外圈：最快
  const rot2 = -(now * 5) % 360   // 紫色圈：反向中速
  const rot3 = (now * 3) % 360    // 绿色圈：慢速
  const rot4 = -(now * 12) % 360  // 金色活动环：最快反向

  return (
    <ZStack frame={{ width: size, height: size }} alignment="center">
      {/* ═══ 第一层：最外圈 — 青色弧段（旋转）═══ */}
      <ZStack frame={{ width: size, height: size }} alignment="center"
        rotationEffect={{ degrees: rot1, anchor: "center" }}>
        <Circle stroke={{ shapeStyle: '#00E5FF' as Color, strokeStyle: { lineWidth: Math.max(0.5, S(0.8)) } }}
          frame={{ width: size, height: size }}
          trim={{ from: 0.0, to: 0.75 }} opacity={0.25} />
      </ZStack>
      {/* ═══ 第二圈 — 紫色弧段（反向旋转）═══ */}
      <ZStack frame={{ width: size * 0.88, height: size * 0.88 }} alignment="center"
        rotationEffect={{ degrees: rot2, anchor: "center" }}>
        <Circle stroke={{ shapeStyle: '#BF5AF2' as Color, strokeStyle: { lineWidth: Math.max(0.8, S(1.2)) } }}
          frame={{ width: size * 0.88, height: size * 0.88 }}
          trim={{ from: 0.1, to: 0.85 }} opacity={0.35} />
      </ZStack>
      {/* ═══ 第三圈 — 绿色弧段（慢速旋转）═══ */}
      <ZStack frame={{ width: size * 0.76, height: size * 0.76 }} alignment="center"
        rotationEffect={{ degrees: rot3, anchor: "center" }}>
        <Circle stroke={{ shapeStyle: '#34C759' as Color, strokeStyle: { lineWidth: Math.max(1, S(1.8)) } }}
          frame={{ width: size * 0.76, height: size * 0.76 }}
          trim={{ from: 0.05, to: 0.90 }} opacity={0.45} />
      </ZStack>
      {/* ═══ 第四圈：活动环 — 黄金弧段（最快反向）═══ */}
      <ZStack frame={{ width: size * 0.66, height: size * 0.66 }} alignment="center"
        rotationEffect={{ degrees: rot4, anchor: "center" }}>
        <Circle stroke={{ shapeStyle: '#FFD60A' as Color, strokeStyle: { lineWidth: Math.max(1.5, S(2.5)) } }}
          frame={{ width: size * 0.66, height: size * 0.66 }}
          trim={{ from: 0.08, to: 0.65 }} opacity={0.80} />
      </ZStack>

      {/* ═══ 装饰点 — 跟随外圈旋转 ═══ */}
      <ZStack frame={{ width: size, height: size }} alignment="center"
        rotationEffect={{ degrees: rot1 * 0.7, anchor: "center" }}>
        <Circle fill="#00E5FF" frame={{ width: Math.max(3, S(4)), height: Math.max(3, S(4)) }}
          offset={{ x: size * 0.33, y: -size * 0.1 }} opacity={0.50} />
        <Circle fill="#BF5AF2" frame={{ width: Math.max(2, S(3)), height: Math.max(2, S(3)) }}
          offset={{ x: -size * 0.28, y: size * 0.2 } } opacity={0.40} />
      </ZStack>

      {/* ═══ 外围光晕（静态）═══ */}
      <Circle fill="#6B5CE7" frame={{ width: size * 0.58, height: size * 0.58 }} opacity={0.06} />
      <Circle fill="#5B4FCF" frame={{ width: size * 0.53, height: size * 0.53 }} opacity={0.08} />

      {/* ═══ 九号logo（静态不旋转，精确对齐） ═══ */}
      <Image filePath={NINEBOT_LOGO_PATH} resizable={true} frame={{ width: iconSize, height: iconSize }} />
    </ZStack>
  )
}

/** ninebot 品牌标题 — 红色英文 + 彩色九号 */
const NinebotTitle = ({ fontSize }: { fontSize: number }) => (
  <VStack alignment="center" spacing={0}>
    <Text font={Math.round(fontSize * 0.5)} foregroundStyle={{ color: "#FF3B30" as Color, opacity: 1 }}>ninebot</Text>
    <HStack alignment="center" spacing={0}>
      <Text font={fontSize} fontWeight="bold" foregroundStyle={{ color: "#00E5FF" as Color, opacity: 1 }}>九</Text>
      <Text font={fontSize} fontWeight="bold" foregroundStyle={{ color: "#BF5AF2" as Color, opacity: 1 }}>号</Text>
    </HStack>
  </VStack>
)

/** 科技卡片 */
const TechCard = ({ children, padding, glowColor }: { children: any, padding?: number, glowColor?: Color }) => (
  <ZStack frame={{ maxWidth: "infinity" }}>
    <Rectangle fill={Theme.colors.card} stroke={{ shapeStyle: Theme.colors.cardStroke, strokeStyle: { lineWidth: 0.5 } }} />
    {glowColor && (
      <>
        <Circle fill={glowColor} frame={{ width: 2, height: 2 }} offset={{ x: -1, y: -1 }} opacity={0.5} />
        <Circle fill={glowColor} frame={{ width: 2, height: 2 }} offset={{ x: 1, y: -1 }} opacity={0.5} />
        <Circle fill={glowColor} frame={{ width: 2, height: 2 }} offset={{ x: -1, y: 1 }} opacity={0.5} />
        <Circle fill={glowColor} frame={{ width: 2, height: 2 }} offset={{ x: 1, y: 1 }} opacity={0.5} />
      </>
    )}
    <VStack padding={padding ?? S(8)} spacing={S(3)} frame={{ maxWidth: "infinity" }}>
      {children}
    </VStack>
  </ZStack>
)

/** 格式化更新时间 → "HH:MM" */
const formatTime = (d: Date) => `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`

/** 统计项卡片 — 图标 + 标签 + 数值 + 彩色底线 */
const StatItem = ({ icon, label, value, color }: { icon: string, label: string, value: string | number, color: Color }) => (
  <VStack alignment="center" spacing={1} frame={{ maxWidth: "infinity" }}>
    <Image systemName={icon} font={fs(8)} foregroundStyle={{ color, opacity: 0.85 }} />
    <Text font={fs(6)} foregroundStyle={{ color: Theme.colors.text2, opacity: 0.8 }}>{label}</Text>
    <Text font={fs(12)} fontWeight="bold" foregroundStyle={{ color, opacity: 1 }}>{value}</Text>
    <Rectangle fill={color} frame={{ width: S(16), height: 1.5 }} opacity={0.5} />
  </VStack>
)

/** 宝箱盲盒组件 — 左宝箱右文布局，进度条从右往左逐渐减少 */
const BlindBoxRing = ({ box, vehicleName }: { box: any, vehicleName?: string }) => {
  const isReady = box.leftDaysToOpen <= 0
  const total = box.awardDays || 7
  const left = box.leftDaysToOpen
  const progress = isReady ? 1 : Math.max(0, Math.min(1, (total - left) / total))
  const boxSize = S(42)

  // 颜色：可领取=绿色，冷却中=橙色
  const accentColor = isReady ? Theme.colors.green : Theme.colors.orange
  const glowColor = isReady ? Theme.colors.green : Theme.colors.orange
  const bgRingColor = Widget.isTransparentBackground
    ? ("rgba(255,255,255,0.15)" as Color)
    : ("rgba(255,255,255,0.08)" as Color)

  return (
    // @ts-ignore
    <HStack alignment="center" spacing={S(8)}>
      {/* 左侧：宝箱图标 */}
      <ZStack frame={{ width: boxSize, height: boxSize }} alignment="center">
        {/* 外层光晕 */}
        <Circle fill={glowColor}
          frame={{ width: boxSize + S(10), height: boxSize + S(10) }}
          opacity={0.10} />
        {/* 中层光晕 */}
        <Circle fill={glowColor}
          frame={{ width: boxSize + S(5), height: boxSize + S(5) }}
          opacity={0.16} />
        {/* 宝箱底座光底板 */}
        <Circle fill={Widget.isTransparentBackground
          ? ("rgba(255,255,255,0.12)" as Color)
          : ("rgba(191,90,242,0.08)" as Color)}
          frame={{ width: boxSize, height: boxSize }} />
        {/* 宝箱图标 */}
        <VStack alignment="center" spacing={0}>
          {isReady ? (
            <>
              {/* @ts-ignore */}
              <Image systemName="gift.fill" font={fs(22)}
                foregroundStyle={{ color: accentColor, opacity: 1 }} />
              {/* @ts-ignore */}
              <Text font={fs(6)} fontWeight="bold"
                foregroundStyle={{ color: accentColor, opacity: 1 }}>可领</Text>
            </>
          ) : (
            <>
              {/* @ts-ignore */}
              <Image systemName="shippingbox.fill" font={fs(22)}
                foregroundStyle={{ color: accentColor, opacity: 0.9 }} />
              {/* @ts-ignore */}
              <Text font={fs(8)} fontWeight="bold"
                foregroundStyle={{ color: Theme.colors.text1, opacity: 1 }}>{left}天</Text>
            </>
          )}
        </VStack>
      </ZStack>
      {/* 右侧：文字信息 + 从右往左减少的进度条 */}
      <VStack alignment="leading" spacing={S(3)}>
        {/* 标题 */}
        {/* @ts-ignore */}
        <Text font={fs(10)} fontWeight="bold" lineLimit={1}
          foregroundStyle={{ color: Theme.colors.text1, opacity: 1 }}>
          {total === 7 ? "连续签到7天" : "连续签到" + total + "天"}
        </Text>
        {/* 副标题 */}
        {/* @ts-ignore */}
        <Text font={fs(8)} fontWeight="semibold"
          foregroundStyle={{ color: Theme.colors.text3, opacity: 1 }}>
          {isReady ? "可开启!" : "还剩 " + left + " 天"}
        </Text>
        {/* 倒计时进度条 - 7天满格，左边剩余彩色，右边已过灰色 */}
        <HStack spacing={S(1.5)} frame={{ height: S(5), width: S(80) }}>
          {Array.from({ length: total }).map((_, i) => {
            // i < left = 剩余天数(左边) → 彩色；i >= left = 已过天数(右边) → 灰色
            const isColored = i < left
            // 赛博渐变色：蓝(左) → 青 → 绿 → 黄 → 橙 → 金(右)
            const cyberColors = ["#5B6ABF", "#0ABDE3", "#48DBFB", "#78E08F", "#FFC048", "#FF8E53", "#FFD60A"]
            const segColor = cyberColors[i % cyberColors.length]
            return (
              <ZStack key={i} frame={{ maxWidth: "infinity" }}>
                {isColored ? (
                  /* 剩余天数 - 彩色发光格 */
                  <ZStack frame={{ height: S(5) }} alignment="center">
                    <Rectangle fill={segColor as Color} frame={{ height: S(5) }}
                      background={{ shape: { type: "rect", cornerRadius: S(1.5) }, style: segColor as Color }} />
                    {/* 顶部高光 */}
                    <Rectangle fill="#FFFFFF" frame={{ height: S(1), maxWidth: "infinity" }}
                      offset={{ x: 0, y: -S(1.2) }} opacity={0.25} />
                  </ZStack>
                ) : (
                  /* 已过天数 - 灰色半透明格 */
                  <Rectangle fill="rgba(255,255,255,0.12)" frame={{ height: S(5) }}
                    background={{ shape: { type: "rect", cornerRadius: S(1.5) }, style: "rgba(255,255,255,0.12)" as Color }} />
                )}
              </ZStack>
            )
          })}
        </HStack>
        {/* 车型名 */}
        {vehicleName ? (
          // @ts-ignore
          <Text font={fs(12)} foregroundStyle={{ color: Theme.colors.text3, opacity: 0.8 }}>
            {vehicleName}
          </Text>
        ) : null}
      </VStack>
    </HStack>
  )
}

/** 横向胶囊盲盒行（大号组件使用） */
const BlindBoxRowLarge = ({ box }: { box: any }) => {
  const isReady = box.leftDaysToOpen <= 0;
  const isTransparent = Widget.isTransparentBackground;
  
  const total = box.awardDays || 7;
  const left = box.leftDaysToOpen;
  
  const titleText = total === 7 ? "连续签到7天" : "连续签到" + total + "天";
  const subText = isReady ? "可开启!" : "还剩 " + left + " 天";
  
  const barColor = isReady ? Theme.colors.green : "#2B82F6" as Color;
  const bgBarColor = isTransparent ? ("rgba(255,255,255,0.15)" as Color) : ("rgba(255,255,255,0.1)" as Color);
  
  const progressRatio = isReady ? 1 : Math.max(0, Math.min(1, (total - left) / total));
  const progressWidth = S(100); 
  
  return (
    <HStack alignment="center" spacing={S(4)} frame={{ minWidth: 0, maxWidth: "infinity" }} padding={{ vertical: 2 }}>
      <ZStack frame={{ width: S(34), height: S(34) }} alignment="center"
        background={{ shape: { type: "rect", cornerRadius: S(8) }, style: isTransparent ? ("rgba(255,255,255,0.12)" as Color) : ("rgba(255,255,255,0.06)" as Color) }}>
        <Image systemName="cube.fill" font={fs(22)} foregroundStyle={{ color: Theme.colors.text2, opacity: 0.15 }} />
        <Text font={fs(total > 99 ? 12 : 14)} fontWeight="heavy" foregroundStyle={{ color: Theme.colors.text1, opacity: 1 }}>{total}</Text>
      </ZStack>
      <VStack alignment="leading" spacing={S(3.5)} frame={{ minWidth: 0, maxWidth: "infinity" }}>
        <HStack alignment="center" spacing={S(4)}>
            <Text font={fs(10)} fontWeight="bold" lineLimit={1} foregroundStyle={{ color: Theme.colors.text1, opacity: 1 }}>
            {titleText}
            </Text>
            {total === 7 && <Text font={fs(8)} foregroundStyle={{ color: Theme.colors.text3, opacity: 1 }}>循环</Text>}
            <Spacer />
        </HStack>
        <HStack alignment="center" spacing={S(4)}>
            <Text font={fs(9)} fontWeight="semibold" foregroundStyle={{ color: Theme.colors.text3, opacity: 1 }}>
            {subText}
            </Text>
            <Spacer />
        </HStack>
        <HStack frame={{ height: S(3.5), width: progressWidth }} alignment="center" spacing={0}
          background={{ shape: { type: "capsule", style: "continuous" }, style: bgBarColor }}>
          {progressRatio > 0 && 
            <ZStack frame={{ height: S(3.5), width: progressWidth * progressRatio }} 
              background={{ shape: { type: "capsule", style: "continuous" }, style: barColor }} />
          }
          <Spacer />
        </HStack>
      </VStack>
    </HStack>
  )
}

// ========================
// 尺寸视图
// ========================

/** 电量环 — 圆形进度环 + 中心百分比 */
const BatteryRing = ({ energy, size, charging }: { energy: number, size: number, charging?: boolean }) => {
  const color = energy <= 15 ? Theme.colors.red : energy <= 30 ? Theme.colors.orange : Theme.colors.green
  const rot = (Date.now() / 2000) % 360
  return (
    <ZStack frame={{ width: size, height: size }} alignment="center">
      {/* 底环 */}
      <Circle stroke={{ shapeStyle: Theme.colors.cardStroke, strokeStyle: { lineWidth: Math.max(2, S(3)) } }}
        frame={{ width: size, height: size }} opacity={0.3} />
      {/* 进度环 */}
      <Circle stroke={{ shapeStyle: color, strokeStyle: { lineWidth: Math.max(2, S(3)) } }}
        frame={{ width: size, height: size }}
        trim={{ from: 0, to: energy / 100 }} rotationEffect={{ degrees: -90, anchor: "center" }} />
      {/* 充电旋转光点 */}
      {charging ? (
        <ZStack frame={{ width: size, height: size }} alignment="center"
          rotationEffect={{ degrees: rot, anchor: "center" }}>
          <Circle fill={color} frame={{ width: S(4), height: S(4) }}
            offset={{ x: 0, y: -size / 2 + S(2) }} opacity={0.8} />
        </ZStack>
      ) : null}
      {/* 中心数字 */}
      <VStack alignment="center" spacing={0}>
        <Text font={Math.round(size * 0.30)} fontWeight="bold"
          foregroundStyle={{ color, opacity: 1 }}>{energy}</Text>
        <Text font={Math.round(size * 0.13)}
          foregroundStyle={{ color: Theme.colors.text2, opacity: 0.7 }}>%</Text>
      </VStack>
    </ZStack>
  )
}

/** ——— 小号组件 ——— 图一大圆形风格 */
const SmallWidgetView = ({ info }: { info: ExtendedNinebotData }) => {
  const pad = S(8)
  const dashSize = Math.round(W * 0.66)  // 圆形占宽度 66%
  return (
    <ZStack frame={{ maxWidth: "infinity", maxHeight: "infinity" }}
      widgetBackground={isTransparent ? "clear" : gradient("linear", { colors: ["#0A0E1A" as Color, "#050810" as Color], startPoint: "top", endPoint: "bottom" })}>
      <VStack padding={pad} spacing={S(2)} alignment="center" frame={{ maxWidth: "infinity", maxHeight: "infinity" }}>
        {/* 大仪表盘 — 核心视觉 */}
        <Spacer />
        <StatusDashboard isSigned={info.isSigned} size={dashSize} />

        {/* 扫描线 */}
        {info.isSigned && <ScanBeam width={W * 0.55} color={Theme.colors.green} />}

        {/* ninebot 品牌标题 */}
        <NinebotTitle fontSize={fs(12)} />
        <Spacer />
      </VStack>
    </ZStack>
  )
}

/** ——— 中号组件 ——— */
const MediumWidgetView = ({ info }: { info: ExtendedNinebotData }) => {
  const ach = info.achievement

  return (
    <ZStack frame={{ maxWidth: "infinity", maxHeight: "infinity" }} alignment="bottomTrailing"
      widgetBackground={isTransparent ? "clear" : gradient("linear", { colors: ["#0A0E1A" as Color, "#050810" as Color], startPoint: "top", endPoint: "bottom" })}>
      
      {/* 背景上的装饰：脱离文档流的车图，位于右下角 */}
      <HStack padding={{ bottom: 0, trailing: 10 }}>
        <Image filePath={VEHICLE_IMG_PATH} resizable={true}
          frame={{ width: 135, height: 125 }} opacity={0.95} />
      </HStack>

      <VStack spacing={0} frame={{ maxWidth: "infinity", maxHeight: "infinity" }} alignment="leading"
        padding={{ top: 16, bottom: 12, leading: 16, trailing: 16 }}>

        {/* ═══ Row 1: 骑行数据(左) + 签到徽章(右) ═══ */}
        <HStack alignment="top" spacing={S(4)} frame={{ maxWidth: "infinity" }}>
          <VStack alignment="leading" spacing={0} frame={{ minWidth: 0, maxWidth: S(130) }}>
            <Text font={fs(10)} fontWeight="semibold" lineLimit={1}
              foregroundStyle={{ color: Theme.colors.text1, opacity: 0.9 }}>
              今日骑行
            </Text>
            {/* 骑行数据垂直排列 */}
            <HStack alignment="top" spacing={S(8)} frame={{ minWidth: 0, maxWidth: "infinity" }}>
              {/* 今日里程 */}
              <VStack alignment="center" spacing={S(1)} frame={{ maxWidth: "infinity" }}>
                <Image systemName="location.fill" font={fs(9)}
                  foregroundStyle={{ color: "#34C759" as Color, opacity: 0.85 }} />
                <Text font={fs(11)} fontWeight="bold"
                  foregroundStyle={{ color: "#34C759" as Color, opacity: 1 }}>{ach ? ach.mileage + "km" : "--"}</Text>
                <Text font={fs(8)} foregroundStyle={{ color: Theme.colors.text2, opacity: 0.7 }}>今日</Text>
              </VStack>
              {/* 连续天数 */}
              <VStack alignment="center" spacing={S(1)} frame={{ maxWidth: "infinity" }}>
                <Image systemName="bicycle" font={fs(9)}
                  foregroundStyle={{ color: "#FFD60A" as Color, opacity: 0.85 }} />
                <Text font={fs(11)} fontWeight="bold"
                  foregroundStyle={{ color: "#FFD60A" as Color, opacity: 1 }}>{ach ? ach.continuous_days + "天" : "--"}</Text>
                <Text font={fs(8)} foregroundStyle={{ color: Theme.colors.text2, opacity: 0.7 }}>连续骑行</Text>
              </VStack>
              {/* 总里程 */}
              <VStack alignment="center" spacing={S(1)} frame={{ maxWidth: "infinity" }}>
                <Image systemName="road.lanes" font={fs(9)}
                  foregroundStyle={{ color: "#00E5FF" as Color, opacity: 0.85 }} />
                <Text font={fs(11)} fontWeight="bold"
                  foregroundStyle={{ color: "#00E5FF" as Color, opacity: 1 }}>{ach ? ach.odometer + "km" : "--"}</Text>
                <Text font={fs(8)} foregroundStyle={{ color: Theme.colors.text2, opacity: 0.7 }}>总里程</Text>
              </VStack>
            </HStack>
          </VStack>
          <Spacer />
          <VStack alignment="trailing" spacing={0}>
            <HStack alignment="center" spacing={2}>
              <Circle fill={info.isSigned ? "#34C759" : "#FF3B30"}
                frame={{ width: 5, height: 5 }} />
              <Text font="caption" fontWeight="bold"
                foregroundStyle={{ color: info.isSigned ? "#34C759" : "#FF3B30", opacity: 1 }}>
                {info.isSigned ? "已签" : "未签"}
              </Text>
              <Text font="caption" foregroundStyle={{ color: "#C7C7CC" as Color, opacity: 1 }}>
                {formatTime(new Date())}
              </Text>
            </HStack>
            {/* 积分行（右对齐）*/}
            <HStack alignment="center" spacing={3} padding={{ top: 2 }}>
              <Text font="caption2" foregroundStyle={{ color: Theme.colors.text2, opacity: 1 }}>N币</Text>
              <Text font="caption2" fontWeight="bold"
                foregroundStyle={{ color: Theme.colors.text1, opacity: 1 }}>{info.nCoin}</Text>
              <Text font="caption2" foregroundStyle={{ color: Theme.colors.text2, opacity: 1 }}>今日</Text>
              <Text font="caption2" fontWeight="bold"
                foregroundStyle={{ color: "#34C759" as Color, opacity: 1 }}>+{info.nCoin > 0 ? 1 : 0}</Text>
              <Text font="caption2" foregroundStyle={{ color: Theme.colors.text2, opacity: 1 }}>连签</Text>
              <Text font="caption2" fontWeight="bold"
                foregroundStyle={{ color: "#FF9500" as Color, opacity: 1 }}>{info.consecutiveDays}天</Text>
            </HStack>
          </VStack>
        </HStack>
        <Spacer />
        {/* ═══ 中部：左数据 + 右车型 ═══ */}
        <HStack alignment="bottom" spacing={0} frame={{ maxWidth: "infinity" }}>
          {/* 左侧：圆形倒计时环盲盒 — 紧凑布局 */}
          <VStack alignment="leading" spacing={S(2)} padding={{ top: 0, bottom: 4 }}>
            {(() => {
              const pendingBoxes = info.notOpenedBoxesDetail.filter(box => box.leftDaysToOpen > 0 || box.rewardStatus === 1)
              const shownBoxes = pendingBoxes.filter(box => box.awardDays === 7).slice(0, 1)
              return (
                <VStack spacing={S(4)} alignment="leading">
                  {shownBoxes.length > 0 ? (
                    shownBoxes.map((box, i) => (
                      <BlindBoxRing key={"medium-ring-" + i} box={box} vehicleName={info.vehicle?.name || info.achievement?.vehicle_name} />
                    ))
                  ) : (
                    <HStack alignment="center" spacing={S(4)} padding={{ vertical: 4 }}>
                      <Image systemName="checkmark.circle.fill" font={fs(14)} foregroundStyle={{ color: Theme.colors.green, opacity: 1 }} />
                      <Text font={fs(7)} foregroundStyle={{ color: Theme.colors.green, opacity: 1 }}>全部盲盒已领</Text>
                    </HStack>
                  )}
                </VStack>
              )
            })()}
          </VStack>
          <Spacer />
        </HStack>
      </VStack>
    </ZStack>
  )
}

/** ——— 大号组件 ——— 全宽数据面板 */
const LargeWidgetView = ({ info }: { info: ExtendedNinebotData }) => {
  const pad = S(10)
  const ach = info.achievement
  const uniqueHistory = info.openedBoxesDetail
    .sort((a, b) => parseInt(b.openedTime) - parseInt(a.openedTime))
    .reduce((acc, current) => {
      if (!acc.find(item => item.awardDays === current.awardDays)) acc.push(current)
      return acc
    }, [] as typeof info.openedBoxesDetail)
    .slice(0, 3)
  const pendingBoxes = info.notOpenedBoxesDetail.filter(box => box.leftDaysToOpen > 0)
  const readyCount = info.notOpenedBoxesDetail.filter(b => b.leftDaysToOpen === 0).length

  return (
    <ZStack frame={{ maxWidth: "infinity", maxHeight: "infinity" }}
      widgetBackground={isTransparent ? "clear" : gradient("linear", { colors: ["#0A0E1A" as Color, "#050810" as Color], startPoint: "top", endPoint: "bottom" })}>
      <VStack padding={pad} spacing={S(5)} frame={{ maxWidth: "infinity", maxHeight: "infinity" }}>
        {/* 顶部：签到状态 + 时间 */}
        <TechCard padding={S(5)} glowColor={info.isSigned ? Theme.colors.green : Theme.colors.red}>
          <HStack alignment="center" frame={{ maxWidth: "infinity" }}>
            <Text font={fs(9)} fontWeight="bold"
              foregroundStyle={{ color: info.isSigned ? Theme.colors.green : Theme.colors.red, opacity: 1 }}>
              {info.isSigned ? "已签到" : "未签到"}
            </Text>
            <Text font={fs(9)} foregroundStyle={{ color: Theme.colors.text2, opacity: 0.7 }}>连续</Text>
            <Text font={fs(30)} fontWeight="bold"
              foregroundStyle={{ color: info.isSigned ? Theme.colors.green : Theme.colors.red, opacity: 1 }}>
              {info.consecutiveDays}
            </Text>
            <Text font={fs(9)} foregroundStyle={{ color: Theme.colors.text2, opacity: 0.7 }}>天</Text>
            <Spacer />
            <VStack alignment="trailing" spacing={1}>
              <Text font={fs(7)} foregroundStyle={{ color: Theme.colors.text3, opacity: 0.6 }}>{formatTime(new Date())}</Text>
            </VStack>
          </HStack>
        </TechCard>

        {/* 成就数据网格（2x3）*/}
        <TechCard padding={S(5)} glowColor={Theme.colors.cyan}>
          <VStack spacing={S(4)} frame={{ maxWidth: "infinity" }}>
            <HStack spacing={0} alignment="center" frame={{ maxWidth: "infinity" }}>
              <StatItem icon="location.fill" label="今日" value={ach ? ach.mileage + "km" : "--"} color={Theme.colors.green} />
              <StatItem icon="bicycle" label="连续" value={ach ? ach.continuous_days + "天" : "--"} color={Theme.colors.yellow} />
              <StatItem icon="road.lanes" label="总里程" value={ach ? ach.odometer + "km" : "--"} color={Theme.colors.cyan} />
            </HStack>
            <HStack spacing={0} alignment="center" frame={{ maxWidth: "infinity" }}>
              <StatItem icon="trophy.fill" label="LV" value={info.level} color={Theme.colors.cyan} />
              <StatItem icon="circle.grid.cross.fill" label="N币" value={info.nCoin} color={Theme.colors.yellow} />
              <StatItem icon="star.fill" label="经验" value={info.experience} color={Theme.colors.green} />
            </HStack>
          </VStack>
        </TechCard>

        {/* 车辆信息 */}
        {info.vehicle ? (
          <TechCard padding={S(4)} glowColor={info.vehicle.chargingState === 1 ? Theme.colors.yellow : Theme.colors.cyan}>
            <HStack alignment="center" spacing={S(4)} frame={{ maxWidth: "infinity" }}>
              <BatteryRing energy={info.vehicle.dumpEnergy} size={S(40)} charging={info.vehicle.chargingState === 1} />
              <VStack spacing={1} frame={{ maxWidth: "infinity" }}>
                <Text font={fs(8)} fontWeight="semibold" foregroundStyle={{ color: Theme.colors.text1, opacity: 1 }}>
                  {ach ? ach.vehicle_name : (info.vehicle.name || "九号电动车")}
                </Text>
                <HStack spacing={S(6)}>
                  <Text font={fs(7)} foregroundStyle={{ color: Theme.colors.text2, opacity: 0.8 }}>
                    🛣️ {info.vehicle.estimateMileage}km
                  </Text>
                  {info.vehicle.chargingState === 1 ? (
                    <Text font={fs(7)} foregroundStyle={{ color: Theme.colors.yellow, opacity: 0.9 }}>
                      🔌 充电中 {info.vehicle.chargingPower}W
                    </Text>
                  ) : null}
                </HStack>
                {info.vehicle.locationDesc ? (
                  <Text font={fs(6)} foregroundStyle={{ color: Theme.colors.text3, opacity: 0.6 }}>
                    📍 {info.vehicle.locationDesc}
                  </Text>
                ) : null}
              </VStack>
            </HStack>
          </TechCard>
        ) : null}

        {/* 盲盒区 */}
        <TechCard padding={S(4)} glowColor={Theme.colors.purple}>
          {(() => {
            const phase = (Date.now() / 1500) % 1
            return (
              <>
                <HStack alignment="center">
                  <Text font={fs(9)} fontWeight="bold" foregroundStyle={{ color: Theme.colors.text1, opacity: 1 }}>待开盲盒</Text>
                  {readyCount > 0 ? (
                    <HStack spacing={3} alignment="center" padding={{ horizontal: 5, vertical: 2 }}
                      background={{ style: Theme.colors.green, shape: { type: "rect", cornerRadius: 6 } }}>
                      <Circle fill={Theme.colors.text1} frame={{ width: 4, height: 4 }}
                        opacity={0.5 + 0.5 * Math.abs(0.5 - phase) * 2} />
                      <Text font={fs(7)} fontWeight="bold"
                        foregroundStyle={{ color: Theme.colors.text1, opacity: 1 }}>{readyCount} READY</Text>
                    </HStack>
                  ) : null}
                  <Spacer />
                  <Text font={fs(7)} foregroundStyle={{ color: Theme.colors.text3, opacity: 1 }}>{info.notOpenedBlindBoxCount}个</Text>
                </HStack>
                {pendingBoxes.length > 0 ? (
                  <VStack spacing={S(2)}>
                    {pendingBoxes.slice(0, 2).map((box, i) => <BlindBoxRowLarge key={i} box={box} />)}
                  </VStack>
                ) : (
                  <HStack alignment="center" spacing={3}>
                    <Image systemName="checkmark.circle.fill" font={fs(9)} foregroundStyle={{ color: Theme.colors.green, opacity: 1 }} />
                    <Text font={fs(8)} foregroundStyle={{ color: Theme.colors.green, opacity: 1 }}>全部已处理</Text>
                  </HStack>
                )}
              </>
            )
          })()}
        </TechCard>

        {/* 最近记录 */}
        <TechCard padding={S(4)} glowColor={Theme.colors.orange}>
          <Text font={fs(9)} fontWeight="bold" foregroundStyle={{ color: Theme.colors.text1, opacity: 1 }}>最近记录</Text>
          {uniqueHistory.map((box, i) => (
            <HStack key={i} spacing={S(5)} alignment="center">
              <ZStack frame={{ width: S(16), height: S(16) }}>
                <Circle fill={Theme.colors.cardStroke} />
                <Image systemName="shippingbox" font={fs(7)} foregroundStyle={{ color: Theme.colors.orange, opacity: 1 }} />
              </ZStack>
              <VStack alignment="leading" spacing={0} frame={{ maxWidth: "infinity" }}>
                <Text font={fs(8)} fontWeight="medium" foregroundStyle={{ color: Theme.colors.text1, opacity: 1 }}>
                  获得 {box.awardDays} 天奖励
                </Text>
                <Text font={fs(6)} foregroundStyle={{ color: Theme.colors.text3, opacity: 1 }}>
                  {new Date(parseInt(box.openedTime)).toLocaleDateString('zh-CN')}
                </Text>
              </VStack>
              <Text font={fs(7)} fontWeight="semibold" foregroundStyle={{ color: Theme.colors.green, opacity: 1 }}>已入账</Text>
            </HStack>
          ))}
          {uniqueHistory.length === 0 && (
            <Text font={fs(8)} foregroundStyle={{ color: Theme.colors.text3, opacity: 1 }}>暂无记录</Text>
          )}
        </TechCard>
      </VStack>
    </ZStack>
  )
}

// ========================
// 数据获取与入口
// ========================

// ========================
// 通知辅助函数（已全部移除：盲盒与任务通知）
// ========================

const fetchWidgetData = async (): Promise<ExtendedNinebotData> => {
  try {
    let auth = getStorage("ninebot.authorization") || ""
    let devId = getStorage("ninebot.deviceId") || ""

    const settingsStr = getStorage("ninebotSettings")
    const settings = typeof settingsStr === 'string' ? JSON.parse(settingsStr) : (settingsStr || {})

    let baseData = await getNinebotInfo(auth, devId)

    if (settings.autoSign) {
      const now = new Date()
      const currentTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
      const targetTimeStr = settings.autoSignTime || "00:30"

      if (currentTimeStr >= targetTimeStr && !baseData.isSigned) {
        const signResult = await doSign(auth, devId)
        if (signResult.success) {
          baseData = await getNinebotInfo(auth, devId)
        }
      }
    }

    // 已签到但未通知 → 补发签到成功通知（独立于 autoSign 设置）
    if (baseData.isSigned) {
      // 修复：使用本地时区计算 today 字符串，避免 0点到8点(UTC+8) toISOString 返回昨天日期导致未发通知
      const d = new Date()
      const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      
      const lastSignNotifDate = getStorage("ninebot.signNotifiedDate")
      if (lastSignNotifDate !== today) {
        try {
          let blindBoxInfo = ""
          if (baseData.minLeftDaysToOpen !== null && baseData.minLeftDaysToOpen !== undefined && baseData.minLeftDaysToOpen > 0) {
            blindBoxInfo = " | 🎁 下个盲盒 " + baseData.minLeftDaysToOpen + " 天后"
          } else if (baseData.notOpenedBlindBoxCount > 0) {
            blindBoxInfo = " | 🎁 有 " + baseData.notOpenedBlindBoxCount + " 个盲盒可领"
          }

          await Notification.schedule({
            title: "✅ 签到成功",
            subtitle: "九号电动车",
            body: "🎉 已连续签到 " + baseData.consecutiveDays + " 天\n+" + baseData.experience + " 经验 | 等级 " + baseData.level + blindBoxInfo,
            iconImageData: { filePath: "photos/ninebot-logo-new.jpg" } as any,
            threadIdentifier: "ninebot-sign",
            customUI: true,
            userInfo: {
              type: "sign",
              consecutiveDays: baseData.consecutiveDays,
              experience: baseData.experience,
              level: baseData.level,
              nCoin: baseData.nCoin,
              minLeftDaysToOpen: baseData.minLeftDaysToOpen,
              notOpenedBlindBoxCount: baseData.notOpenedBlindBoxCount,
            }
          })
          setStorage("ninebot.signNotifiedDate", today)
          console.log("📋 签到成功通知已补发")
        } catch (e) { console.log("签到通知发送失败:", e) }
      }
    }

    // 自动开启盲盒（功能保留，不发送盲盒通知）
    if (settings.autoOpenBlindBox && baseData.notOpenedBlindBoxCount > 0) {
      try {
        const boxResult = await autoOpenBlindBoxes(auth, devId)
        baseData = await getNinebotInfo(auth, devId)
        if (boxResult.total > 0) {
          console.log("🎁 自动盲盒已完成:", boxResult.receiveSuccess + "/" + boxResult.total)
        }
      } catch (e) { console.log("自动盲盒失败:", e) }
    }

    // 获取车辆监控数据（如果配置了设备服务密钥）
    let vehicle: VehicleInfo | null = null
    const deviceServiceKey = settings.deviceServiceKey || getStorage("ninebot.deviceServiceKey") || ""
    if (deviceServiceKey) {
      try {
        console.log("🛵 开始获取车辆数据...")
        vehicle = await refreshVehicleData(deviceServiceKey)
        if (vehicle) {
          console.log("✅ 车辆数据获取成功:", vehicle.name, vehicle.dumpEnergy + "%")
          // 低电量告警
          if (vehicle.dumpEnergy <= 15 && vehicle.dumpEnergy > 0) {
            try {
              await Notification.schedule({
                title: "🔋 电量偏低",
                subtitle: vehicle.name || "九号电动车",
                body: `当前电量 ${vehicle.dumpEnergy}%，预估续航 ${vehicle.estimateMileage}km` +
                  (vehicle.chargingState === 1 ? "\n🔌 正在充电中" : "\n⚠️ 建议尽快充电"),
                iconImageData: { systemImage: "battery.25percent", color: "#FF9500" },
                threadIdentifier: "ninebot-vehicle",
              })
            } catch (e) { console.log("低电量通知发送失败:", e) }
          }
        }
      } catch (e) { console.log("车辆数据获取失败:", e) }
    }

    // 获取成就数据（里程/排名/骑行天数）
    let achievement: AchievementInfo | null = null
    try {
      achievement = await getMyAchievement(auth, devId)
      if (achievement) {
        console.log("📊 成就数据获取成功:", achievement.vehicle_name, "总里程:", achievement.odometer)
      }
    } catch (e) { console.log("成就数据获取失败:", e) }

    return {
      ...baseData,
      waitingBoxDesc: "分析中...",
      stats: { signStreakMax: 0 },
      vehicle,
      achievement,
    }
  } catch (error) {
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
      <ZStack frame={{ maxWidth: "infinity", maxHeight: "infinity" }} widgetBackground={isTransparent ? "clear" : "#000000" as Color} padding={S(12)} alignment="center">
        <VStack alignment="center" spacing={S(4)}>
          <Image systemName="exclamationmark.triangle" font={fs(18)} foregroundStyle={{ color: Theme.colors.orange, opacity: 1 }} />
          <Text font={fs(11)} fontWeight="semibold" foregroundStyle={{ color: Theme.colors.text1, opacity: 1 }}>加载失败</Text>
          <Text font={fs(9)} foregroundStyle={{ color: Theme.colors.text3, opacity: 1 }}>{(error as Error).message}</Text>
        </VStack>
      </ZStack>
    )
  }
})()
