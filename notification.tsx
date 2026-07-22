/**
 * 九号电动车 - 富通知 UI v2
 * 长按或下拉通知时显示的自定义图形化界面
 */

import { Notification, VStack, HStack, Text, Image, Spacer, Divider, Color, ZStack, Circle, Rectangle } from "scripting"

// ===== 颜色常量 =====
const C = {
  green: "#34C759" as Color,
  greenGlow: "rgba(52,199,89,0.22)" as Color,
  orange: "#FF9500" as Color,
  orangeGlow: "rgba(255,149,0,0.22)" as Color,
  red: "#FF3B30" as Color,
  blue: "#0A84FF" as Color,
  purple: "#BF5AF2" as Color,
  purpleGlow: "rgba(191,90,242,0.22)" as Color,
  gold: "#FFD60A" as Color,
  card: "#2C2C2E" as Color,
  cardDeep: "#232325" as Color,
  divider: "#38383A" as Color,
  bg: "#1C1C1E" as Color,
  text1: "#FFFFFF" as Color,
  text2: "#8E8E93" as Color,
  text3: "#636366" as Color,
  pink: "#FF6B9D" as Color,
}

// ===== 盲盒主图仪式组件 =====
function BlindBoxHero({ systemName, accent, size = 64 }: {
  systemName: string
  accent: Color
  size?: number
}) {
  return (
    <ZStack frame={{ width: size * 1.5, height: size * 1.5 }} alignment="center">
      <Circle fill={accent} frame={{ width: size * 1.5, height: size * 1.5 }} opacity={0.06} />
      <Circle fill={accent} frame={{ width: size * 1.3, height: size * 1.3 }} opacity={0.12} />
      <Circle fill={accent} frame={{ width: size * 1.1, height: size * 1.1 }} opacity={0.22} />
      {/* @ts-ignore */}
      <Image systemName={systemName} font={size} foregroundStyle={{ color: accent, opacity: 1 }} />
    </ZStack>
  )
}

// ===== 奖励图标映射 =====
function rewardIcon(rewardType: number): string {
  if (rewardType === 1) return "star.circle.fill"
  if (rewardType === 2) return "crown.fill"
  if (rewardType === 3) return "rosette"
  if (rewardType === 4) return "ticket.fill"
  if (rewardType === 5) return "giftcard.fill"
  return "gift.fill"
}

function rewardColor(rewardType: number): Color {
  if (rewardType === 1) return C.purple
  if (rewardType === 2) return C.orange
  if (rewardType === 3) return C.pink
  if (rewardType === 4) return C.green
  if (rewardType === 5) return C.blue
  return C.green
}

function rewardName(rewardType: number): string {
  if (rewardType === 1) return "等级经验"
  if (rewardType === 2) return "N币"
  if (rewardType === 3) return "勋章"
  if (rewardType === 4) return "补签卡"
  if (rewardType === 5) return "商城兑换券"
  return "奖励"
}

// ===== 带彩色底线的统计项 =====
function StatCard({ value, label, color, isLarge }: {
  value: string | number
  label: string
  color: Color
  isLarge?: boolean
}) {
  return (
    <VStack alignment="center" spacing={4} frame={{ maxWidth: "infinity" }}>
      {/* @ts-ignore */}
      <Text font={isLarge ? 32 : 28} fontWeight="bold"
        foregroundStyle={{ color: color, opacity: 1 }}>{value}</Text>
      {/* @ts-ignore */}
      <Text font={isLarge ? 12 : 11}
        foregroundStyle={{ color: C.text2, opacity: 1 }}>{label}</Text>
      {/* 底部彩色装饰线 */}
      <VStack frame={{ width: 24, height: 2 }} background={color}
        clipShape="capsule" opacity={0.7} />
    </VStack>
  )
}

// ===== 签到成功通知 UI =====
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
    <VStack padding={16} background={C.bg} spacing={0}>
      {/* Hero 区域：多层光晕 + 图标 */}
      <VStack alignment="center" spacing={10}
        frame={{ maxWidth: "infinity" }} padding={{ top: 8, bottom: 12 }}>
        {/* 5层绿色光晕 */}
        <ZStack alignment="center" frame={{ width: 100, height: 100 }}>
          <Circle fill={C.green} frame={{ width: 100, height: 100 }} opacity={0.04} />
          <Circle fill={C.green} frame={{ width: 80, height: 80 }} opacity={0.08} />
          <Circle fill={C.green} frame={{ width: 64, height: 64 }} opacity={0.14} />
          <Circle fill={C.green} frame={{ width: 48, height: 48 }} opacity={0.22} />
          <Circle fill={C.green} frame={{ width: 36, height: 36 }} opacity={0.35} />
          {/* @ts-ignore */}
          <Image systemName="checkmark.seal.fill" font={28}
            foregroundStyle={{ color: C.green, opacity: 1 }} />
        </ZStack>
        <VStack alignment="center" spacing={2}>
          {/* @ts-ignore */}
          <Text font={20} fontWeight="bold"
            foregroundStyle={{ color: C.text1, opacity: 1 }}>签到成功</Text>
          {/* @ts-ignore */}
          <Text font={12}
            foregroundStyle={{ color: C.text2, opacity: 1 }}>九号出行 · 每日签到</Text>
        </VStack>
      </VStack>

      <Divider />

      {/* 三列统计卡片 + 彩色底线 */}
      {/* @ts-ignore */}
      <HStack alignment="center" spacing={0} background={C.card} cornerRadius={12} padding={14}>
        <StatCard value={consecutiveDays} label="连续天数" color={C.orange} />
        <VStack frame={{ width: 1, height: 36 }} background={C.divider} />
        <StatCard value={level} label="当前等级" color={C.purple} />
        <VStack frame={{ width: 1, height: 36 }} background={C.divider} />
        <StatCard value={nCoin} label="N币" color={C.green} />
      </HStack>

      {/* 签到奖励提示 */}
      {/* @ts-ignore */}
      <HStack alignment="center" spacing={10} background={C.card} cornerRadius={12} padding={12}>
        <ZStack frame={{ width: 36, height: 36 }} alignment="center">
          <Circle fill={C.green} frame={{ width: 36, height: 36 }} opacity={0.18} />
          {/* @ts-ignore */}
          <Image systemName="star.fill" font={18}
            foregroundStyle={{ color: C.green, opacity: 1 }} />
        </ZStack>
        <VStack spacing={1} frame={{ maxWidth: "infinity" }}>
          {/* @ts-ignore */}
          <Text font={13} fontWeight="semibold"
            foregroundStyle={{ color: C.text1, opacity: 1 }}>今日签到奖励</Text>
          {/* @ts-ignore */}
          <Text font={11}
            foregroundStyle={{ color: C.text2, opacity: 1 }}>+2 经验 · 等级进度 +{experience}</Text>
        </VStack>
        {/* @ts-ignore */}
        <Text font={13} fontWeight="semibold"
          foregroundStyle={{ color: C.green, opacity: 1 }}>已获得</Text>
      </HStack>

      {/* 盲盒倒计时 */}
      {notOpenedBlindBoxCount > 0 && (
        // @ts-ignore
        <HStack alignment="center" spacing={10} background="#2A1F0A" as Color cornerRadius={12} padding={12}>
          <ZStack frame={{ width: 36, height: 36 }} alignment="center">
            <Circle fill={C.orange} frame={{ width: 36, height: 36 }} opacity={0.18} />
            {/* @ts-ignore */}
            <Image systemName="gift.fill" font={18}
              foregroundStyle={{ color: C.orange, opacity: 1 }} />
          </ZStack>
          <VStack spacing={1} frame={{ maxWidth: "infinity" }}>
            {/* @ts-ignore */}
            <Text font={13} fontWeight="semibold"
              foregroundStyle={{ color: C.text1, opacity: 1 }}>盲盒待领取</Text>
            {/* @ts-ignore */}
            <Text font={11}
              foregroundStyle={{ color: C.text2, opacity: 1 }}>
              {notOpenedBlindBoxCount + " 个盲盒可领取"}
            </Text>
          </VStack>
          {minLeftDaysToOpen !== null && minLeftDaysToOpen !== undefined && minLeftDaysToOpen > 0 ? (
            /* @ts-ignore */
            <Text font={12}
              foregroundStyle={{ color: C.orange, opacity: 1 }}>⏳ {minLeftDaysToOpen}天</Text>
          ) : (
            /* @ts-ignore */
            <HStack padding={{ horizontal: 8, vertical: 4 }}
              background={{ style: C.green, shape: { type: "rect", cornerRadius: 6 } }}>
              {/* @ts-ignore */}
              <Text font={11} fontWeight="bold"
                foregroundStyle={{ color: C.text1, opacity: 1 }}>可领取</Text>
            </HStack>
          )}
        </HStack>
      )}
    </VStack>
  )
}

// ===== 盲盒领取通知 UI =====
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
  const accentColor = isSuccess ? C.orange : C.red

  return (
    // @ts-ignore
    <VStack padding={16} background={C.bg} spacing={12}>
      {/* 仪式感区域 */}
      <VStack
        frame={{ maxWidth: "infinity" }}
        padding={20}
        spacing={12}
        // @ts-ignore
        background={C.cardDeep} cornerRadius={16}
        alignment="center"
      >
        <BlindBoxHero
          systemName={isSuccess ? "gift.fill" : "exclamationmark.triangle.fill"}
          accent={accentColor}
          size={56}
        />
        <VStack alignment="center" spacing={2}>
          {/* @ts-ignore */}
          <Text font={20} fontWeight="bold"
            foregroundStyle={{ color: C.text1, opacity: 1 }}>
            {isSuccess ? ("成功领取 " + receiveSuccess + " 个盲盒") : "领取异常"}
          </Text>
          {/* @ts-ignore */}
          <Text font={12}
            foregroundStyle={{ color: C.text2, opacity: 1 }}>
            {isSuccess ? "九号出行 · 今日福利已收入囊中" : "部分盲盒未领取成功，请打开应用查看"}
          </Text>
        </VStack>
      </VStack>

      {/* 领取统计 */}
      {/* @ts-ignore */}
      <HStack alignment="center" spacing={0} background={C.card} cornerRadius={12} padding={14}>
        <StatCard value={total} label="处理总数" color={C.orange} />
        <VStack frame={{ width: 1, height: 36 }} background={C.divider} />
        <StatCard value={receiveSuccess} label="领取成功" color={C.green} />
        {failed > 0 && (
          <>
            <VStack frame={{ width: 1, height: 36 }} background={C.divider} />
            <StatCard value={failed} label="领取失败" color={C.red} />
          </>
        )}
      </HStack>

      {/* 奖励详情列表 */}
      {rewards.length > 0 && (
        <VStack spacing={6}>
          <HStack alignment="center" spacing={6}>
            {/* @ts-ignore */}
            <Image systemName="sparkles" font={14}
              foregroundStyle={{ color: C.orange, opacity: 1 }} />
            {/* @ts-ignore */}
            <Text font={13} fontWeight="semibold"
              foregroundStyle={{ color: C.text2, opacity: 1 }}>本次开盒奖励</Text>
          </HStack>
          {rewards.map((r: any, index: number) => {
            const reward = r.reward
            const awardDays = r.awardDays || 0
            const rType = reward?.rewardType
            const rColor = rewardColor(rType)
            const rText = reward
              ? ("+" + reward.rewardValue + " " + rewardName(rType))
              : "奖励"

            return (
              <HStack key={"reward-" + index} alignment="center" spacing={12}
                background={{ style: C.card, shape: { type: "rect", cornerRadius: 12 } }} padding={12}>
                <ZStack frame={{ width: 36, height: 36 }} alignment="center">
                  <Circle fill={rColor} frame={{ width: 36, height: 36 }} opacity={0.18} />
                  {/* @ts-ignore */}
                  <Image systemName={rewardIcon(rType)} font={20}
                    foregroundStyle={{ color: rColor, opacity: 1 }} />
                </ZStack>
                <VStack spacing={2} frame={{ maxWidth: "infinity" }}>
                  {/* @ts-ignore */}
                  <Text font={14} fontWeight="semibold"
                    foregroundStyle={{ color: C.text1, opacity: 1 }}>{awardDays}天签到盲盒</Text>
                  {/* @ts-ignore */}
                  <Text font={11}
                    foregroundStyle={{ color: C.text3, opacity: 1 }}>{rewardName(rType)}</Text>
                </VStack>
                {/* @ts-ignore */}
                <Text font={14} fontWeight="semibold"
                  foregroundStyle={{ color: rColor, opacity: 1 }}>{rText}</Text>
              </HStack>
            )
          })}
        </VStack>
      )}

      {/* 失败原因 */}
      {errors.length > 0 && (
        // @ts-ignore
        <VStack spacing={0} background="#2A0A0A" as Color cornerRadius={12} padding={12}>
          {errors.map((err: string, index: number) => (
            /* @ts-ignore */
            <Text key={"err-" + index} font={12}
              foregroundStyle={{ color: C.red, opacity: 1 }}>⚠️ {err}</Text>
          ))}
        </VStack>
      )}

      {/* 未开盲盒倒计时 */}
      {notOpenedBoxesDetail.length > 0 && (
        <VStack spacing={6}>
          {/* @ts-ignore */}
          <Text font={13}
            foregroundStyle={{ color: C.text2, opacity: 1 }}>📦 待开启盲盒</Text>
          {notOpenedBoxesDetail.map((box: any, index: number) => (
            <HStack key={"box-" + index} alignment="center" spacing={8}
              background={C.card} clipShape="rect" padding={12}>
              {/* @ts-ignore */}
              <Image systemName="gift.fill"
                foregroundStyle={{ color: box.leftDaysToOpen === 0 ? C.green : C.orange, opacity: 1 }} />
              <VStack spacing={2} frame={{ maxWidth: "infinity" }}>
                {/* @ts-ignore */}
                <Text font={14} fontWeight="semibold"
                  foregroundStyle={{ color: C.text1, opacity: 1 }}>{box.awardDays}天签到盲盒</Text>
              </VStack>
              {box.leftDaysToOpen === 0 ? (
                /* @ts-ignore */
                <Text font={13} fontWeight="semibold"
                  foregroundStyle={{ color: C.green, opacity: 1 }}>可领取</Text>
              ) : (
                /* @ts-ignore */
                <Text font={13}
                  foregroundStyle={{ color: C.text2, opacity: 1 }}>⏳ {box.leftDaysToOpen} 天后</Text>
              )}
            </HStack>
          ))}
        </VStack>
      )}

      {/* 所有盲盒已领取完毕 */}
      {notOpenedBoxesDetail.length === 0 && rewards.length > 0 && (
        // @ts-ignore
        <HStack alignment="center" spacing={0} background="#0A2A0A" as Color cornerRadius={12} padding={12}>
          {/* @ts-ignore */}
          <Text font={13}
            foregroundStyle={{ color: C.green, opacity: 1 }}>✨ 所有可领取盲盒已领取完毕</Text>
        </HStack>
      )}
    </VStack>
  )
}

// ===== 盲盒可领取提醒通知 UI =====
function BlindBoxReadyNotification() {
  const data = Notification.current
  const info = data?.userInfo || {}

  const readyCount = info.readyCount || 0
  const notOpenedBoxesDetail: any[] = info.notOpenedBoxesDetail || []
  const readyBoxes = notOpenedBoxesDetail.filter(b => b.leftDaysToOpen === 0)
  const waitingBoxes = notOpenedBoxesDetail.filter(b => b.leftDaysToOpen > 0)

  return (
    // @ts-ignore
    <VStack padding={16} background={C.bg} spacing={12}>
      {/* 仪式感区域 */}
      <VStack
        frame={{ maxWidth: "infinity" }}
        padding={20}
        spacing={12}
        // @ts-ignore
        background={C.cardDeep} cornerRadius={16}
        alignment="center"
      >
        <BlindBoxHero
          systemName="shippingbox.fill"
          accent={C.orange}
          size={56}
        />
        <VStack alignment="center" spacing={2}>
          {/* @ts-ignore */}
          <Text font={20} fontWeight="bold"
            foregroundStyle={{ color: C.text1, opacity: 1 }}>🎁 盲盒已准备就绪</Text>
          {/* @ts-ignore */}
          <Text font={12}
            foregroundStyle={{ color: C.text2, opacity: 1 }}>
            {readyCount > 0 ? ("有 " + readyCount + " 个盲盒等你开启，点击通知一键领取") : "点击查看盲盒详情"}
          </Text>
        </VStack>
        {/* READY 徽章 */}
        {readyCount > 0 ? (
          <HStack spacing={6} alignment="center"
            padding={{ horizontal: 14, vertical: 6 }}
            background={{ style: C.orange, shape: { type: "rect", cornerRadius: 20 } }}>
            {/* @ts-ignore */}
            <Image systemName="sparkles" font={12}
              foregroundStyle={{ color: C.text1, opacity: 1 }} />
            {/* @ts-ignore */}
            <Text font={12} fontWeight="bold"
              foregroundStyle={{ color: C.text1, opacity: 1 }}>READY TO OPEN</Text>
          </HStack>
        ) : null}
      </VStack>

      {/* 顶部总计卡片 */}
      {/* @ts-ignore */}
      <HStack alignment="center" spacing={0} background={C.card} cornerRadius={12} padding={14}>
        <StatCard value={readyCount} label="待领取" color={C.orange} />
        <VStack frame={{ width: 1, height: 36 }} background={C.divider} />
        <StatCard value={readyBoxes.length} label="可领取" color={C.green} />
        <VStack frame={{ width: 1, height: 36 }} background={C.divider} />
        <StatCard value={waitingBoxes.length} label="冷却中" color={C.text2} />
      </HStack>

      {/* 可领取的盲盒列表 */}
      {readyBoxes.length > 0 && (
        <VStack spacing={8}>
          <HStack alignment="center" spacing={6}>
            {/* @ts-ignore */}
            <Image systemName="checkmark.circle.fill" font={14}
              foregroundStyle={{ color: C.green, opacity: 1 }} />
            {/* @ts-ignore */}
            <Text font={13} fontWeight="semibold"
              foregroundStyle={{ color: C.text2, opacity: 1 }}>可领取</Text>
          </HStack>
          {readyBoxes.map((b, i) => (
            <HStack key={"r-" + i} alignment="center" spacing={10}
              background={{ style: C.card, shape: { type: "rect", cornerRadius: 10 } }} padding={10}>
              <VStack frame={{ width: 36, height: 36 }}
                background={{ style: C.orange, shape: { type: "rect", cornerRadius: 10 } }}
                alignment="center">
                {/* @ts-ignore */}
                <Image systemName="gift.fill" font={18}
                  foregroundStyle={{ color: C.text1, opacity: 1 }} />
              </VStack>
              <VStack spacing={2} frame={{ maxWidth: "infinity" }}>
                {/* @ts-ignore */}
                <Text font={15} fontWeight="semibold"
                  foregroundStyle={{ color: C.text1, opacity: 1 }}>{b.awardDays} 天签到盲盒</Text>
                {/* @ts-ignore */}
                <Text font={11}
                  foregroundStyle={{ color: C.orange, opacity: 1 }}>已可领取</Text>
              </VStack>
              <HStack padding={{ horizontal: 8, vertical: 3 }}
                background={{ style: C.orange, shape: { type: "rect", cornerRadius: 6 } }}>
                {/* @ts-ignore */}
                <Text font={10} fontWeight="bold"
                  foregroundStyle={{ color: C.text1, opacity: 1 }}>READY</Text>
              </HStack>
            </HStack>
          ))}
        </VStack>
      )}

      {/* 冷却中的盲盒 */}
      {waitingBoxes.length > 0 && (
        <VStack spacing={8}>
          <HStack alignment="center" spacing={6}>
            {/* @ts-ignore */}
            <Image systemName="hourglass" font={14}
              foregroundStyle={{ color: C.text3, opacity: 1 }} />
            {/* @ts-ignore */}
            <Text font={13} fontWeight="semibold"
              foregroundStyle={{ color: C.text2, opacity: 1 }}>冷却中（近 3 个）</Text>
          </HStack>
          {waitingBoxes.slice(0, 3).map((b, i) => (
            <HStack key={"w-" + i} alignment="center" spacing={10}
              background={{ style: C.card, shape: { type: "rect", cornerRadius: 10 } }} padding={10}>
              <VStack frame={{ width: 36, height: 36 }}
                background={{ style: C.divider, shape: { type: "rect", cornerRadius: 10 } }}
                alignment="center">
                {/* @ts-ignore */}
                <Image systemName="lock.fill" font={16}
                  foregroundStyle={{ color: C.text3, opacity: 1 }} />
              </VStack>
              <VStack spacing={2} frame={{ maxWidth: "infinity" }}>
                {/* @ts-ignore */}
                <Text font={15} fontWeight="semibold"
                  foregroundStyle={{ color: C.text1, opacity: 1 }}>{b.awardDays} 天签到盲盒</Text>
                {/* @ts-ignore */}
                <Text font={11}
                  foregroundStyle={{ color: C.text3, opacity: 1 }}>还剩 {b.leftDaysToOpen} 天冷却</Text>
              </VStack>
            </HStack>
          ))}
        </VStack>
      )}

      {/* 点击提示 */}
      {/* @ts-ignore */}
      <HStack alignment="center" spacing={8} background={C.orange} cornerRadius={12} padding={12}>
        {/* @ts-ignore */}
        <Image systemName="hand.tap.fill" font={16}
          foregroundStyle={{ color: C.text1, opacity: 1 }} />
        {/* @ts-ignore */}
        <Text font={13} fontWeight="semibold"
          foregroundStyle={{ color: C.text1, opacity: 1 }}>点击这条通知进入一键开启</Text>
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
