/**
 * 米游社自动助手 - 工具函数
 * 包含加密、存储、随机延迟等通用功能
 */

// Storage 是全局 API，不需要从 scripting 导入
import { Notification, Script } from 'scripting'
import { STORAGE_KEYS, type AppConfig, DEFAULT_CONFIG } from './types'

// ============ MD5 加密实现 ============

/**
 * MD5 哈希算法实现
 * 用于生成米游社 API 的 DS 签名
 */
export function md5(string: string): string {
  function safeAdd(x: number, y: number) {
    const lsw = (x & 0xffff) + (y & 0xffff)
    const msw = (x >> 16) + (y >> 16) + (lsw >> 16)
    return (msw << 16) | (lsw & 0xffff)
  }
  function bitRotateLeft(num: number, cnt: number) {
    return (num << cnt) | (num >>> (32 - cnt))
  }
  function md5cmn(q: number, a: number, b: number, x: number, s: number, t: number) {
    return safeAdd(bitRotateLeft(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b)
  }
  function md5ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return md5cmn((b & c) | (~b & d), a, b, x, s, t)
  }
  function md5gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return md5cmn((b & d) | (c & ~d), a, b, x, s, t)
  }
  function md5hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return md5cmn(b ^ c ^ d, a, b, x, s, t)
  }
  function md5ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return md5cmn(c ^ (b | ~d), a, b, x, s, t)
  }
  function binlMD5(x: number[], len: number) {
    x[len >> 5] |= 0x80 << (len % 32)
    x[((len + 64) >>> 9 << 4) + 14] = len
    let a = 1732584193, b = -271733879, c = -1732584194, d = 271733878
    for (let i = 0; i < x.length; i += 16) {
      const olda = a, oldb = b, oldc = c, oldd = d
      a = md5ff(a, b, c, d, x[i], 7, -680876936)
      d = md5ff(d, a, b, c, x[i+1], 12, -389564586)
      c = md5ff(c, d, a, b, x[i+2], 17, 606105819)
      b = md5ff(b, c, d, a, x[i+3], 22, -1044525330)
      a = md5ff(a, b, c, d, x[i+4], 7, -176418897)
      d = md5ff(d, a, b, c, x[i+5], 12, 1200080426)
      c = md5ff(c, d, a, b, x[i+6], 17, -1473231341)
      b = md5ff(b, c, d, a, x[i+7], 22, -45705983)
      a = md5ff(a, b, c, d, x[i+8], 7, 1770035416)
      d = md5ff(d, a, b, c, x[i+9], 12, -1958414417)
      c = md5ff(c, d, a, b, x[i+10], 17, -42063)
      b = md5ff(b, c, d, a, x[i+11], 22, -1990404162)
      a = md5ff(a, b, c, d, x[i+12], 7, 1804603682)
      d = md5ff(d, a, b, c, x[i+13], 12, -40341101)
      c = md5ff(c, d, a, b, x[i+14], 17, -1502002290)
      b = md5ff(b, c, d, a, x[i+15], 22, 1236535329)
      a = md5gg(a, b, c, d, x[i+1], 5, -165796510)
      d = md5gg(d, a, b, c, x[i+6], 9, -1069501632)
      c = md5gg(c, d, a, b, x[i+11], 14, 643717713)
      b = md5gg(b, c, d, a, x[i], 20, -373897302)
      a = md5gg(a, b, c, d, x[i+5], 5, -701558691)
      d = md5gg(d, a, b, c, x[i+10], 9, 38016083)
      c = md5gg(c, d, a, b, x[i+15], 14, -660478335)
      b = md5gg(b, c, d, a, x[i+4], 20, -405537848)
      a = md5gg(a, b, c, d, x[i+9], 5, 568446438)
      d = md5gg(d, a, b, c, x[i+14], 9, -1019803690)
      c = md5gg(c, d, a, b, x[i+3], 14, -187363961)
      b = md5gg(b, c, d, a, x[i+8], 20, 1163531501)
      a = md5gg(a, b, c, d, x[i+13], 5, -1444681467)
      d = md5gg(d, a, b, c, x[i+2], 9, -51403784)
      c = md5gg(c, d, a, b, x[i+7], 14, 1735328473)
      b = md5gg(b, c, d, a, x[i+12], 20, -1926607734)
      a = md5hh(a, b, c, d, x[i+5], 4, -378558)
      d = md5hh(d, a, b, c, x[i+8], 11, -2022574463)
      c = md5hh(c, d, a, b, x[i+11], 16, 1839030562)
      b = md5hh(b, c, d, a, x[i+14], 23, -35309556)
      a = md5hh(a, b, c, d, x[i+1], 4, -1530992060)
      d = md5hh(d, a, b, c, x[i+4], 11, 1272893353)
      c = md5hh(c, d, a, b, x[i+7], 16, -155497632)
      b = md5hh(b, c, d, a, x[i+10], 23, -1094730640)
      a = md5hh(a, b, c, d, x[i+13], 4, 681279174)
      d = md5hh(d, a, b, c, x[i+0], 11, -358537222)
      c = md5hh(c, d, a, b, x[i+3], 16, -722521979)
      b = md5hh(b, c, d, a, x[i+6], 23, 76029189)
      a = md5hh(a, b, c, d, x[i+9], 4, -640364487)
      d = md5hh(d, a, b, c, x[i+12], 11, -421815835)
      c = md5hh(c, d, a, b, x[i+15], 16, 530742520)
      b = md5hh(b, c, d, a, x[i+2], 23, -995338651)
      a = md5ii(a, b, c, d, x[i], 6, -198630844)
      d = md5ii(d, a, b, c, x[i+7], 10, 1126891415)
      c = md5ii(c, d, a, b, x[i+14], 15, -1416354905)
      b = md5ii(b, c, d, a, x[i+5], 21, -57434055)
      a = md5ii(a, b, c, d, x[i+12], 6, 1700485571)
      d = md5ii(d, a, b, c, x[i+3], 10, -1894986606)
      c = md5ii(c, d, a, b, x[i+10], 15, -1051523)
      b = md5ii(b, c, d, a, x[i+1], 21, -2054922799)
      a = md5ii(a, b, c, d, x[i+8], 6, 1873313359)
      d = md5ii(d, a, b, c, x[i+15], 10, -30611744)
      c = md5ii(c, d, a, b, x[i+6], 15, -1560198380)
      b = md5ii(b, c, d, a, x[i+13], 21, 1309151649)
      a = md5ii(a, b, c, d, x[i+4], 6, -145523070)
      d = md5ii(d, a, b, c, x[i+11], 10, -1120210379)
      c = md5ii(c, d, a, b, x[i+2], 15, 718787259)
      b = md5ii(b, c, d, a, x[i+9], 21, -343485551)
      a = safeAdd(a, olda)
      b = safeAdd(b, oldb)
      c = safeAdd(c, oldc)
      d = safeAdd(d, oldd)
    }
    return [a, b, c, d]
  }
  function binl2rstr(input: number[]) {
    let output = ''
    for (let i = 0; i < input.length * 32; i += 8) {
      output += String.fromCharCode((input[i >> 5] >>> (i % 32)) & 0xff)
    }
    return output
  }
  function rstr2binl(input: string) {
    const output: number[] = []
    for (let i = 0; i < input.length * 8; i += 8) {
      output[i >> 5] |= (input.charCodeAt(i / 8) & 0xff) << (i % 32)
    }
    return output
  }
  function str2rstrUTF8(input: string) {
    return unescape(encodeURIComponent(input))
  }
  function rstrMD5(s: string) {
    return binl2rstr(binlMD5(rstr2binl(s), s.length * 8))
  }
  function hexMD5(s: string) {
    return rstr2hex(rstrMD5(str2rstrUTF8(s)))
  }
  function rstr2hex(input: string) {
    const hexTab = '0123456789abcdef'
    let output = ''
    for (let i = 0; i < input.length; i++) {
      const x = input.charCodeAt(i)
      output += hexTab.charAt((x >>> 4) & 0x0f) + hexTab.charAt(x & 0x0f)
    }
    return output
  }
  return hexMD5(string)
}

// ============ UUID 生成 ============

/**
 * 生成 UUID v4
 * 用于生成设备 ID
 */
export function uuidv4(): string {
  const chars = '0123456789abcdef'.split('')
  const uuid: string[] = []
  const rnd = Math.random
  let r = 0

  uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-'
  uuid[14] = '4' // version 4

  for (let i = 0; i < 36; i++) {
    if (!uuid[i]) {
      r = 0 | (rnd() * 16)
      uuid[i] = chars[i === 19 ? (r & 0x3) | 0x8 : r & 0xf]
    }
  }

  return uuid.join('')
}

// ============ 随机工具 ============

/**
 * 生成随机字符串
 * @param length 字符串长度
 */
export function getRandomString(length: number): string {
  const chars = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678'
  const maxPos = chars.length
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * maxPos))
  }
  return result
}

/**
 * 生成指定范围的随机整数
 * @param min 最小值（包含）
 * @param max 最大值（包含）
 */
export function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1) + min)
}

/**
 * 随机延迟 2-5 秒
 * 用于防止请求过于频繁触发风控
 */
export async function randomSleep(): Promise<void> {
  const seconds = getRandomInt(2, 5)
  await sleep(seconds * 1000)
}

/**
 * 延迟指定毫秒
 * @param ms 毫秒数
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ============ DS 签名生成 ============

/**
 * DS 签名配置
 * 源自 PizzaHelperUnited + 参考米哈游.js 项目
 *
 * DS 格式：md5(salt + t + r + b + q)
 * - BBS API 使用 saltX4
 * - 游戏签到 API 使用 saltX6
 */
export const DS_CONFIG = {
  // 米游社 DS Salt (X4) — BBS API 使用
  saltX4: 'xV8v4Qu54lUKrEYFZkJhB8cuOh9Asafs',
  // 米游社 DS Salt (X6) — 游戏签到 API 使用
  saltX6: 't0qEgfub6cvueAPgR5m9aQWWVciEer7v',
  // 米游社 x-rpc-app_version（与官方 App 保持一致）
  appVersion: '2.110.0',
  // 米游社 x-rpc-client_type (5=App)
  clientType: '5',
  // 设备 ID（首次生成后持久化存储）
  get deviceId(): string {
    let id = Storage.get<string>('mihoyo_device_id')
    if (!id) {
      id = uuidv4().replace(/-/g, '').toUpperCase()
      Storage.set('mihoyo_device_id', id)
    }
    return id
  },
  // 设备指纹（首次生成后持久化存储）
  get deviceFp(): string {
    let fp = Storage.get<string>('mihoyo_device_fp')
    if (!fp) {
      fp = getRandomString(13)
      Storage.set('mihoyo_device_fp', fp)
    }
    return fp
  },
}

/**
 * 生成随机 6 位数（100000~199999），用于 DS 签名
 * 与参考项目和 200307 版本保持一致
 */
function getDSRandom(): string {
  return Math.floor(Math.random() * 100000 + 100000).toString()
}

/**
 * 生成 BBS API 的 DS 签名
 * 源自 200307 版本，公式: md5(salt={saltX4}&t={time}&r={random}&b={body}&q={query})
 * 始终包含 body 和 query 参数（即使为空字符串）
 * @param body 请求体字符串（GET 请求传空字符串）
 * @param query URL 查询字符串
 */
export function getDS(body: string = '', query: string = ''): string {
  const t = Math.floor(Date.now() / 1000).toString()
  const r = getDSRandom()
  const c = md5(`salt=${DS_CONFIG.saltX4}&t=${t}&r=${r}&b=${body}&q=${query}`)
  return `${t},${r},${c}`
}

/**
 * 生成 DS V2（游戏签到 API 使用）
 * 公式: md5(salt={saltX6}&t={time}&r={random}&b={body}&q={query})
 * @param body 请求体 JSON 字符串
 * @param query URL 查询字符串（? 后面的部分）
 */
export function getGameSign_DS(body: string, query: string = ''): string {
  const t = Math.floor(Date.now() / 1000).toString()
  const r = getDSRandom()
  const c = md5(`salt=${DS_CONFIG.saltX6}&t=${t}&r=${r}&b=${body}&q=${query}`)
  return `${t},${r},${c}`
}

/**
 * 生成 BBS POST DS（包含 body）
 * 公式: md5(salt={saltX4}&t={time}&r={random}&b={body}&q=)
 * 用于 BBS POST 端点
 */
export function getBBS_DS_WithBody(body: string): string {
  const t = Math.floor(Date.now() / 1000).toString()
  const r = getDSRandom()
  const c = md5(`salt=${DS_CONFIG.saltX4}&t=${t}&r=${r}&b=${body}&q=`)
  return `${t},${r},${c}`
}

/**
 * 生成讨论区签到 DS（简化版，不含 body/query）
 * 公式: md5(salt={saltX4}&t={time}&r={random})
 * 仅用于 /apihub/app/api/signIn 端点
 */
export function getSignInDS(): string {
  const t = Math.floor(Date.now() / 1000).toString()
  const r = getDSRandom()
  const c = md5(`salt=${DS_CONFIG.saltX4}&t=${t}&r=${r}`)
  return `${t},${r},${c}`
}

/**
 * 从完整 URL 中提取查询字符串
 * 例如: 'https://api.example.com/path?a=1&b=2' => 'a=1&b=2'
 */
export function extractQuery(url: string): string {
  const idx = url.indexOf('?')
  return idx >= 0 ? url.substring(idx + 1) : ''
}

// ============ Headers 构建 ============

/**
 * 米游社 User-Agent
 * 源自 PizzaHelperUnited URLRequestConfig.getUserAgent()
 */
const MIYOUSHE_UA = `Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) miHoYoBBS/${DS_CONFIG.appVersion}`

/**
 * 构建完整的米游社 API 请求头
 * 源自 PizzaHelperUnited URLRequestConfig.defaultHeaders()
 * @param cookie 用户 Cookie 字符串
 * @param ds DS 签名
 * @param extra 额外的自定义头
 */
export function buildHeaders(
  cookie: string,
  ds: string,
  extra?: Record<string, string>
): Record<string, string> {
  const headers: Record<string, string> = {
    'User-Agent': MIYOUSHE_UA,
    'Referer': 'https://webstatic.mihoyo.com',
    'Origin': 'https://webstatic.mihoyo.com',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'zh-CN,zh-Hans;q=0.9',
    'Accept': 'application/json, text/plain, */*',
    'Connection': 'keep-alive',
    'X-Requested-With': 'com.mihoyo.hyperion',
    'x-rpc-app_version': DS_CONFIG.appVersion,
    'x-rpc-client_type': DS_CONFIG.clientType,
    'x-rpc-page': '3.1.3_#/rpg',
    'x-rpc-device_id': DS_CONFIG.deviceId,
    'x-rpc-language': 'zh-cn',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Site': 'same-site',
    'Sec-Fetch-Mode': 'cors',
    'Cookie': cookie,
    'DS': ds,
  }
  if (extra) {
    Object.assign(headers, extra)
  }
  return headers
}

/**
 * 获取已保存的 Cookie 字符串
 * 统一从存储中读取用户登录后的 Cookie
 */
export function getCookie(): string {
  const cookie = Storage.get<string>(STORAGE_KEYS.COOKIE)
  if (!cookie) {
    throw new Error('未登录，请先通过 WebView 登录获取 Cookie')
  }
  return cookie
}

/**
 * 获取米游币任务的 Headers（自动生成 DS）
 * 恢复 200307 版本逻辑：DS 始终包含 body 和 query
 * @param url 完整的请求 URL（用于提取 query 生成 DS）
 * @param body 请求体字符串（POST 请求传 JSON 字符串）
 */
export function getBBSHeaders(url?: string, body?: string): Record<string, string> {
  const cookie = getCookie()
  const query = url ? extractQuery(url) : ''
  const ds = getDS(body || '', query)
  return buildHeaders(cookie, ds)
}

/**
 * 生成 16 位随机十六进制字符串
 * 用于 x-rpc-post_request_id 等请求标识
 */
function generateRequestId(): string {
  const chars = '0123456789abcdef'
  let result = ''
  for (let i = 0; i < 16; i++) {
    result += chars[Math.floor(Math.random() * 16)]
  }
  return result
}

/**
 * 生成 x-trace-id
 * 格式: {hex}:{hex}:0:1（与官方 APP 抓包一致）
 */
function generateTraceId(): string {
  const id = generateRequestId()
  return `${id}:${id}:0:1`
}

/**
 * 获取 BBS POST 请求的 Headers
 * 优先使用 stoken（APP 级别令牌），回退到 ltoken（Web 令牌）
 * 使用原生 APP headers 格式（client_type=1）
 * @param body 请求体 JSON 字符串
 * @param query URL 查询字符串
 * @param forceWebCookie 强制使用 Web Cookie（stoken 失效时回退用）
 */
export function getBBSPostHeaders(body: string = '', query: string = '', forceWebCookie: boolean = false): Record<string, string> {
  const stokenCookie = forceWebCookie ? null : getStokenCookie()
  const cookie = stokenCookie || getCookie()
  const ds = getDS(body, query)

  if (stokenCookie) {
    // 使用原生 APP headers（与官方 APP 抓包完全一致）
    return {
      'User-Agent': 'Hyperion/563 CFNetwork/3860.600.12 Darwin/25.5.0',
      'Referer': 'https://app.mihoyo.com',
      'x-rpc-app_version': DS_CONFIG.appVersion,
      'x-rpc-client_type': '1',
      'x-rpc-device_id': DS_CONFIG.deviceId,
      'x-rpc-device_fp': DS_CONFIG.deviceFp,
      'x-rpc-verify_key': 'bll8iq97cem8',
      'x-rpc-device_model': 'iPhone14,7',
      'x-rpc-device_name': 'iPhone',
      'x-rpc-channel': 'appstore',
      'x-rpc-csm_source': 'home',
      'x-rpc-sys_version': '26.5',
      'x-rpc-h265_supported': '0',
      'x-trace-id': `${Math.floor(Date.now()/1000)}:${Math.floor(Date.now()/1000)}:0:1`,
      'Accept': '*/*',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept-Language': 'zh-CN,zh-Hans;q=0.9',
      'Content-Type': 'application/json',
      'Cookie': cookie,
      'DS': ds,
    }
  }

  // 回退到 Web headers
  return {
    ...buildHeaders(cookie, ds),
    'Content-Type': 'application/json',
  }
}

/**
 * 获取游戏签到的 Headers（自动生成 DS）
 * 游戏签到 API 使用 V2 DS（包含 body，使用 saltX6）
 * @param url 完整的请求 URL（用于提取 query 生成 DS）
 * @param body 请求体字符串（POST 请求传 JSON 字符串）
 */
export function getSignHeaders(gameCode: string = 'hk4e'): Record<string, string> {
  const cookie = getCookie()
  // Luna API（游戏签到）使用与官方 App 完全匹配的 headers
  // 不需要 DS 签名、x-rpc-app_version、x-rpc-client_type、x-rpc-device_id
  return {
    'User-Agent': `Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) miHoYoBBS/${DS_CONFIG.appVersion}`,
    'Referer': 'https://act.mihoyo.com/',
    'Origin': 'https://act.mihoyo.com',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'zh-CN,zh-Hans;q=0.9',
    'Accept': 'application/json, text/plain, */*',
    'Connection': 'keep-alive',
    'x-rpc-signgame': gameCode,
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Site': 'same-site',
    'Sec-Fetch-Mode': 'cors',
    'Cookie': cookie,
  }
}

/**
 * 获取任务列表查询的 Headers
 * 米游币任务状态查询接口使用此 Headers
 */
export function getTaskHeaders(): Record<string, string> {
  return getBBSHeaders()
}

// ============ 存储工具 ============

/**
 * 获取应用配置
 */
export function getConfig(): AppConfig {
  const configStr = Storage.get<string>(STORAGE_KEYS.CONFIG)
  if (!configStr) {
    return { ...DEFAULT_CONFIG }
  }
  try {
    return { ...DEFAULT_CONFIG, ...JSON.parse(configStr) }
  } catch {
    return { ...DEFAULT_CONFIG }
  }
}

/**
 * 保存应用配置
 */
export function saveConfig(config: AppConfig): void {
  Storage.set(STORAGE_KEYS.CONFIG, JSON.stringify(config))
}

/**
 * 检查是否已登录（Cookie 是否已配置）
 */
export function isLoggedIn(): boolean {
  return Storage.contains(STORAGE_KEYS.COOKIE)
}

/**
 * 保存 Cookie
 * @param cookie 从 WebView 中提取的完整 Cookie 字符串
 */
export function saveCookie(cookie: string): void {
  Storage.set(STORAGE_KEYS.COOKIE, cookie)
}

/**
 * 清除登录数据
 */
export function clearLoginData(): void {
  Storage.remove(STORAGE_KEYS.COOKIE)
}

// ============ stoken 管理 ============

/**
 * 从 Cookie 字符串中解析并保存 stoken
 * @param cookieStr 包含 stoken 和 stuid 的 Cookie 字符串
 */
export function saveStokenFromCookie(cookieStr: string): {
  success: boolean
  message: string
} {
  const parts = cookieStr.split(';').map(s => s.trim())
  let stoken = '', stuid = '', mid = ''
  for (const part of parts) {
    const eqIdx = part.indexOf('=')
    if (eqIdx < 0) continue
    const key = part.substring(0, eqIdx).trim()
    const value = part.substring(eqIdx + 1)
    if (key === 'stoken') stoken = value
    if (key === 'stuid') stuid = value
    if (key === 'mid') mid = value
  }
  if (!stoken || !stuid) {
    return { success: false, message: '缺少 stoken 或 stuid 字段' }
  }
  Storage.set('mihoyo_stoken', stoken)
  Storage.set('mihoyo_stuid', stuid)
  if (mid) Storage.set('mihoyo_mid', mid)
  return { success: true, message: `stoken 已保存 (stuid: ${stuid})` }
}

/**
 * 检查是否已配置 stoken
 */
export function hasStoken(): boolean {
  return Storage.contains('mihoyo_stoken') && Storage.contains('mihoyo_stuid')
}

/**
 * 清除 stoken
 */
export function clearStoken(): void {
  Storage.remove('mihoyo_stoken')
  Storage.remove('mihoyo_stuid')
  Storage.remove('mihoyo_mid')
}

/**
 * 获取 stoken Cookie 字符串
 * 格式: stuid=xxx;stoken=xxx;mid=xxx;login_ticket=（与官方 APP 抓包完全一致）
 */
function getStokenCookie(): string | null {
  const stoken = Storage.get<string>('mihoyo_stoken')
  const stuid = Storage.get<string>('mihoyo_stuid')
  if (!stoken || !stuid) return null
  const mid = Storage.get<string>('mihoyo_mid') || ''
  let cookie = `stuid=${stuid};stoken=${stoken}`
  if (mid) cookie += `;mid=${mid}`
  cookie += ';login_ticket='
  return cookie
}

// ============ 定时调度工具 ============

/** 定时配置 */
export interface ScheduleConfig {
  enabled: boolean
  hour: number
  minute: number
}

/** 获取定时配置 */
export function getScheduleConfig(): ScheduleConfig {
  const str = Storage.get<string>('mihoyo_schedule')
  if (!str) return { enabled: false, hour: 8, minute: 0 }
  try {
    return JSON.parse(str)
  } catch {
    return { enabled: false, hour: 8, minute: 0 }
  }
}

/** 保存定时配置 */
export function saveScheduleConfig(config: ScheduleConfig): void {
  Storage.set('mihoyo_schedule', JSON.stringify(config))
}

/**
 * 注册每日定时通知
 * 用户点击通知后会自动运行脚本执行任务
n * @param hour 小时 (0-23)
 * @param minute 分钟 (0-59)
 */
export async function scheduleNotification(hour: number, minute: number): Promise<boolean> {
  try {
    // 先取消所有旧通知，防止重复
    await Notification.removeAllPendings()
    await Notification.removeAllDelivereds()

    const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
    const dateComponents = new DateComponents()
    dateComponents.hour = hour
    dateComponents.minute = minute
    const trigger = new CalendarNotificationTrigger({
      dateMatching: dateComponents,
      repeats: true,
    })
    const success = await Notification.schedule({
      title: '🎮 米游社自动助手',
      subtitle: '定时签到任务',
      body: `⏰ ${timeStr} 签到时间到了，点击执行`,
      trigger,
      iconImageData: { systemImage: 'gamecontroller.fill', color: 'systemYellow' },
      threadIdentifier: 'mihoyo-schedule',
      userInfo: { autoExecute: true, scheduledTime: timeStr },
      tapAction: { type: 'runScript', scriptName: Script.name },
    })
    return success
  } catch (e) {
    console.error('注册定时通知失败:', e)
    return false
  }
}

/**
 * 取消所有定时通知
 */
export async function cancelScheduleNotification(): Promise<void> {
  try {
    await Notification.removeAllPendings()
    await Notification.removeAllDelivereds()
  } catch (e) {
    console.error('取消通知失败:', e)
  }
}

// ============ 通知工具 ============

/**
 * 发送本地通知
 * @param title 标题
 * @param body 内容
 * @param subtitle 副标题（可选）
 * @param threadId 线程标识（可选，用于通知分组）
 */
export async function sendNotification(title: string, body: string, subtitle?: string, threadId?: string): Promise<void> {
  try {
    await Notification.schedule({
      title,
      body,
      ...(subtitle ? { subtitle } : {}),
      ...(threadId ? { threadIdentifier: threadId } : {}),
      iconImageData: { systemImage: 'gamecontroller.fill', color: 'systemYellow' },
    })
  } catch (e) {
    console.error('发送通知失败:', e)
  }
}

// ============ 日志工具 ============

export interface LogEntry {
  time: string
  level: 'info' | 'success' | 'error' | 'warn'
  message: string
}

/** 日志存储 */
const logs: LogEntry[] = []

/** 订阅者列表，addLog 时通知所有订阅者 */
const subscribers: Set<() => void> = new Set()

/**
 * 添加日志
 */
export function addLog(level: LogEntry['level'], message: string): void {
  const time = new Date().toLocaleTimeString('zh-CN')
  logs.unshift({ time, level, message })
  // 保留最近 100 条日志
  if (logs.length > 100) {
    logs.pop()
  }
  // 通知所有订阅者
  for (const sub of subscribers) {
    try { sub() } catch {}
  }
}

/**
 * 订阅日志变化
 */
export function subscribeLogs(callback: () => void): () => void {
  subscribers.add(callback)
  return () => { subscribers.delete(callback) }
}

/**
 * 获取所有日志
 */
export function getLogs(): LogEntry[] {
  return [...logs]
}

/**
 * 清空日志
 */
export function clearLogs(): void {
  logs.length = 0
}
