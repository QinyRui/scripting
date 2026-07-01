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
  function RotateLeft(lValue: number, iShiftBits: number) {
    return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits))
  }

  function AddUnsigned(lX: number, lY: number) {
    let lX4, lY4, lX8, lY8, lResult
    lX8 = (lX & 0x80000000)
    lY8 = (lY & 0x80000000)
    lX4 = (lX & 0x40000000)
    lY4 = (lY & 0x40000000)
    lResult = (lX & 0x3FFFFFFF) + (lY & 0x3FFFFFFF)
    if (lX4 & lY4) {
      return (lResult ^ 0x80000000 ^ lX8 ^ lY8)
    }
    if (lX4 | lY4) {
      if (lResult & 0x40000000) {
        return (lResult ^ 0xC0000000 ^ lX8 ^ lY8)
      } else {
        return (lResult ^ 0x40000000 ^ lX8 ^ lY8)
      }
    } else {
      return (lResult ^ lX8 ^ lY8)
    }
  }

  function F(x: number, y: number, z: number) { return (x & y) | ((~x) & z) }
  function G(x: number, y: number, z: number) { return (x & z) | (y & (~z)) }
  function H(x: number, y: number, z: number) { return (x ^ y ^ z) }
  function I(x: number, y: number, z: number) { return (y ^ (x | (~z))) }

  function FF(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    a = AddUnsigned(a, AddUnsigned(AddUnsigned(F(b, c, d), x), ac))
    return AddUnsigned(RotateLeft(a, s), b)
  }

  function GG(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    a = AddUnsigned(a, AddUnsigned(AddUnsigned(G(b, c, d), x), ac))
    return AddUnsigned(RotateLeft(a, s), b)
  }

  function HH(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    a = AddUnsigned(a, AddUnsigned(AddUnsigned(H(b, c, d), x), ac))
    return AddUnsigned(RotateLeft(a, s), b)
  }

  function II(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    a = AddUnsigned(a, AddUnsigned(AddUnsigned(I(b, c, d), x), ac))
    return AddUnsigned(RotateLeft(a, s), b)
  }

  function ConvertToWordArray(str: string) {
    let lWordCount
    const lMessageLength = str.length
    const lNumberOfWords_temp1 = lMessageLength + 8
    const lNumberOfWords_temp2 = (lNumberOfWords_temp1 - (lNumberOfWords_temp1 % 64)) / 64
    const lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16
    const lWordArray = new Array(lNumberOfWords - 1)
    let lBytePosition = 0
    let lByteCount = 0

    while (lByteCount < lMessageLength) {
      lWordCount = (lByteCount - (lByteCount % 4)) / 4
      lBytePosition = (lByteCount % 4) * 8
      lWordArray[lWordCount] = (lWordArray[lWordCount] | (str.charCodeAt(lByteCount) << lBytePosition))
      lByteCount++
    }

    lWordCount = (lByteCount - (lByteCount % 4)) / 4
    lBytePosition = (lByteCount % 4) * 8
    lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition)
    lWordArray[lNumberOfWords - 2] = lMessageLength << 3
    lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29

    return lWordArray
  }

  function WordToHex(lValue: number) {
    let WordToHexValue = ""
    let lByte, lCount
    for (lCount = 0; lCount <= 3; lCount++) {
      lByte = (lValue >>> (lCount * 8)) & 255
      WordToHexValue += lByte.toString(16).padStart(2, '0')
    }
    return WordToHexValue
  }

  function Utf8Encode(str: string) {
    str = str.replace(/\r\n/g, "\n")
    let utftext = ""
    for (let n = 0; n < str.length; n++) {
      const c = str.charCodeAt(n)
      if (c < 128) {
        utftext += String.fromCharCode(c)
      } else if ((c > 127) && (c < 2048)) {
        utftext += String.fromCharCode((c >> 6) | 192)
        utftext += String.fromCharCode((c & 63) | 128)
      } else {
        utftext += String.fromCharCode((c >> 12) | 224)
        utftext += String.fromCharCode(((c >> 6) & 63) | 128)
        utftext += String.fromCharCode((c & 63) | 128)
      }
    }
    return utftext
  }

  const S11 = 7, S12 = 12, S13 = 17, S14 = 22
  const S21 = 5, S22 = 9, S23 = 14, S24 = 20
  const S31 = 4, S32 = 11, S33 = 16, S34 = 23
  const S41 = 6, S42 = 10, S43 = 15, S44 = 21

  string = Utf8Encode(string)
  const x = ConvertToWordArray(string)

  let a = 0x67452301, b = 0xEFCDAB89, c = 0x98BADCFE, d = 0x10325476

  for (let k = 0; k < x.length; k += 16) {
    const AA = a, BB = b, CC = c, DD = d

    a = FF(a, b, c, d, x[k + 0], S11, 0xD76AA478)
    d = FF(d, a, b, c, x[k + 1], S12, 0xE8C7B756)
    c = FF(c, d, a, b, x[k + 2], S13, 0x242070DB)
    b = FF(b, c, d, a, x[k + 3], S14, 0xC1BDCEEE)
    a = FF(a, b, c, d, x[k + 4], S11, 0xF57C0FAF)
    d = FF(d, a, b, c, x[k + 5], S12, 0x4787C62A)
    c = FF(c, d, a, b, x[k + 6], S13, 0xA8304613)
    b = FF(b, c, d, a, x[k + 7], S14, 0xFD469501)
    a = FF(a, b, c, d, x[k + 8], S11, 0x698098D8)
    d = FF(d, a, b, c, x[k + 9], S12, 0x8B44F7AF)
    c = FF(c, d, a, b, x[k + 10], S13, 0xFFFF5BB1)
    b = FF(b, c, d, a, x[k + 11], S14, 0x895CD7BE)
    a = FF(a, b, c, d, x[k + 12], S11, 0x6B901122)
    d = FF(d, a, b, c, x[k + 13], S12, 0xFD987193)
    c = FF(c, d, a, b, x[k + 14], S13, 0xA679438E)
    b = FF(b, c, d, a, x[k + 15], S14, 0x49B40821)

    a = GG(a, b, c, d, x[k + 1], S21, 0xF61E2562)
    d = GG(d, a, b, c, x[k + 6], S22, 0xC040B340)
    c = GG(c, d, a, b, x[k + 11], S23, 0x265E5A51)
    b = GG(b, c, d, a, x[k + 0], S24, 0xE9B6C7AA)
    a = GG(a, b, c, d, x[k + 5], S21, 0xD62F105D)
    d = GG(d, a, b, c, x[k + 10], S22, 0x02441453)
    c = GG(c, d, a, b, x[k + 15], S23, 0xD8A1E681)
    b = GG(b, c, d, a, x[k + 4], S24, 0xE7D3FBC8)
    a = GG(a, b, c, d, x[k + 9], S21, 0x21E1CDE6)
    d = GG(d, a, b, c, x[k + 14], S22, 0xC33707D6)
    c = GG(c, d, a, b, x[k + 3], S23, 0xF4D50D87)
    b = GG(b, c, d, a, x[k + 8], S24, 0x455A14ED)
    a = GG(a, b, c, d, x[k + 13], S21, 0xA9E3E905)
    d = GG(d, a, b, c, x[k + 2], S22, 0xFCEFA3F8)
    c = GG(c, d, a, b, x[k + 7], S23, 0x676F02D9)
    b = GG(b, c, d, a, x[k + 12], S24, 0x8D2A4C8A)

    a = HH(a, b, c, d, x[k + 5], S31, 0xFFFA3942)
    d = HH(d, a, b, c, x[k + 8], S32, 0x8771F681)
    c = HH(c, d, a, b, x[k + 11], S33, 0x6D9D6122)
    b = HH(b, c, d, a, x[k + 14], S34, 0xFDE5380C)
    a = HH(a, b, c, d, x[k + 1], S31, 0xA4BEEA44)
    d = HH(d, a, b, c, x[k + 4], S32, 0x4BDECFA9)
    c = HH(c, d, a, b, x[k + 7], S33, 0xF6BB4B60)
    b = HH(b, c, d, a, x[k + 10], S34, 0xBEBFBC70)
    a = HH(a, b, c, d, x[k + 13], S31, 0x289B7EC6)
    d = HH(d, a, b, c, x[k + 0], S32, 0xEAA127FA)
    c = HH(c, d, a, b, x[k + 3], S33, 0xD4EF3085)
    b = HH(b, c, d, a, x[k + 6], S34, 0x04881D05)
    a = HH(a, b, c, d, x[k + 9], S31, 0xD9D4D039)
    d = HH(d, a, b, c, x[k + 12], S32, 0xE6DB99E5)
    c = HH(c, d, a, b, x[k + 15], S33, 0x1FA27CF8)
    b = HH(b, c, d, a, x[k + 2], S34, 0xC4AC5665)

    a = II(a, b, c, d, x[k + 0], S41, 0xF4292244)
    d = II(d, a, b, c, x[k + 7], S42, 0x432AFF97)
    c = II(c, d, a, b, x[k + 14], S43, 0xAB9423A7)
    b = II(b, c, d, a, x[k + 5], S44, 0xFC93A039)
    a = II(a, b, c, d, x[k + 12], S41, 0x655B59C3)
    d = II(d, a, b, c, x[k + 3], S42, 0x8F0CCC92)
    c = II(c, d, a, b, x[k + 10], S43, 0xFFEFF47D)
    b = II(b, c, d, a, x[k + 1], S44, 0x85845DD1)
    a = II(a, b, c, d, x[k + 8], S41, 0x6FA87E4F)
    d = II(d, a, b, c, x[k + 15], S42, 0xFE2CE6E0)
    c = II(c, d, a, b, x[k + 6], S43, 0xA3014314)
    b = II(b, c, d, a, x[k + 13], S44, 0x4E0811A1)
    a = II(a, b, c, d, x[k + 4], S41, 0xF7537E82)
    d = II(d, a, b, c, x[k + 11], S42, 0xBD3AF235)
    c = II(c, d, a, b, x[k + 2], S43, 0x2AD7D2BB)
    b = II(b, c, d, a, x[k + 9], S44, 0xEB86D391)

    a = AddUnsigned(a, AA)
    b = AddUnsigned(b, BB)
    c = AddUnsigned(c, CC)
    d = AddUnsigned(d, DD)
  }

  const temp = WordToHex(a) + WordToHex(b) + WordToHex(c) + WordToHex(d)
  return temp.toLowerCase()
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
