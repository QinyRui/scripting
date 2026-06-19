/**
 * 盲盒仪式感 — 共享视觉组件库
 *
 * 设计语言源自九号 H5 活动 openBlindBox 页面：
 * - 居中盲盒主体 + 浮动盒盖 + 多层光晕
 * - 大标题（32px / 600 weight）
 * - 引导手势（手指 + 上下浮动）
 * - 奖励揭晓（图标缩放出现 + 数字 + 标签）
 *
 * 使用场景：
 * - index.tsx 主应用 BlindBoxView
 * - widget.tsx 桌面小组件
 */

import { VStack, HStack, ZStack, Text, Image, Circle, type Color } from "scripting"

// ==================== 统一调色板 ====================
export const BB = {
  primary: "#FF9500" as Color,
  primaryGlow: "rgba(255,149,0,0.22)" as Color,
  primarySoft: "rgba(255,149,0,0.12)" as Color,
  purple: "#BF5AF2" as Color,
  purpleGlow: "rgba(191,90,242,0.22)" as Color,
  coinGold: "#FFD60A" as Color,
  coinGoldGlow: "rgba(255,214,10,0.25)" as Color,
  green: "#34C759" as Color,
  greenGlow: "rgba(52,199,89,0.22)" as Color,
  red: "#FF3B30" as Color,
  redGlow: "rgba(255,59,48,0.22)" as Color,
  bg: "#1C1C1E" as Color,
  card: "#2C2C2E" as Color,
  cardStroke: "#38383A" as Color,
  text1: "#FFFFFF" as Color,
  text2: "#8E8E93" as Color,
  text3: "#636366" as Color,
}

// ==================== 盲盒主体（居中仪式感）====================
export function BlindBoxCeremony({
  isReady,
  size,
  capPhase = 0,
  accentColor,
}: {
  isReady: boolean
  size: number
  capPhase?: number
  accentColor?: Color
}) {
  const accent = accentColor || (isReady ? BB.primary : (BB.text3 as Color))
  const capOffset = Math.round(-Math.sin(capPhase * Math.PI) * 10)
  const capOpacity = isReady ? (0.85 + capPhase * 0.15) : 0.5

  return (
    <ZStack frame={{ width: size, height: size }} alignment="center">
      <Circle fill={accent} frame={{ width: size * 1.5, height: size * 1.5 }} opacity={0.05} />
      <Circle fill={accent} frame={{ width: size * 1.25, height: size * 1.25 }} opacity={0.08} />
      <Circle fill={accent} frame={{ width: size * 1.1, height: size * 1.1 }} opacity={0.14} />
      {/* @ts-ignore - CommonViewProps fontSize/foregroundStyle on Image */}
      <Image
        systemName="shippingbox.fill"
        font={size * 0.42}
        foregroundStyle={{ color: accent, opacity: 1 }}
      />
      {isReady ? (
        /* @ts-ignore - CommonViewProps offset/foregroundStyle on Image */
        <Image
          systemName="shippingbox"
          font={size * 0.36}
          offset={{ x: 0, y: capOffset }}
          foregroundStyle={{ color: accent, opacity: capOpacity }}
        />
      ) : null}
    </ZStack>
  )
}

// ==================== 引导手势 ====================
export function GuideGesture({
  label = "点击开启盲盒",
  color,
}: {
  label?: string
  color?: Color
}) {
  const accent = color || BB.primary
  return (
    <VStack alignment="center" spacing={6}>
      {/* @ts-ignore - CommonViewProps foregroundStyle/font on Image */}
      <Image
        systemName="hand.point.up.left.fill"
        font={28}
        foregroundStyle={{ color: accent, opacity: 0.85 }}
      />
      {/* @ts-ignore - CommonViewProps foregroundStyle/font on Text */}
      <Text font={13} foregroundStyle={{ color: accent, opacity: 0.9 }}>
        {label}
      </Text>
    </VStack>
  )
}

// ==================== 奖励图标 ====================
export function RewardIcon({
  rewardType,
  size = 40,
}: {
  rewardType: number
  size?: number
}) {
  if (rewardType === 1) {
    /* @ts-ignore - CommonViewProps font/foregroundStyle on Image */
    return <Image systemName="star.circle.fill" font={size} foregroundStyle={{ color: BB.purple, opacity: 1 }} />
  } else if (rewardType === 2) {
    /* @ts-ignore */
    return <Image systemName="crown.fill" font={size} foregroundStyle={{ color: BB.primary, opacity: 1 }} />
  } else if (rewardType === 3) {
    /* @ts-ignore */
    return <Image systemName="rosette" font={size} foregroundStyle={{ color: "#FF6B9D" as Color, opacity: 1 }} />
  } else if (rewardType === 4) {
    /* @ts-ignore */
    return <Image systemName="ticket.fill" font={size} foregroundStyle={{ color: BB.green, opacity: 1 }} />
  } else if (rewardType === 5) {
    /* @ts-ignore */
    return <Image systemName="giftcard.fill" font={size} foregroundStyle={{ color: "#0A84FF" as Color, opacity: 1 }} />
  }
  /* @ts-ignore */
  return <Image systemName="gift.fill" font={size} foregroundStyle={{ color: BB.green, opacity: 1 }} />
}

// ==================== 奖励类型名 ====================
export function rewardTypeName(rewardType: number): string {
  if (rewardType === 1) return "等级经验"
  if (rewardType === 2) return "电动车币"
  if (rewardType === 3) return "勋章"
  if (rewardType === 4) return "补签卡"
  if (rewardType === 5) return "商城兑换券"
  return "奖励"
}

// ==================== 仪式感大标题 ====================
export function CeremonyTitle({
  title,
  subtitle,
  color,
}: {
  title: string
  subtitle?: string
  color?: Color
}) {
  const titleColor = color || ("label" as Color)
  return (
    <VStack alignment="leading" spacing={2} frame={{ maxWidth: "infinity" }}>
      {/* @ts-ignore - CommonViewProps fontSize/fontWeight/foregroundStyle on Text */}
      <Text font={26} fontWeight="bold" foregroundStyle={titleColor}>
        {title}
      </Text>
      {subtitle ? (
        /* @ts-ignore */
        <Text font={13} foregroundStyle="secondaryLabel">
          {subtitle}
        </Text>
      ) : null}
    </VStack>
  )
}

// ==================== 奖励揭晓（主应用用）====================
export function RewardReveal({
  rewardType,
  rewardValue,
  size = 64,
}: {
  rewardType: number
  rewardValue: number | string
  size?: number
}) {
  const color: Color =
    rewardType === 1
      ? BB.purple
      : rewardType === 2
        ? BB.primary
        : rewardType === 3
          ? ("#FF6B9D" as Color)
          : rewardType === 4
            ? BB.green
            : rewardType === 5
              ? ("#0A84FF" as Color)
              : BB.green

  return (
    <VStack alignment="center" spacing={10}>
      <ZStack frame={{ width: size * 1.6, height: size * 1.6 }} alignment="center">
        <Circle fill={color} frame={{ width: size * 1.6, height: size * 1.6 }} opacity={0.1} />
        <Circle fill={color} frame={{ width: size * 1.3, height: size * 1.3 }} opacity={0.18} />
        <Circle fill={color} frame={{ width: size * 1.1, height: size * 1.1 }} opacity={0.28} />
        <RewardIcon rewardType={rewardType} size={size} />
      </ZStack>
      {/* @ts-ignore - CommonViewProps fontSize/fontWeight/foregroundStyle on Text */}
      <Text font={36} fontWeight="bold" foregroundStyle={{ color, opacity: 1 }}>
        +{rewardValue}
      </Text>
      {/* @ts-ignore */}
      <Text font={15} foregroundStyle="secondaryLabel">
        {rewardTypeName(rewardType)}
      </Text>
    </VStack>
  )
}
