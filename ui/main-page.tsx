/**
 * 米游社自动助手 v3.0 — 增强版主页面
 *
 * 新增：
 *   - 统计概览卡片（签到状态 / 米游币余额 / 连续天数）
 *   - 今日奖励展示
 *   - 全游戏签到（原神/星铁/绝区零/崩坏3/未定事件簿）
 *   - 耗时统计
 *
 * 拆分：
 *   - 共享组件 → components.tsx
 *   - 结果弹窗 → result-popup.tsx
 *   - 关于页面 → about-view.tsx
 */

import {
  HStack, VStack, Text, Image, Button,
  Toggle, Spacer, Divider, Navigation,
  Rectangle, fetch,
  useState, useRef, useEffect,
  ZStack, Circle, ScrollView, ScrollViewReader,
  RoundedRectangle, Notification, Widget, Script,
} from 'scripting'
import {
  getConfig, saveConfig, isLoggedIn, addLog, getLogs, clearLogs, subscribeLogs,
  sendNotification, getBBSHeaders, getDS, getSignHeaders,
} from '../src/utils'
import { executeMiCoinTasks } from '../src/micoin'
import { executeSignTasks } from '../src/sign'
import { MICOIN_TASKS, GAMES } from '../src/config'
import type { MiCoinTaskId, GameId } from '../src/types'
import { LoginPage } from '../src/login-page'
import { IconBadge, GlowIcon, Row, CardSection, MIHOYO_ICON_URL } from './components'
import { ResultPopup } from './result-popup'
import { AboutView } from './about-view'
import { SettingsPage } from './settings-page'
import { PointHistoryPage } from './point-history-page'
import { AccountPage } from './account-page'

// ============ 全局 API 声明 ============

declare const Dialog: any

// ============ 工具函数 ============

function openLoginPage(onSuccess: () => void) {
  Navigation.present(<LoginPage onDismiss={onSuccess} />)
}

// ============ 全局执行状态 ============

let _execDone = false
let _execResult = ''

function calcTotalReward(actions: number[]): number {
  return actions.reduce((sum, id) => {
    const task = MICOIN_TASKS.find(t => t.id === id)
    return sum + (task ? task.reward : 0)
  }, 0)
}

function buildNotifTitle(result: string): string {
  if (result.includes('失败')) return '⚠️ 签到部分失败'
  if (result.includes('没有需要执行') || result.includes('没有启用')) return 'ℹ️ 无需执行'
  // 提取游戏名
  const gameMatch = result.match(/✅ (.+?) 签到成功/)
  const gameName = gameMatch ? gameMatch[1] : ''
  return gameName ? `✅ ${gameName}签到完成` : '✅ 签到执行完成'
}

/** 从签到结果中提取奖励信息 */
function extractRewards(result: string): string[] {
  const rewards: string[] = []
  // 匹配 "领取了 XXX xN" 模式
  const matches = result.matchAll(/领取了\s+(.+?)\s+x(\d+)/g)
  for (const m of matches) {
    rewards.push(`${m[1]} x${m[2]}`)
  }
  // 匹配 "今日奖励: XXX xN" 模式
  const matches2 = result.matchAll(/今日奖励[:：]\s*(.+?)\s+x(\d+)/g)
  for (const m of matches2) {
    const item = `${m[1]} x${m[2]}`
    if (!rewards.includes(item)) rewards.push(item)
  }
  return rewards
}

async function sendResultNotification(result: string) {
  const title = buildNotifTitle(result)
  const rewards = extractRewards(result)

  // 获取角色信息
  let charInfo = ''
  try {
    const rd = JSON.parse(Storage.get<string>('widget_role_data') || '{}')
    if (rd.nickname) {
      charInfo = rd.nickname + (rd.serverName ? (' · ' + rd.serverName) : '')
    }
  } catch {}

  // 构建通知正文
  let body = ''
  // 奖励
  if (rewards.length > 0) {
    body = '🎁 获得: ' + rewards.join('、') + '\n'
  }
  // 结果统计
  const lines = result.split('\n').filter(l => l.trim())
  const successCount = lines.filter(l => l.includes('✅')).length
  const failCount = lines.filter(l => l.includes('❌')).length
  if (successCount > 0) body += '成功: ' + successCount + '个'
  if (failCount > 0) body += '  失败: ' + failCount + '个'
  // 耗时
  const timeMatch = result.match(/耗时\s+([\d.]+)s/)
  if (timeMatch) body += '  ⏱' + timeMatch[1] + 's'

  if (!body.trim()) body = result.substring(0, 200)

  await sendNotification(title, body.trim(), charInfo || '米游社自动助手', 'mihoyo-schedule')
}

// ============ Widget 数据刷新 ============

async function refreshWidgetRoleData() {
  console.log('[Widget] refreshWidgetRoleData 开始执行')
  try {
    const cookieStr = Storage.get<string>('mihoyo_cookie') || ''
    const mihoyoUid = cookieStr.match(/account_id=(\d+)/)?.[1] || ''

    const roleUrl = 'https://api-takumi.mihoyo.com/binding/api/getUserGameRolesByCookie?game_biz=hk4e_cn'
    const roleHeaders = getBBSHeaders(roleUrl)

    const recordUrl = `https://api-takumi-record.mihoyo.com/game_record/app/card/wapi/getGameRecordCard?uid=${mihoyoUid}`
    const recordHeaders = getBBSHeaders(recordUrl)

    const [rolesRes, missionRes, recordRes] = await Promise.all([
      fetch(roleUrl, { method: 'GET', headers: roleHeaders })
        .then(r => r.json()).catch(() => null),
      (async () => {
        const url = 'https://bbs-api.miyoushe.com/apihub/wapi/getUserMissionsState'
        const headers = getBBSHeaders(url)
        return fetch(url, { method: 'GET', headers })
          .then(r => r.json()).catch(() => null)
      })(),
      fetch(recordUrl, { method: 'GET', headers: recordHeaders })
        .then(r => r.json()).catch(() => null),
    ])

    const role = rolesRes?.data?.list?.find((r: any) => r.is_chosen) || rolesRes?.data?.list?.[0]
    const gameUid = role?.game_uid || ''
    const gameRegion = role?.region || 'cn_gf01'

    const signUrl = `https://api-takumi.mihoyo.com/event/luna/hk4e/resign_info?uid=${gameUid}&region=${gameRegion}&act_id=e202311201442471`
    const signHeaders = getBBSHeaders(signUrl)
    signHeaders['x-rpc-signgame'] = 'hk4e'
    const signRes = await fetch(signUrl, { method: 'GET', headers: signHeaders })
      .then(r => r.json()).catch(() => null)

    const gameRecord = recordRes?.data?.list?.[0]
    const gameStats: { name: string; value: string }[] = gameRecord?.data || []

    const missionData = missionRes?.data
    console.log('[Widget] missionRes.raw:', JSON.stringify(missionRes?.data, null, 2))
    const states = missionData?.states || []
    const totalPoints = missionData?.total_points || 0
    const alreadyReceived = missionData?.already_received_points || 0
    const todayTotalPoints = missionData?.today_total_points || 50

    // 任务 ID → 名称映射
    const MISSION_NAMES: Record<number, string> = {
      58: '打卡', 59: '浏览3个帖子', 60: '完成5次点赞',
      61: '分享帖子', 62: '绑定游戏角色', 64: '修改个性签名',
    }
    const MISSION_ICONS: Record<number, string> = {
      58: '📅', 59: '📖', 60: '👍', 61: '↗', 62: '🔗', 64: '✏️',
    }
    const MISSION_REWARDS: Record<number, number> = {
      58: 30, 59: 20, 60: 30, 61: 10, 62: 80, 64: 80,
    }
    const MISSION_TOTALS: Record<number, number> = {
      58: 1, 59: 3, 60: 5, 61: 1, 62: 1, 64: 1,
    }

    // 从 missions + states 构造任务列表
    // missions 提供任务定义和打卡连续天数；states 提供一次性任务完成状态
    const allMissions = [...(missionData?.missions || []), ...(missionData?.more_missions || [])]
    const statesMap: Record<number, any> = {}
    for (const s of (missionData?.states || [])) {
      statesMap[s.mission_id] = s
    }
    const signDays = signRes?.data?.sign_days || 0
    const tasks = allMissions.map((m: any) => {
      const id = m.id
      const times = m.continuous_cycle_times || 0
      const limit = m.limit || 1
      const state = statesMap[id]
      // 打卡任务：用 is_auto_send_award 判断今日是否已领奖
      // 一次性任务：用 states 的 is_get_award 判断是否已完成
      const done = id === 58
        ? (m.is_auto_send_award || false)
        : (state?.is_get_award || false)
      if (id === 58) {
        return {
          id,
          name: MISSION_NAMES[id] || '打卡',
          current: times > 0 ? 1 : 0,
          total: 1,
          reward: m.points || MISSION_REWARDS[id] || 0,
          done,
          icon: MISSION_ICONS[id] || '📅',
          isCheckIn: true,
        }
      }
      return {
        id,
        name: MISSION_NAMES[id] || m.name || `任务${id}`,
        current: times,
        total: limit,
        reward: m.points || MISSION_REWARDS[id] || 0,
        done,
        icon: MISSION_ICONS[id] || '📋',
      }
    })
    // 确保打卡任务(id=58)始终存在于任务列表
    if (!tasks.find((t: any) => t.id === 58)) {
      tasks.push({
        id: 58,
        name: '打卡',
        current: 0,
        total: 1,
        reward: 30,
        done: false,
        icon: '📅',
        isCheckIn: true,
      })
    }

    // 连续打卡天数：直接从 missions 的 continuous_cycle_times 获取
    let continuousDays = 0
    const checkInMission = allMissions.find((m: any) => m.id === 58)
    if (checkInMission) {
      continuousDays = checkInMission.continuous_cycle_times || 0
      const checkInTask = tasks.find((t: any) => t.id === 58)
      if (checkInTask) {
        checkInTask.current = continuousDays
        // is_auto_send_award=true 表示今天已打卡领奖
        if (checkInMission.is_auto_send_award) {
          checkInTask.done = true
        }
      }
      console.log('[Main] 连续打卡天数(missions):', continuousDays, '已领奖:', checkInMission.is_auto_send_award)
    }
    // 兜底：从 Storage 读取
    if (continuousDays <= 0) {
      continuousDays = Number(Storage.get<string>('mihoyo_checkin_streak') || '0')
    }

    // 每日上限直接从 API 获取
    const maxDailyPoints = todayTotalPoints
    const earnedPoints = alreadyReceived

    // 调试日志
    console.log('[WidgetData] states:', JSON.stringify(states))
    console.log('[WidgetData] tasks count:', tasks.length, 'earnedPoints:', earnedPoints, 'maxDailyPoints:', maxDailyPoints)

    // 签到奖励：从 award 历史 API 获取今天的实际领取记录
    let rewardName = ''
    let rewardCount = 0
    let rewardIcon = ''
    try {
      const awardUrl = `https://api-takumi.mihoyo.com/event/luna/hk4e/award?current_page=1&lang=zh-cn&page_size=7&region=${gameRegion || 'cn_gf01'}&uid=${gameUid || ''}&act_id=e202311201442471`
      const awardRes = await fetch(awardUrl, { method: 'GET', headers: getSignHeaders('hk4e') })
        .then(r => r.json()).catch(() => null)
      const awardList = awardRes?.data?.list || []
      // 取今天的第一条记录（API返回本地时间，用本地日期匹配）
      const now = new Date()
      const todayStr = String(now.getFullYear()) + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0')
      const todayAward = awardList.find((a: any) => (a.created_at || '').startsWith(todayStr))
      if (todayAward) {
        rewardName = todayAward.name || ''
        rewardCount = todayAward.cnt || 0
        rewardIcon = todayAward.img || ''
      }
      console.log('[Widget] 今日奖励(award API):', rewardName, 'x' + rewardCount)
    } catch (e: any) { console.log('[Widget] 奖励获取失败:', e.message) }

    const data = {
      nickname: role?.nickname || '未知角色',
      uid: mihoyoUid,
      avatar: role?.avatar || '',
      serverName: role?.region_name || '未知服务器',
      level: role?.level || 0,
      coinBalance: totalPoints,
      coinToday: earnedPoints,
      maxDailyPoints,
      signDays: signRes?.data?.sign_days || 0,
      signedToday: signRes?.data?.signed || false,
      tasks,
      enabledActions: getConfig().micoin.actions || [],
      micoinEnabled: getConfig().tasks.includes('micoin'),
      gameStats,
      rewardName,
      rewardCount,
      rewardIcon,
      fetchTime: Date.now(),
    }

    console.log('[WidgetData] final tasks:', JSON.stringify(tasks))
    console.log('[WidgetData] data.coinToday:', data.coinToday, 'maxDailyPoints:', data.maxDailyPoints)

    Storage.set('widget_role_data', JSON.stringify(data))
    try { Widget.reloadAll() } catch (_: any) {}
  } catch (e: any) {
    console.log('[Widget] 刷新角色数据失败:', e.message)
  }
}

// ============================================================
// 主页面
// ============================================================

export function MainPage() {
  const [config, setConfig] = useState(getConfig())
  const [loggedIn, setLoggedIn] = useState(isLoggedIn())
  const [isRunning, setIsRunning] = useState(false)
  const [runPhase, setRunPhase] = useState(0)
  const [lastResult, setLastResult] = useState('')
  const logProxyRef = useRef<any>()
  const [liveLogs, setLiveLogs] = useState<{ time: string; level: string; message: string }[]>([])
  const [showExecPopup, setShowExecPopup] = useState(false)
  const unsubscribeRef = useRef<(() => void) | null>(null)

  const allReady = loggedIn
  const totalReward = calcTotalReward(config.micoin.actions)

  // 读取角色数据
  const readCachedRole = () => {
    try {
      const s = Storage.get<string>('widget_role_data')
      return s ? JSON.parse(s) : null
    } catch { return null }
  }
  const [roleData, setRoleData] = useState(readCachedRole())
  const roleRefreshed = useState(false)
  if (!roleRefreshed[0] && loggedIn) {
    roleRefreshed[1](true)
    refreshWidgetRoleData().then(() => setRoleData(readCachedRole()))
  }

  // === 一键执行 ===
  const handleRunTasks = async (showPanel = true) => {
    if (isRunning) return
    setIsRunning(true)
    setShowExecPopup(true)
    setRunPhase(1)
    setLastResult('')
    _execDone = false
    _execResult = ''
    clearLogs()
    addLog('info', '===== 开始执行任务 =====')
    const startTime = Date.now()
    setLiveLogs(getLogs())

    if (!unsubscribeRef.current) {
      unsubscribeRef.current = subscribeLogs(() => {
        setLiveLogs(getLogs())
      })
    }

    try {
      const results: string[] = []
      const micoinActions = config.micoin?.actions || []
      console.log('[RunTasks] micoinActions:', JSON.stringify(micoinActions), 'signGames:', JSON.stringify(config.signGames))
      // 有启用的米游币子任务就执行（不再依赖 config.tasks 总开关）
      if (micoinActions.length > 0) {
        console.log('[RunTasks] 开始执行米游币任务...')
        const r = await executeMiCoinTasks()
        console.log('[RunTasks] 米游币结果:', r.message)
        results.push(r.message)
      }
      if (config.signGames.length > 0) {
        console.log('[RunTasks] 开始执行游戏签到...')
        const r = await executeSignTasks()
        console.log('[RunTasks] 签到结果:', r.message)
        results.push(r.message)
      }
      const duration = ((Date.now() - startTime) / 1000).toFixed(1)
      const result = results.join('\n\n') + `\n\n⏱️ 耗时 ${duration}s`
      _execResult = result
      _execDone = true
      setLastResult(result)
      setRunPhase(2)
      addLog('success', `任务执行完成 (耗时 ${duration}s)`)
      Storage.set('mihoyo_last_result', result)
      Storage.set('mihoyo_last_run_time', new Date().toLocaleString('zh-CN'))
      await refreshWidgetRoleData()
      setRoleData(readCachedRole())
      await sendResultNotification(result)
    } catch (e: any) {
      const errMsg = '执行失败: ' + e.message
      _execResult = errMsg
      _execDone = true
      setLastResult(errMsg)
      setRunPhase(2)
      addLog('error', errMsg)
      await sendResultNotification(errMsg)
    } finally {
      setLiveLogs(getLogs())
      setIsRunning(false)
      setTimeout(() => setRunPhase(0), 2000)
    }
  }

  // 自动滚动日志
  useEffect(() => {
    const scrollLatest = () => {
      try { logProxyRef.current?.scrollTo?.('logBottom', 'bottom') } catch {}
    }
    scrollLatest()
    const intervalId = isRunning
      ? (globalThis as any).setInterval?.(scrollLatest, 200)
      : undefined
    const finalTimer = setTimeout(scrollLatest, 150)
    return () => {
      if (intervalId !== undefined) (globalThis as any).clearInterval?.(intervalId)
      clearTimeout(finalTimer)
    }
  }, [isRunning, liveLogs])

  // === 通知触发自动执行 ===
  const notifInfo = Notification.current
  const isAutoExec = notifInfo?.request?.content?.userInfo?.autoExecute === true
  const [autoRunDone, setAutoRunDone] = useState(false)
  if (isAutoExec && !autoRunDone && !isRunning && allReady) {
    setAutoRunDone(true)
    addLog('info', '定时通知触发，自动执行签到任务')
    setTimeout(async () => {
      try { await Notification.removeAllDelivereds() } catch (_) {}
      handleRunTasks(false)
    }, 1500)
  }

  // === Toggle：立即生效 + 持久化 ===
  const toggleMicoinAction = (actionId: MiCoinTaskId) => {
    const next = config.micoin.actions.includes(actionId)
      ? config.micoin.actions.filter(id => id !== actionId)
      : [...config.micoin.actions, actionId]
    const nextConfig = { ...config, micoin: { ...config.micoin, actions: next } }
    setConfig(nextConfig)
    saveConfig(nextConfig)
  }

  const toggleGame = (gameId: GameId) => {
    const next = config.signGames.includes(gameId)
      ? config.signGames.filter(id => id !== gameId)
      : [...config.signGames, gameId]
    const nextConfig = { ...config, signGames: next }
    setConfig(nextConfig)
    saveConfig(nextConfig)
  }

  const SIGNABLE_GAMES: { id: GameId; name: string; icon: string; color: string }[] = [
    { id: 'genshin', name: '原神', icon: 'sparkles', color: '#E2A93B' },
    { id: 'starrail', name: '星穹铁道', icon: 'moon.stars', color: '#6B7BFF' },
    { id: 'zzz', name: '绝区零', icon: 'bolt.fill', color: '#FF4D4D' },
    { id: 'honkai3rd', name: '崩坏3', icon: 'flame.fill', color: '#FF6B35' },
    { id: 'tot', name: '未定事件簿', icon: 'heart.fill', color: '#FF6B9D' },
  ]

  return (
    <ZStack frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }}>
    <ScrollView>
      <VStack
        // @ts-ignore
        padding={{ horizontal: 16, top: 8, bottom: 24 }}
        spacing={16}
      >
        {/* 顶部导航栏 */}
        <HStack alignment="center">
          <Button action={() => Script.exit()}>
            <ZStack frame={{ width: 36, height: 36 }}>
              <Circle
                // @ts-ignore
                fill="rgba(255,255,255,0.12)"
              />
              <Image systemName="chevron.left"
                // @ts-ignore
                foregroundStyle="rgba(255,255,255,0.8)"
                font={16}
              />
            </ZStack>
          </Button>
          <Spacer />
          <Button action={() => Script.exit()}>
            <ZStack frame={{ width: 36, height: 36 }}>
              <Circle
                // @ts-ignore
                fill="rgba(255,255,255,0.12)"
              />
              <Image systemName="xmark"
                // @ts-ignore
                foregroundStyle="rgba(255,255,255,0.8)"
                font={16}
              />
            </ZStack>
          </Button>
        </HStack>
        {/* ===== 统一信息卡片 ===== */}
        <VStack
          // @ts-ignore
          background="#1C1C1E"
          // @ts-ignore
          cornerRadius={20}
          // @ts-ignore
          padding={{ vertical: 24, horizontal: 20 }}
          spacing={16}
          alignment="center"
        >
          {/* 圆形图标 */}
          {roleData ? (
            <ZStack frame={{ width: 72, height: 72 }}>
              <Circle
                // @ts-ignore
                fill="rgba(255,255,255,0.08)"
              />
              <Image
                imageUrl={MIHOYO_ICON_URL}
                resizable={true}
                // @ts-ignore
                mask={<Circle fill="black" />}
                frame={{ width: 72, height: 72 }}
              />
            </ZStack>
          ) : (
            <GlowIcon />
          )}
          {/* 昵称 + UID + 服务器 */}
          <VStack spacing={4} alignment="center">
            {roleData ? (
              <>
                <Text font="title3" fontWeight="bold">{roleData.nickname}</Text>
                <Text font="caption"
                  // @ts-ignore
                  foregroundStyle="secondaryLabel"
                >{roleData.uid ? ('UID: ' + roleData.uid) : ''}  {roleData.serverName} · Lv.{roleData.level}</Text>
              </>
            ) : (
              <>
                <Text font="title3" fontWeight="bold">米游社助手</Text>
                <Text font="caption"
                  // @ts-ignore
                  foregroundStyle="secondaryLabel"
                >{loggedIn ? '加载中...' : '未登录'}</Text>
              </>
            )}
          </VStack>
          {/* 签到状态 · 连续天数 · 米游币 */}
          {roleData ? (
            <HStack spacing={0} alignment="center">
              <VStack spacing={2} alignment="center" frame={{ maxWidth: 'infinity' }}>
                <Text font="caption"
                  // @ts-ignore
                  foregroundStyle="secondaryLabel"
                >签到</Text>
                <Text font="title3" fontWeight="bold"
                  // @ts-ignore
                  foregroundStyle={roleData.signedToday ? 'systemGreen' : 'systemOrange'}
                >{roleData.signedToday ? '✅ 已签' : '⏳ 待签'}</Text>
              </VStack>
              <VStack spacing={2} alignment="center" frame={{ maxWidth: 'infinity' }}>
                <Text font="caption"
                  // @ts-ignore
                  foregroundStyle="secondaryLabel"
                >连续</Text>
                <Text font="title3" fontWeight="bold"
                  // @ts-ignore
                  foregroundStyle={roleData.signDays >= 7 ? 'systemOrange' : 'label'}
                >{roleData.signDays || 0}天</Text>
              </VStack>
              <VStack spacing={2} alignment="center" frame={{ maxWidth: 'infinity' }}>
                <Text font="caption"
                  // @ts-ignore
                  foregroundStyle="secondaryLabel"
                >米游币</Text>
                <Text font="title3" fontWeight="bold"
                  // @ts-ignore
                  foregroundStyle="#FFCC00"
                >{roleData.coinBalance || 0}</Text>
              </VStack>
            </HStack>
          ) : null}
          {/* 今日奖励 */}
          {roleData && roleData.rewardName ? (
            <HStack spacing={8} alignment="center"
              // @ts-ignore
              padding={{ vertical: 8, horizontal: 12 }}
              // @ts-ignore
              background="rgba(148,130,220,0.1)"
              // @ts-ignore
              cornerRadius={10}
              frame={{ maxWidth: 'infinity' }}
            >
              <Text font="caption">🎁</Text>
              <Text font="caption" fontWeight="bold" frame={{ maxWidth: 'infinity' }}>{roleData.rewardName} x{roleData.rewardCount}</Text>
              <Text font="caption2"
                // @ts-ignore
                foregroundStyle={roleData.signedToday ? 'systemGreen' : 'systemOrange'}
              >{roleData.signedToday ? '已领' : '待领'}</Text>
            </HStack>
          ) : null}
          {/* 刷新按钮 */}
          {allReady ? (
            <Button action={async () => {
              addLog('info', '刷新数据...')
              await refreshWidgetRoleData()
              setRoleData(readCachedRole())
              addLog('success', '数据已刷新')
            }}>
              <HStack spacing={4} alignment="center">
                <Image systemName="arrow.clockwise" font={14}
                  // @ts-ignore
                  foregroundStyle="systemBlue"
                />
                <Text font="caption" fontWeight="bold"
                  // @ts-ignore
                  foregroundStyle="systemBlue"
                >刷新数据</Text>
              </HStack>
            </Button>
          ) : null}
          {/* 积分记录入口 */}
          {allReady ? (
            <Button action={() => Navigation.present(<PointHistoryPage />)}>
              <HStack spacing={4} alignment="center">
                <Image systemName="list.bullet.rectangle" font={14}
                  // @ts-ignore
                  foregroundStyle="systemPurple"
                />
                <Text font="caption" fontWeight="bold"
                  // @ts-ignore
                  foregroundStyle="systemPurple"
                >积分记录</Text>
              </HStack>
            </Button>
          ) : null}
        </VStack>

        {/* ===== 账号管理 ===== */}
        <VStack
          // @ts-ignore
          background="#1C1C1E"
          // @ts-ignore
          cornerRadius={16}
          // @ts-ignore
          padding={{ vertical: 14, horizontal: 16 }}
          spacing={0}
        >
          <Button action={() => Navigation.present(
            <AccountPage onAuthChange={() => {
              setLoggedIn(isLoggedIn())
              if (isLoggedIn()) {
                refreshWidgetRoleData().then(() => setRoleData(readCachedRole()))
              } else {
                setRoleData(null)
                Storage.remove('widget_role_data')
                try { Widget.reloadAll() } catch (_: any) {}
              }
            }} />
          )}>
            <HStack spacing={12} alignment="center">
              <IconBadge icon="person.circle.fill" color="systemBlue" size={36} />
              <VStack spacing={2} frame={{ maxWidth: 'infinity' }}>
                <Text fontWeight="bold">管理本地账号</Text>
                <Text font="caption"
                  // @ts-ignore
                  foregroundStyle="secondaryLabel"
                >{loggedIn ? '点击查看账号信息' : '点击登录米游社账号'}</Text>
              </VStack>
              <Image systemName="chevron.right" font={14}
                // @ts-ignore
                foregroundStyle="tertiaryLabel"
              />
            </HStack>
          </Button>
        </VStack>

        {/* ===== 一键执行 ===== */}
        <Button
          action={() => handleRunTasks(true)}
          popover={{
            isPresented: showExecPopup,
            onChanged: (v: boolean) => {
              setShowExecPopup(v)
              if (!v) setLastResult('')
            },
            presentationCompactAdaptation: 'popover',
            arrowEdge: 'bottom' as any,
            content: (
              <VStack
                // @ts-ignore
                background="rgba(35,35,35,0.95)"
                // @ts-ignore
                mask={<RoundedRectangle cornerRadius={20} fill="black" />}
                // @ts-ignore
                padding={{ vertical: 16, horizontal: 14 }}
                spacing={8}
                frame={{ width: 260 }}
              >
                <Text font="headline" fontWeight="bold" foregroundStyle="white">
                  {isRunning ? '⏳ 执行中...' : '📋 执行结果'}
                </Text>
                <ScrollView frame={{ height: 220 }}>
                  <VStack spacing={4} frame={{ maxWidth: 'infinity' }}>
                    {[...liveLogs].reverse().map((log, i) => (
                      <HStack key={log.time + i} spacing={6} frame={{ maxWidth: 'infinity' }} alignment="center">
                        <Text font="caption"
                          // @ts-ignore
                          foregroundStyle={log.level === 'success' ? 'systemGreen' : log.level === 'error' ? 'systemRed' : log.level === 'warn' ? 'systemOrange' : 'tertiaryLabel'}
                        >{log.level === 'success' ? '✅' : log.level === 'error' ? '❌' : log.level === 'warn' ? '⚠️' : '•'}</Text>
                        <Text font="footnote" foregroundStyle="label"
                          frame={{ maxWidth: 'infinity' }}
                          multilineTextAlignment="leading"
                        >{log.message}</Text>
                      </HStack>
                    ))}
                    <Rectangle key="bottom" foregroundStyle="clear" frame={{ maxWidth: 'infinity', height: 1 }} />
                  </VStack>
                </ScrollView>
                {!isRunning ? (
                  <Button action={() => setShowExecPopup(false)}>
                    <Text fontWeight="bold" foregroundStyle="systemGreen">确定</Text>
                  </Button>
                ) : null}
              </VStack>
            )
          }}
        >
          <HStack spacing={8} alignment="center"
            // @ts-ignore
            background="#1C1C1E"
            // @ts-ignore
            cornerRadius={16}
            // @ts-ignore
            padding={{ vertical: 14, horizontal: 20 }}
            frame={{ maxWidth: 'infinity' }}
          >
            <Text fontWeight="bold">{isRunning ? '⏳ 执行中...' : '⚡ 一键执行所有任务'}</Text>
          </HStack>
        </Button>


        {/* ===== 米游币任务 ===== */}
        <CardSection trailing={'总计 +' + totalReward + ' 米游币'}>
          {MICOIN_TASKS.map(task => (
            <HStack key={String(task.id)} padding={{ horizontal: 16, vertical: 12 }} spacing={12} alignment="center">
              <IconBadge icon="bitcoinsign.circle.fill" color="systemOrange" />
              <VStack spacing={0} frame={{ maxWidth: "infinity" }}>
                <Text fontWeight="bold">{task.name}</Text>
                <Text font="caption"
                  // @ts-ignore
                  foregroundStyle="secondaryLabel"
                >+{task.reward} 米游币</Text>
              </VStack>
              <Toggle title="启用" value={config.micoin.actions.includes(task.id)}
                onChanged={() => toggleMicoinAction(task.id)}
              />
            </HStack>
          ))}
        </CardSection>

        {/* ===== 游戏签到（全部 5 款游戏）===== */}
        <CardSection title="游戏签到">
          {SIGNABLE_GAMES.map(game => {
            const checked = config.signGames.includes(game.id)
            return (
              <HStack key={game.id} padding={{ horizontal: 16, vertical: 12 }} spacing={12} alignment="center">
                <IconBadge icon={game.icon} color={game.color} />
                <Text fontWeight="bold" frame={{ maxWidth: "infinity" }}>{game.name}</Text>
                <Toggle title="启用" value={checked}
                  onChanged={() => toggleGame(game.id)}
                />
              </HStack>
            )
          })}
        </CardSection>

        {/* ===== 底部占位 ===== */}
        <VStack frame={{ height: 80 }} />

      </VStack>
    </ScrollView>

    {/* 悬浮设置按钮 */}
    <VStack alignment="trailing" padding={{ bottom: 24, horizontal: 16 }}>
      <Spacer />
      <Button action={() => Navigation.present(
        <SettingsPage onDataCleared={() => {
          // 重置主页面状态
          setLoggedIn(false)
          setConfig(getConfig())
          setRoleData(null)
          setLastResult('')
        }} />
      )}>
        <ZStack frame={{ width: 44, height: 44 }}>
          <Circle
            // @ts-ignore
            fill="rgba(142,142,147,0.8)"
          />
          <Image systemName="gearshape.fill"
            // @ts-ignore
            foregroundStyle="white"
            font={20}
          />
        </ZStack>
      </Button>
    </VStack>

    </ZStack>
  )
}
