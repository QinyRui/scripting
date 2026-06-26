// theme.ts - 主题配色、工具函数、类型定义
// 所有 tab 共享此文件

import { fetch } from 'scripting'

// 主题配色（深色玻璃拟态，匹配网站风格）
export const T = {
  bg: '#000000',
  surface: 'rgba(255,255,255,0.06)',
  surface2: 'rgba(255,255,255,0.1)',
  border: 'rgba(255,255,255,0.1)',
  divider: 'rgba(255,255,255,0.06)',
  text: '#ffffff',
  text2: 'rgba(255,255,255,0.7)',
  text3: 'rgba(255,255,255,0.45)',
  text4: 'rgba(255,255,255,0.3)',
  blue: '#3b82f6',
  blue2: '#60a5fa',
  green: '#22c55e',
  green2: '#4ade80',
  red: '#ef4444',
  purple: '#a855f7',
  pink: '#ec4899',
  orange: '#f59e0b',
  yellow: '#eab308',
}

// 账号类型
export type Account = {
  id: string
  email: string
  password: string
  canCopy: boolean
  region: string
  status: string
  lastCheck: string
  regionName: string
}

// 账号 API 响应
export type ApiResponse = {
  lastUpdate: string
  refreshInterval: number
  accounts: Account[]
}

// 限免应用
export type FreeApp = {
  id: string
  name: string
  type: '本体限免' | '内购限免'
  category?: string
  icon?: string
}

// 国旗 emoji 映射
export function regionFlag(code: string): string {
  const map: Record<string, string> = {
    US: '🇺🇸', JP: '🇯🇵', KR: '🇰🇷', HK: '🇭🇰', TW: '🇹🇼',
    CN: '🇨🇳', GB: '🇬🇧', DE: '🇩🇪', FR: '🇫🇷', VN: '🇻🇳',
    AU: '🇦🇺', CA: '🇨🇦', SG: '🇸🇬', IN: '🇮🇳', TR: '🇹🇷',
    PH: '🇵🇭', NG: '🇳🇬', AE: '🇦🇪',
  }
  return map[code] || '🌐'
}

// 邮箱域名提取
export function emailDomain(email: string): string {
  const at = email.indexOf('@')
  return at >= 0 ? email.substring(at + 1) : ''
}

// 相对时间（"2026-06-21 15:43:37" -> "13 分钟前"）
export function relTime(iso: string): string {
  if (!iso) return ''
  try {
    const t = iso.includes('T') ? iso : iso.replace(' ', 'T') + 'Z'
    const d = new Date(t)
    const diff = Date.now() - d.getTime()
    if (diff < 0) return '刚刚'
    const min = Math.floor(diff / 60000)
    if (min < 1) return '刚刚'
    if (min < 60) return `${min} 分钟前`
    const h = Math.floor(min / 60)
    if (h < 24) return `${h} 小时前`
    return `${Math.floor(h / 24)} 天前`
  } catch {
    return iso
  }
}

// 账号 API
export const API_URL = 'https://sliverkiss-psi.vercel.app/api/accounts'
export const CACHE_KEY = 'sakura_accounts_cache'

// 读缓存
export function loadCache(): ApiResponse | null {
  try {
    const raw = Storage.get(CACHE_KEY) as string | null
    if (!raw) return null
    return JSON.parse(raw) as ApiResponse
  } catch {
    return null
  }
}

// 写缓存
export function saveCache(d: ApiResponse) {
  try {
    Storage.set(CACHE_KEY, JSON.stringify(d))
  } catch {}
}

// 拉取账号
export async function fetchAccounts(): Promise<ApiResponse | null> {
  try {
    const res = await fetch(API_URL, {
      method: 'GET',
      headers: {
        Origin: 'https://sliverkiss-psi.vercel.app',
        Referer: 'https://sliverkiss-psi.vercel.app/accounts',
      },
      timeout: 15,
    })
    if (!res.ok) return null
    return await res.json() as ApiResponse
  } catch (e) {
    console.error('fetch err:', String(e))
    return null
  }
}
