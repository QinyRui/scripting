/**
 * 米游社自动助手 - 设置页面
 *
 * 功能：
 *   - 自动签到开关
 *   - 自动执行米游币任务开关
 *   - 通知开关
 *   - 定时执行设置
 *   - 调试模式（显示 API 请求详情）
 *   - 数据导出/清除
 */

import {
  HStack, VStack, Text, Image, Button,
  Toggle, Spacer, ScrollView, Navigation,
  useState,
} from 'scripting'
import {
  getConfig, saveConfig, isLoggedIn, addLog,
  getScheduleConfig, saveScheduleConfig,
  scheduleNotification, cancelScheduleNotification,
  clearLoginData, clearStoken,
} from '../src/utils'
import { IconBadge } from './components'

// ============ 数据管理页 ============

function DataManagementView({ onDataCleared }: { onDataCleared?: () => void }) {
  const dismiss = Navigation.useDismiss()
  const [confirmClear, setConfirmClear] = useState(false)

  const handleClearAll = () => {
    if (!confirmClear) {
      setConfirmClear(true)
      return
    }
    // 清除所有数据（保留配置，开关状态跨登录持久化）
    clearLoginData()
    clearStoken()
    Storage.remove('mihoyo_schedule')
    Storage.remove('widget_role_data')
    Storage.remove('mihoyo_device_id')
    Storage.remove('mihoyo_device_fp')
    Storage.remove('mihoyo_last_result')
    Storage.remove('mihoyo_last_run_time')
    setConfirmClear(false)
    addLog('info', '已清除所有数据')
    // 通知主页面刷新
    onDataCleared?.()
    dismiss()
  }

  return (
    <ScrollView frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }}>
      <VStack spacing={0}>
        <HStack padding={16} alignment="center">
          <Button action={dismiss}>
            <HStack padding={{ horizontal: 16, vertical: 8 }} background={{ style: 'secondarySystemBackground', shape: { type: 'rect', cornerRadius: 20 } }}>
              <Text font="headline">返回</Text>
            </HStack>
          </Button>
          <Spacer />
          <Text font="headline">数据管理</Text>
          <Spacer />
          <Spacer frame={{ width: 60 }} />
        </HStack>

        <VStack padding={16} spacing={16}>
          {/* 存储空间 */}
          <VStack spacing={8}>
            <Text font="subheadline" fontWeight="bold" foregroundStyle="secondaryLabel">存储空间</Text>
            <HStack padding={12} spacing={8}
              // @ts-ignore
              background="rgba(255,255,255,0.05)"
              // @ts-ignore
              cornerRadius={10}
            >
              <IconBadge icon="internaldrive" color="systemBlue" />
              <VStack spacing={1} frame={{ maxWidth: "infinity" }}>
                <Text fontWeight="bold">Cookie 数据</Text>
                <Text font="caption" foregroundStyle="secondaryLabel">
                  {isLoggedIn() ? '已存储登录凭据' : '未存储'}
                </Text>
              </VStack>
            </HStack>
          </VStack>

          {/* 危险操作 */}
          <VStack spacing={8}>
            <Text font="subheadline" fontWeight="bold" foregroundStyle="systemRed">危险操作</Text>
            <VStack padding={12} spacing={8}
              // @ts-ignore
              background="rgba(255,59,48,0.1)"
              // @ts-ignore
              cornerRadius={10}
            >
              <Text font="caption" foregroundStyle="systemRed">
                ⚠️ 清除所有数据将删除登录状态、配置和缓存，需要重新登录。
              </Text>
              <Button
                title={confirmClear ? '确认清除（再点一次）' : '清除所有数据'}
                systemImage="trash.fill"
                action={handleClearAll}
              />
            </VStack>
          </VStack>
        </VStack>
      </VStack>
    </ScrollView>
  )
}

// ============ 主设置页面 ============

export function SettingsPage({ onDataCleared }: { onDataCleared?: () => void } = {}) {
  const dismiss = Navigation.useDismiss()
  const config = getConfig()
  const schedule = getScheduleConfig()

  // 状态
  const [notifications, setNotifications] = useState(Storage.get<string>('widget_notify') !== 'false')
  const [schedEnabled, setSchedEnabled] = useState(schedule.enabled)
  const [schedHour, setSchedHour] = useState(schedule.hour)
  const [schedMinute, setSchedMinute] = useState(schedule.minute)
  const schedTimeStr = String(schedHour).padStart(2, '0') + ':' + String(schedMinute).padStart(2, '0')

  // 确保 config.tasks 始终包含 'micoin' 和 'sign'（主页面开关直接控制子任务）
  if (!config.tasks.includes('micoin') || !config.tasks.includes('sign')) {
    const fixed = { ...config, tasks: ['micoin', 'sign'] as any[] }
    saveConfig(fixed)
  }

  // 切换通知
  const toggleNotifications = (v: boolean) => {
    setNotifications(v)
    Storage.set('widget_notify', v ? 'true' : 'false')
  }

  // 桌面组件刷新间隔
  const [refreshInterval, setRefreshInterval] = useState(Number(Storage.get<string>('widget_refresh_interval') || '15'))

  const adjRefresh = (d: number) => {
    const v = Math.max(5, Math.min(120, refreshInterval + d * 5))
    setRefreshInterval(v)
    Storage.set('widget_refresh_interval', String(v))
  }


  // 定时执行
  const handleSchedToggle = async () => {
    if (!isLoggedIn()) return
    if (!schedEnabled) {
      if (await scheduleNotification(schedHour, schedMinute)) {
        setSchedEnabled(true)
        saveScheduleConfig({ enabled: true, hour: schedHour, minute: schedMinute })
      }
    } else {
      await cancelScheduleNotification()
      setSchedEnabled(false)
      saveScheduleConfig({ enabled: false, hour: schedHour, minute: schedMinute })
    }
  }

  const adjTime = async (t: 'h' | 'm', d: number) => {
    if (t === 'h') {
      const h = (schedHour + d + 24) % 24
      setSchedHour(h)
      saveScheduleConfig({ enabled: schedEnabled, hour: h, minute: schedMinute })
      if (schedEnabled) await scheduleNotification(h, schedMinute)
    } else {
      const m = (schedMinute + d + 60) % 60
      setSchedMinute(m)
      saveScheduleConfig({ enabled: schedEnabled, hour: schedHour, minute: m })
      if (schedEnabled) await scheduleNotification(schedHour, m)
    }
  }

  return (
    <ScrollView frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }}>
      <VStack spacing={0}>
        {/* 导航栏 */}
        <HStack padding={16} alignment="center">
          <Button action={dismiss}>
            <HStack padding={{ horizontal: 16, vertical: 8 }} background={{ style: 'secondarySystemBackground', shape: { type: 'rect', cornerRadius: 20 } }}>
              <Text font="headline">关闭</Text>
            </HStack>
          </Button>
          <Spacer />
          <Text font="headline">设置</Text>
          <Spacer />
          <Spacer frame={{ width: 60 }} />
        </HStack>

        <VStack padding={{ horizontal: 16 }} spacing={20} alignment="leading">

          {/* ===== 通知 & 定时 ===== */}
          <VStack spacing={8} alignment="leading">
            <Text font="footnote" fontWeight="bold"
              // @ts-ignore
              foregroundStyle="secondaryLabel"
              frame={{ maxWidth: 'infinity' }}
              multilineTextAlignment="center"
            >通知 & 定时</Text>
            <VStack
              // @ts-ignore
              background="#1C1C1E"
              // @ts-ignore
              cornerRadius={12}
              spacing={0}
            >
              <HStack padding={14} spacing={12} alignment="center">
                <IconBadge icon="bell.fill" color="systemOrange" />
                <VStack spacing={1} frame={{ maxWidth: 'infinity' }}>
                  <Text fontWeight="bold">签到通知</Text>
                  <Text font="caption" foregroundStyle="secondaryLabel">执行完成后发送通知</Text>
                </VStack>
                <Toggle title="" value={notifications} onChanged={toggleNotifications} />
              </HStack>
              <HStack padding={14} spacing={12} alignment="center">
                <IconBadge icon="alarm.fill" color={schedEnabled ? 'systemGreen' : 'systemGray'} />
                <VStack spacing={1} frame={{ maxWidth: 'infinity' }}>
                  <Text fontWeight="bold">每日定时</Text>
                  <Text font="caption" foregroundStyle="secondaryLabel">
                    {schedEnabled ? '每天 ' + schedTimeStr + ' 自动运行' : '关闭'}
                  </Text>
                </VStack>
                <Toggle title="" value={schedEnabled} onChanged={handleSchedToggle} />
              </HStack>
              {schedEnabled ? (
                <HStack padding={{ horizontal: 14, bottom: 14 }} spacing={8} alignment="center">
                  <Spacer />
                  <Button title="−" action={() => adjTime('h', -1)} />
                  <Text font={22} fontWeight="bold">{String(schedHour).padStart(2, '0')}</Text>
                  <Button title="+" action={() => adjTime('h', 1)} />
                  <Text font={22} fontWeight="bold" foregroundStyle="tertiaryLabel">:</Text>
                  <Button title="−" action={() => adjTime('m', -1)} />
                  <Text font={22} fontWeight="bold">{String(schedMinute).padStart(2, '0')}</Text>
                  <Button title="+" action={() => adjTime('m', 1)} />
                </HStack>
              ) : null}
            </VStack>
          </VStack>

          {/* ===== 桌面组件刷新 ===== */}
          <VStack spacing={8} alignment="leading">
            <Text font="footnote" fontWeight="bold"
              // @ts-ignore
              foregroundStyle="secondaryLabel"
              frame={{ maxWidth: 'infinity' }}
              multilineTextAlignment="center"
            >桌面组件刷新</Text>
            <VStack
              // @ts-ignore
              background="#1C1C1E"
              // @ts-ignore
              cornerRadius={12}
              spacing={0}
            >
              <HStack padding={14} spacing={12} alignment="center">
                <IconBadge icon="arrow.clockwise" color="systemBlue" />
                <VStack spacing={1} frame={{ maxWidth: 'infinity' }}>
                  <Text fontWeight="bold">刷新间隔（分钟）</Text>
                  <Text font="caption" foregroundStyle="secondaryLabel">{'当前: ' + refreshInterval}</Text>
                </VStack>
              </HStack>
              <HStack padding={{ horizontal: 14, bottom: 14 }} spacing={8} alignment="center">
                <Spacer />
                <Button title="−" action={() => adjRefresh(-1)} />
                <Text font={22} fontWeight="bold">{refreshInterval}</Text>
                <Button title="+" action={() => adjRefresh(1)} />
              </HStack>
            </VStack>
          </VStack>

          {/* ===== 数据管理 ===== */}
          <VStack spacing={8} alignment="leading">
            <Text font="footnote" fontWeight="bold"
              // @ts-ignore
              foregroundStyle="secondaryLabel"
              frame={{ maxWidth: 'infinity' }}
              multilineTextAlignment="center"
            >数据管理</Text>
            <VStack
              // @ts-ignore
              background="#1C1C1E"
              // @ts-ignore
              cornerRadius={12}
              spacing={0}
            >
              <HStack padding={14} spacing={12} alignment="center"
                onTapGesture={() => Navigation.present(<DataManagementView onDataCleared={onDataCleared} />)}
              >
                <IconBadge icon="externaldrive.fill" color="systemPurple" />
                <VStack spacing={1} frame={{ maxWidth: 'infinity' }}>
                  <Text fontWeight="bold">数据管理</Text>
                  <Text font="caption" foregroundStyle="secondaryLabel">清除缓存 / 退出登录</Text>
                </VStack>
                <Image systemName="chevron.right" font={12} foregroundStyle="tertiaryLabel" />
              </HStack>
            </VStack>
          </VStack>

          {/* 底部占位 */}
          <VStack frame={{ height: 40 }} />
        </VStack>
      </VStack>
    </ScrollView>
  )
}
