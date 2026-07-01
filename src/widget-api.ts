/**
 * 米游社自动助手 - 组件专用 API v2.0
 *
 * 修复：
 *   - DS 签名使用完整 MD5（之前用简易 hash 导致签名错误）
 *   - 支持查询所有游戏的签到状态
 *   - 数据结构与新类型系统对齐
 */

import { fetch } from 'scripting'

// ============ 类型定义 ============

export interface GameRole {
  game_uid: string
  region: string
  region_name: string
  nickname: string
  level: number
  game_biz: string
  is_chosen: boolean
}

export interface TaskProgress {
  id: number
  name: string
  current: number
  total: number
  reward: number
  done: boolean
}

export interface SignStatus {
  gameId: string
  gameName: string
  signed: boolean
  signDays: number
}

export interface WidgetData {
  nickname: string
  serverName: string
  level: number
  coinBalance: number
  coinToday: number
  signDays: number
  signedToday: boolean
  tasks: TaskProgress[]
  signStatuses: SignStatus[]
  gameStats: Array<{ name: string; value: string }>
  fetchTime: number
  loggedIn: boolean
}

// ============ MD5 实现（完整版） ============

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
    a=FF(a,b,c,d,w[k+0],7,0xD76AA478);d=FF(d,a,b,c,w[k+1],12,0xE8C7B756);c=FF(c,d,a,b,w[k+2],17,0x242070DB);b=FF(b,c,d,a,w[k+3],22,0xC1BDCEEE)
    a=FF(a,b,c,d,w[k+4],7,0xF57C0FAF);d=FF(d,a,b,c,w[k+5],12,0x4787C62A);c=FF(c,d,a,b,w[k+6],17,0xA8304613);b=FF(b,c,d,a,w[k+7],22,0xFD469501)
    a=FF(a,b,c,d,w[k+8],7,0x698098D8);d=FF(d,a,b,c,w[k+9],12,0x8B44F7AF);c=FF(c,d,a,b,w[k+10],17,0xFFFF5BB1);b=FF(b,c,d,a,w[k+11],22,0x895CD7BE)
    a=FF(a,b,c,d,w[k+12],7,0x6B901122);d=FF(d,a,b,c,w[k+13],12,0xFD987193);c=FF(c,d,a,b,w[k+14],17,0xA679438E);b=FF(b,c,d,a,w[k+15],22,0x49B40821)
    a=GG(a,b,c,d,w[k+1],5,0xF61E2562);d=GG(d,a,b,c,w[k+6],9,0xC040B340);c=GG(c,d,a,b,w[k+11],14,0x265E5A51);b=GG(b,c,d,a,w[k+0],20,0xE9B6C7AA)
    a=GG(a,b,c,d,w[k+5],5,0xD62F105D);d=GG(d,a,b,c,w[k+10],9,0x02441453);c=GG(c,d,a,b,w[k+15],14,0xD8A1E681);b=GG(b,c,d,a,w[k+4],20,0xE7D3FBC8)
    a=GG(a,b,c,d,w[k+9],5,0x21E1CDE6);d=GG(d,a,b,c,w[k+14],9,0xC33707D6);c=GG(c,d,a,b,w[k+3],14,0xF4D50D87);b=GG(b,c,d,a,w[k+8],20,0x455A14ED)
    a=GG(a,b,c,d,w[k+13],5,0xA9E3E905);d=GG(d,a,b,c,w[k+2],9,0xFCEFA3F8);c=GG(c,d,a,b,w[k+7],14,0x676F02D9);b=GG(b,c,d,a,w[k+12],20,0x8D2A4C8A)
    a=HH(a,b,c,d,w[k+5],4,0xFFFA3942);d=HH(d,a,b,c,w[k+8],11,0x8771F681);c=HH(c,d,a,b,w[k+11],16,0x6D9D6122);b=HH(b,c,d,a,w[k+14],23,0xFDE5380C)
    a=HH(a,b,c,d,w[k+1],4,0xA4BEEA44);d=HH(d,a,b,c,w[k+4],11,0x4BDECFA9);c=HH(c,d,a,b,w[k+7],16,0xF6BB4B60);b=HH(b,c,d,a,w[k+10],23,0xBEBFBC70)
    a=HH(a,b,c,d,w[k+13],4,0x289B7EC6);d=HH(d,a,b,c,w[k+0],11,0xEAA127FA);c=HH(c,d,a,b,w[k+3],16,0xD4EF3085);b=HH(b,c,d,a,w[k+6],23,0x04881D05)
    a=HH(a,b,c,d,w[k+9],4,0xD9D4D039);d=HH(d,a,b,c,w[k+12],11,0xE6DB99E5);c=HH(c,d,a,b,w[k+15],16,0x1FA27CF8);b=HH(b,c,d,a,w[k+2],23,0xC4AC5665)
    a=II(a,b,c,d,w[k+0],6,0xF4292244);d=II(d,a,b,c,w[k+7],10,0x432AFF97);c=II(c,d,a,b,w[k+14],15,0xAB9423A7);b=II(b,c,d,a,w[k+5],21,0xFC93A039)
    a=II(a,b,c,d,w[k+12],6,0x655B59C3);d=II(d,a,b,c,w[k+3],10,0x8F0CCC92);c=II(c,d,a,b,w[k+10],15,0xFFEFF47D);b=II(b,c,d,a,w[k+1],21,0x85845DD1)
    a=II(a,b,c,d,w[k+8],6,0x6FA87E4F);d=II(d,a,b,c,w[k+15],10,0xFE2CE6E0);c=II(c,d,a,b,w[k+6],15,0xA3014314);b=II(b,c,d,a,w[k+13],21,0x4E0811A1)
    a=II(a,b,c,d,w[k+4],6,0xF7537E82);d=II(d,a,b,c,w[k+11],10,0xBD3AF235);c=II(c,d,a,b,w[k+2],15,0x2AD7D2BB);b=II(b,c,d,a,w[k+9],21,0xEB86D391)
    a=X(a,A);b=X(b,B);c=X(c,C);d=X(d,D)
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

// ============ 游戏签到查询 ============

/** 游戏签到配置 */
const GAME_SIGN_CONFIG: Record<string, { gameCode: string; actId: string; name: string }> = {
  genshin:   { gameCode: 'hk4e', actId: 'e202311201442471', name: '原神' },
  starrail:  { gameCode: 'hkrpg', actId: 'e202304121431091', name: '星铁' },
  zzz:       { gameCode: 'nap', actId: 'e202407291442471', name: '绝区零' },
  honkai3rd: { gameCode: 'bh3', actId: 'e202203021431091', name: '崩坏3' },
  tot:       { gameCode: 'nxx', actId: 'e202203021431091', name: '未定' },
}

/** 查询单个游戏的签到状态 */
async function queryGameSign(
  gameCode: string,
  actId: string,
  gameUid: string,
  region: string
): Promise<{ signed: boolean; signDays: number }> {
  try {
    const url = `https://api-takumi.mihoyo.com/event/luna/${gameCode}/resign_info?uid=${gameUid}&region=${region}&act_id=${actId}`
    const headers = getBBSHeaders(url)
    headers['x-rpc-signgame'] = gameCode
    const res = await fetch(url, { method: 'GET', headers })
      .then((r: any) => r.json()).catch(() => null)
    return {
      signed: !!res?.data?.signed,
      signDays: res?.data?.sign_days || 0,
    }
  } catch {
    return { signed: false, signDays: 0 }
  }
}

// ============ 公开接口 ============

/**
 * 获取完整的组件显示数据
 * 先从 API 获取，缓存到 Storage，组件直接读取
 */
export async function fetchWidgetData(): Promise<WidgetData> {
  const loggedIn = getCookie() !== ''

  if (!loggedIn) {
    return {
      nickname: '', serverName: '', level: 0,
      coinBalance: 0, coinToday: 0, signDays: 0, signedToday: false,
      tasks: [], signStatuses: [], gameStats: [],
      fetchTime: 0, loggedIn: false,
    }
  }

  // 1. 获取角色信息
  const roleUrl = 'https://api-takumi.mihoyo.com/binding/api/getUserGameRolesByCookie?game_biz=hk4e_cn'
  const roleRes = await fetch(roleUrl, { method: 'GET', headers: getBBSHeaders(roleUrl) })
    .then((r: any) => r.json()).catch(() => null)
  const role = roleRes?.data?.list?.find((r: any) => r.is_chosen) || roleRes?.data?.list?.[0]

  // 2. 获取任务状态
  const missionUrl = 'https://bbs-api.miyoushe.com/apihub/wapi/getUserMissionsState'
  const missionRes = await fetch(missionUrl, { method: 'GET', headers: getBBSHeaders(missionUrl) })
    .then((r: any) => r.json()).catch(() => null)
  const missionData = missionRes?.data
  const states = missionData?.states || []
  const totalPoints = missionData?.total_points || 0
  const canGetPoints = missionData?.can_get_points || 0

  // 3. 解析任务
  const taskDefs = [
    { id: 59, name: '浏览3个帖子', total: 3, reward: 20 },
    { id: 60, name: '完成5次点赞', total: 5, reward: 30 },
    { id: 61, name: '分享帖子', total: 1, reward: 10 },
  ]
  const tasks: TaskProgress[] = taskDefs.map(def => {
    const state = states.find((s: any) => s.mission_id === def.id)
    const current = Math.min(state?.happened_times || 0, def.total)
    return { id: def.id, name: def.name, current, total: def.total, reward: def.reward, done: current >= def.total }
  })

  // 4. 查询所有游戏签到状态
  const signStatuses: SignStatus[] = []
  if (role?.game_uid) {
    for (const [gameId, cfg] of Object.entries(GAME_SIGN_CONFIG)) {
      const status = await queryGameSign(cfg.gameCode, cfg.actId, role.game_uid, role.region || 'cn_gf01')
      signStatuses.push({ gameId, gameName: cfg.name, ...status })
    }
  }

  // 5. 获取游戏记录
  const cookieStr = getCookie()
  const mihoyoUid = cookieStr.match(/account_id=(\d+)/)?.[1] || ''
  const recordUrl = `https://api-takumi-record.mihoyo.com/game_record/app/card/wapi/getGameRecordCard?uid=${mihoyoUid}`
  const recordRes = await fetch(recordUrl, { method: 'GET', headers: getBBSHeaders(recordUrl) })
    .then((r: any) => r.json()).catch(() => null)
  const gameStats = recordRes?.data?.list?.[0]?.data || []

  // 6. 汇总签到数据
  const genshinSign = signStatuses.find(s => s.gameId === 'genshin')

  const data: WidgetData = {
    nickname: role?.nickname || '未知角色',
    serverName: role?.region_name || '未知服务器',
    level: role?.level || 0,
    coinBalance: totalPoints,
    coinToday: canGetPoints,
    signDays: genshinSign?.signDays || 0,
    signedToday: genshinSign?.signed || false,
    tasks,
    signStatuses,
    gameStats,
    fetchTime: Date.now(),
    loggedIn: true,
  }

  // 缓存到 Storage
  Storage.set('widget_role_data', JSON.stringify(data))
  return data
}
