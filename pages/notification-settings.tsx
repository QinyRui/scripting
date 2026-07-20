/**
 * 彩云天气 — 通知设置页
 *
 * 设计理念：
 *   顶部大图标 + 开关总控
 *   通知类型分项展示，Toggle 即时保存
 *   时间间隔 Picker 即时生效
 *
 * 布局策略：
 *   使用 ScrollView 替代 List/Section，完全手动控制每一像素的布局
 *   所有通知行共享完全相同的水平结构，确保标题首字严格垂直对齐
 *   图标使用独立行提取为 NotificationRow 组件，避免嵌套偏移
 */

import {
  Text,
  VStack,
  HStack,
  Spacer,
  Button,
  Toggle,
  Picker,
  Link,
  Navigation,
  NavigationStack,
  ScrollView,
  ZStack,
  Circle,
  Image,
  useState,
  Divider,
  Section,
  List,
} from "scripting"

declare const Storage: any

const SETTING_KEY = "ColorfulCloudsSetting"

export interface Profile {
  notification: {
    Precipitation: boolean
    ExtremeWeather: boolean
    isLocalNotify: boolean
    isSurroundNotify: boolean
    isUselessNotify: boolean
    NotificationInterval: number
    TemperatureChange: boolean
    AirPollution: boolean
    StrongWind: boolean
    TyphoonAlert: boolean
    EarthquakeAlert: boolean
  }
  widget: {
    RefreshInterval: number
  }
}

export function getDefaultProfile(): Profile {
  return {
    notification: {
      Precipitation: true,
      ExtremeWeather: true,
      isLocalNotify: true,
      isSurroundNotify: false,
      isUselessNotify: false,
      NotificationInterval: 0,
      TemperatureChange: true,
      AirPollution: true,
      StrongWind: true,
      TyphoonAlert: true,
      EarthquakeAlert: true,
    },
    widget: { RefreshInterval: 0 },
  }
}

export function loadProfile(): Profile {
  const stored = (Storage.get(SETTING_KEY) as any) || {};
  const defaults = getDefaultProfile();
  return {
    ...defaults,
    ...stored,
    notification: { ...defaults.notification, ...(stored.notification || {}) },
    widget: { ...defaults.widget, ...(stored.widget || {}) },
  };
}

function saveProfile(profile: Profile) {
  Storage.set(SETTING_KEY, profile)
}

const TIME_GAP_LIST = [0, 5, 10, 15, 30]

// 通知项数据：按标题字数从少到多排列
const NOTIFICATION_ITEMS = [
  { icon: "exclamationmark.triangle.fill", iconColor: "systemRed", bg: "systemRed", title: "极端天气", desc: "暴雨、暴雪等预警", key: "ExtremeWeather" },
  { icon: "cloud.rain.fill", iconColor: "systemBlue", bg: "systemBlue", title: "降水通知", desc: "即将下雨/停雨提醒", key: "isLocalNotify" },
  { icon: "location.fill", iconColor: "systemCyan", bg: "systemCyan", title: "周边通知", desc: "周边区域降水提醒", key: "isSurroundNotify" },
  { icon: "bubble.left.fill", iconColor: "systemIndigo", bg: "systemIndigo", title: "提示通知", desc: "深夜了等温馨提醒", key: "isUselessNotify" },
  { icon: "thermometer.medium", iconColor: "systemOrange", bg: "systemOrange", title: "变温提醒", desc: "温差变化过大时提醒", key: "TemperatureChange" },
  { icon: "wind", iconColor: "systemCyan", bg: "systemCyan", title: "大风提醒", desc: "风速超过范围时提醒", key: "StrongWind" },
  { icon: "arrow.down.to.line", iconColor: "#8C7CFF", bg: "#8C7CFF", title: "地震速报", desc: "附近地震时提醒", key: "EarthquakeAlert" },
  { icon: "aqi.medium", iconColor: "#FF9500", bg: "#FF9500", title: "空气污染提醒", desc: "空气污染持续时提醒", key: "AirPollution" },
  { icon: "hurricane", iconColor: "systemRed", bg: "systemRed", title: "台风信息速递", desc: "台风来临时提醒", key: "TyphoonAlert" },
]

/**
 * 单个通知行组件
 * 每行具有完全相同的水平结构：padding(16) + 图标(44) + 间距(12) + 文本 + 开关
 * · 图标固定 44pt，保证各行标题首字在同一竖线上
 * · HStack center 对齐，保证图标 / 标题块 / 开关三者垂直居中
 */
function NotificationRow(props: {
  item: typeof NOTIFICATION_ITEMS[number]
  value: boolean
  onToggle: (val: boolean) => void
}) {
  const { item, value, onToggle } = props
  return (
    <HStack
      alignment="center"
      spacing={12}
      padding={{ vertical: 12, horizontal: 16 }}
      frame={{ maxWidth: "infinity" }}
    >
      {/* 图标：固定 44×44，保证标题列垂直对齐 */}
      <ZStack frame={{ width: 44, height: 44 }} alignment="center">
        <Circle fill={item.bg as any} opacity={0.15} />
        <Image systemName={item.icon} font={17} foregroundStyle={item.iconColor as any} />
      </ZStack>
      {/* 文本区域：标题 + 副标题垂直居中于行高 */}
      <VStack alignment="leading" spacing={2} frame={{ maxWidth: "infinity", alignment: "leading" }}>
        <Text fontWeight="bold" multilineTextAlignment="leading">{item.title}</Text>
        <Text font="caption" foregroundStyle="secondaryLabel" multilineTextAlignment="leading">{item.desc}</Text>
      </VStack>
      {/* 开关：与图标/标题块垂直居中 */}
      <Toggle
        title=""
        value={value}
        onChanged={onToggle}
      />
    </HStack>
  )
}

/**
 * 分组标题
 */
function SectionLabel(props: { text: string }) {
  return (
    <Text
      font="footnote"
      foregroundStyle="secondaryLabel"
      padding={{ top: 24, bottom: 8, leading: 32, trailing: 16 }}
      frame={{ maxWidth: "infinity" }}
    >
      {props.text}
    </Text>
  )
}

/**
 * 卡片容器 — 模拟 Section 的圆角背景
 */
function Card(props: { children: any }) {
  return (
    <VStack spacing={0} frame={{ maxWidth: "infinity" }}>
      {props.children}
    </VStack>
  )
}

export function NotificationSettingsPage() {
  const dismiss = Navigation.useDismiss()
  const [profile, setProfile] = useState<Profile>(() => loadProfile())

  const n = profile.notification
  const timeGapList = TIME_GAP_LIST

  function update<K extends keyof Profile["notification"]>(key: K, value: Profile["notification"][K]) {
    const next = {
      ...profile,
      notification: { ...profile.notification, [key]: value },
    }
    setProfile(next)
    saveProfile(next)
  }

  return (
    <NavigationStack>
      <ScrollView
        navigationTitle="通知设置"
        navigationBarTitleDisplayMode="inline"
        toolbar={{
          cancellationAction: <Button title="完成" action={dismiss} />,
        }}
      >
        <VStack spacing={0} frame={{ maxWidth: "infinity" }}>

          {/* ══════ 顶部总控 ══════ */}
          <VStack spacing={16} alignment="center" padding={{ vertical: 24 }}>
            <ZStack frame={{ width: 56, height: 56 }}>
              <Circle fill={{ colors: ["#34c759", "#30b350"], startPoint: "top", endPoint: "bottom" }} />
              <Image systemName="bell.badge.fill" font={26} foregroundStyle="white" />
            </ZStack>
            <VStack spacing={4} alignment="center">
              <Text font="title3" fontWeight="bold">天气通知</Text>
              <Text font="subheadline" foregroundStyle="secondaryLabel">实时推送降水与极端天气</Text>
            </VStack>
            {/* 总开关卡片 */}
            <HStack spacing={10} alignment="center"
              padding={{ horizontal: 16, vertical: 12 }}
              background={{ style: "secondarySystemBackground", shape: { type: "rect", cornerRadius: 12 } }}
              frame={{ maxWidth: "infinity" }}>
              <ZStack frame={{ width: 28, height: 28 }}>
                <Circle fill="systemGreen" opacity={0.15} />
                <Image systemName="bell.fill" font={13} foregroundStyle="systemGreen" />
              </ZStack>
              <Text fontWeight="bold">启用通知</Text>
              <Spacer />
              <Toggle
                title=""
                value={n.Precipitation}
                onChanged={(val) => update("Precipitation", val)}
              />
            </HStack>
          </VStack>

          {n.Precipitation && (
            <>
              {/* ══════ 通知频率 ══════ */}
              <SectionLabel text="通知频率" />
              <Card>
                <HStack spacing={12} alignment="center" padding={{ vertical: 12, horizontal: 16 }} frame={{ maxWidth: "infinity" }}>
                  {/* 与通知类型行统一 44pt 图标列，保证标题竖线对齐 */}
                  <ZStack frame={{ width: 44, height: 44 }} alignment="center">
                    <Circle fill="systemOrange" opacity={0.15} />
                    <Image systemName="timer" font={17} foregroundStyle="systemOrange" />
                  </ZStack>
                  <VStack alignment="leading" spacing={2} frame={{ maxWidth: "infinity", alignment: "leading" }}>
                    <Text fontWeight="bold">通知间隔</Text>
                    <Text font="caption" foregroundStyle="secondaryLabel">两次通知之间的最小间隔</Text>
                  </VStack>
                  <Picker
                    title=""
                    pickerStyle="menu"
                    value={n.NotificationInterval}
                    onChanged={(val: number) => update("NotificationInterval", val)}>
                    {timeGapList.map((item) => (
                      <Text key={item} tag={item}>{item === 0 ? "自动" : item + " 分钟"}</Text>
                    ))}
                  </Picker>
                </HStack>
              </Card>

              {/* ══════ 通知类型 ══════ */}
              <SectionLabel text="通知类型" />
              <Card>
                {NOTIFICATION_ITEMS.map((item, idx) => {
                  const val = (n as any)[item.key]
                  return (
                    <VStack key={item.key} spacing={0} frame={{ maxWidth: "infinity" }}>
                      {idx > 0 ? <Divider padding={{ leading: 72 }} /> : null}
                      <NotificationRow
                        item={item}
                        value={val}
                        onToggle={(val) => update(item.key as any, val)}
                      />
                    </VStack>
                  )
                })}
              </Card>

              {/* ══════ 说明 ══════ */}
              <SectionLabel text="其他" />
              <Card>
                <VStack alignment="leading" spacing={4} padding={{ vertical: 12, horizontal: 16 }} frame={{ maxWidth: "infinity" }}>
                  <HStack spacing={0}>
                    <Text font="caption" foregroundStyle="secondaryLabel">{". 极端天气定义可查看 "}</Text>
                    <Link url="https://open.caiyunapp.com/彩云天气数据格式速查表">
                      <Text font="caption" foregroundStyle="systemBlue">官方文档</Text>
                    </Link>
                  </HStack>
                </VStack>
              </Card>
            </>
          )}

          {/* 底部留白 */}
          <Spacer frame={{ height: 40 }} />
        </VStack>
      </ScrollView>
    </NavigationStack>
  )
}
