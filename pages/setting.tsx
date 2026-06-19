import {
  Text,
  VStack,
  Picker,
  Section,
  DisclosureGroup,
  List,
  Button,
  Toggle,
  Navigation,
  NavigationStack,
  useState,
  HStack,
  Image,
  Spacer,
  Link,
  Divider,
  ZStack,   // ✅ 新增图形化叠加容器
  Circle    // ✅ 新增圆形背景
} from "scripting";

declare const Storage: any;

const SETTING_KEY = "ColorfulCloudsSetting";

export interface Profile {
  notification: {
    Precipitation: boolean;
    ExtremeWeather: boolean;
    isLocalNotify: boolean;
    isSurroundNotify: boolean;
    isUselessNotify: boolean;
    NotificationInterval: number;
  };
  widget: {
    RefreshInterval: number;
  };
}

export const profile: Profile = (Storage.get(SETTING_KEY) as any) || {
  notification: {
    Precipitation: true,
    ExtremeWeather: true,
    isLocalNotify: true,
    isSurroundNotify: false,
    isUselessNotify: false,
    NotificationInterval: 0,
  },
  widget: {
    RefreshInterval: 0,
  },
};

export function SettingView() {
  const dismiss = Navigation.useDismiss();

  const [isPrecipitationEnabled, setIsPrecipitationEnabled] = useState(profile.notification.Precipitation);
  const [isExtremeWeatherEnabled, setIsExtremeWeatherEnabled] = useState(profile.notification.ExtremeWeather);
  const [isUselessNotificationEnabled, setIsUselessNotificationEnabled] = useState(profile.notification.isUselessNotify);
  const [isLocalNotifyEnabled, setIsLocalNotifyEnabled] = useState(profile.notification.isLocalNotify);
  const [isSurroundNotifyEnabled, setIsSurroundNotifyEnabled] = useState(profile.notification.isSurroundNotify);
  const [notificationInterval, setNotificationInterval] = useState<number>(profile.notification.NotificationInterval);
  const [refreshInterval, setRefreshInterval] = useState<number>(profile.widget.RefreshInterval);

  const timeGapList = [0, 5, 10, 15, 30];

  const saveProfile = () => {
    Storage.set(SETTING_KEY, profile);
  };

  return (
    <NavigationStack>
      <List navigationTitle="设置">
        {/* 小组件模块 - 图形化 */}
        <Section
          header={<Text font="headline">小组件</Text>}
          footer={<Text font="caption" foregroundStyle="secondaryLabel">· 实际刷新频率由系统决定</Text>}>
          <HStack padding={16} spacing={12} alignment="center">
            <ZStack frame={{ width: 32, height: 32 }}>
              <Circle fill="systemBlue" opacity={0.15} />
              <Image systemName="clock.fill" foregroundStyle="systemBlue" font={16} />
            </ZStack>
            <Text fontWeight="bold">刷新时间间隔</Text>
            <Spacer />
            <Picker
              title=""
              pickerStyle="menu"
              value={refreshInterval}
              onChanged={(val: number) => {
                profile.widget.RefreshInterval = val;
                setRefreshInterval(val);
                saveProfile();
              }}>
              {timeGapList.map((item) => (
                <Text key={item} tag={item}>{item === 0 ? "自动" : `${item} 分钟`}</Text>
              ))}
            </Picker>
          </HStack>
        </Section>

        {/* 通知模块 - 完整图形化风格（对齐 Colorful Clouds） */}
        <Section
          header={<Text font="headline">通知</Text>}
          footer={
            isPrecipitationEnabled ? (
              <VStack alignment="leading" spacing={4} padding={{ top: 8 }}>
                <HStack spacing={0}>
                  <Text font="caption" foregroundStyle="secondaryLabel">· 极端天气：其定义可查看 </Text>
                  <Link url="https://open.caiyunapp.com/彩云天气数据格式速查表#.E5.A4.A9.E6.B0.94.E9.A2.84.E8.AD.A6.E4.BF.A1.E6.81.AF">
                    <Text font="caption" foregroundStyle="systemBlue">官方文档</Text>
                  </Link>
                </HStack>
                <Text font="caption" foregroundStyle="secondaryLabel">· 提示通知：指内容不包含数字，仅提示作用，例如“深夜了”</Text>
              </VStack>
            ) : undefined
          }>
          <HStack padding={16} spacing={12} alignment="center">
            <ZStack frame={{ width: 32, height: 32 }}>
              <Circle fill="systemGreen" opacity={0.15} />
              <Image systemName="bell.badge.fill" foregroundStyle="systemGreen" font={16} />
            </ZStack>
            <Text fontWeight="bold">通知开关</Text>
            <Spacer />
            <Toggle
              title=""
              value={isPrecipitationEnabled}
              onChanged={(val) => {
                profile.notification.Precipitation = val;
                setIsPrecipitationEnabled(val);
                saveProfile();
              }}
            />
          </HStack>

          {isPrecipitationEnabled && (
            <>
              <HStack padding={16} spacing={12} alignment="center">
                <ZStack frame={{ width: 32, height: 32 }}>
                  <Circle fill="systemOrange" opacity={0.15} />
                  <Image systemName="timer" foregroundStyle="systemOrange" font={16} />
                </ZStack>
                <Text fontWeight="bold">通知时间间隔</Text>
                <Spacer />
                <Picker
                  title=""
                  pickerStyle="menu"
                  value={notificationInterval}
                  onChanged={(val: number) => {
                    profile.notification.NotificationInterval = val;
                    setNotificationInterval(val);
                    saveProfile();
                  }}>
                  {timeGapList.map((item) => (
                    <Text key={item} tag={item}>{item === 0 ? "自动" : `${item} 分钟`}</Text>
                  ))}
                </Picker>
              </HStack>

              <DisclosureGroup
                title="通知类型"
                label={
                  <HStack spacing={12} alignment="center">
                    <ZStack frame={{ width: 32, height: 32 }}>
                      <Circle fill="systemIndigo" opacity={0.15} />
                      <Image systemName="checklist" foregroundStyle="systemIndigo" font={16} />
                    </ZStack>
                    <Text fontWeight="bold">通知类型</Text>
                  </HStack>
                }>
                <VStack spacing={0} padding={{ leading: 44 }}>
                  <Toggle
                    title="极端天气"
                    padding={{ vertical: 12 }}
                    value={isExtremeWeatherEnabled}
                    onChanged={(val) => {
                      profile.notification.ExtremeWeather = val;
                      setIsExtremeWeatherEnabled(val);
                      saveProfile();
                    }}
                  />
                  <Divider padding={{ leading: 44 }} />
                  <Toggle
                    title="降水通知"
                    padding={{ vertical: 12 }}
                    value={isLocalNotifyEnabled}
                    onChanged={(val) => {
                      profile.notification.isLocalNotify = val;
                      setIsLocalNotifyEnabled(val);
                      saveProfile();
                    }}
                  />
                  <Divider padding={{ leading: 44 }} />
                  <Toggle
                    title="周边通知"
                    padding={{ vertical: 12 }}
                    value={isSurroundNotifyEnabled}
                    onChanged={(val) => {
                      profile.notification.isSurroundNotify = val;
                      setIsSurroundNotifyEnabled(val);
                      saveProfile();
                    }}
                  />
                  <Divider padding={{ leading: 44 }} />
                  <Toggle
                    title="提示通知"
                    padding={{ vertical: 12 }}
                    value={isUselessNotificationEnabled}
                    onChanged={(val) => {
                      profile.notification.isUselessNotify = val;
                      setIsUselessNotificationEnabled(val);
                      saveProfile();
                    }}
                  />
                </VStack>
              </DisclosureGroup>
            </>
          )}
        </Section>
      </List>
    </NavigationStack>
  );
}
