import { VStack, HStack, ZStack, Text, Spacer, Widget, Image, Rectangle, Circle, Capsule, Notification, gradient, type Color } from "scripting"
import { getNinebotInfo, doSign, autoOpenBlindBoxes, type NinebotWidgetData } from './api'
import { getStorage } from './utils/storage'

interface ExtendedNinebotData extends NinebotWidgetData {
  waitingBoxDesc: string
  stats: { signStreakMax: number }
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

/** 中心图标路径（备用）*/
const NINEBOT_LOGO_PATH = "/var/mobile/Library/Mobile Documents/iCloud~com~thomfang~Scripting/Documents/scripts/九号系统签到/scooter-icon.jpg"

/** 签到核心仪表盘 — 彩色渐变环（基于时间旋转）+ 光晕 + moped.fill */
const StatusDashboard = ({ isSigned, size }: { isSigned: boolean, size: number }) => {
  const iconSize = size * 0.38
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

      {/* ═══ 白色图标（静态不旋转）═══ */}
      <Image systemName="moped.fill" font={iconSize}
        foregroundStyle={{ color: "#FFFFFF" as Color, opacity: 1 }} />
    </ZStack>
  )
}

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

/** 盲盒进度条 */
const BlindBoxRow = ({ box }: { box: { awardDays: number, leftDaysToOpen: number } }) => {
  const progress = box.leftDaysToOpen > 0 ? (box.awardDays - box.leftDaysToOpen) / box.awardDays : 1
  const color = box.awardDays >= 100 ? Theme.colors.orange : box.awardDays >= 30 ? Theme.colors.purple : Theme.colors.cyan
  return (
    <VStack spacing={S(2)}>
      <HStack alignment="center">
        <Image systemName="shippingbox" font={fs(9)} foregroundStyle={{ color, opacity: 1 }} />
        <Text font={fs(10)} fontWeight="semibold" foregroundStyle={{ color: Theme.colors.text1, opacity: 1 }}>{box.awardDays}天</Text>
        <Spacer />
        <Text font={fs(8)} foregroundStyle={{ color: (box.leftDaysToOpen > 0 ? Theme.colors.text3 : Theme.colors.green), opacity: 1 }}>
          {box.leftDaysToOpen > 0 ? `${box.leftDaysToOpen}天` : "可开"}
        </Text>
      </HStack>
      <ZStack frame={{ height: S(3), maxWidth: "infinity" }}>
        <Capsule fill={Theme.colors.cardStroke} />
        <HStack frame={{ maxWidth: "infinity" }}>
          <Capsule fill={gradient("linear", { colors: [color, color], startPoint: "leading", endPoint: "trailing" })} frame={{ height: S(3), width: 80 * progress }} />
          <Spacer />
        </HStack>
      </ZStack>
    </VStack>
  )
}

// ========================
// 尺寸视图
// ========================

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

        {/* 连续天数 */}
        <VStack alignment="center" spacing={0}>
          <HStack alignment="bottom" spacing={1}>
            <Text font={fs(22)} fontWeight="bold" foregroundStyle={{ color: Theme.colors.text1, opacity: 1 }}>{info.consecutiveDays}</Text>
            <Text font={fs(8)} foregroundStyle={{ color: Theme.colors.text3, opacity: 1 }} padding={{ bottom: 2 }}>天</Text>
          </HStack>
          <Text font={fs(7)} foregroundStyle={{ color: Theme.colors.text3, opacity: 1 }}>连续签到</Text>
        </VStack>

        {/* 底部精简指标 */}
        <HStack spacing={S(8)} alignment="center" frame={{ maxWidth: "infinity" }}>
          <Text font={fs(8)} fontWeight="semibold" foregroundStyle={{ color: Theme.colors.cyan, opacity: 1 }}>LV.{info.level}</Text>
          <Text font={fs(8)} fontWeight="semibold" foregroundStyle={{ color: Theme.colors.yellow, opacity: 1 }}>N {info.nCoin}</Text>
          <Text font={fs(8)} fontWeight="semibold" foregroundStyle={{ color: Theme.colors.purple, opacity: 1 }}>EXP {info.experience}</Text>
        </HStack>
        <Spacer />
      </VStack>
    </ZStack>
  )
}

/** ——— 中号组件 ——— */
const MediumWidgetView = ({ info }: { info: ExtendedNinebotData }) => {
  const pad = S(10)
  const leftW = Math.round(W * 0.36)  // 左侧面板占 36% 宽度
  const dashSize = Math.round(leftW * 0.80)  // 仪表盘缩小腾出底部空间
  const pendingBoxes = info.notOpenedBoxesDetail.filter(box => box.leftDaysToOpen > 0)

  return (
    <ZStack frame={{ maxWidth: "infinity", maxHeight: "infinity" }}
      widgetBackground={isTransparent ? "clear" : gradient("linear", { colors: ["#0A0E1A" as Color, "#050810" as Color], startPoint: "top", endPoint: "bottom" })}>
      <HStack padding={pad} spacing={S(8)} frame={{ maxWidth: "infinity", maxHeight: "infinity" }}>
        {/* 左侧：大仪表盘 */}
        <VStack alignment="center" spacing={S(2)} frame={{ width: leftW }}>
          <StatusDashboard isSigned={info.isSigned} size={dashSize} />
          {info.isSigned && <ScanBeam width={leftW - S(6)} color={Theme.colors.green} />}
          {/* 底部图形化横排：天数 + 更新时间 */}
          <HStack spacing={S(8)} alignment="center" frame={{ maxWidth: "infinity" }}>
            <HStack alignment="center" spacing={3}>
              <Image systemName="flame.fill" font={fs(8)} foregroundStyle={{ color: Theme.colors.orange, opacity: 0.9 }} />
              <Text font={fs(18)} fontWeight="bold" foregroundStyle={{ color: Theme.colors.text1, opacity: 1 }}>{info.consecutiveDays}</Text>
              <Text font={fs(7)} fontWeight="medium" foregroundStyle={{ color: Theme.colors.text2, opacity: 0.8 }}>天</Text>
            </HStack>
            <Rectangle fill={Theme.colors.text3} frame={{ width: 1, height: S(12) }} opacity={0.2} />
            <HStack alignment="center" spacing={2}>
              <Image systemName="arrow.clockwise" font={fs(6)} foregroundStyle={{ color: Theme.colors.green, opacity: 0.7 }} />
              <Text font={fs(6)} fontWeight="medium" foregroundStyle={{ color: Theme.colors.green, opacity: 0.8 }}>{formatTime(new Date())}</Text>
            </HStack>
          </HStack>
        </VStack>

        {/* 竖向发光分隔线 */}
        <ZStack frame={{ width: 2, maxHeight: "infinity" }} alignment="center">
          <Rectangle fill={Theme.colors.cyan} frame={{ width: 2, maxHeight: "infinity" }} opacity={0.06} />
          <Rectangle fill={Theme.colors.cyan} frame={{ width: 0.5, maxHeight: "infinity" }} opacity={0.3} />
          <Circle fill={Theme.colors.cyan} frame={{ width: 3, height: 3 }} offset={{ x: 0, y: 0 }} opacity={0.6} />
        </ZStack>

        {/* 右侧：数据面板 */}
        <VStack spacing={S(3)} frame={{ maxWidth: "infinity" }} alignment="leading">
          {/* 四项数据统计 — 图标 + 数值 + 彩色底线 */}
          <TechCard padding={S(5)} glowColor={Theme.colors.cyan}>
            <HStack spacing={0} alignment="center" frame={{ maxWidth: "infinity" }}>
              <StatItem icon="trophy.fill" label="LV" value={info.level} color={Theme.colors.cyan} />
              <StatItem icon="circle.grid.cross.fill" label="N币" value={info.nCoin} color={Theme.colors.yellow} />
              <StatItem icon="ticket.fill" label="补签" value={info.signCardsNum} color={Theme.colors.purple} />
              <StatItem icon="star.fill" label="经验" value={info.experience} color={Theme.colors.green} />
            </HStack>
          </TechCard>

          <TechCard padding={S(5)} glowColor={Theme.colors.purple}>
            <HStack alignment="center">
              <Image systemName="gift.fill" font={fs(8)} foregroundStyle={{ color: Theme.colors.purple, opacity: 1 }} />
              <Text font={fs(9)} fontWeight="bold" foregroundStyle={{ color: Theme.colors.text1, opacity: 1 }}>待开盲盒</Text>
              <Spacer />
              <Text font={fs(7)} foregroundStyle={{ color: Theme.colors.text3, opacity: 1 }}>{info.notOpenedBlindBoxCount}个</Text>
            </HStack>
            {pendingBoxes.length > 0 ? (
              <VStack spacing={S(2)}>
                {pendingBoxes.slice(0, 1).map((box, i) => <BlindBoxRow key={i} box={box} />)}
              </VStack>
            ) : (
              <HStack alignment="center" spacing={3}>
                <Image systemName="checkmark.circle.fill" font={fs(9)} foregroundStyle={{ color: Theme.colors.green, opacity: 1 }} />
                <Text font={fs(8)} foregroundStyle={{ color: Theme.colors.green, opacity: 1 }}>全部已处理</Text>
              </HStack>
            )}
          </TechCard>
        </VStack>
      </HStack>
    </ZStack>
  )
}

/** ——— 大号组件 ——— */
const LargeWidgetView = ({ info }: { info: ExtendedNinebotData }) => {
  const pad = S(10)
  const dashSize = Math.round(W * 0.42)  // 仪表盘占宽度 42%
  const uniqueHistory = info.openedBoxesDetail
    .sort((a, b) => parseInt(b.openedTime) - parseInt(a.openedTime))
    .reduce((acc, current) => {
      if (!acc.find(item => item.awardDays === current.awardDays)) acc.push(current)
      return acc
    }, [] as typeof info.openedBoxesDetail)
    .slice(0, 4)
  const pendingBoxes = info.notOpenedBoxesDetail.filter(box => box.leftDaysToOpen > 0)

  return (
    <ZStack frame={{ maxWidth: "infinity", maxHeight: "infinity" }}
      widgetBackground={isTransparent ? "clear" : gradient("linear", { colors: ["#0A0E1A" as Color, "#050810" as Color], startPoint: "top", endPoint: "bottom" })}>
      <VStack padding={pad} spacing={S(6)} frame={{ maxWidth: "infinity", maxHeight: "infinity" }}>
        {/* 顶部状态行 */}
        <HStack spacing={S(8)} alignment="center">
          <StatusDashboard isSigned={info.isSigned} size={dashSize} />
          <VStack spacing={1}>
            <HStack alignment="bottom" spacing={2}>
              <Text font={fs(20)} fontWeight="bold" foregroundStyle={{ color: Theme.colors.text1, opacity: 1 }}>{info.consecutiveDays}</Text>
              <Text font={fs(8)} foregroundStyle={{ color: Theme.colors.text3, opacity: 1 }} padding={{ bottom: 2 }}>天连续签到</Text>
            </HStack>
            <Text font={fs(8)} foregroundStyle={{ color: (info.isSigned ? Theme.colors.green : Theme.colors.text3), opacity: 1 }}>
              {info.isSigned ? "✓ 今日已完成" : "今日尚未签到"}
            </Text>
          </VStack>
          <Spacer />
          <VStack alignment="trailing" spacing={2}>
            <HStack alignment="center" spacing={2}>
              <Text font={fs(7)} foregroundStyle={{ color: Theme.colors.text3, opacity: 1 }}>LV</Text>
              <Text font={fs(12)} fontWeight="bold" foregroundStyle={{ color: Theme.colors.cyan, opacity: 1 }}>{info.level}</Text>
            </HStack>
            <HStack alignment="center" spacing={2}>
              <Text font={fs(7)} foregroundStyle={{ color: Theme.colors.text3, opacity: 1 }}>N</Text>
              <Text font={fs(12)} fontWeight="bold" foregroundStyle={{ color: Theme.colors.yellow, opacity: 1 }}>{info.nCoin}</Text>
            </HStack>
          </VStack>
        </HStack>

        {/* 扫描线 */}
        {info.isSigned && <ScanBeam width={W - pad * 2} color={Theme.colors.green} />}

        {/* 盲盒区 */}
        <TechCard glowColor={Theme.colors.purple}>
          <HStack alignment="center">
            <Image systemName="gift.fill" font={fs(9)} foregroundStyle={{ color: Theme.colors.purple, opacity: 1 }} />
            <Text font={fs(10)} fontWeight="bold" foregroundStyle={{ color: Theme.colors.text1, opacity: 1 }}>待开盲盒</Text>
            <Spacer />
            <Text font={fs(8)} foregroundStyle={{ color: Theme.colors.text3, opacity: 1 }}>EXP {info.experience}</Text>
          </HStack>
          {pendingBoxes.length > 0 ? (
            <VStack spacing={S(3)}>
              {pendingBoxes.slice(0, 3).map((box, i) => <BlindBoxRow key={i} box={box} />)}
            </VStack>
          ) : (
            <HStack alignment="center" spacing={3}>
              <Image systemName="checkmark.circle.fill" font={fs(10)} foregroundStyle={{ color: Theme.colors.green, opacity: 1 }} />
              <Text font={fs(9)} foregroundStyle={{ color: Theme.colors.green, opacity: 1 }}>全部已处理</Text>
            </HStack>
          )}
        </TechCard>

        {/* 发光分隔线 */}
        <ZStack frame={{ height: 4, maxWidth: "infinity" }} alignment="center">
          <Rectangle fill={Theme.colors.purple} frame={{ height: 3, maxWidth: "infinity" }} opacity={0.06} />
          <Rectangle fill={Theme.colors.purple} frame={{ height: 0.5, maxWidth: "infinity" }} opacity={0.3} />
        </ZStack>

        {/* 最近记录 */}
        <TechCard glowColor={Theme.colors.orange}>
          <HStack alignment="center">
            <Image systemName="clock.arrow.circlepath" font={fs(9)} foregroundStyle={{ color: Theme.colors.orange, opacity: 1 }} />
            <Text font={fs(10)} fontWeight="bold" foregroundStyle={{ color: Theme.colors.text1, opacity: 1 }}>最近记录</Text>
          </HStack>
          {uniqueHistory.map((box, i) => (
            <HStack key={i} spacing={S(6)} alignment="center">
              <ZStack frame={{ width: S(18), height: S(18) }}>
                <Circle fill={Theme.colors.cardStroke} />
                <Image systemName="shippingbox" font={fs(8)} foregroundStyle={{ color: Theme.colors.orange, opacity: 1 }} />
              </ZStack>
              <VStack alignment="leading" spacing={0} frame={{ maxWidth: "infinity" }}>
                <Text font={fs(10)} fontWeight="medium" foregroundStyle={{ color: Theme.colors.text1, opacity: 1 }}>
                  获得 {box.awardDays} 天奖励
                </Text>
                <Text font={fs(7)} foregroundStyle={{ color: Theme.colors.text3, opacity: 1 }}>
                  {new Date(parseInt(box.openedTime)).toLocaleDateString('zh-CN')}
                </Text>
              </VStack>
              <Text font={fs(8)} fontWeight="semibold" foregroundStyle={{ color: Theme.colors.green, opacity: 1 }}>已入账</Text>
            </HStack>
          ))}
          {uniqueHistory.length === 0 && (
            <Text font={fs(9)} foregroundStyle={{ color: Theme.colors.text3, opacity: 1 }}>暂无记录</Text>
          )}
        </TechCard>
      </VStack>
    </ZStack>
  )
}

// ========================
// 数据获取与入口
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
          try {
            await Notification.schedule({
              title: "✅ 签到成功",
              body: `已连续签到 ${baseData.consecutiveDays} 天`,
            })
          } catch (e) { console.log("通知发送失败:", e) }
        }
      }
    }

    if (settings.autoOpenBlindBox && baseData.notOpenedBlindBoxCount > 0) {
      await autoOpenBlindBoxes(auth, devId)
      baseData = await getNinebotInfo(auth, devId)
    }

    return {
      ...baseData,
      waitingBoxDesc: "分析中...",
      stats: { signStreakMax: 0 }
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
