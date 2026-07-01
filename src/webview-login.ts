/**
 * 米游社自动助手 - WebView 登录模块
 *
 * 登录流程：
 * 1. 打开米游社网页版，用户登录
 * 2. 提取网页 Cookie（包含 ltoken/ltuid/cookie_token 等）
 * 3. 自动通过 login_ticket 换取 stoken（APP 级别令牌）
 * 4. 将 Cookie 和 stoken 统一存储，API 请求时自动生成 DS 签名
 *
 * 基于 PizzaHelperUnited 的 API 架构设计
 */

import { fetch } from 'scripting'
import { STORAGE_KEYS } from './types'
import { saveCookie, clearLoginData as clearCookie, getDS } from './utils'

// ============ 常量 ============

/** 米游社页面 URL */
const MIYOUSHE_URL = 'https://miyoushe.com/ys/'

/** 需要保留的 Cookie 域名关键词 */
const MIYOUSHE_DOMAINS = ['mihoyo', 'miyoushe', 'hoyoverse']

/** 必须包含的关键 Cookie 名称 */
const REQUIRED_COOKIES = ['ltoken', 'ltuid']

// ============ Cookie 解析 ============

/**
 * 从 WebView Cookie 数组中查找指定名称的值
 */
function findCookieValue(
  cookies: Array<{ name: string; value: string }>,
  name: string
): string | null {
  const cookie = cookies.find(c => c.name === name)
  return cookie ? cookie.value : null
}

/**
 * 检查 Cookie 字符串中是否包含指定 key
 */
function cookieHasKey(cookieStr: string, key: string): boolean {
  const regex = new RegExp(`(?:^|;)\\s*${key}\\s*=`)
  return regex.test(cookieStr)
}

// ============ 自动获取 Stoken ============

/**
 * 尝试通过 genAuthKey + getSToken 获取 stoken
 * @param loginCookie 登录 Cookie 字符串
 * @param method 认证方式描述（用于日志）
 */
async function tryGetStoken(
  loginCookie: string,
  method: string
): Promise<{ stoken: string; stuid: string; mid: string } | null> {
  try {
    // 步骤 1: 获取 authkey
    console.log(`[登录] [${method}] 步骤 1: 获取 authkey...`)
    const authKeyUrl = 'https://api-takumi.mihoyo.com/binding/api/genAuthKey'
    const authKeyBody = JSON.stringify({ game_biz: 'hk4e_cn' })
    const authKeyDS = getDS(authKeyBody, 'game_biz=hk4e_cn')

    const authKeyResp = await fetch(authKeyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) miHoYoBBS/2.110.0',
        'Referer': 'https://webstatic.mihoyo.com',
        'Cookie': loginCookie,
        'DS': authKeyDS,
        'x-rpc-app_version': '2.110.0',
        'x-rpc-client_type': '5',
        'x-rpc-device_id': Storage.get<string>('mihoyo_device_id') || '',
      },
      body: authKeyBody,
    })

    const authKeyData = await authKeyResp.json()
    console.log(`[登录] [${method}] genAuthKey retcode: ${authKeyData.retcode}, message: ${authKeyData.message}`)
    if (authKeyData.retcode !== 0) {
      return null
    }

    const authkey = authKeyData.data?.authkey
    if (!authkey) {
      console.log(`[登录] [${method}] genAuthKey 返回空 authkey`)
      return null
    }
    console.log(`[登录] [${method}] authkey 获取成功`)

    // 步骤 2: 用 authkey 换取 stoken
    console.log(`[登录] [${method}] 步骤 2: 用 authkey 换取 stoken...`)
    const stokenUrl = 'https://api-takumi.mihoyo.com/account/auth/api/getSToken'
    const stokenBody = JSON.stringify({
      authkey: authkey,
      game_biz: 'hk4e_cn',
    })
    const stokenDS = getDS(stokenBody, 'game_biz=hk4e_cn')

    const stokenResp = await fetch(stokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) miHoYoBBS/2.110.0',
        'Referer': 'https://webstatic.mihoyo.com',
        'Cookie': loginCookie,
        'DS': stokenDS,
        'x-rpc-app_version': '2.110.0',
        'x-rpc-client_type': '5',
        'x-rpc-device_id': Storage.get<string>('mihoyo_device_id') || '',
      },
      body: stokenBody,
    })

    const stokenData = await stokenResp.json()
    console.log(`[登录] [${method}] getSToken retcode: ${stokenData.retcode}, message: ${stokenData.message}`)
    if (stokenData.retcode !== 0) {
      return null
    }

    const result = stokenData.data
    if (!result?.stoken || !result?.stuid) {
      console.log(`[登录] [${method}] getSToken 返回数据不完整`)
      return null
    }

    console.log(`[登录] [${method}] stoken 获取成功 (stuid: ${result.stuid})`)
    return {
      stoken: result.stoken,
      stuid: result.stuid,
      mid: result.mid || '',
    }
  } catch (error: any) {
    console.log(`[登录] [${method}] 获取 stoken 失败: ${error.message}`)
    return null
  }
}

/**
 * 通过登录 Cookie 自动换取 stoken
 * 支持两种方式: login_ticket (原生APP) 和 ltoken (网页版)
 * @param cookies WebView 提取的完整 Cookie 数组
 */
async function fetchStokenFromLoginTicket(
  cookies: Array<{ name: string; value: string; domain: string }>
): Promise<{ stoken: string; stuid: string; mid: string } | null> {
  // 调试: 列出所有 cookie 名称
  const allNames = cookies.map(c => c.name).sort()
  console.log(`[登录] 所有 Cookie 名称 (${allNames.length}): ${allNames.join(', ')}`)

  // 提取认证相关 cookie
  const loginTicket = cookies.find(c => c.name === 'login_ticket')?.value
  const accountId = cookies.find(c => c.name === 'account_id')?.value ||
                    cookies.find(c => c.name === 'account_id_v2')?.value ||
                    cookies.find(c => c.name === 'ltuid')?.value
  const ltoken = cookies.find(c => c.name === 'ltoken')?.value
  const cookieToken = cookies.find(c => c.name === 'cookie_token')?.value ||
                      cookies.find(c => c.name === 'cookie_token_v2')?.value
  const stuid = accountId || cookies.find(c => c.name === 'stuid')?.value

  console.log(`[登录] login_ticket: ${loginTicket ? '有' : '无'}, account_id/ltuid: ${accountId || '无'}, ltoken: ${ltoken ? '有' : '无'}, cookie_token: ${cookieToken ? '有' : '无'}`)

  // 方式一: 有 login_ticket (原生 APP 登录流程)
  if (loginTicket && accountId) {
    console.log('[登录] 使用 login_ticket 方式获取 stoken...')
    const loginCookieParts: string[] = []
    for (const c of cookies) {
      if (['login_ticket', 'account_id', 'account_id_v2', 'ltuid', 'ltoken',
           'cookie_token', 'cookie_token_v2', 'sid', 'web_id'].includes(c.name)) {
        loginCookieParts.push(`${c.name}=${c.value}`)
      }
    }
    const result = await tryGetStoken(loginCookieParts.join('; '), 'login_ticket')
    if (result) return result
  }

  // 方式二: 有 ltoken + ltuid (网页版登录流程)
  if (ltoken && stuid) {
    console.log('[登录] 使用 ltoken 方式获取 stoken...')
    const loginCookieParts: string[] = [`ltoken=${ltoken}`, `ltuid=${stuid}`]
    if (cookieToken) loginCookieParts.push(`cookie_token=${cookieToken}`)
    // 添加其他可能需要的 cookie
    for (const c of cookies) {
      if (['account_id', 'account_id_v2', 'web_id', 'sid', 'login_uid',
           'cookie_id', 'uuid'].includes(c.name)) {
        loginCookieParts.push(`${c.name}=${c.value}`)
      }
    }
    const result = await tryGetStoken(loginCookieParts.join('; '), 'ltoken')
    if (result) return result
  }

  // 方式三: 有 passToken (部分网页登录流程)
  const passToken = cookies.find(c => c.name === 'passToken')?.value
  const userId = cookies.find(c => c.name === 'userId')?.value || stuid
  if (passToken && userId) {
    console.log('[登录] 使用 passToken 方式获取 stoken...')
    const loginCookieParts: string[] = [`passToken=${passToken}`, `account_id=${userId}`, `ltuid=${userId}`]
    if (ltoken) loginCookieParts.push(`ltoken=${ltoken}`)
    if (cookieToken) loginCookieParts.push(`cookie_token=${cookieToken}`)
    const result = await tryGetStoken(loginCookieParts.join('; '), 'passToken')
    if (result) return result
  }

  console.log('[登录] 所有方式均未能获取 stoken，需要手动导入')
  return null
}

// ============ WebView 登录 ============

/**
 * 通过 WebView 获取 Cookie
 *
 * 打开米游社页面，用户登录后关闭 WebView，
 * 自动提取所有米游社相关 Cookie。
 */
export async function getCookieViaWebView(): Promise<{
  success: boolean
  cookieStr?: string
  uid?: string
  message: string
}> {
  const vc = new WebViewController()

  try {
    console.log('[登录] 正在加载米游社页面...')
    const loaded = await vc.loadURL(MIYOUSHE_URL)
    if (!loaded) {
      return { success: false, message: '页面加载失败' }
    }

    console.log('[登录] 请在 WebView 中登录米游社，完成后点关闭')
    await vc.present({
      fullscreen: false,
      navigationTitle: '登录米游社（登录后点关闭）',
    })

    // 提取 Cookie
    const cookies = await vc.getAllCookies()
    if (!cookies || cookies.length === 0) {
      return { success: false, message: '未获取到任何 Cookie，请确认已登录' }
    }

    console.log(`[登录] 获取到 ${cookies.length} 个 Cookie`)

    // 构建 Cookie 字符串（只保留米游社相关域的 Cookie）
    const parts: string[] = []
    for (const c of cookies) {
      if (MIYOUSHE_DOMAINS.some(d => c.domain.includes(d))) {
        parts.push(`${c.name}=${c.value}`)
      }
    }

    const cookieStr = parts.join(';')

    // 检查关键字段
    const hasLToken = cookieHasKey(cookieStr, 'ltoken')
    const hasLtuid = cookieHasKey(cookieStr, 'ltuid')
    const hasCookieToken = cookieHasKey(cookieStr, 'cookie_token')

    if (!hasLToken && !hasCookieToken) {
      return {
        success: false,
        message: 'Cookie 中缺少关键认证信息（ltoken/cookie_token），请确保已登录',
      }
    }

    // 提取用户 UID
    const uid = findCookieValue(cookies, 'ltuid') ||
                findCookieValue(cookies, 'account_id') ||
                findCookieValue(cookies, 'account_id_v2')

    // 自动获取 stoken（通过 login_ticket 换取）
    const stokenResult = await fetchStokenFromLoginTicket(cookies)
    if (stokenResult) {
      Storage.set('mihoyo_stoken', stokenResult.stoken)
      Storage.set('mihoyo_stuid', stokenResult.stuid)
      if (stokenResult.mid) Storage.set('mihoyo_mid', stokenResult.mid)
      console.log(`[登录] ✅ stoken 自动获取成功并已保存`)
    } else if (!Storage.contains('mihoyo_stoken')) {
      console.log('[登录] ⚠️ stoken 未获取。点赞/分享功能需要 stoken，请通过「导入 Stoken」配置')
    }

    let message = 'Cookie 获取成功'
    if (uid) message += ` (UID: ${uid})`
    if (hasLToken) message += '，含 ltoken'
    if (hasCookieToken) message += '，含 cookie_token'
    if (stokenResult) message += '，已自动获取 stoken'

    return {
      success: true,
      cookieStr,
      uid: uid ?? undefined,
      message,
    }
  } catch (error: any) {
    return { success: false, message: `获取 Cookie 失败: ${error.message}` }
  } finally {
    vc.dispose()
  }
}

/**
 * 保存登录数据
 *
 * 将从 WebView 获取的 Cookie 统一保存到 Storage。
 * API 请求时会自动从 Storage 读取 Cookie 并生成 DS 签名。
 */
export async function saveLoginData(cookieStr: string): Promise<{
  success: boolean
  message: string
  uid?: string
}> {
  try {
    // 保存 Cookie
    saveCookie(cookieStr)

    // 提取 UID
    const parts = cookieStr.split(';')
    let uid: string | undefined
    for (const part of parts) {
      const [key, value] = part.trim().split('=')
      if (key === 'ltuid' || key === 'account_id') {
        uid = value
        break
      }
    }

    // 保存登录元数据
    Storage.set('mihoyo_login_data', JSON.stringify({
      uid,
      savedAt: Date.now(),
    }))

    console.log('[登录] Cookie 已保存')

    return {
      success: true,
      message: `✅ 登录成功！${uid ? `UID: ${uid}` : ''}`,
      uid,
    }
  } catch (error: any) {
    return { success: false, message: `保存失败: ${error.message}` }
  }
}

/**
 * 检查登录状态
 */
export function checkLoginStatus(): {
  isLoggedIn: boolean
  uid?: string
} {
  const isLoggedIn = Storage.contains(STORAGE_KEYS.COOKIE)

  let uid: string | undefined
  const loginDataStr = Storage.get<string>('mihoyo_login_data')
  if (loginDataStr) {
    try {
      const loginData = JSON.parse(loginDataStr)
      uid = loginData.uid
    } catch { /* 忽略解析错误 */ }
  }

  return { isLoggedIn, uid }
}

/**
 * 清除所有登录数据
 */
export function clearLoginData(): void {
  clearCookie()
  Storage.remove('mihoyo_login_data')
  Storage.remove('mihoyo_device_id')
  console.log('[登录] 已清除所有登录数据')
}
