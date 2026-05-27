/**
 * 🌤️ 彩云天气 — 通知设置页（图形化重设计）
 *
 * 设计理念：
 *   · 顶部大图标 + 开关总控
 *   · 通知类型分项展示，Toggle 即时保存
 *   · 时间间隔 Picker 即时生效
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
  List,
  Section,
  ZStack,
  Circle,
  Image,
  useState,
  Divider,
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
    },
    widget: { RefreshInterval: 0 },
  }
}

export function loadProfile(): Profile {
  return (Storage.get(SETTING_KEY) as Profile) || getDefaultProfile()
}

function saveProfile(profile: Profile) {
  Storage.set(SETTING_KEY, profile)
}

const TIME_GAP_LIST = [0, 5, 10, 15, 30]

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
      <List
        navigationTitle="通知设置"
        navigationBarTitleDisplayMode="inline"
        toolbar={{
          cancellationAction: <Button title="完成" action={dismiss} />,
        }}
      >
        {/* ── 顶部总控 ── */}
        <Section>
          <VStack spacing={16} alignment="center" padding={{ vertical: 20 }}>
            <ZStack frame={{ width: 56, height: 56 }}>
              <Circle fill={{ colors: ["#34c759", "#30b350"], startPoint: "top", endPoint: "bottom" }} />
              <Image systemName="bell.badge.fill" font={26} foregroundStyle="white" />
            </ZStack>
            <VStack spacing={4} alignment="center">
              <Text font="title3" fontWeight="bold">天气通知</Text>
              <Text font="subheadline" foregroundStyle="secondaryLabel">实时推送降水与极端天气</Text>
            </VStack>
            {/* 总开关 */}
            <HStack spacing={10} alignment="center"
              padding={{ horizontal: 16, vertical: 10 }}
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
        </Section>

        {n.Precipitation && (
          <>
            {/* ── 通知时间间隔 ── */}
            <Section header={<Text font="footnote" foregroundStyle="secondaryLabel">通知频率</Text>}>
              <HStack spacing={12} alignment="center" padding={{ vertical: 4 }}>
                <ZStack frame={{ width: 36, height: 36 }}>
                  <Circle fill="systemOrange" opacity={0.15} />
                  <Image systemName="timer" font={17} foregroundStyle="systemOrange" />
                </ZStack>
                <VStack alignment="leading" spacing={1} frame={{ maxWidth: "infinity" }}>
                  <Text fontWeight="bold">通知间隔</Text>
                  <Text font="caption" foregroundStyle="secondaryLabel">两次通知之间的最小间隔</Text>
                </VStack>
                <Picker
                  title=""
                  pickerStyle="menu"
                  value={n.NotificationInterval}
                  onChanged={(val: number) => update("NotificationInterval", val)}>
                  {timeGapList.map((item) => (
                    <Text key={item} tag={item}>{item === 0 ? "自动" : `${item} 分钟`}</Text>
                  ))}
                </Picker>
              </HStack>
            </Section>

            {/* ── 通知类型 ── */}
            <Section header={<Text font="footnote" foregroundStyle="secondaryLabel">通知类型</Text>}>
              <VStack spacing={0}>
                {/* 极端天气 */}
                <HStack spacing={12} alignment="center" padding={{ vertical: 10 }}>
                  <ZStack frame={{ width: 36, height: 36 }}>
                    <Circle fill="systemRed" opacity={0.15} />
                    <Image systemName="exclamationmark.triangle.fill" font={17} foregroundStyle="systemRed" />
                  </ZStack>
                  <VStack alignment="leading" spacing={1} frame={{ maxWidth: "infinity" }}>
                    <Text fontWeight="bold">极端天气</Text>
                    <Text font="caption" foregroundStyle="secondaryLabel">暴雨、暴雪等预警</Text>
                  </VStack>
                  <Toggle
                    title=""
                    value={n.ExtremeWeather}
                    onChanged={(val) => update("ExtremeWeather", val)}
                  />
                </HStack>

                <Divider padding={{ leading: 48 }} />

                {/* 降水通知 */}
                <HStack spacing={12} alignment="center" padding={{ vertical: 10 }}>
                  <ZStack frame={{ width: 36, height: 36 }}>
                    <Circle fill="systemBlue" opacity={0.15} />
                    <Image systemName="cloud.rain.fill" font={17} foregroundStyle="systemBlue" />
                  </ZStack>
                  <VStack alignment="leading" spacing={1} frame={{ maxWidth: "infinity" }}>
                    <Text fontWeight="bold">降水通知</Text>
                    <Text font="caption" foregroundStyle="secondaryLabel">即将下雨/停雨提醒</Text>
                  </VStack>
                  <Toggle
                    title=""
                    value={n.isLocalNotify}
                    onChanged={(val) => update("isLocalNotify", val)}
                  />
                </HStack>

                <Divider padding={{ leading: 48 }} />

                {/* 周边通知 */}
                <HStack spacing={12} alignment="center" padding={{ vertical: 10 }}>
                  <ZStack frame={{ width: 36, height: 36 }}>
                    <Circle fill="systemCyan" opacity={0.15} />
                    <Image systemName="location.fill" font={17} foregroundStyle="systemCyan" />
                  </ZStack>
                  <VStack alignment="leading" spacing={1} frame={{ maxWidth: "infinity" }}>
                    <Text fontWeight="bold">周边通知</Text>
                    <Text font="caption" foregroundStyle="secondaryLabel">周边区域降水提醒</Text>
                  </VStack>
                  <Toggle
                    title=""
                    value={n.isSurroundNotify}
                    onChanged={(val) => update("isSurroundNotify", val)}
                  />
                </HStack>

                <Divider padding={{ leading: 48 }} />

                {/* 提示通知 */}
                <HStack spacing={12} alignment="center" padding={{ vertical: 10 }}>
                  <ZStack frame={{ width: 36, height: 36 }}>
                    <Circle fill="systemIndigo" opacity={0.15} />
                    <Image systemName="bubble.left.fill" font={17} foregroundStyle="systemIndigo" />
                  </ZStack>
                  <VStack alignment="leading" spacing={1} frame={{ maxWidth: "infinity" }}>
                    <Text fontWeight="bold">提示通知</Text>
                    <Text font="caption" foregroundStyle="secondaryLabel">例如"深夜了"等温馨提醒</Text>
                  </VStack>
                  <Toggle
                    title=""
                    value={n.isUselessNotify}
                    onChanged={(val) => update("isUselessNotify", val)}
                  />
                </HStack>
              </VStack>
            </Section>

            {/* ── 说明 ── */}
            <Section>
              <VStack alignment="leading" spacing={4} padding={{ vertical: 4 }}>
                <HStack spacing={0}>
                  <Text font="caption" foregroundStyle="secondaryLabel">· 极端天气定义可查看 </Text>
                  <Link url="https://open.caiyunapp.com/彩云天气数据格式速查表">
                    <Text font="caption" foregroundStyle="systemBlue">官方文档</Text>
                  </Link>
                </HStack>
              </VStack>
            </Section>
          </>
        )}
      </List>
    </NavigationStack>
  )
}
