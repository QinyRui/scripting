/**
 * 九号电动车 - 富通知 UI
 * 长按或下拉通知时显示的自定义图形化界面
 */

import { Notification, VStack, HStack, Text, Image, Spacer, Divider, Color } from "scripting"

// ===== 颜色常量（使用 as Color 断言）=====
const C = {
  green: "#34C759" as Color,
  orange: "#FF9500" as Color,
  red: "#FF3B30" as Color,
  blue: "#0A84FF" as Color,
  purple: "#BF5AF2" as Color,
  card: "#2C2C2E" as Color,
  divider: "#38383A" as Color,
  bg: "#1C1C1E" as Color,
  text1: "#FFFFFF" as Color,
  text2: "#8E8E93" as Color,
  text3: "#636366" as Color,
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
    // @ts-ignore - CommonViewProps padding/background
    <VStack padding={16} background={C.bg} spacing={0}>
      {/* 顶部标题区域 */}
      <HStack alignment="center" spacing={10}>
        {/* @ts-ignore - foregroundStyle on Image */}
        <Image systemName="checkmark.seal.fill" foregroundStyle={{ color: C.green, opacity: 1 }} />
        <VStack spacing={2}>
          <Text font={17} fontWeight="bold" foregroundStyle={{ color: C.text1, opacity: 1 }}>✅ 签到成功</Text>
          <Text font={13} foregroundStyle={{ color: C.text2, opacity: 1 }}>九号电动车 · 每日签到</Text>
        </VStack>
      </HStack>

      <Divider />

      {/* 签到数据统计 — 三列横排 */}
      {/* @ts-ignore - CommonViewProps background/cornerRadius */}
      <HStack alignment="center" spacing={0} background={C.card} cornerRadius={12} padding={14}>
        <VStack alignment="center" spacing={4} frame={{ maxWidth: "infinity" }}>
          <Text font={28} fontWeight="bold" foregroundStyle={{ color: C.orange, opacity: 1 }}>{consecutiveDays}</Text>
          <Text font={11} foregroundStyle={{ color: C.text2, opacity: 1 }}>连续签到(天)</Text>
        </VStack>
        {/* @ts-ignore */}
        <VStack frame={{ width: 1, height: 32 }} background={C.divider} />
        <VStack alignment="center" spacing={4} frame={{ maxWidth: "infinity" }}>
          <Text font={28} fontWeight="bold" foregroundStyle={{ color: C.purple, opacity: 1 }}>{level}</Text>
          <Text font={11} foregroundStyle={{ color: C.text2, opacity: 1 }}>当前等级</Text>
        </VStack>
        {/* @ts-ignore */}
        <VStack frame={{ width: 1, height: 32 }} background={C.divider} />
        <VStack alignment="center" spacing={4} frame={{ maxWidth: "infinity" }}>
          <Text font={28} fontWeight="bold" foregroundStyle={{ color: C.green, opacity: 1 }}>{nCoin}</Text>
          <Text font={11} foregroundStyle={{ color: C.text2, opacity: 1 }}>电动车币</Text>
        </VStack>
      </HStack>

      {/* 今日奖励行 */}
      {/* @ts-ignore - CommonViewProps */}
      <HStack alignment="center" spacing={0} background={C.card} cornerRadius={12} padding={12}>
        <Text font={13} foregroundStyle={{ color: C.text2, opacity: 1 }}>今日获得</Text>
        <Spacer />
        <Text font={13} fontWeight="semibold" foregroundStyle={{ color: C.green, opacity: 1 }}>+{experience} 经验</Text>
        <Text font={13} foregroundStyle={{ color: C.text3, opacity: 1 }}>{"  |  "}</Text>
        <Text font={13} fontWeight="semibold" foregroundStyle={{ color: C.orange, opacity: 1 }}>💰 {nCoin} 电动车币</Text>
      </HStack>

      {/* 盲盒倒计时 */}
      {notOpenedBlindBoxCount > 0 && (
        // @ts-ignore - CommonViewProps
        <HStack alignment="center" spacing={0} background="#2A1F0A" as Color cornerRadius={12} padding={12}>
          {/* @ts-ignore - foregroundStyle on Image */}
          <Image systemName="gift.fill" foregroundStyle={{ color: C.orange, opacity: 1 }} />
          <Text font={13} foregroundStyle={{ color: C.orange, opacity: 1 }}>{" " + notOpenedBlindBoxCount + " 个盲盒待领取"}</Text>
          <Spacer />
          {minLeftDaysToOpen !== null && minLeftDaysToOpen !== undefined && minLeftDaysToOpen > 0 ? (
            <Text font={13} foregroundStyle={{ color: C.text2, opacity: 1 }}>⏳ 还需 {minLeftDaysToOpen} 天</Text>
          ) : (
            <Text font={13} fontWeight="semibold" foregroundStyle={{ color: C.green, opacity: 1 }}>可立即领取</Text>
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
    // @ts-ignore - CommonViewProps padding/background
    <VStack padding={16} background={C.bg} spacing={0}>
      {/* 顶部标题区域 */}
      <HStack alignment="center" spacing={10}>
        {/* @ts-ignore - foregroundStyle on Image */}
        <Image systemName={isSuccess ? "gift.fill" : "exclamationmark.triangle.fill"}
          foregroundStyle={{ color: accentColor, opacity: 1 }} />
        <VStack spacing={2}>
          <Text font={17} fontWeight="bold"
            foregroundStyle={{ color: C.text1, opacity: 1 }}>{isSuccess ? "🎁 盲盒领取完成" : "⚠️ 盲盒领取异常"}</Text>
          <Text font={13} foregroundStyle={{ color: C.text2, opacity: 1 }}>九号电动车 · 自动领取</Text>
        </VStack>
      </HStack>

      <Divider />

      {/* 领取统计 */}
      {/* @ts-ignore - CommonViewProps */}
      <HStack alignment="center" spacing={0} background={C.card} cornerRadius={12} padding={14}>
        <VStack alignment="center" spacing={4} frame={{ maxWidth: "infinity" }}>
          <Text font={28} fontWeight="bold" foregroundStyle={{ color: C.orange, opacity: 1 }}>{total}</Text>
          <Text font={11} foregroundStyle={{ color: C.text2, opacity: 1 }}>处理总数</Text>
        </VStack>
        {/* @ts-ignore */}
        <VStack frame={{ width: 1, height: 32 }} background={C.divider} />
        <VStack alignment="center" spacing={4} frame={{ maxWidth: "infinity" }}>
          <Text font={28} fontWeight="bold" foregroundStyle={{ color: C.green, opacity: 1 }}>{receiveSuccess}</Text>
          <Text font={11} foregroundStyle={{ color: C.text2, opacity: 1 }}>领取成功</Text>
        </VStack>
        {failed > 0 && (
          <>
            {/* @ts-ignore */}
            <VStack frame={{ width: 1, height: 32 }} background={C.divider} />
            <VStack alignment="center" spacing={4} frame={{ maxWidth: "infinity" }}>
              <Text font={28} fontWeight="bold" foregroundStyle={{ color: C.red, opacity: 1 }}>{failed}</Text>
              <Text font={11} foregroundStyle={{ color: C.text2, opacity: 1 }}>领取失败</Text>
            </VStack>
          </>
        )}
      </HStack>

      {/* 奖励详情列表 */}
      {rewards.length > 0 && (
        <VStack spacing={4}>
          {rewards.map((r: any, index: number) => {
            const reward = r.reward
            const awardDays = r.awardDays || 0
            let rewardText = ""
            let rewardColor = C.green

            if (reward) {
              if (reward.rewardType === 1) {
                rewardText = "+" + reward.rewardValue + " 等级经验"
                rewardColor = C.purple
              } else if (reward.rewardType === 2) {
                rewardText = "+" + reward.rewardValue + " 电动车币"
                rewardColor = C.orange
              } else {
                rewardText = "+" + reward.rewardValue + " 奖励"
              }
            }

            return (
              // @ts-ignore - CommonViewProps cornerRadius
              <HStack key={"reward-" + index} alignment="center" spacing={0} background={C.card} cornerRadius={12} padding={12}>
                {/* @ts-ignore - foregroundStyle on Image */}
                <Image systemName="star.fill" foregroundStyle={{ color: rewardColor, opacity: 1 }} />
                <VStack spacing={2} frame={{ maxWidth: "infinity" }}>
                  <Text font={14} fontWeight="semibold"
                    foregroundStyle={{ color: C.text1, opacity: 1 }}>{awardDays}天签到盲盒</Text>
                </VStack>
                <Text font={14} fontWeight="semibold"
                  foregroundStyle={{ color: rewardColor, opacity: 1 }}>{rewardText}</Text>
              </HStack>
            )
          })}
        </VStack>
      )}

      {/* 失败原因 */}
      {errors.length > 0 && (
        // @ts-ignore - CommonViewProps
        <VStack spacing={0} background="#2A0A0A" as Color cornerRadius={12} padding={12}>
          {errors.map((err: string, index: number) => (
            <Text key={"err-" + index} font={12}
              foregroundStyle={{ color: C.red, opacity: 1 }}>⚠️ {err}</Text>
          ))}
        </VStack>
      )}

      {/* 未开盲盒倒计时 */}
      {notOpenedBoxesDetail.length > 0 && (
        <VStack spacing={6}>
          <Text font={13} foregroundStyle={{ color: C.text2, opacity: 1 }}>📦 待开启盲盒</Text>
          {notOpenedBoxesDetail.map((box: any, index: number) => (
            // @ts-ignore - CommonViewProps cornerRadius
            <HStack key={"box-" + index} alignment="center" spacing={8} background={C.card} cornerRadius={12} padding={12}>
              {/* @ts-ignore - foregroundStyle on Image */}
              <Image systemName="gift.fill"
                foregroundStyle={{ color: box.leftDaysToOpen === 0 ? C.green : C.orange, opacity: 1 }} />
              <VStack spacing={2} frame={{ maxWidth: "infinity" }}>
                <Text font={14} fontWeight="semibold"
                  foregroundStyle={{ color: C.text1, opacity: 1 }}>{box.awardDays}天签到盲盒</Text>
              </VStack>
              {box.leftDaysToOpen === 0 ? (
                <Text font={13} fontWeight="semibold"
                  foregroundStyle={{ color: C.green, opacity: 1 }}>可领取</Text>
              ) : (
                <Text font={13} foregroundStyle={{ color: C.text2, opacity: 1 }}>⏳ {box.leftDaysToOpen} 天后</Text>
              )}
            </HStack>
          ))}
        </VStack>
      )}

      {/* 所有盲盒已领取完毕 */}
      {notOpenedBoxesDetail.length === 0 && rewards.length > 0 && (
        // @ts-ignore - CommonViewProps
        <HStack alignment="center" spacing={0} background="#0A2A0A" as Color cornerRadius={12} padding={12}>
          <Text font={13} foregroundStyle={{ color: C.green, opacity: 1 }}>✨ 所有可领取盲盒已领取完毕</Text>
        </HStack>
      )}
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
  } else {
    Notification.present(<SignInNotification />)
  }
}
