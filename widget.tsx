// 桌面小组件 - 账号共享 Sakura
// 小组件 (systemSmall) + 中组件 (systemMedium) 双视图
// 支持透明背景

import {
  VStack,
  HStack,
  ZStack,
  Text,
  Image,
  Spacer,
  Widget,
} from 'scripting'
import { fetch } from 'scripting'

// ============================================
// 主题配色（与主应用保持一致）
// ============================================
const T = {
  bg: '#000000',
  surface: 'rgba(255,255,255,0.08)',
  surface2: 'rgba(255,255,255,0.12)',
  border: 'rgba(255,255,255,0.1)',
  text: '#ffffff',
  text2: 'rgba(255,255,255,0.7)',
  text3: 'rgba(255,255,255,0.5)',
  text4: 'rgba(255,255,255,0.3)',
  blue: '#3b82f6',
  blue2: '#60a5fa',
  green: '#22c55e',
  green2: '#4ade80',
  red: '#ef4444',
  purple: '#a855f7',
  orange: '#f59e0b',
}

const API_URL = 'https://sliverkiss-psi.vercel.app/api/accounts'
const CACHE_KEY = 'sakura_accounts_cache'

// ============================================
// 数据结构
// ============================================
type Account = {
  id: string
  email: string
  password: string
  canCopy: boolean
  region: string
  status: string
  lastCheck: string
  regionName: string
}

type ApiResponse = {
  lastUpdate: string
  refreshInterval: number
  accounts: Account[]
}

// ============================================
// 工具函数
// ============================================
function loadCache(): ApiResponse | null {
  try {
    const raw = Storage.get(CACHE_KEY) as string | null
    if (!raw) return null
    return JSON.parse(raw) as ApiResponse
  } catch {
    return null
  }
}

function regionFlag(code: string): string {
  const map: Record<string, string> = {
    US: '🇺🇸', JP: '🇯🇵', KR: '🇰🇷', HK: '🇭🇰', TW: '🇹🇼',
    CN: '🇨🇳', GB: '🇬🇧', DE: '🇩🇪', FR: '🇫🇷', VN: '🇻🇳',
    AU: '🇦🇺', CA: '🇨🇦', SG: '🇸🇬',
  }
  return map[code] || '🌐'
}

function relTime(iso: string): string {
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

// 透明背景时的主色（避免纯黑）
function bgStyle() {
  return Widget.isTransparentBackground ? 'rgba(0,0,0,0.0)' : T.bg
}

// ============================================
// 小组件 (systemSmall) - 概览
// ============================================
function SmallWidget(props: { data: ApiResponse | null }) {
  const { data } = props
  const total = data?.accounts.length || 0
  const regionCount = data
    ? new Set(data.accounts.map(a => a.regionName)).size
    : 0
  const lastUpdate = data?.lastUpdate || ''

  return (
    <VStack
      alignment="leading"
      spacing={6}
      padding={{ top: 14, bottom: 14, leading: 14, trailing: 14 }}
      // @ts-ignore
      background={bgStyle()}
      // @ts-ignore
      cornerRadius={20}
    >
      {/* 顶部：图标 + 标题 */}
      <HStack alignment="center" spacing={6}>
        <Text font="title3">🌸</Text>
        <Text
          // @ts-ignore
          foregroundColor={T.text}
          font="footnote"
          bold
        >
          账号共享
        </Text>
        <Spacer />
        <HStack alignment="center" spacing={3}>
          <Text
            // @ts-ignore
            foregroundColor={T.green}
            font="caption"
          >
            ●
          </Text>
          <Text
            // @ts-ignore
            foregroundColor={T.green2}
            font="caption"
            bold
          >
            活跃
          </Text>
        </HStack>
      </HStack>

      {/* 中间：大数字 */}
      <VStack alignment="leading" spacing={2}>
        <Text
          // @ts-ignore
          foregroundColor={T.text}
          font="largeTitle"
          bold
        >
          {total}
        </Text>
        <Text
          // @ts-ignore
          foregroundColor={T.text2}
          font="caption"
        >
          {`${regionCount} 个地区 · 共 ${total} 个账号`}
        </Text>
      </VStack>

      <Spacer />

      {/* 底部：更新时间 */}
      <HStack alignment="center" spacing={4}>
        <Text
          // @ts-ignore
          foregroundColor={T.text3}
          font="caption"
        >
          {lastUpdate ? `更新于 ${relTime(lastUpdate)}` : '加载中...'}
        </Text>
      </HStack>
    </VStack>
  )
}

// ============================================
// 中组件 (systemMedium) - 地区分布 + 最近账号
// ============================================
function MediumWidget(props: { data: ApiResponse | null }) {
  const { data } = props
  const accounts = data?.accounts || []
  const total = accounts.length

  // 统计地区分布（取 top 5）
  const regionStats: Record<string, number> = {}
  accounts.forEach(a => {
    regionStats[a.regionName] = (regionStats[a.regionName] || 0) + 1
  })
  const topRegions = Object.entries(regionStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)

  // 取最近 3 个账号
  const recent = accounts.slice(0, 3)

  return (
    <VStack
      alignment="leading"
      spacing={10}
      padding={{ top: 14, bottom: 14, leading: 16, trailing: 16 }}
      // @ts-ignore
      background={bgStyle()}
      // @ts-ignore
      cornerRadius={20}
    >
      {/* 顶部：标题 + 统计 */}
      <HStack alignment="center">
        <HStack alignment="center" spacing={6}>
          <Text font="title3">🌸</Text>
          <VStack alignment="leading" spacing={1}>
            <Text
              // @ts-ignore
              foregroundColor={T.text}
              font="subheadline"
              bold
            >
              账号共享
            </Text>
            <Text
              // @ts-ignore
              foregroundColor={T.text3}
              font="caption"
            >
              {data?.lastUpdate ? `更新于 ${relTime(data.lastUpdate)}` : '加载中...'}
            </Text>
          </VStack>
        </HStack>
        <Spacer />
        <HStack
          alignment="center"
          spacing={4}
          padding={{ horizontal: 10, vertical: 4 }}
          // @ts-ignore
          background="rgba(34,197,94,0.18)"
          // @ts-ignore
          cornerRadius={10}
        >
          <Text
            // @ts-ignore
            foregroundColor={T.green2}
            font="title3"
            bold
          >
            {total}
          </Text>
          <Text
            // @ts-ignore
            foregroundColor={T.green2}
            font="caption"
            bold
          >
            在线
          </Text>
        </HStack>
      </HStack>

      {/* 地区分布条形图 */}
      <VStack alignment="leading" spacing={6}>
        <Text
          // @ts-ignore
          foregroundColor={T.text3}
          font="caption"
          bold
        >
          地区分布
        </Text>
        <VStack alignment="leading" spacing={4}>
          {topRegions.map(([name, count]) => {
            const pct = total > 0 ? (count / total) * 100 : 0
            return (
              <VStack
                key={name}
                alignment="leading"
                spacing={3}
              >
                <HStack alignment="center">
                  <Text
                    // @ts-ignore
                    foregroundColor={T.text2}
                    font="caption"
                  >
                    {name}
                  </Text>
                  <Spacer />
                  <Text
                    // @ts-ignore
                    foregroundColor={T.text}
                    font="caption"
                    bold
                  >
                    {count}
                  </Text>
                </HStack>
                <VStack
                  frame={{ height: 4 }}
                  // @ts-ignore
                  background={T.surface}
                  // @ts-ignore
                  cornerRadius={2}
                >
                  <VStack
                    frame={{ width: `${pct}%` as any, height: 4 }}
                    // @ts-ignore
                    background={T.blue}
                    // @ts-ignore
                    cornerRadius={2}
                  />
                </VStack>
              </VStack>
            )
          })}
        </VStack>
      </VStack>

      {/* 最近账号（最多 3 个） */}
      {recent.length > 0 ? (
        <VStack alignment="leading" spacing={6}>
          <Text
            // @ts-ignore
            foregroundColor={T.text3}
            font="caption"
            bold
          >
            可用账号
          </Text>
          <VStack alignment="leading" spacing={4}>
            {recent.map(acc => (
              <HStack
                key={acc.id}
                alignment="center"
                spacing={8}
                padding={{ horizontal: 8, vertical: 5 }}
                // @ts-ignore
                background={T.surface}
                // @ts-ignore
                cornerRadius={8}
              >
                <Text font="caption">{regionFlag(acc.region)}</Text>
                <Text
                  // @ts-ignore
                  foregroundColor={T.text2}
                  font="caption"
                >
                  {acc.regionName}
                </Text>
                <Spacer />
                <Text
                  // @ts-ignore
                  foregroundColor={T.text}
                  font="caption"
                  bold
                >
                  {acc.email}
                </Text>
              </HStack>
            ))}
          </VStack>
        </VStack>
      ) : null}
    </VStack>
  )
}

// ============================================
// Widget 入口
// ============================================
async function run() {
  // 优先使用缓存，避免空白
  const cached = loadCache()
  let data: ApiResponse | null = cached

  // 异步刷新
  try {
    const res = await fetch(API_URL, {
      method: 'GET',
      headers: {
        Origin: 'https://sliverkiss-psi.vercel.app',
        Referer: 'https://sliverkiss-psi.vercel.app/accounts',
      },
      timeout: 10,
    })
    if (res.ok) {
      const json = await res.json() as ApiResponse
      data = json
      try {
        Storage.set(CACHE_KEY, JSON.stringify(json))
      } catch {}
    }
  } catch (e) {
    console.error('widget fetch err:', String(e))
  }

  // 根据 family 选择视图
  if (Widget.family === 'systemMedium') {
    Widget.present(
      <MediumWidget data={data} />,
      { policy: 'after', date: new Date(Date.now() + 30 * 60 * 1000) }
    )
  } else {
    Widget.present(
      <SmallWidget data={data} />,
      { policy: 'after', date: new Date(Date.now() + 30 * 60 * 1000) }
    )
  }
}
run()
