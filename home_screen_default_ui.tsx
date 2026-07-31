/**
 * 九号APP签到 — 首页 UI
 * 仿图片设计：大圆环 Hero + 统计卡片 + 签到状态 + 盲盒进度 + 车辆信息
 */

import {
  Navigation,
  NavigationStack,
  ScrollView,
  Text,
  Button,
  HStack,
  VStack,
  ZStack,
  Circle,
  Image,
  Color,
  Spacer,
  useState,
  useEffect,
} from "scripting"

import { getNinebotInfo, refreshVehicleData, getMyAchievement, type NinebotWidgetData, type VehicleInfo, type AchievementInfo } from "./api"

declare const Storage: any

const LOGO_PATH = "/var/mobile/Library/Mobile Documents/iCloud~com~thomfang~Scripting/Documents/scripts/九号APP签到/photos/ninebot-logo-new.jpg"

// ========================
// 主视图组件
// ========================
function HomeScreenView() {
  const dismiss = Navigation.useDismiss()
  const [info, setInfo] = useState<NinebotWidgetData | null>(null)
  const [vehicle, setVehicle] = useState<VehicleInfo | null>(null)
  const [achievement, setAchievement] = useState<AchievementInfo | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const auth = Storage.get("ninebot.authorization") || ""
      const devId = Storage.get("ninebot.deviceId") || ""
      const data = await getNinebotInfo(auth, devId)
      setInfo(data)

      try {
        const achData = await getMyAchievement(auth, devId)
        setAchievement(achData)
      } catch { /* 可选 */ }

      const deviceServiceKey = Storage.get("ninebot.deviceKey") || ""
      if (deviceServiceKey) {
        try {
          const vData = await refreshVehicleData(deviceServiceKey)
          setVehicle(vData)
        } catch { /* 可选 */ }
      }
    } catch (e) {
      console.log("加载数据失败:", e)
    }
  }

  // 计算连续天数进度（假设最大365天）
  const consecutiveDays = info?.consecutiveDays || 0
  const maxDays = 365
  const ringProgress = Math.min(consecutiveDays / maxDays, 1)

  return (
    <NavigationStack>
      <ScrollView
        navigationTitle="九号签到"
        navigationBarTitleDisplayMode="inline"
        toolbar={{
          cancellationAction: <Button title="关闭" action={dismiss} />
        }}
      >
        <VStack spacing={16} padding={{ horizontal: 16, top: 16, bottom: 32 }}>

          {/* Hero 大圆环 */}
          <VStack alignment="center" spacing={12} padding={{ top: 24, bottom: 24 }}>
            <ZStack alignment="center" frame={{ width: 180, height: 180 }}>
              {/* 背景圆环 */}
              <Circle stroke={{ shapeStyle: "separator" as Color, strokeStyle: { lineWidth: 12 } }} frame={{ width: 180, height: 180 }} />
              {/* 进度圆环 */}
              <Circle stroke={{ shapeStyle: "systemOrange" as Color, strokeStyle: { lineWidth: 12, lineCap: "round" } }} frame={{ width: 180, height: 180 }} trim={{ from: 0, to: ringProgress }} rotationEffect={{ degrees: -90, anchor: "center" }} />
              {/* 中心内容 */}
              <VStack alignment="center" spacing={2}>
                <Text font={48} fontWeight="bold">{consecutiveDays}</Text>
                <Text font={14} foregroundStyle={{ color: "secondaryLabel", opacity: 1 }}>连续天数</Text>
              </VStack>
            </ZStack>
            {/* 等级和N币 */}
            <HStack spacing={24}>
              <VStack alignment="center" spacing={2}>
                <Text font={12} foregroundStyle={{ color: "tertiaryLabel", opacity: 1 }}>等级</Text>
                <Text font={18} fontWeight="bold" foregroundStyle={{ color: "systemPurple", opacity: 1 }}>LV.{info?.level || "--"}</Text>
              </VStack>
              <VStack alignment="center" spacing={2}>
                <Text font={12} foregroundStyle={{ color: "tertiaryLabel", opacity: 1 }}>N币</Text>
                <Text font={18} fontWeight="bold" foregroundStyle={{ color: "systemOrange", opacity: 1 }}>{info?.nCoin || 0}</Text>
              </VStack>
              <VStack alignment="center" spacing={2}>
                <Text font={12} foregroundStyle={{ color: "tertiaryLabel", opacity: 1 }}>经验</Text>
                <Text font={18} fontWeight="bold" foregroundStyle={{ color: "systemCyan", opacity: 1 }}>{info?.experience || 0}</Text>
              </VStack>
            </HStack>
          </VStack>

          {/* 骑行统计卡片 */}
          <HStack spacing={12}>
            <VStack alignment="center" spacing={8} frame={{ maxWidth: "infinity" }} padding={{ vertical: 16 }}>
              <Image systemName="location.fill" font={20} foregroundStyle={{ color: "systemGreen", opacity: 1 }} />
              <Text font={20} fontWeight="bold">{achievement ? achievement.mileage : "--"}</Text>
              <Text font={12} foregroundStyle={{ color: "secondaryLabel", opacity: 1 }}>今日(km)</Text>
            </VStack>
            <VStack alignment="center" spacing={8} frame={{ maxWidth: "infinity" }} padding={{ vertical: 16 }}>
              <Image systemName="bicycle" font={20} foregroundStyle={{ color: "systemYellow", opacity: 1 }} />
              <Text font={20} fontWeight="bold">{achievement ? achievement.continuous_days : "--"}</Text>
              <Text font={12} foregroundStyle={{ color: "secondaryLabel", opacity: 1 }}>连续(天)</Text>
            </VStack>
            <VStack alignment="center" spacing={8} frame={{ maxWidth: "infinity" }} padding={{ vertical: 16 }}>
              <Image systemName="road.lanes" font={20} foregroundStyle={{ color: "systemCyan", opacity: 1 }} />
              <Text font={20} fontWeight="bold">{achievement ? achievement.odometer : "--"}</Text>
              <Text font={12} foregroundStyle={{ color: "secondaryLabel", opacity: 1 }}>总里程(km)</Text>
            </VStack>
          </HStack>

          {/* 签到状态卡片 */}
          <HStack alignment="center" spacing={12} padding={{ horizontal: 16, vertical: 14 }}>
            <Circle fill={info?.isSigned ? "systemGreen" : "systemRed"} frame={{ width: 12, height: 12 }} />
            <VStack alignment="leading" spacing={2}>
              <Text font={15} fontWeight="semibold">{info?.isSigned ? "今日已签到" : "今日未签到"}</Text>
              <Text font={12} foregroundStyle={{ color: "secondaryLabel", opacity: 1 }}>连签 {info?.consecutiveDays || 0} 天 · {info?.signCardsNum || 0} 张补签卡</Text>
            </VStack>
            <Spacer />
            {info?.isSigned ? (
              <Image systemName="checkmark.seal.fill" font={24} foregroundStyle={{ color: "systemGreen", opacity: 1 }} />
            ) : null}
          </HStack>

          {/* 盲盒进度卡片 */}
          <VStack alignment="leading" spacing={12} padding={{ horizontal: 16, vertical: 14 }}>
            <Text font={13} fontWeight="semibold" foregroundStyle={{ color: "secondaryLabel", opacity: 1 }}>盲盒进度</Text>
            {info?.notOpenedBoxesDetail && info.notOpenedBoxesDetail.length > 0 ? (
              info.notOpenedBoxesDetail.slice(0, 2).map((box: any, i: number) => {
                const isReady = box.leftDaysToOpen <= 0
                const total = box.awardDays || 7
                const left = box.leftDaysToOpen
                const progress = isReady ? 1 : Math.max(0, Math.min(1, (total - left) / total))
                return (
                  <HStack key={i} alignment="center" spacing={12}>
                    <ZStack frame={{ width: 44, height: 44 }} alignment="center">
                      <Circle stroke={{ shapeStyle: "separator" as Color, strokeStyle: { lineWidth: 3 } }} frame={{ width: 44, height: 44 }} />
                      <Circle stroke={{ shapeStyle: (isReady ? "systemGreen" : "systemOrange") as Color, strokeStyle: { lineWidth: 3, lineCap: "round" } }} frame={{ width: 44, height: 44 }} trim={{ from: 0, to: progress }} rotationEffect={{ degrees: -90, anchor: "center" }} />
                      <Text font={14} fontWeight="bold">{isReady ? "✓" : left}</Text>
                    </ZStack>
                    <VStack alignment="leading" spacing={2}>
                      <Text font={14} fontWeight="semibold">{total === 7 ? "连续签到7天" : "连续签到" + total + "天"}</Text>
                      <Text font={12} foregroundStyle={{ color: "tertiaryLabel", opacity: 1 }}>{isReady ? "可开启!" : "还剩 " + left + " 天"}</Text>
                    </VStack>
                    <Spacer />
                  </HStack>
                )
              })
            ) : (
              <Text font={13} foregroundStyle={{ color: "tertiaryLabel", opacity: 1 }}>暂无待开启盲盒</Text>
            )}
          </VStack>

          {/* 车辆信息卡片 */}
          {vehicle ? (
            <VStack alignment="leading" spacing={12} padding={{ horizontal: 16, vertical: 14 }}>
              <Text font={13} fontWeight="semibold" foregroundStyle={{ color: "secondaryLabel", opacity: 1 }}>🛵 {vehicle.name || "我的车辆"}</Text>
              <HStack alignment="center" spacing={16}>
                <ZStack frame={{ width: 64, height: 64 }} alignment="center">
                  <Circle stroke={{ shapeStyle: "separator" as Color, strokeStyle: { lineWidth: 4 } }} frame={{ width: 64, height: 64 }} />
                  <Circle stroke={{ shapeStyle: (vehicle.dumpEnergy <= 15 ? "systemRed" : vehicle.dumpEnergy <= 30 ? "systemOrange" : "systemGreen") as Color, strokeStyle: { lineWidth: 4, lineCap: "round" } }} frame={{ width: 64, height: 64 }} trim={{ from: 0, to: vehicle.dumpEnergy / 100 }} rotationEffect={{ degrees: -90, anchor: "center" }} />
                  <VStack alignment="center" spacing={0}>
                    <Text font={18} fontWeight="bold" foregroundStyle={{ color: vehicle.dumpEnergy <= 15 ? "systemRed" : vehicle.dumpEnergy <= 30 ? "systemOrange" : "systemGreen", opacity: 1 }}>{vehicle.dumpEnergy}</Text>
                    <Text font={9} foregroundStyle={{ color: "tertiaryLabel", opacity: 1 }}>%</Text>
                  </VStack>
                </ZStack>
                <VStack alignment="leading" spacing={6}>
                  <HStack spacing={6}>
                    <Image systemName="bolt.fill" font={14} foregroundStyle={{ color: vehicle.chargingState === 1 ? "systemGreen" : "tertiaryLabel", opacity: 1 }} />
                    <Text font={13}>{vehicle.chargingState === 1 ? "充电中" : "未充电"}</Text>
                  </HStack>
                  <HStack spacing={6}>
                    <Image systemName="location.fill" font={14} foregroundStyle={{ color: "systemCyan", opacity: 1 }} />
                    <Text font={13}>{vehicle.estimateMileage}km 续航</Text>
                  </HStack>
                  {vehicle.locationDesc ? (
                    <HStack spacing={6}>
                      <Image systemName="mappin.circle.fill" font={14} foregroundStyle={{ color: "tertiaryLabel", opacity: 1 }} />
                      <Text font={12} foregroundStyle={{ color: "tertiaryLabel", opacity: 1 }}>{vehicle.locationDesc}</Text>
                    </HStack>
                  ) : null}
                </VStack>
                <Spacer />
              </HStack>
            </VStack>
          ) : null}

          {/* 刷新按钮 */}
          <Button title="刷新数据" action={loadData} />

        </VStack>
      </ScrollView>
    </NavigationStack>
  )
}

export default HomeScreenView
