// tabs/IapTab.tsx - 内购查询 Tab
// 功能：搜索应用 → 查看内购/订阅 productId 和价格

import {
  VStack,
  HStack,
  Text,
  ScrollView,
  Spacer,
  Image,
  TextField,
  Picker,
  useState,
  useObservable,
  fetch,
} from 'scripting'
import { T } from '../theme'
import { PageHeader, LoadingView, EmptyView } from '../components'
import { IAP_REGIONS, IAP_SEARCH_TYPES } from '../data'

// API 基础配置
const BASE = 'https://sliverkiss-psi.vercel.app'
const HEADERS_JSON = {
  'Content-Type': 'application/json',
  'Origin': BASE,
  'Referer': `${BASE}/iap`,
}

// 地区名到国家代码映射
const REGION_CODE: Record<string, string> = {
  '美国': 'us', '中国': 'cn', '香港': 'hk', '台湾': 'tw',
  '日本': 'jp', '英国': 'gb', '韩国': 'kr', '德国': 'de',
  '法国': 'fr', '加拿大': 'ca', '澳大利亚': 'au', '印度': 'in',
}

// 国家国旗映射
const FLAG_MAP: Record<string, string> = {
  '美国': '🇺🇸', '中国': '🇨🇳', '香港': '🇭🇰', '台湾': '🇹🇼',
  '日本': '🇯🇵', '英国': '🇬🇧', '韩国': '🇰🇷', '德国': '🇩🇪',
  '法国': '🇫🇷', '加拿大': '🇨🇦', '澳大利亚': '🇦🇺', '印度': '🇮🇳',
}

// 类型定义
interface SearchResult {
  trackId: number
  trackName: string
  bundleId: string
  artworkUrl512: string
  description: string
  averageUserRating: number
  userRatingCount: number
  formattedPrice: string
  sellerName: string
}

interface IAPItem {
  name?: string
  price?: string
  productId?: string
  type?: string
  displayPrice?: string
  description?: string
}

interface IAPDetail {
  app: {
    name: string
    bundleId: string
    iconUrl: string
    userRating?: {
      ratingCount: number
      value: number
    }
  }
  iaps: IAPItem[]
  fetchedAt: string
}

// 缩小 App Store 图标 URL 列表尺寸（标准 iOS 列表图标 53pt）
function smallIcon(url: string): string {
  return url.replace(/\d+x\d+bb/, '53x53bb')
}

export function IapTab() {
  const [searchType, setSearchType] = useState<string>('应用名称')
  const [region, setRegion] = useState<string>('中国')
  const searchObs = useObservable<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [iapDetail, setIapDetail] = useState<IAPDetail | null>(null)
  const [error, setError] = useState<string>('')
  const [showRegionPicker, setShowRegionPicker] = useState<boolean>(false)

  // 搜索应用
  async function doSearch() {
    await doSearchWithQuery(searchObs.value)
  }

  // 按指定关键词搜索（预设用）
  async function doSearchWithQuery(query: string) {
    const q = query.trim()
    if (!q) {
      setError('请输入查询内容')
      return
    }
    setLoading(true)
    setError('')
    setIapDetail(null)
    // 保留旧搜索结果，避免闪屏回到初始状态

    const code = REGION_CODE[region] || 'cn'

    try {
      if (searchType === '应用名称') {
        // 通过应用名称搜索
        const url = `${BASE}/api/icon?term=${encodeURIComponent(q)}&country=${code}&entity=software&limit=10`
        const res = await fetch(url, {
          headers: {
            'Origin': BASE,
            'Referer': `${BASE}/iap`,
          },
        })
        const data = await res.json()
        if (data.results && data.results.length > 0) {
          setSearchResults(data.results)
        } else {
          setError('没有找到相关应用')
        }
      } else if (searchType === 'Bundle ID') {
        // 直接通过 Bundle ID 查询内购
        await loadIAPByBundleId(q, code)
      } else if (searchType === 'Track ID') {
        // 通过 Track ID 搜索
        const url = `${BASE}/api/icon?id=${q}&country=${code}&entity=software&limit=1`
        const res = await fetch(url, {
          headers: {
            'Origin': BASE,
            'Referer': `${BASE}/iap`,
          },
        })
        const data = await res.json()
        if (data.results && data.results.length > 0) {
          await loadIAPByBundleId(data.results[0].bundleId, code)
        } else {
          setError('没有找到该 Track ID 对应的应用')
        }
      } else if (searchType === 'App Store 链接') {
        // 从 URL 提取 ID
        const match = q.match(/id(\d+)/)
        if (match) {
          const url = `${BASE}/api/icon?id=${match[1]}&country=${code}&entity=software&limit=1`
          const res = await fetch(url, {
            headers: {
              'Origin': BASE,
              'Referer': `${BASE}/iap`,
            },
          })
          const data = await res.json()
          if (data.results && data.results.length > 0) {
            await loadIAPByBundleId(data.results[0].bundleId, code)
          } else {
            setError('没有找到该链接对应的应用')
          }
        } else {
          setError('无法从链接中提取应用 ID')
        }
      }
    } catch (e) {
      setError('网络错误，请检查连接')
    }
    setLoading(false)
  }

  // 通过 Bundle ID 加载内购详情
  async function loadIAPByBundleId(bundleId: string, country: string) {
    const url = `${BASE}/api/iap?bundleId=${encodeURIComponent(bundleId)}&country=${country}`
    const res = await fetch(url, {
      headers: {
        'Origin': BASE,
        'Referer': `${BASE}/iap`,
      },
    })
    const data = await res.json()
    if (data.app) {
      setIapDetail(data)
    } else {
      setError('获取内购信息失败')
    }
  }

  // 从搜索结果选择应用
  async function selectApp(app: SearchResult) {
    setLoading(true)
    setError('')
    const code = REGION_CODE[region] || 'cn'
    try {
      await loadIAPByBundleId(app.bundleId, code)
    } catch (e) {
      setError('网络错误')
    }
    setLoading(false)
  }

  // 渲染：搜索结果列表
  function renderSearchResults() {
    if (loading) return <LoadingView text="搜索中..." />
    if (error) return <EmptyView message={error} emoji="❌" />
    if (searchResults.length === 0) return null

    return (
      <VStack padding={{ top: 4, bottom: 16 }} spacing={0}>
        <HStack padding={{ leading: 20, trailing: 20, bottom: 8 }}>
          {/* @ts-ignore */}
          <Text
            foregroundColor={T.text3}
            font="caption"
            bold
          >
            {`找到 ${searchResults.length} 个应用，点击查看详情`}
          </Text>
        </HStack>
        {searchResults.map(app => (
          <VStack
            key={app.trackId}
            onTapGesture={() => selectApp(app)}
            padding={{ horizontal: 16, vertical: 12 }}
            margin={{ leading: 16, trailing: 16, bottom: 8 }}
          >
            <HStack alignment="center" spacing={12}>
              {app.artworkUrl512 ? (
                <Image
                  imageUrl={smallIcon(app.artworkUrl512)}
                  frame={{ width: 53, height: 53 }}
                  cornerRadius={12}
                />
              ) : (
                <VStack
                  frame={{ width: 53, height: 53 }}
                  alignment="center"
                  background={T.surface2}
                  cornerRadius={12}
                  clipShape="capsule"
                >
                  <Text font="title3">📱</Text>
                </VStack>
              )}
              <VStack alignment="leading" spacing={3} frame={{ maxWidth: 200 }}>
                {/* @ts-ignore */}
                <Text
                  foregroundColor={T.text}
                  font="callout"
                  bold
                >
                  {app.trackName}
                </Text>
                {/* @ts-ignore */}
                <Text
                  foregroundColor={T.text4}
                  font="caption2"
                >
                  {app.bundleId}
                </Text>
                {/* @ts-ignore */}
                <Text
                  foregroundColor={T.text3}
                  font="caption"
                >
                  {app.sellerName}
                </Text>
              </VStack>
              <Spacer />
              <VStack alignment="trailing" spacing={3}>
                {/* @ts-ignore */}
                <Text
                  foregroundColor={T.purple}
                  font="footnote"
                  bold
                >
                  内购 →
                </Text>
                {app.averageUserRating ? (
                  <Text
                    foregroundColor={T.text4}
                    font="caption2"
                  >
                    ⭐ {app.averageUserRating.toFixed(1)}
                  </Text>
                ) : null}
              </VStack>
            </HStack>
          </VStack>
        ))}
      </VStack>
    )
  }

  // 渲染：内购详情
  function renderIAPDetail() {
    if (loading) return <LoadingView text="加载内购信息..." />
    if (!iapDetail) return null

    const { app, iaps } = iapDetail
    const rating = app.userRating

    return (
      <VStack spacing={0} padding={{ bottom: 16 }}>
        {/* 应用信息 */}
        {/* @ts-ignore */}
        <VStack
          padding={{ horizontal: 16, vertical: 14 }}
          margin={{ leading: 16, trailing: 16, top: 8, bottom: 8 }}
        >
          <HStack alignment="center" spacing={12}>
            {app.iconUrl ? (
              <Image
                imageUrl={smallIcon(app.iconUrl)}
                frame={{ width: 32, height: 32 }}
                cornerRadius={7}
              />
            ) : null}
            <VStack alignment="leading" spacing={3}>
              {/* @ts-ignore */}
              <Text
                foregroundColor={T.text}
                font="title3"
                bold
              >
                {app.name}
              </Text>
              {/* @ts-ignore */}
              <Text
                foregroundColor={T.text4}
                font="caption2"
              >
                {app.bundleId}
              </Text>
              {rating ? (
                <HStack alignment="center" spacing={8}>
                  {/* @ts-ignore */}
                  <Text
                    foregroundColor={T.text3}
                    font="caption"
                  >
                    ⭐ {rating.value.toFixed(1)}
                  </Text>
                  {/* @ts-ignore */}
                  <Text
                    foregroundColor={T.text4}
                    font="caption2"
                  >
                    ({rating.ratingCount.toLocaleString()} 评分)
                  </Text>
                </HStack>
              ) : null}
            </VStack>
            <Spacer />
            {/* @ts-ignore */}
            <VStack
              onTapGesture={() => { setIapDetail(null); setSearchResults([]) }}
              padding={{ horizontal: 12, vertical: 7 }}
              background={T.glass}
              cornerRadius={20}
              stroke={T.glassBorder}
              strokeWidth={0.5}
              clipShape="capsule"
            >
              {/* @ts-ignore */}
              <Text
                foregroundColor={T.text2}
                font="caption"
              >
                ← 返回
              </Text>
            </VStack>
          </HStack>
        </VStack>

        {/* 内购列表 */}
        <HStack
          padding={{ leading: 20, trailing: 20, top: 8, bottom: 8 }}
        >
          {/* @ts-ignore */}
          <Text
            foregroundColor={T.text3}
            font="caption"
            bold
          >
            {iaps.length > 0 ? `内购项目 (${iaps.length})` : '内购项目'}
          </Text>
        </HStack>

        {iaps.length === 0 ? (
          <EmptyView message="该应用没有公开的内购项目" emoji="📭" />
        ) : (
          iaps.map((iap, idx) => (
            <VStack
              key={idx}
              padding={{ horizontal: 16, vertical: 12 }}
              margin={{ leading: 16, trailing: 16, bottom: 6 }}
            >
              <HStack alignment="center" spacing={10}>
                {/* @ts-ignore */}
                <VStack
                  frame={{ width: 32, height: 32 }}
                  alignment="center"
                  background="rgba(168,85,247,0.15)"
                  cornerRadius={8}
                  clipShape="capsule"
                >
                  <Text font="callout">💎</Text>
                </VStack>
                <VStack alignment="leading" spacing={3} frame={{ maxWidth: 200 }}>
                  {/* @ts-ignore */}
                  <Text
                    foregroundColor={T.text}
                    font="callout"
                    bold
                  >
                    {iap.name || '未知项目'}
                  </Text>
                  {iap.productId ? (
                    <Text
                      foregroundColor={T.text4}
                      font="caption2"
                    >
                      {iap.productId}
                    </Text>
                  ) : null}
                  {iap.type ? (
                    <Text
                      foregroundColor={T.text3}
                      font="caption2"
                    >
                      {iap.type}
                    </Text>
                  ) : null}
                </VStack>
                <Spacer />
                <VStack alignment="trailing" spacing={2}>
                  {iap.displayPrice ? (
                    <Text
                      foregroundColor={T.purple}
                      font="callout"
                      bold
                    >
                      {iap.displayPrice}
                    </Text>
                  ) : null}
                  {iap.price ? (
                    <Text
                      foregroundColor={T.text4}
                      font="caption2"
                    >
                      {iap.price}
                    </Text>
                  ) : null}
                </VStack>
              </HStack>
            </VStack>
          ))
        )}
      </VStack>
    )
  }

  return (
    <VStack>
      <PageHeader
        title="内购查询"
        subtitle="查询 App 内购/订阅 productId · 解锁隐藏项目"
        desc="查询任意应用的内购和订阅项目详细信息，包括 productId、价格、类型等。"
      />

      {/* 搜索类型选择 */}
      <HStack
        padding={{ leading: 20, trailing: 20, top: 6, bottom: 4 }}
        spacing={6}
        alignment="center"
      >
        {IAP_SEARCH_TYPES.map(t => {
          const active = t === searchType
          return (
            <VStack
              key={t}
              onTapGesture={() => setSearchType(t)}
              padding={{ horizontal: 12, vertical: 6 }}
              background={active ? T.glassActive : T.glass}
              cornerRadius={20}
              stroke={active ? T.purple : T.glassBorder}
              strokeWidth={active ? 1 : 0.5}
              clipShape="capsule"
            >
              <Text
                foregroundColor={active ? '#fff' : T.text2}
                font="caption"
                bold={active}
              >
                {t}
              </Text>
            </VStack>
          )
        })}
      </HStack>

      {/* 搜索栏：胶囊背景 */}
      <HStack
        alignment="center"
        spacing={0}
        padding={{ leading: 10, trailing: 7, vertical: 0 }}
        margin={{ leading: 16, trailing: 16, top: 4, bottom: 4 }}
        background={T.glass}
        cornerRadius={22}
        clipShape="capsule"
      >
        {/* 国家选择：Picker menu 和网站 select 一样 */}
        <Picker
          value={region}
          onChanged={(v) => setRegion(v)}
          pickerStyle="menu"
          label={
            <HStack alignment="center" spacing={2}>
              <Text font="footnote" bold>{FLAG_MAP[region] || '🌍'} {region}</Text>
              <Text font="caption2" foregroundColor={T.text3}>▾</Text>
            </HStack>
          }
        >
          {IAP_REGIONS.map(r => (
            <Text key={r} tag={r}>{FLAG_MAP[r] || '🌍'} {r}</Text>
          ))}
        </Picker>
        {/* 分隔线 */}
        <VStack frame={{ width: 1, height: 20 }} background={T.glassBorder} margin={{ leading: 8 }} />
        {/* 搜索输入 */}
        <VStack padding={{ leading: 12 }} frame={{ maxWidth: 200 }}>
          <TextField value={searchObs} title=" " prompt="搜索应用名称..." />
        </VStack>
        <Spacer />
        {/* 搜索按钮：网站同款白底深字 */}
        <VStack
          onTapGesture={doSearch}
          padding={{ horizontal: 14, vertical: 6 }}
          cornerRadius={8}
        >
          <Text font="footnote" bold>搜索</Text>
        </VStack>
      </HStack>

      {/* 提示 */}
      {/* @ts-ignore */}
      <VStack
        padding={10}
        margin={{ leading: 16, trailing: 16, top: 2, bottom: 4 }}
        background={T.purpleGlass}
        cornerRadius={20}
        stroke={T.glassBorder}
        strokeWidth={0.5}
        clipShape="capsule"
      >
        {/* @ts-ignore */}
        <Text
          foregroundColor={T.text2}
          font="caption"
        >
          输入 Bundle ID / Track ID / App Store 链接查询内购项目，或切换到应用名称搜索
        </Text>
      </VStack>


      {/* 内容区域 */}
      <ScrollView>
        {iapDetail ? renderIAPDetail() : renderSearchResults()}
      </ScrollView>
    </VStack>
  )
}
