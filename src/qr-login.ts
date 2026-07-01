/**
 * 米游社二维码扫码登录模块
 * 流程: 生成二维码 → 用户扫码 → 获取 GameToken → 换取 stoken_v2/ltoken/cookie_token
 */

import { fetch } from 'scripting'
import { getDS } from './utils'

const GAME_TOKEN_APP_ID = '1'

// 设备 ID 生成（UUID v4 格式）
function generateDeviceId(): string {
  const hex = '0123456789abcdef'
  let id = ''
  for (let i = 0; i < 32; i++) {
    if (i === 8 || i === 12 || i === 16 || i === 20) id += '-'
    id += hex[Math.floor(Math.random() * 16)]
  }
  return id
}

/** 扫码登录结果 */
export interface QRLoginResult {
  success: boolean
  cookie?: string
  uid?: string
  error?: string
}

/**
 * 步骤1: 获取扫码二维码 URL
 */
export async function fetchQRCode(deviceId: string): Promise<{ url: string; ticket: string } | null> {
  try {
    const res = await fetch('https://hk4e-sdk.mihoyo.com/hk4e_cn/combo/panda/qrcode/fetch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: GAME_TOKEN_APP_ID, device: deviceId }),
    }).then(r => r.json())

    if (res?.retcode === 0 && res?.data?.url) {
      const url = new URL(res.data.url)
      const ticket = url.searchParams.get('ticket') || ''
      console.log('[QRLogin] 获取二维码成功, ticket:', ticket.substring(0, 20) + '...')
      return { url: res.data.url, ticket }
    }
    console.log('[QRLogin] 获取二维码失败:', res?.message)
    return null
  } catch (e: any) {
    console.log('[QRLogin] 获取二维码异常:', e.message)
    return null
  }
}

/**
 * 步骤2: 轮询扫码状态
 * 返回 { uid, game_token } 或 null（未扫码/已过期）
 */
export async function queryQRCodeStatus(
  ticket: string,
  deviceId: string
): Promise<{ scanned: boolean; expired: boolean; uid?: string; gameToken?: string }> {
  try {
    const res = await fetch('https://hk4e-sdk.mihoyo.com/hk4e_cn/combo/panda/qrcode/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: GAME_TOKEN_APP_ID, device: deviceId, ticket }),
    }).then(r => r.json())

    if (res?.retcode === 0) {
      const stat = res?.data?.stat
      if (stat === 'Init') return { scanned: false, expired: false }
      if (stat === 'Scanned') return { scanned: true, expired: false }
      // Confirmed - 提取 uid 和 game_token
      const raw = res?.data?.payload?.raw
      if (raw) {
        const parsed = JSON.parse(raw)
        console.log('[QRLogin] 扫码确认, uid:', parsed.uid)
        return { scanned: true, expired: false, uid: parsed.uid, gameToken: parsed.token }
      }
    }
    if (res?.retcode === -106) {
      return { scanned: false, expired: true }
    }
    return { scanned: false, expired: false }
  } catch (e: any) {
    console.log('[QRLogin] 查询扫码状态异常:', e.message)
    return { scanned: false, expired: false }
  }
}

/**
 * 步骤3: GameToken → stoken_v2 + mid
 */
async function getTokenByGameToken(uid: string, gameToken: string): Promise<{ stokenV2: string; mid: string } | null> {
  try {
    const res = await fetch('https://api-takumi.mihoyo.com/account/ma-cn-session/app/getTokenByGameToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-rpc-app_id': 'bll8iq97cem8',
      },
      body: JSON.stringify({ account_id: parseInt(uid), game_token: gameToken }),
    }).then(r => r.json())

    if (res?.retcode === 0) {
      const stokenV2 = res?.data?.token?.token || ''
      const mid = res?.data?.user_info?.mid || ''
      console.log('[QRLogin] stoken_v2 获取成功')
      return { stokenV2, mid }
    }
    console.log('[QRLogin] 获取 stoken_v2 失败:', res?.message)
    return null
  } catch (e: any) {
    console.log('[QRLogin] 获取 stoken_v2 异常:', e.message)
    return null
  }
}

/**
 * 步骤4: stoken_v2 → ltoken
 */
async function getLTokenByStoken(uid: string, stokenV2: string, mid: string): Promise<string | null> {
  try {
    const cookie = `stoken=${stokenV2}; stuid=${uid}; mid=${mid}`
    const res = await fetch('https://passport-api.mihoyo.com/account/auth/api/getLTokenBySToken', {
      method: 'GET',
      headers: {
        'Cookie': cookie,
        'x-rpc-client_type': '1',
      },
    }).then(r => r.json())

    if (res?.retcode === 0) {
      const ltoken = res?.data?.ltoken || ''
      console.log('[QRLogin] ltoken 获取成功')
      return ltoken
    }
    console.log('[QRLogin] 获取 ltoken 失败:', res?.message)
    return null
  } catch (e: any) {
    console.log('[QRLogin] 获取 ltoken 异常:', e.message)
    return null
  }
}

/**
 * 步骤5: stoken_v2 → cookie_token
 */
async function getCookieTokenByStoken(uid: string, stokenV2: string, mid: string): Promise<string | null> {
  try {
    const cookie = `stoken=${stokenV2}; stuid=${uid}; mid=${mid}`
    const res = await fetch('https://passport-api.mihoyo.com/account/auth/api/getCookieAccountInfoBySToken', {
      method: 'GET',
      headers: {
        'Cookie': cookie,
        'x-rpc-client_type': '1',
      },
    }).then(r => r.json())

    if (res?.retcode === 0) {
      const cookieToken = res?.data?.cookie_token || ''
      console.log('[QRLogin] cookie_token 获取成功')
      return cookieToken
    }
    console.log('[QRLogin] 获取 cookie_token 失败:', res?.message)
    return null
  } catch (e: any) {
    console.log('[QRLogin] 获取 cookie_token 异常:', e.message)
    return null
  }
}

/**
 * 完整扫码登录流程
 */
export async function performQRLogin(): Promise<QRLoginResult> {
  const deviceId = generateDeviceId()
  console.log('[QRLogin] 开始扫码登录, deviceId:', deviceId)

  // 1. 获取二维码
  const qrData = await fetchQRCode(deviceId)
  if (!qrData) {
    return { success: false, error: '获取二维码失败' }
  }

  // 2. 轮询扫码状态（最多 120 秒）
  let uid: string | undefined
  let gameToken: string | undefined
  for (let i = 0; i < 40; i++) {
    await new Promise<void>(r => setTimeout(r, 3000))
    const status = await queryQRCodeStatus(qrData.ticket, deviceId)
    if (status.expired) {
      return { success: false, error: '二维码已过期' }
    }
    if (status.uid && status.gameToken) {
      uid = status.uid
      gameToken = status.gameToken
      break
    }
  }

  if (!uid || !gameToken) {
    return { success: false, error: '扫码超时' }
  }

  // 3. GameToken → stoken_v2
  const tokenData = await getTokenByGameToken(uid, gameToken)
  if (!tokenData) {
    return { success: false, error: '获取 stoken 失败' }
  }

  // 4. stoken_v2 → ltoken
  const ltoken = await getLTokenByStoken(uid, tokenData.stokenV2, tokenData.mid)

  // 5. stoken_v2 → cookie_token
  const cookieToken = await getCookieTokenByStoken(uid, tokenData.stokenV2, tokenData.mid)

  if (!cookieToken) {
    return { success: false, error: '获取 cookie_token 失败' }
  }

  // 6. 组装 Cookie
  const cookieParts = [
    `account_id=${uid}`,
    `ltuid_v2=${uid}`,
    `ltoken_v2=${ltoken || ''}`,
    `cookie_token_v2=${cookieToken}`,
    `device_id=${deviceId}`,
  ]
  const cookie = cookieParts.join('; ')

  console.log('[QRLogin] 登录成功! uid:', uid)
  return { success: true, cookie, uid }
}

/** 导出 deviceId 供 UI 生成二维码使用 */
export { generateDeviceId }

/**
 * 仅 token 交换（扫码确认后调用，不重新生成二维码）
 */
export async function exchangeTokensForCookie(uid: string, gameToken: string, deviceId: string): Promise<QRLoginResult> {
  console.log('[QRLogin] 开始 token 交换, uid:', uid)

  // 1. GameToken → stoken_v2
  const tokenData = await getTokenByGameToken(uid, gameToken)
  if (!tokenData) {
    return { success: false, error: '获取 stoken 失败' }
  }

  // 2. stoken_v2 → ltoken
  const ltoken = await getLTokenByStoken(uid, tokenData.stokenV2, tokenData.mid)

  // 3. stoken_v2 → cookie_token
  const cookieToken = await getCookieTokenByStoken(uid, tokenData.stokenV2, tokenData.mid)

  if (!cookieToken) {
    return { success: false, error: '获取 cookie_token 失败' }
  }

  // 4. 保存 stoken（APP 级认证，用于 signIn/getTaskList 等）
  Storage.set('mihoyo_stuid', uid)
  Storage.set('mihoyo_stoken', tokenData.stokenV2)
  if (tokenData.mid) Storage.set('mihoyo_mid', tokenData.mid)
  console.log('[QRLogin] stoken 已保存, stuid:', uid)

  // 5. 保存 device_id
  Storage.set('mihoyo_device_id', deviceId)

  // 6. 组装 Web Cookie（用于 getUserInfo 等 Web API）
  const cookieParts = [
    `account_id=${uid}`,
    `ltuid_v2=${uid}`,
    `ltoken_v2=${ltoken || ''}`,
    `cookie_token_v2=${cookieToken}`,
    `device_id=${deviceId}`,
  ]
  const cookie = cookieParts.join('; ')

  // 7. 保存 Web Cookie
  Storage.set('mihoyo_cookie', cookie)
  console.log('[QRLogin] 登录成功! uid:', uid, 'stoken + cookie 均已保存')
  return { success: true, cookie, uid }
}
