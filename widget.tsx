import { Widget, Text, VStack, HStack, Image, ZStack, Circle, Spacer, Notification, RoundedRectangle } from 'scripting'
import { fetch } from 'scripting'

const ICON = 'https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/c1/ca/a0/c1caa0d0-92c3-270f-3b05-8d2e0e857dec/AppIcon-0-0-1x_U007ephone-0-1-85-220.png/200x200bb.jpg'

// ============ 工具函数 ============

function read(key: string, fallback: string = ''): string {
  try { return Storage.get<string>(key) || fallback } catch { return fallback }
}

function readJSON(key: string): any {
  try { const s = Storage.get<string>(key); return s ? JSON.parse(s) : null } catch { return null }
}

function formatTime(ts: number): string {
  if (!ts) return ''
  const d = new Date(ts)
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
}

// ============ MD5 实现（从 utils.ts 复制）============

function md5(str: string): string {
  function R(n: number, c: number) { return (n << c) | (n >>> (32 - c)) }
  function X(a: number, b: number) {
    const l8 = a & 0x80000000, r8 = b & 0x80000000, l4 = a & 0x40000000, r4 = b & 0x40000000
    const r = (a & 0x3FFFFFFF) + (b & 0x3FFFFFFF)
    if (l4 & r4) return (r ^ 0x80000000 ^ l8 ^ r8)
    if (l4 | r4) return (r & 0x40000000) ? (r ^ 0xC0000000 ^ l8 ^ r8) : (r ^ 0x40000000 ^ l8 ^ r8)
    return (r ^ l8 ^ r8)
  }
  function F(x: number, y: number, z: number) { return (x & y) | ((~x) & z) }
  function G(x: number, y: number, z: number) { return (x & z) | (y & (~z)) }
  function H(x: number, y: number, z: number) { return (x ^ y ^ z) }
  function I(x: number, y: number, z: number) { return (y ^ (x | (~z))) }
  function FF(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) { return X(R(X(X(F(b, c, d), x), ac), s), b) }
  function GG(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) { return X(R(X(X(G(b, c, d), x), ac), s), b) }
  function HH(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) { return X(R(X(X(H(b, c, d), x), ac), s), b) }
  function II(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) { return X(R(X(X(I(b, c, d), x), ac), s), b) }

  function conv(s: string) {
    let t = ''
    for (let i = 0; i < s.length; i++) {
      const c = s.charCodeAt(i)
      if (c < 128) t += String.fromCharCode(c)
      else if (c < 2048) { t += String.fromCharCode((c >> 6) | 192); t += String.fromCharCode((c & 63) | 128) }
      else { t += String.fromCharCode((c >> 12) | 224); t += String.fromCharCode(((c >> 6) & 63) | 128); t += String.fromCharCode((c & 63) | 128) }
    }
    return t
  }

  str = conv(str.replace(/\r\n/g, '\n'))
  const ml = str.length, lmt = ((ml + 8 - (ml + 8) % 64) / 64 + 1) * 16
  const w = new Array(lmt).fill(0)
  for (let i = 0; i < ml; i++) w[(i - i % 4) >> 2] |= str.charCodeAt(i) << ((i % 4) * 8)
  w[(ml - ml % 4) >> 2] |= 0x80 << ((ml % 4) * 8)
  w[lmt - 2] = ml << 3

  let a = 0x67452301, b = 0xEFCDAB89, c = 0x98BADCFE, d = 0x10325476
  for (let k = 0; k < lmt; k += 16) {
    const A = a, B = b, C = c, D = d
    a = FF(a,b,c,d,w[k+0],7,0xD76AA478); d=FF(d,a,b,c,w[k+1],12,0xE8C7B756); c=FF(c,d,a,b,w[k+2],17,0x242070DB); b=FF(b,c,d,a,w[k+3],22,0xC1BDCEEE)
    a = FF(a,b,c,d,w[k+4],7,0xF57C0FAF); d=FF(d,a,b,c,w[k+5],12,0x4787C62A); c=FF(c,d,a,b,w[k+6],17,0xA8304613); b=FF(b,c,d,a,w[k+7],22,0xFD469501)
    a = FF(a,b,c,d,w[k+8],7,0x698098D8); d=FF(d,a,b,c,w[k+9],12,0x8B44F7AF); c=FF(c,d,a,b,w[k+10],17,0xFFFF5BB1); b=FF(b,c,d,a,w[k+11],22,0x895CD7BE)
    a = FF(a,b,c,d,w[k+12],7,0x6B901122); d=FF(d,a,b,c,w[k+13],12,0xFD987193); c=FF(c,d,a,b,w[k+14],17,0xA679438E); b=FF(b,c,d,a,w[k+15],22,0x49B40821)
    a = GG(a,b,c,d,w[k+1],5,0xF61E2562); d=GG(d,a,b,c,w[k+6],9,0xC040B340); c=GG(c,d,a,b,w[k+11],14,0x265E5A51); b=GG(b,c,d,a,w[k+0],20,0xE9B6C7AA)
    a = GG(a,b,c,d,w[k+5],5,0xD62F105D); d=GG(d,a,b,c,w[k+10],9,0x02441453); c=GG(c,d,a,b,w[k+15],14,0xD8A1E681); b=GG(b,c,d,a,w[k+4],20,0xE7D3FBC8)
    a = GG(a,b,c,d,w[k+9],5,0x21E1CDE6); d=GG(d,a,b,c,w[k+14],9,0xC33707D6); c=GG(c,d,a,b,w[k+3],14,0xF4D50D87); b=GG(b,c,d,a,w[k+8],20,0x455A14ED)
    a = GG(a,b,c,d,w[k+13],5,0xA9E3E905); d=GG(d,a,b,c,w[k+2],9,0xFCEFA3F8); c=GG(c,d,a,b,w[k+7],14,0x676F02D9); b=GG(b,c,d,a,w[k+12],20,0x8D2A4C8A)
    a = HH(a,b,c,d,w[k+5],4,0xFFFA3942); d=HH(d,a,b,c,w[k+8],11,0x8771F681); c=HH(c,d,a,b,w[k+11],16,0x6D9D6122); b=HH(b,c,d,a,w[k+14],23,0xFDE5380C)
    a = HH(a,b,c,d,w[k+1],4,0xA4BEEA44); d=HH(d,a,b,c,w[k+4],11,0x4BDECFA9); c=HH(c,d,a,b,w[k+7],16,0xF6BB4B60); b=HH(b,c,d,a,w[k+10],23,0xBEBFBC70)
    a = HH(a,b,c,d,w[k+13],4,0x289B7EC6); d=HH(d,a,b,c,w[k+0],11,0xEAA127FA); c=HH(c,d,a,b,w[k+3],16,0xD4EF3085); b=HH(b,c,d,a,w[k+6],23,0x04881D05)
    a = HH(a,b,c,d,w[k+9],4,0xD9D4D039); d=HH(d,a,b,c,w[k+12],11,0xE6DB99E5); c=HH(c,d,a,b,w[k+15],16,0x1FA27CF8); b=HH(b,c,d,a,w[k+2],23,0xC4AC5665)
    a = II(a,b,c,d,w[k+0],6,0xF4292244); d=II(d,a,b,c,w[k+7],10,0x432AFF97); c=II(c,d,a,b,w[k+14],15,0xAB9423A7); b=II(b,c,d,a,w[k+5],21,0xFC93A039)
    a = II(a,b,c,d,w[k+12],6,0x655B59C3); d=II(d,a,b,c,w[k+3],10,0x8F0CCC92); c=II(c,d,a,b,w[k+10],15,0xFFEFF47D); b=II(b,c,d,a,w[k+1],21,0x85845DD1)
    a = II(a,b,c,d,w[k+8],6,0x6FA87E4F); d=II(d,a,b,c,w[k+15],10,0xFE2CE6E0); c=II(c,d,a,b,w[k+6],15,0xA3014314); b=II(b,c,d,a,w[k+13],21,0x4E0811A1)
    a = II(a,b,c,d,w[k+4],6,0xF7537E82); d=II(d,a,b,c,w[k+11],10,0xBD3AF235); c=II(c,d,a,b,w[k+2],15,0x2AD7D2BB); b=II(b,c,d,a,w[k+9],21,0xEB86D391)
    a=X(a,A); b=X(b,B); c=X(c,C); d=X(d,D)
  }
  function toHex(n: number) { let s=''; for(let i=0;i<4;i++) s+=('0'+((n>>>(i*8))&255).toString(16)).slice(-2); return s }
  return toHex(a)+toHex(b)+toHex(c)+toHex(d)
}

// ============ DS 签名 ============

const SALT_X4 = 'xV8v4Qu54lUKrEYFZkJhB8cuOh9Asafs'
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) miHoYoBBS/2.110.0'

function getDS(body: string = '', query: string = ''): string {
  const t = Math.floor(Date.now() / 1000).toString()
  const r = Math.floor(Math.random() * 100000 + 100000).toString()
  const c = md5(`salt=${SALT_X4}&t=${t}&r=${r}&b=${body}&q=${query}`)
  return `${t},${r},${c}`
}

function extractQuery(url: string): string {
  const idx = url.indexOf('?')
  return idx >= 0 ? url.substring(idx + 1) : ''
}

function getCookie(): string {
  return Storage.get<string>('mihoyo_cookie') || ''
}

function getBBSHeaders(url: string): Record<string, string> {
  const cookie = getCookie()
  const query = extractQuery(url)
  const ds = getDS('', query)
  return {
    'User-Agent': UA,
    'Referer': 'https://webstatic.mihoyo.com',
    'Origin': 'https://webstatic.mihoyo.com',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'zh-CN,zh-Hans;q=0.9',
    'X-Requested-With': 'com.mihoyo.hyperion',
    'x-rpc-app_version': '2.110.0',
    'x-rpc-client_type': '5',
    'Cookie': cookie,
    'DS': ds,
  }
}

// ============ 自动签到逻辑（仿九号App模式）============
// 每次 widget 刷新时：先查签到状态 → 未签到则自动签 → 重新拉取数据渲染

/** 检查今日是否已签到（通过 API 返回的 signed 字段判断） */
async function checkTodaySigned(cookieStr: string): Promise<boolean> {
  if (!cookieStr) return false
  try {
    // 先获取角色
    const roleUrl = 'https://api-takumi.mihoyo.com/binding/api/getUserGameRolesByCookie?game_biz=hk4e_cn'
    const roleRes = await fetch(roleUrl, { method: 'GET', headers: getBBSHeaders(roleUrl) })
      .then((r: any) => r.json()).catch(() => null)
    const role = roleRes?.data?.list?.[0]
    if (!role?.game_uid) return false

    // 查询签到状态
    const signUrl = `https://api-takumi.mihoyo.com/event/luna/hk4e/resign_info?uid=${role.game_uid}&region=${role.region || 'cn_gf01'}&act_id=e202311201442471`
    const signHeaders = getBBSHeaders(signUrl)
    signHeaders['x-rpc-signgame'] = 'hk4e'
    const signRes = await fetch(signUrl, { method: 'GET', headers: signHeaders })
      .then((r: any) => r.json()).catch(() => null)
    return !!signRes?.data?.signed
  } catch {
    return false
  }
}

/** 执行完整签到 + 米游币任务 + 数据刷新流程 */
async function autoSignAndRefresh(cookieStr: string): Promise<{ result: string; data: any }> {
  const mihoyoUid = cookieStr.match(/account_id=(\d+)/)?.[1] || ''

  // 1. 获取角色信息
  const roleUrl = 'https://api-takumi.mihoyo.com/binding/api/getUserGameRolesByCookie?game_biz=hk4e_cn'
  const roleRes = await fetch(roleUrl, { method: 'GET', headers: getBBSHeaders(roleUrl) })
    .then((r: any) => r.json()).catch(() => null)
  const role = roleRes?.data?.list?.find((r: any) => r.is_chosen) || roleRes?.data?.list?.[0]
  const gameUid = role?.game_uid || ''
  const gameRegion = role?.region || 'cn_gf01'

  const sections: string[] = []

  // 2. 游戏签到 + 获取奖励
  let signDays = 0
  let rewardName = ''
  let rewardCount = 0
  if (gameUid) {
    const signUrl = `https://api-takumi.mihoyo.com/event/luna/hk4e/resign_info?uid=${gameUid}&region=${gameRegion}&act_id=e202311201442471`
    const signHeaders = getBBSHeaders(signUrl)
    signHeaders['x-rpc-signgame'] = 'hk4e'
    const signRes = await fetch(signUrl, { method: 'GET', headers: signHeaders })
      .then((r: any) => r.json()).catch(() => null)
    signDays = signRes?.data?.sign_days || 0
    const signed = !!signRes?.data?.signed
    sections.push(`✅ ${role?.nickname || '角色'} ${signed ? '已签到' : '签到中'} 累计 ${signDays} 天`)
    // 获取今日奖励
    try {
      const homeUrl = `https://api-takumi.mihoyo.com/event/luna/hk4e/home?act_id=e202311201442471`
      const homeRes = await fetch(homeUrl, { method: 'GET', headers: getBBSHeaders(homeUrl) })
        .then((r: any) => r.json()).catch(() => null)
      const todayDay = homeRes?.data?.info?.total_sign_day || signDays
      const awards = homeRes?.data?.awards || []
      const todayAward = awards.find((a: any) => a.day === todayDay)
      if (todayAward) {
        rewardName = todayAward.name || ''
        rewardCount = todayAward.cnt || 0
      }
    } catch {}
  }

  // 3. 获取米游币任务状态
  const missionUrl = 'https://bbs-api.miyoushe.com/apihub/wapi/getUserMissionsState'
  const missionRes = await fetch(missionUrl, { method: 'GET', headers: getBBSHeaders(missionUrl) })
    .then((r: any) => r.json()).catch(() => null)
  const totalPoints = missionRes?.data?.total_points || 0
  const alreadyReceived = missionRes?.data?.already_received_points || 0
  const todayTotalPoints = missionRes?.data?.today_total_points || 50
  const states = missionRes?.data?.states || []

  // 3.1 每日上限直接从 API 获取
  const maxDailyPoints = todayTotalPoints

  // 4. 获取游戏记录
  const recordUrl = `https://api-takumi-record.mihoyo.com/game_record/app/card/wapi/getGameRecordCard?uid=${mihoyoUid}`
  const recordRes = await fetch(recordUrl, { method: 'GET', headers: getBBSHeaders(recordUrl) })
    .then((r: any) => r.json()).catch(() => null)
  const gameRecord = recordRes?.data?.list?.[0]
  const gameStats = gameRecord?.data || []

  // 5. 解析任务完成情况（从 states 构造）

  // 任务 ID → 名称映射
  const MISSION_NAMES: Record<number, string> = {
    58: '打卡', 59: '浏览3个帖子', 60: '完成5次点赞',
    61: '分享帖子',
  }
  const MISSION_ICONS: Record<number, string> = {
    58: '📅', 59: '📖', 60: '👍', 61: '↗',
  }
  const MISSION_REWARDS: Record<number, number> = {
    58: 30, 59: 20, 60: 30, 61: 10,
  }
  const MISSION_TOTALS: Record<number, number> = {
    58: 1, 59: 3, 60: 5, 61: 1,
  }

  const tasks = states.map((s: any) => {
    const id = s.mission_id
    const done = s.process === 1 || (s.happened_times || 0) >= (MISSION_TOTALS[id] || 1)
    if (id === 58) {
      return {
        id,
        name: MISSION_NAMES[id] || '打卡',
        current: done ? 1 : 0,
        total: 1,
        reward: MISSION_REWARDS[id] || 0,
        done,
        icon: MISSION_ICONS[id] || '📅',
        isCheckIn: true,
      }
    }
    return {
      id,
      name: MISSION_NAMES[id] || `任务${id}`,
      current: s.happened_times || 0,
      total: MISSION_TOTALS[id] || 1,
      reward: MISSION_REWARDS[id] || 0,
      done,
      icon: MISSION_ICONS[id] || '📋',
    }
  })

  // 讨论区连续打卡天数：从积分记录 API 计算
  // getUserMissionsState 没有 continuous_cycle_times，getTaskList 返回 gzip
  // 所以从积分历史记录中倒推连续打卡天数
  let continuousDays = 0
  try {
    const pointUrl = 'https://bbs-api.miyoushe.com/common/homutreasure/v1/web/user/record?app_id=1&point_sn=myb&action=1&size=20'
    const pointCookie = Storage.get<string>('mihoyo_cookie') || ''
    const pointDs = getDS('', 'app_id=1&point_sn=myb&action=1&size=20')
    const pointRes = await fetch(pointUrl, {
      method: 'GET',
      headers: {
        'User-Agent': UA,
        'Referer': 'https://webstatic.mihoyo.com',
        'Accept': 'application/json',
        'Cookie': pointCookie,
        'DS': pointDs,
      },
    }).then((r: any) => r.json()).catch((e: any) => { console.log('[Widget] 积分记录API失败:', e.message); return null })
    console.log('[Widget] 积分记录retcode:', pointRes?.retcode, 'list长度:', pointRes?.data?.list?.length)
    const pointList = pointRes?.data?.list || []
    const checkInRecords = pointList.filter((r: any) => r.title === '打卡' && r.num > 0)
    console.log('[Widget] 打卡记录数:', checkInRecords.length)
    if (checkInRecords.length > 0) {
      let streak = 0
      const now = new Date()
      let expectedDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      for (const record of checkInRecords) {
        const recordDate = new Date(parseInt(record.order_time) * 1000)
        const recordDay = new Date(recordDate.getFullYear(), recordDate.getMonth(), recordDate.getDate())
        const diffDays = Math.round((expectedDate.getTime() - recordDay.getTime()) / 86400000)
        console.log('[Widget] 记录:', record.title, recordDay.toISOString().slice(0, 10), 'diff:', diffDays)
        if (diffDays === 0 || diffDays === 1) {
          streak++
          expectedDate = new Date(recordDay.getTime() - 86400000)
        } else {
          break
        }
      }
      continuousDays = streak
      console.log('[Widget] 计算连续天数:', streak)
    }
  } catch (e: any) { console.log('[Widget] 连续天数异常:', e.message) }
  // 兜底：从 Storage 读取
  if (continuousDays <= 0) {
    continuousDays = Number(Storage.get<string>('mihoyo_checkin_streak') || '0')
  }
  // 应用连续天数到打卡任务
  if (continuousDays > 0) {
    const checkInTask = tasks.find((t: any) => t.id === 58)
    if (checkInTask) {
      checkInTask.current = continuousDays
    }
  }

  // 未完成的排前面
  tasks.sort((a: any, b: any) => (a.done ? 1 : 0) - (b.done ? 1 : 0))

  // 计算今日已获得的米游币
  const earnedPoints = alreadyReceived

  // 6. 构建通知正文
  const taskLines = tasks.map((t: any) => `${t.icon} ${t.name} (+${t.reward} 米游币)`).join('\n')
  const notifBody = `米游币任务完成:\n${taskLines}\n\n总余额: ${totalPoints} 米游币  今日+${earnedPoints}`

  // 7. 构建 widget 数据
  const data = {
    nickname: role?.nickname || '未知角色',
    serverName: role?.region_name || '未知服务器',
    level: role?.level || 0,
    coinBalance: totalPoints,
    coinToday: earnedPoints,
    maxDailyPoints,
    signDays: signDays,
    signedToday: signDays > 0,
    rewardName,
    rewardCount,
    tasks,
    enabledActions: (readJSON('mihoyo_config')?.micoin?.actions) || [],
    micoinEnabled: (readJSON('mihoyo_config')?.tasks || []).includes('micoin'),
    gameStats,
    fetchTime: Date.now(),
  }
  Storage.set('widget_role_data', JSON.stringify(data))

  // 8. 记录执行
  const now = new Date()
  const dateStr = now.toLocaleDateString('zh-CN')
  const timeStr = formatTime(now.getTime())
  Storage.set('mihoyo_last_run_time', `${dateStr} ${timeStr}`)
  Storage.set('mihoyo_last_success', 'true')
  Storage.set('mihoyo_last_result', notifBody)

  return { result: notifBody, data }
}

// ============ 主流程 ============

;(async () => {
  try {
    const transparent = Widget.isTransparentBackground
    const family = Widget.family
    const bgColor = transparent ? 'clear' : '#1C1C1E'

    const role = readJSON('widget_role_data')
    const loggedIn = Storage.contains('mihoyo_cookie')
    const lastRun = read('mihoyo_last_run_time')
    const lastResult = read('mihoyo_last_result')
    const success = read('mihoyo_last_success') === 'true'

    const refreshMin = Number(read('widget_refresh_interval', '15')) || 15
    const doNotify = read('widget_notify') !== 'false'

    let sched = { enabled: false, hour: 8, minute: 0 }
    try { sched = JSON.parse(read('mihoyo_schedule', '{}')) } catch {}

    // ========== 仿九号App模式：每次刷新都拉取最新数据 ==========
    const cookieStr = getCookie()
    const startTime = Date.now()
    if (loggedIn && cookieStr) {
      try {
        const isSigned = await checkTodaySigned(cookieStr)
        if (!isSigned) {
          // 未签到，执行签到 + 全量数据刷新
          const signResult = await autoSignAndRefresh(cookieStr)
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
          // 签到成功后发送通知
          if (doNotify) {
            const notifyLines: string[] = []
            const latestData = readJSON('widget_role_data')
            if (latestData?.rewardName) {
              notifyLines.push(`🎁 今日奖励: ${latestData.rewardName} x${latestData.rewardCount}`)
            }
            if (latestData?.signDays > 0) {
              notifyLines.push(`✅ 原神 已签到: 累计 ${latestData.signDays} 天`)
            }
            const micoinToday = latestData?.coinToday || 0
            if (micoinToday > 0) {
              notifyLines.push(`🪙 今日米游币 +${micoinToday}`)
            }
            notifyLines.push(`⏱ 任务执行完成 (耗时 ${elapsed}s)`)
            Notification.schedule({
              title: '🎮 签到成功',
              body: notifyLines.join('\n'),
            })
          }
        } else {
          // 已签到，仍需拉取最新任务进度写入 Storage
          const missionsUrl = 'https://bbs-api.miyoushe.com/apihub/wapi/getUserMissionsState'
          const missionsRes = await fetch(missionsUrl, { method: 'GET', headers: getBBSHeaders(missionsUrl) })
            .then((r: any) => r.json()).catch(() => null)
          const totalPoints = missionsRes?.data?.total_points || 0
          const alreadyReceived = missionsRes?.data?.already_received_points || 0
          const todayTotalPoints = missionsRes?.data?.today_total_points || 50
          const states = missionsRes?.data?.states || []

          // 从 states 构造任务列表
          const MISSION_NAMES: Record<number, string> = {
            58: '打卡', 59: '浏览3个帖子', 60: '完成5次点赞',
            61: '分享帖子', 62: '绑定游戏角色', 64: '修改个性签名',
          }
          const MISSION_ICONS: Record<number, string> = {
            58: '📅', 59: '📖', 60: '👍', 61: '↗', 62: '🔗', 64: '✏️',
          }
          const MISSION_TOTALS: Record<number, number> = {
            58: 1, 59: 3, 60: 5, 61: 1, 62: 1, 64: 1,
          }
          const MISSION_REWARDS: Record<number, number> = {
            58: 30, 59: 20, 60: 30, 61: 10, 62: 80, 64: 80,
          }
          const tasks = states
            .filter((s: any) => s.mission_id !== 62 && s.mission_id !== 64)
            .map((s: any) => {
            const id = s.mission_id
            const done = s.process === 1 || (s.happened_times || 0) >= (MISSION_TOTALS[id] || 1)
            if (id === 58) {
              return {
                id, name: MISSION_NAMES[id] || '打卡',
                current: done ? 1 : 0, total: 1,
                reward: MISSION_REWARDS[id] || 0, done,
                icon: MISSION_ICONS[id] || '📅', isCheckIn: true,
              }
            }
            return {
              id, name: MISSION_NAMES[id] || '任务' + id,
              current: s.happened_times || 0,
              total: MISSION_TOTALS[id] || 1,
              reward: MISSION_REWARDS[id] || 0, done,
              icon: MISSION_ICONS[id] || '📋',
            }
          })

          // 已签到路径：从 Storage 读取连续打卡天数
          const continuousDays2 = Number(Storage.get<string>('mihoyo_checkin_streak') || '0')
          if (continuousDays2 > 0) {
            const checkInTask2 = tasks.find((t: any) => t.id === 58)
            if (checkInTask2) {
              checkInTask2.current = continuousDays2
            }
          }

          // 合并更新 widget_role_data（保留 main-page 已存储的奖励数据）
          if (role) {
            role.coinBalance = totalPoints
            role.coinToday = alreadyReceived
            role.maxDailyPoints = todayTotalPoints
            role.tasks = tasks
            role.fetchTime = Date.now()
            Storage.set('widget_role_data', JSON.stringify(role))
          }
        }
      } catch (e: any) {
        console.log('widget 数据刷新失败:', e.message)
      }
    }

    // 计算下次刷新时间
    let nextRefresh: Date
    if (sched.enabled) {
      const t = new Date()
      t.setHours(sched.hour, sched.minute, 0, 0)
      if (t <= new Date()) t.setDate(t.getDate() + 1)
      nextRefresh = t
    } else {
      nextRefresh = new Date(Date.now() + refreshMin * 60 * 1000)
    }

    // 重新从 Storage 读取最新数据（上面的刷新已写入）
    const useRole = readJSON('widget_role_data') || role
    const updateTime = useRole?.fetchTime ? ('更新于 ' + formatTime(useRole.fetchTime)) : ''

    // 解析签到状态数据（新增 signStatuses 字段）
    const signStatuses = useRole?.signStatuses || []
    // 解析奖励数据
    const rewardName = useRole?.rewardName || ''
    const rewardCount = useRole?.rewardCount || 0
    // 解析上次执行结果（不显示）
    const lastResultLines: string[] = []

    let view

    if (family === 'systemSmall') {
      view = (
        <VStack
          // @ts-ignore
          background={bgColor}
          // @ts-ignore
          cornerRadius={20}
          // @ts-ignore
          padding={{ horizontal: 16, top: 24, bottom: 16 }}
          spacing={6}
          alignment="center"
        >
          <ZStack frame={{ width: 40, height: 40 }}>
            <Image imageUrl={ICON} resizable={true}
              // @ts-ignore
              mask={<RoundedRectangle cornerRadius={8} fill="black" />}
              frame={{ width: 40, height: 40 }}
            />
          </ZStack>
          <Text font="subheadline" fontWeight="bold">
            {useRole?.nickname || '米游社助手'}
          </Text>
          {useRole ? (
            <Text font="caption2"
              // @ts-ignore
              foregroundStyle="secondaryLabel"
            >{useRole.serverName + ' · Lv.' + useRole.level}</Text>
          ) : (
            <Text font="caption2"
              // @ts-ignore
              foregroundStyle={loggedIn ? 'systemGreen' : 'systemRed'}
            >{loggedIn ? '已就绪' : '未登录'}</Text>
          )}
          {useRole && useRole.coinBalance > 0 ? (
            <Text font="title3" fontWeight="bold"
              // @ts-ignore
              foregroundStyle="#FFCC00"
            >{'\u24C2 ' + useRole.coinBalance}</Text>
          ) : null}
          {useRole && useRole.signDays > 0 ? (
            <Text font="caption" fontWeight="bold"
              // @ts-ignore
              foregroundStyle="systemOrange"
            >{'连续签到 ' + useRole.signDays + ' 天'}</Text>
          ) : null}
          {useRole && useRole.rewardName ? (
            <Text font="caption2" fontWeight="bold"
              // @ts-ignore
              foregroundStyle="systemPurple"
            >{'🎁 ' + useRole.rewardName + ' x' + useRole.rewardCount}</Text>
          ) : null}
          {sched.enabled ? (
            <Text font="caption2"
              // @ts-ignore
              foregroundStyle="tertiaryLabel"
            >{'\u23F0 ' + String(sched.hour).padStart(2, '0') + ':' + String(sched.minute).padStart(2, '0')}</Text>
          ) : null}
          {updateTime ? (
            <Text font="caption2"
              // @ts-ignore
              foregroundStyle="tertiaryLabel"
            >{updateTime}</Text>
          ) : null}
        </VStack>
      )
    } else if (family === 'systemMedium') {
      // 进度条宽度配置
      const BAR_TOTAL = 72
      view = (
        <VStack
          // @ts-ignore
          background={bgColor}
          // @ts-ignore
          cornerRadius={20}
          // @ts-ignore
          padding={{ horizontal: 14, top: 12, bottom: 8 }}
          spacing={0}
        >
          <HStack alignment="top" spacing={10}>
            {/* ===== 左侧栏：图标 + 米游币 + 签到 ===== */}
            <VStack alignment="center" spacing={3}
              frame={{ width: 88 }}
            >
              <Image imageUrl={ICON} resizable={true}
                // @ts-ignore
                mask={<RoundedRectangle cornerRadius={12} fill="black" />}
                frame={{ width: 48, height: 48 }}
              />
              {/* 米游币 */}
              <HStack spacing={2} alignment="center">
                <Text font="caption2" fontWeight="bold"
                  // @ts-ignore
                  foregroundStyle="#FFCC00"
                >{'\u24C2'}</Text>
                <Text font="caption" fontWeight="bold"
                  // @ts-ignore
                  foregroundStyle="#FFCC00"
                >{String(useRole?.coinBalance || 0)}</Text>
              </HStack>
              {/* 连续签到 */}
              {useRole && useRole.signDays > 0 ? (
                <Text font="caption2" fontWeight="bold"
                  // @ts-ignore
                  foregroundStyle="systemOrange"
                >{'连续签到' + useRole.signDays + '天'}</Text>
              ) : null}
            </VStack>
            {/* ===== 右侧栏：账号 + 任务列表 ===== */}
            <VStack spacing={3} frame={{ maxWidth: 'infinity' }}>
              {/* 昵称 + 服务器 + 今日上限 */}
              <VStack spacing={1}>
                <Text font="caption" fontWeight="bold" lineLimit={1}>
                  {useRole?.nickname || '米游社助手'}
                </Text>
                <Text font="caption2"
                  // @ts-ignore
                  foregroundStyle="secondaryLabel"
                  lineLimit={1}
                >{(useRole ? (useRole.serverName + ' · Lv.' + useRole.level) : (loggedIn ? '已就绪' : '未登录'))}</Text>
              </VStack>
              {/* 今日米游币上限 */}
              <Text font="caption2"
                // @ts-ignore
                foregroundStyle="tertiaryLabel"
              >{'今日获取米游币上限 ' + (useRole?.coinToday || 0) + '/' + (useRole?.maxDailyPoints || 50)}</Text>
              {/* 任务列表 */}
              <VStack spacing={2}>
                {useRole && useRole.tasks && useRole.tasks.length > 0 ? (
                  useRole.tasks
                    .filter((t: any) => {
                      const actions = useRole.enabledActions || []
                      return actions.length === 0 || actions.includes(t.id)
                    })
                    .map((t: any) => (
                    <VStack key={t.id} spacing={1}>
                      {/* 任务名 + 奖励 + 进度 */}
                      <HStack alignment="center">
                        <Text font="caption2"
                          // @ts-ignore
                          foregroundStyle={t.done ? 'systemGreen' : 'label'}
                        >{t.icon + ' ' + t.name}</Text>
                        <Spacer />
                        <Text font="caption2" fontWeight="bold"
                          // @ts-ignore
                          foregroundStyle={t.done ? 'systemGreen' : 'systemBlue'}
                        >{t.isCheckIn ? (t.current > 0 ? '连续 ' + t.current + ' 天' : '未打卡') : (t.current + '/' + t.total)}</Text>
                      </HStack>
                      {/* 进度条（打卡任务不显示进度条） */}
                      {t.isCheckIn ? null : (
                      <HStack spacing={0} frame={{ height: 3 }}>
                        <VStack frame={{ width: Math.round(BAR_TOTAL * Math.min(t.current / t.total, 1)), height: 3 }}
                          // @ts-ignore
                          background={t.done ? 'systemGreen' : 'systemBlue'}
                          // @ts-ignore
                          cornerRadius={1.5}
                        />
                        {t.current < t.total ? (
                          <VStack frame={{ width: BAR_TOTAL - Math.round(BAR_TOTAL * Math.min(t.current / t.total, 1)), height: 3 }}
                            // @ts-ignore
                            background="systemGray5"
                            // @ts-ignore
                            cornerRadius={1.5}
                          />
                        ) : null}
                      </HStack>
                      )}
                    </VStack>
                  ))
                ) : (
                  <Text font="caption2"
                    // @ts-ignore
                    foregroundStyle="tertiaryLabel"
                    multilineTextAlignment="center"
                  >{loggedIn ? '打开 App 刷新' : '请先登录'}</Text>
                )}
              </VStack>
            </VStack>
          </HStack>
          {/* 今日奖励 */}
          {rewardName ? (
            <HStack spacing={6} alignment="center"
              // @ts-ignore
              padding={{ top: 4 }}
            >
              <Text font="caption2" foregroundStyle="systemPurple">{'\uD83C\uDF81'}</Text>
              <Text font="caption2" fontWeight="bold"
                foregroundStyle="label"
              >{rewardName + ' x' + rewardCount}</Text>
              <Spacer />
              {useRole?.signedToday ? (
                <Text font="caption2" foregroundStyle="systemGreen">已领取</Text>
              ) : null}
            </HStack>
          ) : null}
          {/* 游戏数据 */}
          {useRole && useRole.gameStats && useRole.gameStats.length > 0 ? (
            <HStack spacing={0} alignment="center"
              // @ts-ignore
              padding={{ vertical: 4, horizontal: 4 }}
            >
              {useRole.gameStats.map((s: any, i: number) => (
                <VStack key={i} spacing={0}
                  // @ts-ignore
                  frame={{ maxWidth: "infinity" }}
                  alignment="center"
                >
                  <Text font="footnote" fontWeight="bold" foregroundStyle="label">{s.value}</Text>
                  <Text font="caption2" foregroundStyle="tertiaryLabel">{s.name}</Text>
                </VStack>
              ))}
            </HStack>
          ) : null}
          {lastResultLines.length > 0 ? (
            <VStack spacing={1}
              // @ts-ignore
              padding={{ top: 2 }}
            >
              {lastResultLines.map((line: string, i: number) => (
                <Text key={i} font="caption2"
                  foregroundStyle="tertiaryLabel"
                  lineLimit={1}
                >{line}</Text>
              ))}
            </VStack>
          ) : null}
          {/* 底部：定时 + 更新时间 */}
          <HStack spacing={0}>
            {sched.enabled ? (
              <Text font="caption2"
                // @ts-ignore
                foregroundStyle="tertiaryLabel"
              >{'\u23F0 ' + String(sched.hour).padStart(2, '0') + ':' + String(sched.minute).padStart(2, '0')}</Text>
            ) : null}
            {updateTime ? (
              <Text font="caption2"
                // @ts-ignore
                foregroundStyle="tertiaryLabel"
              >{sched.enabled ? ('   ' + updateTime) : updateTime}</Text>
            ) : null}
          </HStack>
        </VStack>
      )
    } else {
      // systemLarge
      const BAR_TOTAL = 120
      view = (
        <VStack
          // @ts-ignore
          background={bgColor}
          // @ts-ignore
          cornerRadius={20}
          // @ts-ignore
          padding={{ horizontal: 16, top: 20, bottom: 12 }}
          spacing={8}
        >
          {/* 顶部：图标 + 账号信息 + 米游币 */}
          <HStack spacing={10} alignment="center">
            <Image imageUrl={ICON} resizable={true}
              // @ts-ignore
              mask={<RoundedRectangle cornerRadius={10} fill="black" />}
              frame={{ width: 44, height: 44 }}
            />
            <VStack spacing={1} frame={{ maxWidth: "infinity" }}>
              <Text font="headline" fontWeight="bold" lineLimit={1}>
                {useRole?.nickname || '米游社助手'}
              </Text>
              <Text font="caption"
                // @ts-ignore
                foregroundStyle="secondaryLabel"
              >{(useRole ? (useRole.serverName + ' · Lv.' + useRole.level) : (loggedIn ? '已就绪' : '请先登录')) + (useRole && useRole.signDays > 0 ? ('  ·  连续签到' + useRole.signDays + '天') : '')}</Text>
            </VStack>
            {useRole ? (
              <VStack alignment="trailing" spacing={1}>
                <Text font="title3" fontWeight="bold"
                  // @ts-ignore
                  foregroundStyle="#FFCC00"
                >{'\u24C2 ' + useRole.coinBalance}</Text>
                <Text font="caption2"
                  // @ts-ignore
                  foregroundStyle="tertiaryLabel"
                >{'今日 +' + useRole.coinToday}</Text>
              </VStack>
            ) : null}
          </HStack>
          {/* 每日任务标题 */}
          <Text font="subheadline" fontWeight="bold"
            // @ts-ignore
            foregroundStyle="secondaryLabel"
          >{'每日任务  今日获取米游币上限 ' + (useRole?.coinToday || 0) + '/' + (useRole?.maxDailyPoints || 50)}</Text>
          {/* 任务列表 + 进度条 */}
          {useRole && useRole.tasks && useRole.tasks.length > 0 ? (
            <VStack spacing={6}>
              {useRole.tasks.map((t: any) => (
                <VStack key={t.id} spacing={2}>
                  <HStack alignment="center">
                    <Text font="caption"
                      // @ts-ignore
                      foregroundStyle={t.done ? 'systemGreen' : 'label'}
                    >{t.icon + ' ' + t.name + '  +' + t.reward}</Text>
                    <Spacer />
                    <Text font="caption" fontWeight="bold"
                      // @ts-ignore
                      foregroundStyle={t.done ? 'systemGreen' : 'systemBlue'}
                    >{t.current + '/' + t.total}</Text>
                  </HStack>
                  <HStack spacing={0} frame={{ height: 4 }}>
                    <VStack frame={{ width: Math.round(BAR_TOTAL * Math.min(t.current / t.total, 1)), height: 4 }}
                      // @ts-ignore
                      background={t.done ? 'systemGreen' : 'systemBlue'}
                      // @ts-ignore
                      cornerRadius={2}
                    />
                    {t.current < t.total ? (
                      <VStack frame={{ width: BAR_TOTAL - Math.round(BAR_TOTAL * Math.min(t.current / t.total, 1)), height: 4 }}
                        // @ts-ignore
                        background="systemGray5"
                        // @ts-ignore
                        cornerRadius={2}
                      />
                    ) : null}
                  </HStack>
                </VStack>
              ))}
            </VStack>
          ) : (
            <Text font="caption"
              // @ts-ignore
              foregroundStyle="tertiaryLabel"
              multilineTextAlignment="center"
            >{loggedIn ? '打开 App 刷新' : '请先登录'}</Text>
          )}
          {/* 今日奖励 */}
          {rewardName ? (
            <HStack spacing={8} alignment="center"
              // @ts-ignore
              padding={{ vertical: 6, horizontal: 10 }}
              // @ts-ignore
              background="rgba(148,130,220,0.1)"
              // @ts-ignore
              cornerRadius={8}
            >
              <Text font="caption">{'\uD83C\uDF81'}</Text>
              <VStack spacing={1} frame={{ maxWidth: 'infinity' }}>
                <Text font="caption" fontWeight="bold">{rewardName}</Text>
                <Text font="caption2" foregroundStyle="secondaryLabel">{'x' + rewardCount + '  签到第' + (useRole?.signDays || 0) + '天奖励'}</Text>
              </VStack>
              {useRole?.signedToday ? (
                <Text font="caption2" fontWeight="bold" foregroundStyle="systemGreen">已领取</Text>
              ) : (
                <Text font="caption2" foregroundStyle="systemOrange">待领取</Text>
              )}
            </HStack>
          ) : null}
          {/* 游戏数据（账号信息） */}
          {useRole && useRole.gameStats && useRole.gameStats.length > 0 ? (
            <HStack spacing={0} alignment="center"
              // @ts-ignore
              padding={{ vertical: 6, horizontal: 10 }}
              // @ts-ignore
              background="rgba(255,255,255,0.03)"
              // @ts-ignore
              cornerRadius={8}
            >
              {useRole.gameStats.map((s: any, i: number) => (
                <VStack key={i} spacing={1}
                  // @ts-ignore
                  frame={{ maxWidth: "infinity" }}
                  alignment="center"
                >
                  <Text font="title3" fontWeight="bold"
                    // @ts-ignore
                    foregroundStyle="label"
                  >{s.value}</Text>
                  <Text font="caption2"
                    // @ts-ignore
                    foregroundStyle="tertiaryLabel"
                  >{s.name}</Text>
                </VStack>
              ))}
            </HStack>
          ) : null}
          {/* 最近日志 */}
          {lastResultLines.length > 0 ? (
            <VStack spacing={2}
              // @ts-ignore
              padding={{ vertical: 6, horizontal: 10 }}
              // @ts-ignore
              background="rgba(255,255,255,0.05)"
              // @ts-ignore
              cornerRadius={8}
            >
              <Text font="caption2" fontWeight="bold"
                foregroundStyle="secondaryLabel"
              >最近日志</Text>
              {lastResultLines.map((line: string, i: number) => (
                <Text key={i} font="caption2"
                  foregroundStyle="tertiaryLabel"
                  lineLimit={1}
                >{line}</Text>
              ))}
            </VStack>
          ) : null}
          {/* 底部信息 */}
          <VStack spacing={2}>
            {sched.enabled ? (
              <Text font="caption"
                // @ts-ignore
                foregroundStyle="tertiaryLabel"
              >{'\u23F0 ' + String(sched.hour).padStart(2, '0') + ':' + String(sched.minute).padStart(2, '0') + (lastRun ? ('  \u00B7 ' + (success ? '\u2705' : '\u274C') + ' ' + lastRun) : '')}</Text>
            ) : null}
            {updateTime ? (
              <Text font="caption2"
                // @ts-ignore
                foregroundStyle="tertiaryLabel"
              >{updateTime}</Text>
            ) : null}
          </VStack>
        </VStack>
      )
    }

    Widget.present(view, {
      policy: "after",
      date: nextRefresh
    })
  } catch (error) {
    Widget.present(
      <VStack
        // @ts-ignore
        background="#1C1C1E"
        // @ts-ignore
        cornerRadius={20}
        // @ts-ignore
        padding={16}
        alignment="center"
        spacing={4}
      >
        <Text font="headline">米游社助手</Text>
        <Text font="caption"
          // @ts-ignore
          foregroundStyle="systemRed"
        >加载失败</Text>
      </VStack>
    )
  }
})()
