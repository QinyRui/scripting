/**
 * 九号电动车 - 高端富通知 UI
 * 长按或下拉通知时显示的自定义图形化界面
 * 视觉风格：深邃背景 + 多层光晕 + 精致卡片 + 高级色彩体系
 */

import { Notification, VStack, HStack, Text, Image, Spacer, Divider, Color, ZStack, Circle, Rectangle } from "scripting"

// ===== 高端色彩体系 =====
const C = {
  // 主背景
  bg: "#0A0A0F" as Color,
  bgCard: "#161619" as Color,
  bgCardAlt: "#1C1C21" as Color,
  bgHero: "#111115" as Color,
  // 品牌色
  orange: "#FF9F0A" as Color,
  orangeGlow: "rgba(255,159,10,0.18)" as Color,
  orangeSoft: "rgba(255,159,10,0.08)" as Color,
  green: "#30D158" as Color,
  greenGlow: "rgba(48,209,88,0.18)" as Color,
  red: "#FF453A" as Color,
  redGlow: "rgba(255,69,58,0.18)" as Color,
  purple: "#BF5AF2" as Color,
  purpleGlow: "rgba(191,90,242,0.18)" as Color,
  blue: "#64D2FF" as Color,
  blueGlow: "rgba(100,210,255,0.18)" as Color,
  gold: "#FFD60A" as Color,
  goldGlow: "rgba(255,214,10,0.18)" as Color,
  pink: "#FF6B9D" as Color,
  // 文字
  text1: "#FFFFFF" as Color,
  text2: "#98989D" as Color,
  text3: "#636366" as Color,
  // 分隔
  divider: "#2C2C2E" as Color,
  dividerSoft: "#222224" as Color,
  // 特殊
  readyBadge: "#FF9F0A" as Color,
  coolBadge: "#48484A" as Color,
}

// ===== 高端光晕主图组件 =====
function GlowHero({ icon, accent, subGlow, size = 52 }: {
  icon: string
  accent: Color
  subGlow?: Color
  size?: number
}) {
  const glow = subGlow || accent
  const r1 = size * 2.2
  const r2 = size * 1.7
  const r3 = size * 1.35
  const r4 = size * 1.12
  return (
    <ZStack frame={{ width: r1, height: r1 }} alignment="center">
      {/* 外层氛围光 */}
      <Circle fill={glow} frame={{ width: r1, height: r1 }} opacity={0.04} />
      <Circle fill={glow} frame={{ width: r2, height: r2 }} opacity={0.07} />
      {/* 中层聚焦光 */}
      <Circle fill={accent} frame={{ width: r3, height: r3 }} opacity={0.12} />
      <Circle fill={accent} frame={{ width: r4, height: r4 }} opacity={0.20} />
      {/* 核心光圈 */}
      <Circle fill={C.bgCard} frame={{ width: size * 1.1, height: size * 1.1 }} opacity={0.95} />
      {/* @ts-ignore */}
      <Image systemName={icon} font={size} foregroundStyle={{ color: accent, opacity: 1 }} />
    </ZStack>
  )
}

// ===== 奖励辅助函数 =====
function rewardIcon(t: number): string {
  if (t === 1) return "star.circle.fill"
  if (t === 2) return "crown.fill"
  if (t === 3) return "rosette"
  if (t === 4) return "ticket.fill"
  if (t === 5) return "giftcard.fill"
  return "gift.fill"
}
function rewardColor(t: number): Color {
  if (t === 1) return C.purple
  if (t === 2) return C.gold
  if (t === 3) return C.pink
  if (t === 4) return C.green
  if (t === 5) return C.blue
  return C.green
}
function rewardName(t: number): string {
  if (t === 1) return "等级经验"
  if (t === 2) return "电动车币"
  if (t === 3) return "勋章"
  if (t === 4) return "补签卡"
  if (t === 5) return "商城兑换券"
  return "奖励"
}

// ===== 精致统计卡片 =====
function StatCard({ value, label, accent }: { value: string | number; label: string; accent: Color }) {
  return (
    <VStack alignment="center" spacing={6} frame={{ maxWidth: "infinity" }}>
      {/* @ts-ignore */}
      <Text font={30} fontWeight="bold" foregroundStyle={{ color: accent, opacity: 1 }}>{value}</Text>
      {/* @ts-ignore */}
      <Text font={11} foregroundStyle={{ color: C.text3, opacity: 1 }}>{label}</Text>
    </VStack>
  )
}
function StatSep() {
  return <VStack frame={{ width: 1, height: 36 }} background={C.dividerSoft} />
}

// ===== 签到成功通知 =====
function SignInNotification() {
  const data = Notification.current
  const info = data?.userInfo || {}
  const consecutiveDays = info.consecutiveDays || 0
  const experience = info.experience || 0
  const level = info.level || 0
  const nCoin = info.nCoin || 0
  const minLeftDaysToOpen = info.minLeftDaysToOpen
  const notOpenedBlindBoxCount = info.notOpenedBlindBoxCount || 0

  return (
    // @ts-ignore
    <VStack padding={16} background={C.bg} spacing={14}>
      {/* ===== Hero 区域 ===== */}
      <VStack
        // @ts-ignore
        background={C.bgHero} cornerRadius={18}
        alignment="center" spacing={14}
        padding={{ top: 24, bottom: 18, horizontal: 16 }}
        frame={{ maxWidth: "infinity" }}
      >
        <GlowHero icon="checkmark.seal.fill" accent={C.green} size={46} />
        <VStack alignment="center" spacing={4}>
          {/* @ts-ignore */}
          <Text font={22} fontWeight="bold" foregroundStyle={{ color: C.text1, opacity: 1 }}>签到成功</Text>
          {/* @ts-ignore */}
          <Text font={13} foregroundStyle={{ color: C.text2, opacity: 1 }}>九号电动车 · 每日签到</Text>
        </VStack>
        {/* 徽章 */}
        <HStack spacing={8} alignment="center"
          // @ts-ignore
          padding={{ horizontal: 16, vertical: 7 }} background={C.green} cornerRadius={20}>
          {/* @ts-ignore */}
          <Image systemName="flame.fill" font={12} foregroundStyle={{ color: C.text1, opacity: 1 }} />
          {/* @ts-ignore */}
          <Text font={12} fontWeight="bold" foregroundStyle={{ color: C.text1, opacity: 1 }}>
            已连续 {consecutiveDays} 天
          </Text>
        </HStack>
      </VStack>

      {/* ===== 数据统计三列 ===== */}
      {/* @ts-ignore */}
      <HStack alignment="center" spacing={0} background={C.bgCard} cornerRadius={14} padding={{ vertical: 16, horizontal: 8 }}>
        <StatCard value={consecutiveDays} label="连续签到" accent={C.orange} />
        <StatSep />
        <StatCard value={level} label="当前等级" accent={C.purple} />
        <StatSep />
        <StatCard value={nCoin} label="电动车币" accent={C.gold} />
      </HStack>

      {/* ===== 今日获得 ===== */}
      {/* @ts-ignore */}
      <HStack alignment="center" spacing={0} background={C.bgCard} cornerRadius={14} padding={{ vertical: 12, horizontal: 14 }}>
        {/* @ts-ignore */}
        <Image systemName="sparkles" font={14} foregroundStyle={{ color: C.orange, opacity: 1 }} />
        {/* @ts-ignore */}
        <Text font={13} foregroundStyle={{ color: C.text2, opacity: 1 }}>{"  今日获得"}</Text>
        <Spacer />
        {/* @ts-ignore */}
        <Text font={13} fontWeight="semibold" foregroundStyle={{ color: C.green, opacity: 1 }}>+{experience} 经验</Text>
        {/* @ts-ignore */}
        <Text font={13} foregroundStyle={{ color: C.text3, opacity: 1 }}>{"  ·  "}</Text>
        {/* @ts-ignore */}
        <Text font={13} fontWeight="semibold" foregroundStyle={{ color: C.gold, opacity: 1 }}>🪙 {nCoin} 币</Text>
      </HStack>

      {/* ===== 盲盒提醒条 ===== */}
      {notOpenedBlindBoxCount > 0 ? (
        // @ts-ignore
        <HStack alignment="center" spacing={0} background="#1A1608" as Color cornerRadius={14} padding={{ vertical: 12, horizontal: 14 }}>
          {/* @ts-ignore */}
          <Image systemName="gift.fill" font={14} foregroundStyle={{ color: C.orange, opacity: 1 }} />
          {/* @ts-ignore */}
          <Text font={13} foregroundStyle={{ color: C.orange, opacity: 1 }}>{"  " + notOpenedBlindBoxCount + " 个盲盒待领取"}</Text>
          <Spacer />
          {minLeftDaysToOpen !== null && minLeftDaysToOpen !== undefined && minLeftDaysToOpen > 0 ? (
            // @ts-ignore
            <Text font={12} foregroundStyle={{ color: C.text3, opacity: 1 }}>⏳ 还需 {minLeftDaysToOpen} 天</Text>
          ) : (
            // @ts-ignore
            <Text font={12} fontWeight="semibold" foregroundStyle={{ color: C.green, opacity: 1 }}>可立即领取 →</Text>
          )}
        </HStack>
      ) : null}
    </VStack>
  )
}

// ===== 盲盒领取结果通知 =====
function BlindBoxNotification() {
  const data = Notification.current
  const info = data?.userInfo || {}
  const total = info.total || 0
  const receiveSuccess = info.receiveSuccess || 0
  const failed = info.failed || 0
  const rewards = info.rewards || []
  const errors = info.errors || []
  const notOpenedBoxesDetail = info.notOpenedBoxesDetail || []
  const isSuccess = receiveSuccess > 0
  const accent = isSuccess ? C.orange : C.red

  return (
    // @ts-ignore
    <VStack padding={16} background={C.bg} spacing={14}>
      {/* ===== Hero ===== */}
      <VStack
        // @ts-ignore
        background={C.bgHero} cornerRadius={18}
        alignment="center" spacing={14}
        padding={{ top: 24, bottom: 18, horizontal: 16 }}
        frame={{ maxWidth: "infinity" }}
      >
        <GlowHero
          icon={isSuccess ? "gift.fill" : "exclamationmark.triangle.fill"}
          accent={accent}
          subGlow={isSuccess ? C.gold : undefined}
          size={46}
        />
        <VStack alignment="center" spacing={4}>
          {/* @ts-ignore */}
          <Text font={22} fontWeight="bold" foregroundStyle={{ color: C.text1, opacity: 1 }}>
            {isSuccess ? `成功领取 ${receiveSuccess} 个盲盒` : "领取异常"}
          </Text>
          {/* @ts-ignore */}
          <Text font={13} foregroundStyle={{ color: C.text2, opacity: 1 }}>
            {isSuccess ? "🎉 今日福利已收入囊中" : "⚠️ 部分盲盒未领取成功"}
          </Text>
        </VStack>
        {/* 状态徽章 */}
        <HStack spacing={8} alignment="center"
          // @ts-ignore
          padding={{ horizontal: 16, vertical: 7 }} background={accent} cornerRadius={20}>
          {/* @ts-ignore */}
          <Image systemName={isSuccess ? "checkmark.circle.fill" : "xmark.circle.fill"}
            font={12} foregroundStyle={{ color: C.text1, opacity: 1 }} />
          {/* @ts-ignore */}
          <Text font={12} fontWeight="bold" foregroundStyle={{ color: C.text1, opacity: 1 }}>
            {isSuccess ? "CLAIMED" : "FAILED"}
          </Text>
        </HStack>
      </VStack>

      {/* ===== 统计三列 ===== */}
      {/* @ts-ignore */}
      <HStack alignment="center" spacing={0} background={C.bgCard} cornerRadius={14} padding={{ vertical: 16, horizontal: 8 }}>
        <StatCard value={total} label="处理总数" accent={C.blue} />
        <StatSep />
        <StatCard value={receiveSuccess} label="领取成功" accent={C.green} />
        {failed > 0 ? (
          <>
            <StatSep />
            <StatCard value={failed} label="领取失败" accent={C.red} />
          </>
        ) : null}
      </HStack>

      {/* ===== 奖励详情列表 ===== */}
      {rewards.length > 0 ? (
        <VStack spacing={8}>
          <HStack alignment="center" spacing={8}>
            {/* @ts-ignore */}
            <Image systemName="sparkles" font={14} foregroundStyle={{ color: C.gold, opacity: 1 }} />
            {/* @ts-ignore */}
            <Text font={13} fontWeight="semibold" foregroundStyle={{ color: C.text2, opacity: 1 }}>本次开盒奖励</Text>
          </HStack>
          {rewards.map((r: any, i: number) => {
            const rw = r.reward
            const awardDays = r.awardDays || 0
            const rType = rw?.rewardType
            const rc = rewardColor(rType)
            const rText = rw ? `+${rw.rewardValue} ${rewardName(rType)}` : "奖励"
            return (
              <HStack key={"rw" + i} alignment="center" spacing={12}
                // @ts-ignore
                background={C.bgCard} cornerRadius={14} padding={{ vertical: 12, horizontal: 12 }}>
                {/* 左侧色条 */}
                {/* @ts-ignore */}
                <Rectangle fill={rc} frame={{ width: 3, height: 36 }} cornerRadius={2} opacity={0.7} />
                {/* 图标 */}
                <ZStack frame={{ width: 38, height: 38 }} alignment="center">
                  <Circle fill={rc} frame={{ width: 38, height: 38 }} opacity={0.15} />
                  {/* @ts-ignore */}
                  <Image systemName={rewardIcon(rType)} font={20} foregroundStyle={{ color: rc, opacity: 1 }} />
                </ZStack>
                {/* 文字 */}
                <VStack spacing={3} frame={{ maxWidth: "infinity" }}>
                  {/* @ts-ignore */}
                  <Text font={14} fontWeight="semibold" foregroundStyle={{ color: C.text1, opacity: 1 }}>
                    {awardDays}天签到盲盒
                  </Text>
                  {/* @ts-ignore */}
                  <Text font={11} foregroundStyle={{ color: C.text3, opacity: 1 }}>{rewardName(rType)}</Text>
                </VStack>
                {/* 数值 */}
                {/* @ts-ignore */}
                <Text font={14} fontWeight="bold" foregroundStyle={{ color: rc, opacity: 1 }}>{rText}</Text>
              </HStack>
            )
          })}
        </VStack>
      ) : null}

      {/* ===== 失败原因 ===== */}
      {errors.length > 0 ? (
        // @ts-ignore
        <VStack spacing={6} background="#1A0E0E" as Color cornerRadius={14} padding={12}>
          {errors.map((err: string, i: number) => (
            // @ts-ignore
            <Text key={"e" + i} font={12} foregroundStyle={{ color: C.red, opacity: 1 }}>⚠️ {err}</Text>
          ))}
        </VStack>
      ) : null}

      {/* ===== 待开启盲盒 ===== */}
      {notOpenedBoxesDetail.length > 0 ? (
        <VStack spacing={8}>
          {/* @ts-ignore */}
          <Text font={13} fontWeight="semibold" foregroundStyle={{ color: C.text2, opacity: 1 }}>📦 待开启盲盒</Text>
          {notOpenedBoxesDetail.map((box: any, i: number) => {
            const ready = box.leftDaysToOpen === 0
            return (
              <HStack key={"b" + i} alignment="center" spacing={10}
                // @ts-ignore
                background={C.bgCard} cornerRadius={14} padding={{ vertical: 11, horizontal: 12 }}>
                <ZStack frame={{ width: 34, height: 34 }} alignment="center">
                  <Circle fill={ready ? C.orange : C.coolBadge} frame={{ width: 34, height: 34 }} opacity={0.15} />
                  {/* @ts-ignore */}
                  <Image systemName={ready ? "gift.fill" : "lock.fill"} font={16}
                    foregroundStyle={{ color: ready ? C.orange : C.text3, opacity: 1 }} />
                </ZStack>
                <VStack spacing={2} frame={{ maxWidth: "infinity" }}>
                  {/* @ts-ignore */}
                  <Text font={14} fontWeight="semibold" foregroundStyle={{ color: C.text1, opacity: 1 }}>
                    {box.awardDays}天签到盲盒
                  </Text>
                  {/* @ts-ignore */}
                  <Text font={11} foregroundStyle={{ color: ready ? C.orange : C.text3, opacity: 1 }}>
                    {ready ? "已可领取" : `⏳ 还剩 ${box.leftDaysToOpen} 天`}
                  </Text>
                </VStack>
                {ready ? (
                  // @ts-ignore
                  <HStack padding={{ horizontal: 10, vertical: 4 }} background={C.orange} cornerRadius={8}>
                    {/* @ts-ignore */}
                    <Text font={10} fontWeight="bold" foregroundStyle={{ color: C.text1, opacity: 1 }}>READY</Text>
                  </HStack>
                ) : null}
              </HStack>
            )
          })}
        </VStack>
      ) : null}

      {/* 全部领完 */}
      {notOpenedBoxesDetail.length === 0 && rewards.length > 0 ? (
        // @ts-ignore
        <HStack alignment="center" spacing={8} background="#0E1A0E" as Color cornerRadius={14} padding={12}>
          {/* @ts-ignore */}
          <Image systemName="checkmark.circle.fill" font={14} foregroundStyle={{ color: C.green, opacity: 1 }} />
          {/* @ts-ignore */}
          <Text font={13} fontWeight="semibold" foregroundStyle={{ color: C.green, opacity: 1 }}>
            ✨ 所有可领取盲盒已领取完毕
          </Text>
        </HStack>
      ) : null}
    </VStack>
  )
}

// ===== 盲盒可领取提醒通知 =====
function BlindBoxReadyNotification() {
  const data = Notification.current
  const info = data?.userInfo || {}
  const readyCount = info.readyCount || 0
  const notOpenedBoxesDetail: any[] = info.notOpenedBoxesDetail || []
  const readyBoxes = notOpenedBoxesDetail.filter(b => b.leftDaysToOpen === 0)
  const waitingBoxes = notOpenedBoxesDetail.filter(b => b.leftDaysToOpen > 0)

  return (
    // @ts-ignore
    <VStack padding={16} background={C.bg} spacing={14}>
      {/* ===== Hero ===== */}
      <VStack
        // @ts-ignore
        background={C.bgHero} cornerRadius={18}
        alignment="center" spacing={14}
        padding={{ top: 24, bottom: 18, horizontal: 16 }}
        frame={{ maxWidth: "infinity" }}
      >
        <GlowHero icon="shippingbox.fill" accent={C.orange} subGlow={C.gold} size={46} />
        <VStack alignment="center" spacing={4}>
          {/* @ts-ignore */}
          <Text font={22} fontWeight="bold" foregroundStyle={{ color: C.text1, opacity: 1 }}>
            🎁 盲盒已准备就绪
          </Text>
          {/* @ts-ignore */}
          <Text font={13} foregroundStyle={{ color: C.text2, opacity: 1 }}>
            {readyCount > 0 ? `有 ${readyCount} 个盲盒等你开启` : "点击查看盲盒详情"}
          </Text>
        </VStack>
        {readyCount > 0 ? (
          <HStack spacing={8} alignment="center"
            // @ts-ignore
            padding={{ horizontal: 16, vertical: 7 }} background={C.orange} cornerRadius={20}>
            {/* @ts-ignore */}
            <Image systemName="sparkles" font={12} foregroundStyle={{ color: C.text1, opacity: 1 }} />
            {/* @ts-ignore */}
            <Text font={12} fontWeight="bold" foregroundStyle={{ color: C.text1, opacity: 1 }}>
              READY TO OPEN
            </Text>
          </HStack>
        ) : null}
      </VStack>

      {/* ===== 统计三列 ===== */}
      {/* @ts-ignore */}
      <HStack alignment="center" spacing={0} background={C.bgCard} cornerRadius={14} padding={{ vertical: 16, horizontal: 8 }}>
        <StatCard value={readyCount} label="待领取" accent={C.orange} />
        <StatSep />
        <StatCard value={readyBoxes.length} label="可领取" accent={C.green} />
        <StatSep />
        <StatCard value={waitingBoxes.length} label="冷却中" accent={C.text3} />
      </HStack>

      {/* ===== 可领取列表 ===== */}
      {readyBoxes.length > 0 ? (
        <VStack spacing={8}>
          <HStack alignment="center" spacing={8}>
            {/* @ts-ignore */}
            <Image systemName="checkmark.circle.fill" font={14} foregroundStyle={{ color: C.green, opacity: 1 }} />
            {/* @ts-ignore */}
            <Text font={13} fontWeight="semibold" foregroundStyle={{ color: C.text2, opacity: 1 }}>可领取</Text>
          </HStack>
          {readyBoxes.map((b, i) => (
            <HStack key={"r" + i} alignment="center" spacing={10}
              // @ts-ignore
              background={C.bgCard} cornerRadius={14} padding={{ vertical: 11, horizontal: 12 }}>
              <ZStack frame={{ width: 36, height: 36 }} alignment="center">
                <Circle fill={C.orange} frame={{ width: 36, height: 36 }} opacity={0.15} />
                {/* @ts-ignore */}
                <Image systemName="gift.fill" font={18} foregroundStyle={{ color: C.orange, opacity: 1 }} />
              </ZStack>
              <VStack spacing={3} frame={{ maxWidth: "infinity" }}>
                {/* @ts-ignore */}
                <Text font={15} fontWeight="semibold" foregroundStyle={{ color: C.text1, opacity: 1 }}>
                  {b.awardDays} 天签到盲盒
                </Text>
                {/* @ts-ignore */}
                <Text font={11} foregroundStyle={{ color: C.orange, opacity: 1 }}>已可领取</Text>
              </VStack>
              {/* @ts-ignore */}
              <HStack padding={{ horizontal: 10, vertical: 4 }} background={C.orange} cornerRadius={8}>
                {/* @ts-ignore */}
                <Text font={10} fontWeight="bold" foregroundStyle={{ color: C.text1, opacity: 1 }}>READY</Text>
              </HStack>
            </HStack>
          ))}
        </VStack>
      ) : null}

      {/* ===== 冷却中列表 ===== */}
      {waitingBoxes.length > 0 ? (
        <VStack spacing={8}>
          <HStack alignment="center" spacing={8}>
            {/* @ts-ignore */}
            <Image systemName="hourglass" font={14} foregroundStyle={{ color: C.text3, opacity: 1 }} />
            {/* @ts-ignore */}
            <Text font={13} fontWeight="semibold" foregroundStyle={{ color: C.text2, opacity: 1 }}>冷却中</Text>
          </HStack>
          {waitingBoxes.slice(0, 3).map((b, i) => (
            <HStack key={"w" + i} alignment="center" spacing={10}
              // @ts-ignore
              background={C.bgCard} cornerRadius={14} padding={{ vertical: 11, horizontal: 12 }}>
              <ZStack frame={{ width: 36, height: 36 }} alignment="center">
                <Circle fill={C.coolBadge} frame={{ width: 36, height: 36 }} opacity={0.15} />
                {/* @ts-ignore */}
                <Image systemName="lock.fill" font={16} foregroundStyle={{ color: C.text3, opacity: 1 }} />
              </ZStack>
              <VStack spacing={3} frame={{ maxWidth: "infinity" }}>
                {/* @ts-ignore */}
                <Text font={15} fontWeight="semibold" foregroundStyle={{ color: C.text1, opacity: 1 }}>
                  {b.awardDays} 天签到盲盒
                </Text>
                {/* @ts-ignore */}
                <Text font={11} foregroundStyle={{ color: C.text3, opacity: 1 }}>
                  还剩 {b.leftDaysToOpen} 天冷却
                </Text>
              </VStack>
            </HStack>
          ))}
        </VStack>
      ) : null}

      {/* ===== CTA 按钮 ===== */}
      {/* @ts-ignore */}
      <HStack alignment="center" spacing={10} background={C.orange} cornerRadius={14} padding={12}>
        {/* @ts-ignore */}
        <Image systemName="hand.tap.fill" font={16} foregroundStyle={{ color: C.text1, opacity: 1 }} />
        {/* @ts-ignore */}
        <Text font={13} fontWeight="semibold" foregroundStyle={{ color: C.text1, opacity: 1 }}>
          点击这条通知进入一键开启
        </Text>
      </HStack>
    </VStack>
  )
}

// ===== 主入口 =====
const data = Notification.current
if (data) {
  const userInfo = data.userInfo || {}
  const type = userInfo.type || "sign"

  if (type === "blindbox") {
    Notification.present(<BlindBoxNotification />)
  } else if (type === "blindbox_ready") {
    Notification.present(<BlindBoxReadyNotification />)
  } else {
    Notification.present(<SignInNotification />)
  }
}
