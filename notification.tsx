/**
 * 九号电动车 - 富通知 UI
 * 支持：签到通知、盲盒就绪通知、盲盒已领取通知
 */

import { Notification, VStack, HStack, Text, Image, Divider, Color, ZStack, Circle } from "scripting"

// ===== 颜色常量 =====
const C = {
  green: "#34C759" as Color,
  greenGlow: "rgba(52,199,89,0.22)" as Color,
  orange: "#FF9500" as Color,
  orangeGlow: "rgba(255,149,0,0.22)" as Color,
  purple: "#BF5AF2" as Color,
  gold: "#FFD60A" as Color,
  card: "#2C2C2E" as Color,
  divider: "#38383A" as Color,
  bg: "#1C1C1E" as Color,
  text1: "#FFFFFF" as Color,
  text2: "#8E8E93" as Color,
}

// ===== 带彩色底线的统计项 =====
function StatCard({ value, label, color }: {
  value: string | number
  label: string
  color: Color
}) {
  return (
    <VStack alignment="center" spacing={4} frame={{ maxWidth: "infinity" }}>
      {/* @ts-ignore */}
      <Text font={28} fontWeight="bold"
        foregroundStyle={{ color: color, opacity: 1 }}>{value}</Text>
      {/* @ts-ignore */}
      <Text font={11}
        foregroundStyle={{ color: C.text2, opacity: 1 }}>{label}</Text>
      {/* 底部彩色装饰线 */}
      <VStack frame={{ width: 24, height: 2 }} background={color}
        clipShape="capsule" opacity={0.7} />
    </VStack>
  )
}

// ===== 签到成功通知 UI =====
function SignInNotification({ consecutiveDays = 0, experience = 0, level = 0, nCoin = 0, minLeftDaysToOpen, notOpenedBlindBoxCount = 0 }: {
  consecutiveDays?: number
  experience?: number
  level?: number
  nCoin?: number
  minLeftDaysToOpen?: number
  notOpenedBlindBoxCount?: number
}) {

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

      {/* 盲盒信息简洁提示（仅显示数量，不发送盲盒通知） */}
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

// ===== 盲盒就绪通知 UI =====
function BlindBoxReadyNotification({ readyCount, totalBoxes }: {
  readyCount?: number
  totalBoxes?: number
}) {
  const count = readyCount || 0
  return (
    // @ts-ignore
    <VStack padding={16} background={C.bg} spacing={0}>
      {/* Hero：多层金色光晕 + gift 图标 */}
      <VStack alignment="center" spacing={10}
        frame={{ maxWidth: "infinity" }} padding={{ top: 8, bottom: 12 }}>
        <ZStack alignment="center" frame={{ width: 100, height: 100 }}>
          <Circle fill={C.gold} frame={{ width: 100, height: 100 }} opacity={0.04} />
          <Circle fill={C.gold} frame={{ width: 80, height: 80 }} opacity={0.08} />
          <Circle fill={C.gold} frame={{ width: 64, height: 64 }} opacity={0.14} />
          <Circle fill={C.orange} frame={{ width: 48, height: 48 }} opacity={0.22} />
          <Circle fill={C.orange} frame={{ width: 36, height: 36 }} opacity={0.35} />
          {/* @ts-ignore */}
          <Image systemName="gift.fill" font={28}
            foregroundStyle={{ color: C.gold, opacity: 1 }} />
        </ZStack>
        <VStack alignment="center" spacing={2}>
          {/* @ts-ignore */}
          <Text font={20} fontWeight="bold"
            foregroundStyle={{ color: C.text1, opacity: 1 }}>盲盒已就绪!</Text>
          {/* @ts-ignore */}
          <Text font={12}
            foregroundStyle={{ color: C.text2, opacity: 1 }}>九号出行 · 盲盒奖励</Text>
        </VStack>
      </VStack>

      <Divider />

      {/* 数量提示 */}
      {/* @ts-ignore */}
      <HStack alignment="center" spacing={10} background="#2A1F0A" as Color cornerRadius={12} padding={14}>
        <ZStack frame={{ width: 40, height: 40 }} alignment="center">
          <Circle fill={C.gold} frame={{ width: 40, height: 40 }} opacity={0.18} />
          {/* @ts-ignore */}
          <Image systemName="gift.fill" font={20}
            foregroundStyle={{ color: C.gold, opacity: 1 }} />
        </ZStack>
        <VStack spacing={1} frame={{ maxWidth: "infinity" }}>
          {/* @ts-ignore */}
          <Text font={13} fontWeight="semibold"
            foregroundStyle={{ color: C.text1, opacity: 1 }}>{count} 个盲盒可领取</Text>
          {/* @ts-ignore */}
          <Text font={11}
            foregroundStyle={{ color: C.text2, opacity: 1 }}>签到天数达标，盲盒已解锁</Text>
        </VStack>
        {/* @ts-ignore */}
        <HStack padding={{ horizontal: 8, vertical: 4 }}
          background={{ style: C.gold, shape: { type: "rect", cornerRadius: 6 } }}>
          {/* @ts-ignore */}
          <Text font={11} fontWeight="bold"
            foregroundStyle={{ color: C.bg, opacity: 1 }}>可领</Text>
        </HStack>
      </HStack>
    </VStack>
  )
}

// ===== 盲盒已领取通知 UI =====
function BlindBoxReceivedNotification({ awardDays, rewardType, rewardValue }: {
  awardDays?: number
  rewardType?: number
  rewardValue?: number
}) {
  const days = awardDays || 0
  const rType = rewardType === 1 ? "+2 经验" : (rewardValue ? "+" + rewardValue + " N币" : "奖励已到账")
  return (
    // @ts-ignore
    <VStack padding={16} background={C.bg} spacing={0}>
      {/* Hero：多层绿色光晕 */}
      <VStack alignment="center" spacing={10}
        frame={{ maxWidth: "infinity" }} padding={{ top: 8, bottom: 12 }}>
        <ZStack alignment="center" frame={{ width: 100, height: 100 }}>
          <Circle fill={C.green} frame={{ width: 100, height: 100 }} opacity={0.04} />
          <Circle fill={C.green} frame={{ width: 80, height: 80 }} opacity={0.08} />
          <Circle fill={C.green} frame={{ width: 64, height: 64 }} opacity={0.14} />
          <Circle fill={C.green} frame={{ width: 48, height: 48 }} opacity={0.22} />
          <Circle fill={C.green} frame={{ width: 36, height: 36 }} opacity={0.35} />
          {/* @ts-ignore */}
          <Image systemName="checkmark.circle.fill" font={28}
            foregroundStyle={{ color: C.green, opacity: 1 }} />
        </ZStack>
        <VStack alignment="center" spacing={2}>
          {/* @ts-ignore */}
          <Text font={20} fontWeight="bold"
            foregroundStyle={{ color: C.text1, opacity: 1 }}>盲盒已领取!</Text>
          {/* @ts-ignore */}
          <Text font={12}
            foregroundStyle={{ color: C.text2, opacity: 1 }}>九号出行 · 盲盒奖励</Text>
        </VStack>
      </VStack>

      <Divider />

      {/* 奖励详情 */}
      {/* @ts-ignore */}
      <HStack alignment="center" spacing={10} background={C.card} cornerRadius={12} padding={14}>
        <ZStack frame={{ width: 40, height: 40 }} alignment="center">
          <Circle fill={C.green} frame={{ width: 40, height: 40 }} opacity={0.18} />
          {/* @ts-ignore */}
          <Image systemName="shippingbox.fill" font={20}
            foregroundStyle={{ color: C.green, opacity: 1 }} />
        </ZStack>
        <VStack spacing={1} frame={{ maxWidth: "infinity" }}>
          {/* @ts-ignore */}
          <Text font={13} fontWeight="semibold"
            foregroundStyle={{ color: C.text1, opacity: 1 }}>{days} 天盲盒奖励</Text>
          {/* @ts-ignore */}
          <Text font={11}
            foregroundStyle={{ color: C.text2, opacity: 1 }}>{rType}</Text>
        </VStack>
        {/* @ts-ignore */}
        <HStack padding={{ horizontal: 8, vertical: 4 }}
          background={{ style: C.green, shape: { type: "rect", cornerRadius: 6 } }}>
          {/* @ts-ignore */}
          <Text font={11} fontWeight="bold"
            foregroundStyle={{ color: C.text1, opacity: 1 }}>已入账</Text>
        </HStack>
      </HStack>
    </VStack>
  )
}

// ===== 主入口 =====
const data = Notification.current
if (data) {
  const userInfo = data.userInfo || {}
  const type = userInfo.type || "sign"

  if (type === "blindBoxReceived") {
    // 盲盒已领取通知
    Notification.present(<BlindBoxReceivedNotification
      awardDays={userInfo.awardDays}
      rewardType={userInfo.rewardType}
      rewardValue={userInfo.rewardValue}
    />)
  } else {
    // 签到成功通知（默认）
    Notification.present(<SignInNotification
      consecutiveDays={userInfo.consecutiveDays}
      experience={userInfo.experience}
      level={userInfo.level}
      nCoin={userInfo.nCoin}
      minLeftDaysToOpen={userInfo.minLeftDaysToOpen}
      notOpenedBlindBoxCount={userInfo.notOpenedBlindBoxCount}
    />)
  }
}
