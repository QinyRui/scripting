/**
 * 米游社自动助手 - API 封装
 * 封装所有米游社 API 请求
 */

import { fetch } from 'scripting'
import type {
  ApiResponse,
  MissionStateResponse,
  ForumPostListResponse,
  UserInfoResponse,
  SignInfo,
  GameAccount,
  Board,
} from './types'
import { getBBSHeaders, getBBSPostHeaders, getSignHeaders, getTaskHeaders, randomSleep, addLog, extractQuery, buildHeaders, getCookie, hasStoken, getGameSign_DS, getDS, getSignInDS, DS_CONFIG } from './utils'
// Storage 是全局 API，不需要从 scripting 导入

// ============ API 端点常量 ============

/**
 * 米游社 API 端点常量
 * 基于 PizzaHelperUnited 和 MihoyoBBSTools 的 API 定义
 * https://github.com/pizza-studio/PizzaHelperUnited
 */
const API_ENDPOINTS = {
  // 用户信息（账号绑定 API）
  getUserInfo: 'https://api-takumi.mihoyo.com/binding/api/getUserGameRolesByCookie?game_biz={0}',

  // 米游币任务相关（BBS API）
  micoin: {
    // 获取用户任务状态（wapi 路径 + miyoushe.com 域名 + DS 可用）
    getUserMissionState: 'https://bbs-api.miyoushe.com/apihub/wapi/getUserMissionsState',
    // 获取版块帖子列表（miyoushe.com 域名 + DS 可用）
    getForumPostList: 'https://bbs-api.miyoushe.com/post/api/getForumPostList?forum_id={0}&is_good=false&is_hot=false&page_size=20&sort_type=1',
    // 获取帖子详情
    getPostFull: 'https://bbs-api.miyoushe.com/post/api/getPostFull?post_id={0}',
    // 点赞帖子（根据抓包修正：/post/api/post/upvote）
    postUpVotePost: 'https://bbs-api.miyoushe.com/post/api/post/upvote',
    // 分享帖子（根据抓包修正：/post/api/sharePost）
    sharePost: 'https://bbs-api.miyoushe.com/post/api/sharePost',
    // 讨论区签到（任务 ID 58，+30 米游币）— 需要 stoken cookie
    postSignIn: 'https://bbs-api.miyoushe.com/apihub/app/api/signIn',
    // 米游币积分记录
    getUserPointRecord: 'https://bbs-api.miyoushe.com/common/homutreasure/v1/web/user/record?app_id=1&point_sn=myb&action=1&size=20',
  },

  // 游戏签到（Luna API）— 路径中需要包含游戏代码（如 hk4e、bh3）
  genshin: {
    getSignInfo: 'https://api-takumi.mihoyo.com/event/luna/hk4e/info?lang=zh-cn&region={0}&act_id={1}&uid={2}',
    getSignAwards: 'https://api-takumi.mihoyo.com/event/luna/hk4e/home?lang=zh-cn&act_id={0}',
    postSign: 'https://api-takumi.mihoyo.com/event/luna/hk4e/sign',
  },

  honkai3rd: {
    getSignInfo: 'https://api-takumi.mihoyo.com/event/luna/bh3/info?lang=zh-cn&region={0}&act_id={1}&uid={2}',
    getSignAwards: 'https://api-takumi.mihoyo.com/event/luna/bh3/home?lang=zh-cn&act_id={0}',
    postSign: 'https://api-takumi.mihoyo.com/event/luna/bh3/sign',
  },
}

// ============ 错误码常量 ============

/** 米哈游 API 常见错误码 */
const ERROR_CODES = {
  COOKIE_EXPIRED: -100,        // Cookie 失效
  NETWORK_ERROR: -500001,      // 网络临时错误
  SERVER_ERROR: -101,          // 服务器错误
  RISK_CONTROL: -1008,         // 触发风控
} as const

/** 需要重试的错误码 */
const RETRYABLE_ERRORS = new Set([ERROR_CODES.NETWORK_ERROR, ERROR_CODES.SERVER_ERROR])

/** 最大重试次数 */
const MAX_RETRIES = 3

// ============ 工具函数 ============

/**
 * 格式化字符串（替换 {0}, {1} 等占位符）
 */
function formatString(template: string, ...args: any[]): string {
  let result = template
  for (let i = 0; i < args.length; i++) {
    result = result.replace(`{${i}}`, String(args[i]))
  }
  return result
}

/**
 * 判断是否为 Cookie 失效错误
 * @param retcode 返回码
 * @param message 错误消息
 */
export function isCookieExpired(retcode: number, message: string): boolean {
  return retcode === ERROR_CODES.COOKIE_EXPIRED || 
         message.includes('登录失效') ||
         message.includes('cookie') ||
         message.includes('Cookie')
}

/**
 * 判断是否为可重试的网络错误
 * @param retcode 返回码
 */
export function isRetryableError(retcode: number): boolean {
  return RETRYABLE_ERRORS.has(retcode as any)
}

/**
 * 带重试机制的通用 GET 请求
 * @param url 请求 URL
 * @param headers 请求头
 * @param retries 剩余重试次数
 */
async function apiGetWithRetry<T>(url: string, headers: Record<string, string>, retries: number = MAX_RETRIES): Promise<T> {
  try {
    return await apiGet<T>(url, headers)
  } catch (error: any) {
    // 如果是 Cookie 失效，不重试
    if (error.message?.includes('登录失效') || error.retcode === ERROR_CODES.COOKIE_EXPIRED) {
      throw error
    }
    
    // 如果是可重试错误且有剩余重试次数
    if (retries > 0 && isRetryableError(error.retcode)) {
      addLog('warn', `请求失败，${retries} 次重试机会剩余: ${error.message}`)
      await randomSleep()
      return await apiGetWithRetry<T>(url, headers, retries - 1)
    }
    
    throw error
  }
}

/**
 * 带重试机制的通用 POST 请求
 * @param url 请求 URL
 * @param headers 请求头
 * @param body 请求体
 * @param retries 剩余重试次数
 */
async function apiPostWithRetry<T>(url: string, headers: Record<string, string>, body?: any, retries: number = MAX_RETRIES): Promise<T> {
  try {
    return await apiPost<T>(url, headers, body)
  } catch (error: any) {
    // Cookie 失效时抛出特殊错误，由调用方决定是否回退重试
    if (error.message?.includes('登录失效') || error.retcode === ERROR_CODES.COOKIE_EXPIRED) {
      throw error
    }
    
    // 可重试的网络错误
    if (retries > 0 && isRetryableError(error.retcode)) {
      addLog('warn', `请求失败，${retries} 次重试机会剩余: ${error.message}`)
      await randomSleep()
      return await apiPostWithRetry<T>(url, headers, body, retries - 1)
    }
    
    throw error
  }
}

/**
 * 带 stoken → Web Cookie 回退的 POST 请求
 * 当 stoken 失效（retcode -100）时，自动使用 Web Cookie 重试
 */
async function apiPostWithFallback<T>(url: string, body: any, label: string): Promise<T> {
  const bodyStr = JSON.stringify(body)
  const query = extractQuery(url)
  const stokenExists = hasStoken()

  addLog('info', `${label}: 认证方式: ${stokenExists ? 'stoken (APP)' : 'Web Cookie'}`)

  // 第一次尝试：使用 stoken（如果有的话）
  const stokenHeaders = getBBSPostHeaders(bodyStr, query)
  try {
    return await apiPost<T>(url, stokenHeaders, body)
  } catch (error: any) {
    // 非 Cookie 过期错误直接抛出
    if (!isCookieExpired(error.retcode, error.message)) {
      throw error
    }
    // 没有 stoken 时，Web Cookie 也无法用于 POST，直接给出明确提示
    if (!stokenExists) {
      addLog('error', `${label}失败: 点赞/分享需要 stoken 认证，请通过「导入 Stoken」功能配置`)
      throw new Error(`${label}需要 stoken 认证，请导入 stoken`)
    }
    addLog('warn', `${label}: stoken 已失效，回退到 Web Cookie 重试`)
  }

  // 第二次尝试：强制使用 Web Cookie
  await randomSleep()
  const webHeaders = getBBSPostHeaders(bodyStr, query, true)
  return await apiPost<T>(url, webHeaders, body)
}

/**
 * 通用 GET 请求
 * DS 签名会自动从 URL query 中提取并生成
 */
async function apiGet<T>(url: string, headers: Record<string, string>): Promise<T> {
  console.log(`[API GET] ${url}`)

  const response = await fetch(url, {
    method: 'GET',
    headers,
  })

  const data: ApiResponse<T> = await response.json()
  console.log(`[API Response] retcode: ${data.retcode}, message: ${data.message}`)

  if (data.retcode !== 0) {
    const error = new Error(data.message || `API 请求失败: ${data.retcode}`)
    ;(error as any).retcode = data.retcode
    throw error
  }

  return data.data
}

/**
 * 通用 POST 请求
 * DS 签名会自动从 URL query 和 body 中生成
 */
async function apiPost<T>(url: string, headers: Record<string, string>, body?: any): Promise<T> {
  console.log(`[API POST] ${url}`)
  if (body) console.log(`[Body] ${JSON.stringify(body)}`)

  const bodyStr = body ? JSON.stringify(body) : ''
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: bodyStr || undefined,
  })

  // 先读原始文本，避免 JSON parse 吞掉真实错误
  const text = await response.text()
  console.log(`[API POST] status: ${response.status}, contentType: ${response.headers?.get?.('content-type') || 'unknown'}`)
  console.log(`[API POST] response: ${text.substring(0, 500)}`)

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${text.substring(0, 200)}`)
  }

  let data: ApiResponse<T>
  try {
    data = JSON.parse(text)
  } catch (e: any) {
    throw new Error(`JSON Parse error: ${e.message} (response: ${text.substring(0, 200)})`)
  }

  console.log(`[API Response] retcode: ${data.retcode}, message: ${data.message}`)

  if (data.retcode !== 0) {
    const error = new Error(data.message || `API 请求失败: ${data.retcode}`)
    ;(error as any).retcode = data.retcode
    throw error
  }

  return data.data
}

// ============ 米游币任务 API ============

/**
 * 获取用户任务状态
 * 返回可执行的任务列表
 */
export async function getUserMissionState(): Promise<MissionStateResponse> {
  addLog('info', '获取用户任务状态...')

  const url = API_ENDPOINTS.micoin.getUserMissionState
  const headers = getBBSHeaders(url)
  
  try {
    const data = await apiGetWithRetry<MissionStateResponse>(url, headers)

    // 检查是否还能获取米游币（用 today_total - already_received 计算，can_get_points 不可靠）
    const remaining = (data.today_total_points || 50) - (data.already_received_points || 0)
    if (remaining <= 0) {
      addLog('info', `今日米游币已达上限 (${data.already_received_points}/${data.today_total_points})`)
      // 不抛异常，允许执行已启用的任务（可能有非米游币类任务）
    }

    addLog('success', `可获取米游币: ${data.can_get_points}`)
    return data
  } catch (error: any) {
    if (isCookieExpired(error.retcode, error.message)) {
      addLog('error', '登录失效，请重新登录')
      throw new Error('登录失效，请重新登录')
    }
    throw error
  }
}

/**
 * 获取版块帖子列表
 * @param forumId 版块 ID
 */
export async function getForumPostList(forumId: number): Promise<ForumPostListResponse['list']> {
  addLog('info', `获取版块 ${forumId} 的帖子列表...`)

  const url = formatString(API_ENDPOINTS.micoin.getForumPostList, forumId)
  const headers = getBBSHeaders(url)
  const data = await apiGetWithRetry<ForumPostListResponse>(url, headers)

  if (!data.list || data.list.length === 0) {
    throw new Error('获取到的帖子列表为空')
  }

  addLog('success', `获取到 ${data.list.length} 个帖子`)
  return data.list
}

/**
 * 浏览帖子
 * @param postId 帖子 ID
 */
export async function getPostFull(postId: string): Promise<boolean> {
  addLog('info', `浏览帖子: ${postId}`)

  const url = formatString(API_ENDPOINTS.micoin.getPostFull, postId)
  const headers = getBBSHeaders(url)

  try {
    await apiGetWithRetry(url, headers)
    addLog('success', '浏览帖子成功')
    return true
  } catch (error: any) {
    addLog('error', `浏览帖子失败: ${error.message}`)
    return false
  }
}

/**
 * 点赞帖子
 * @param postId 帖子 ID
 */
export async function postUpVotePost(postId: string): Promise<boolean> {
  addLog('info', `点赞帖子: ${postId}`)

  const url = API_ENDPOINTS.micoin.postUpVotePost
  const body = { post_id: postId, is_cancel: false }

  try {
    await apiPostWithFallback(url, body, '点赞')
    addLog('success', '点赞帖子成功')
    return true
  } catch (error: any) {
    addLog('error', `点赞帖子失败: ${error.message}`)
    return false
  }
}

/**
 * 分享帖子
 * @param postId 帖子 ID
 */
export async function sharePost(postId: string): Promise<boolean> {
  addLog('info', `分享帖子: ${postId}`)

  const url = API_ENDPOINTS.micoin.sharePost
  const body = { post_id: postId }

  try {
    await apiPostWithFallback(url, body, '分享')
    addLog('success', '分享帖子成功 (+10 米游币)')
    return true
  } catch (error: any) {
    addLog('error', `分享帖子失败: ${error.message}`)
    return false
  }
}

/**
 * 讨论区签到结果
 */
export interface DiscussionSignInResult {
  /** 是否成功 */
  success: boolean
  /** 获得的米游币数 */
  points: number
  /** 连续打卡天数 */
  continuousDays?: number
}

/**
 * 讨论区签到（任务 ID 58）
 * 连续打卡奖励: 普通 +30, 满3天 +40, 满5天 +50
 * 参考: QuantumultX mihoyobbs-auto-helper 的 postSignIn 实现
 * @param forumId 版块 ID
 */
export async function postDiscussionSignIn(forumId: number): Promise<DiscussionSignInResult> {
  addLog('info', `讨论区签到 (版块 ID: ${forumId})...`)

  const url = API_ENDPOINTS.micoin.postSignIn
  const body = { gids: 2 }
  const bodyStr = JSON.stringify(body)

  // 讨论区签到使用简化 DS（不含 body/query）
  const ds = getSignInDS()
  const cookie = (() => {
    try {
      const stoken = Storage.get<string>('mihoyo_stoken')
      const stuid = Storage.get<string>('mihoyo_stuid')
      if (stoken && stuid) {
        const mid = Storage.get<string>('mihoyo_mid') || ''
        let c = `stuid=${stuid};stoken=${stoken}`
        if (mid) c += `;mid=${mid}`
        c += ';login_ticket='
        return c
      }
    } catch {}
    return getCookie()
  })()

  // 精确匹配官方 APP 抓包 headers
  const headers: Record<string, string> = {
    'User-Agent': 'Hyperion/563 CFNetwork/3860.600.12 Darwin/25.5.0',
    'Referer': 'https://app.mihoyo.com',
    'x-rpc-app_version': '2.110.0',
    'x-rpc-client_type': '1',
    'x-rpc-device_id': DS_CONFIG.deviceId,
    'x-rpc-device_fp': DS_CONFIG.deviceFp,
    'x-rpc-verify_key': 'bll8iq97cem8',
    'x-rpc-device_model': 'iPhone14,7',
    'x-rpc-device_name': 'iPhone',
    'x-rpc-channel': 'appstore',
    'x-rpc-csm_source': 'discussion',
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

  try {
    console.log(`[SignIn] url: ${url}`)
    console.log(`[SignIn] body: ${bodyStr}`)
    console.log(`[SignIn] DS: ${ds}`)
    const data = await apiPostWithRetry<{ points: number }>(url, headers, body)
    console.log(`[SignIn] response data:`, JSON.stringify(data))
    const points = data?.points || 0
    addLog('success', `讨论区签到成功 (+${points} 米游币)`)
    Storage.set('mihoyo_last_checkin_date', new Date().toISOString().slice(0, 10))
    return { success: true, points }
  } catch (error: any) {
    // 登录失效时给出明确提示
    if (error.retcode === -100) {
      addLog('warn', '讨论区签到：Cookie 已过期，请重新登录')
      return { success: false, points: 0 }
    }
    const errMsg = `讨论区签到失败: ${error.message} (retcode: ${error.retcode})`
    addLog('error', errMsg)
    console.log(`[SignIn] error:`, errMsg)
    return { success: false, points: 0 }
  }
}

// ============ 游戏签到 API ============

/**
 * 获取用户游戏账号信息
 * @param board 游戏版块信息
 */
export async function getUserInfo(board: Board): Promise<GameAccount> {
  addLog('info', `获取 ${board.name} 账号信息...`)

  const url = formatString(API_ENDPOINTS.getUserInfo, board.biz)
  const gameCode = board.biz.replace('_cn', '')
  const headers = getSignHeaders(gameCode)
  
  const data = await apiGetWithRetry<UserInfoResponse>(url, headers)

  if (!data.list || data.list.length === 0) {
    throw new Error(`未找到 ${board.name} 绑定的游戏账号，请检查该游戏是否已登录或 Cookie 是否有效`)
  }

  const account = data.list[0]
  addLog('success', `获取到账号: ${account.nickname} (${account.game_uid})`)
  return account
}

/**
 * 获取签到信息
 * @param board 游戏版块信息
 * @param account 游戏账号
 */
export async function getSignInfo(board: Board, account: GameAccount): Promise<SignInfo> {
  addLog('info', `获取 ${board.name} 签到信息...`)

  const apiUrl = board.key === 'genshin'
    ? formatString(API_ENDPOINTS.genshin.getSignInfo, account.region, board.actid, account.game_uid)
    : formatString(API_ENDPOINTS.honkai3rd.getSignInfo, account.region, board.actid, account.game_uid)

  const gameCode = board.biz.replace('_cn', '')
  const headers = getSignHeaders(gameCode)
  const data = await apiGetWithRetry<SignInfo>(apiUrl, headers)

  // 检查是否首次绑定
  if (data.first_bind) {
    throw new Error('请先前往米游社 App 手动签到一次')
  }

  // 检查是否已签到
  if (data.is_sign) {
    addLog('info', `${account.nickname} 今日已签到（累计 ${data.total_sign_day} 天）`)
    return data
  }

  addLog('info', `累计签到: ${data.total_sign_day} 天`)
  return data
}

/**
 * 获取签到奖励信息
 * @param board 游戏版块信息
 * @param totalSignDay 累计签到天数
 */
export async function getSignAwards(board: Board, totalSignDay: number): Promise<{ name: string; count: number }> {
  addLog('info', `获取 ${board.name} 签到奖励...`)

  const apiUrl = board.key === 'genshin'
    ? formatString(API_ENDPOINTS.genshin.getSignAwards, board.actid)
    : formatString(API_ENDPOINTS.honkai3rd.getSignAwards, board.actid)

  const gameCode = board.biz.replace('_cn', '')
  const headers = getSignHeaders(gameCode)
  const data = await apiGetWithRetry<any>(apiUrl, headers)

  const award = data.awards?.[totalSignDay]
  if (!award) {
    throw new Error('无法获取奖励信息')
  }

  addLog('success', `今日奖励: ${award.name} x${award.cnt}`)
  return { name: award.name, count: award.cnt }
}

/**
 * 执行签到操作
 * @param board 游戏版块信息
 * @param account 游戏账号
 */
export async function postSign(board: Board, account: GameAccount): Promise<void> {
  addLog('info', `执行 ${board.name} 签到...`)

  const body = {
    act_id: board.actid,
    region: account.region,
    uid: account.game_uid,
  }
  const bodyStr = JSON.stringify(body)

  const apiUrl = board.key === 'genshin'
    ? API_ENDPOINTS.genshin.postSign
    : API_ENDPOINTS.honkai3rd.postSign

  const gameCode = board.biz.replace('_cn', '')
  const headers = getSignHeaders(gameCode)
  const data = await apiPostWithRetry<any>(apiUrl, headers, body)

  // 原神需要检查风控验证码
  if (board.key === 'genshin' && data.risk_code !== 0) {
    throw new Error('触发风控验证码，请前往米游社 App 手动签到')
  }

  addLog('success', `${board.name} 签到成功`)
}

// ============ Cookie 获取辅助 ============

/**
 * 从 WebView 获取 Cookie 并保存
 * 具体的 WebView 交互在 webview-login.ts 中处理
 */
export async function fetchAndSaveHeaders(url: string, type: 'bbs' | 'sign'): Promise<void> {
  addLog('info', '正在获取 Cookie...')
  throw new Error('请在设置页面登录获取 Cookie')
}

// ============ 积分记录 ============

/** 积分记录项 */
export interface PointRecord {
  title: string        // 任务名称（如「打卡」「浏览3个帖子」）
  num: number          // 获得积分
  comment: string      // 详情描述
  order_time: string   // 时间戳（秒）
  type_name: string    // 类型名称（如「米游币任务」）
  source_name: string  // 来源（如「社区」）
}

/** 获取米游币积分记录 */
export async function getUserPointRecords(time: number = 0): Promise<PointRecord[]> {
  try {
    const cookie = getCookie()
    const url = API_ENDPOINTS.micoin.getUserPointRecord + (time ? `&time=${time}` : '')
    const ds = getDS('', 'app_id=1&point_sn=myb&action=1&size=20')
    const headers = buildHeaders(cookie, ds)

    const res = await fetch(url, {
      method: 'GET',
      headers,
    }).then(r => r.json())

    if (res?.retcode === 0) {
      const list = res?.data?.list || []
      return list.map((item: any) => ({
        title: item.title || '',
        num: item.num || 0,
        comment: item.comment || '',
        order_time: item.order_time || '0',
        type_name: item.type_name || '',
        source_name: item.source_name || '',
      }))
    }
    addLog('warn', `获取积分记录失败: ${res?.message}`)
    return []
  } catch (e: any) {
    addLog('error', `获取积分记录异常: ${e.message}`)
    return []
  }
}
