// tabs/IapTab.tsx - 内购查询 Tab
// 功能：搜索应用 → 查看内购/订阅 productId 和价格

import {
  VStack,
  HStack,
  Text,
  ScrollView,
  Spacer,
  Image,
  useState,
  useObservable,
  fetch,
} from 'scripting'
import { T } from '../theme'
import { PageHeader, SearchBar, LoadingView, EmptyView } from '../components'
import { IAP_REGIONS, IAP_SEARCH_TYPES, IAP_PRESETS } from '../data'

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
  '法国': 'fr', '加拿大': 'ca',
}

// 类型定义
interface SearchResult {
  trackId: number
  trackName: string
  bundleId: string
  artworkUrl100: string
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
          <Text
            // @ts-ignore
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
            // @ts-ignore
            background={T.surface}
            // @ts-ignore
            cornerRadius={12}
          >
            <HStack alignment="center" spacing={12}>
              {app.artworkUrl100 ? (
                <Image
                  imageUrl={smallIcon(app.artworkUrl100)}
                  frame={{ width: 28, height: 28 }}
                  // @ts-ignore
                  cornerRadius={6}
                />
              ) : (
                <VStack
                  frame={{ width: 28, height: 28 }}
                  alignment="center"
                  // @ts-ignore
                  background={T.surface2}
                  // @ts-ignore
                  cornerRadius={6}
                >
                  <Text font="footnote">📱</Text>
                </VStack>
              )}
              <VStack alignment="leading" spacing={3} frame={{ maxWidth: 200 }}>
                <Text
                  // @ts-ignore
                  foregroundColor={T.text}
                  font="callout"
                  bold
                >
                  {app.trackName}
                </Text>
                <Text
                  // @ts-ignore
                  foregroundColor={T.text4}
                  font="caption2"
                >
                  {app.bundleId}
                </Text>
                <Text
                  // @ts-ignore
                  foregroundColor={T.text3}
                  font="caption"
                >
                  {app.sellerName}
                </Text>
              </VStack>
              <Spacer />
              <VStack alignment="trailing" spacing={3}>
                <Text
                  // @ts-ignore
                  foregroundColor={T.purple}
                  font="footnote"
                  bold
                >
                  内购 →
                </Text>
                {app.averageUserRating ? (
                  <Text
                    // @ts-ignore
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
        <VStack
          padding={{ horizontal: 16, vertical: 14 }}
          margin={{ leading: 16, trailing: 16, top: 8, bottom: 8 }}
          // @ts-ignore
          background={T.surface}
          // @ts-ignore
          cornerRadius={14}
        >
          <HStack alignment="center" spacing={12}>
            {app.iconUrl ? (
              <Image
                imageUrl={smallIcon(app.iconUrl)}
                frame={{ width: 32, height: 32 }}
                // @ts-ignore
                cornerRadius={7}
              />
            ) : null}
            <VStack alignment="leading" spacing={3}>
              <Text
                // @ts-ignore
                foregroundColor={T.text}
                font="title3"
                bold
              >
                {app.name}
              </Text>
              <Text
                // @ts-ignore
                foregroundColor={T.text4}
                font="caption2"
              >
                {app.bundleId}
              </Text>
              {rating ? (
                <HStack alignment="center" spacing={8}>
                  <Text
                    // @ts-ignore
                    foregroundColor={T.text3}
                    font="caption"
                  >
                    ⭐ {rating.value.toFixed(1)}
                  </Text>
                  <Text
                    // @ts-ignore
                    foregroundColor={T.text4}
                    font="caption2"
                  >
                    ({rating.ratingCount.toLocaleString()} 评分)
                  </Text>
                </HStack>
              ) : null}
            </VStack>
            <Spacer />
            <VStack
              onTapGesture={() => { setIapDetail(null); setSearchResults([]) }}
              padding={{ horizontal: 10, vertical: 6 }}
              // @ts-ignore
              background={T.surface2}
              // @ts-ignore
              cornerRadius={8}
            >
              <Text
                // @ts-ignore
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
          <Text
            // @ts-ignore
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
              // @ts-ignore
              background={T.surface}
              // @ts-ignore
              cornerRadius={10}
            >
              <HStack alignment="center" spacing={10}>
                <VStack
                  frame={{ width: 32, height: 32 }}
                  alignment="center"
                  // @ts-ignore
                  background="rgba(168,85,247,0.15)"
                  // @ts-ignore
                  cornerRadius={8}
                >
                  <Text font="callout">💎</Text>
                </VStack>
                <VStack alignment="leading" spacing={3} frame={{ maxWidth: 200 }}>
                  <Text
                    // @ts-ignore
                    foregroundColor={T.text}
                    font="callout"
                    bold
                  >
                    {iap.name || '未知项目'}
                  </Text>
                  {iap.productId ? (
                    <Text
                      // @ts-ignore
                      foregroundColor={T.text4}
                      font="caption2"
                    >
                      {iap.productId}
                    </Text>
                  ) : null}
                  {iap.type ? (
                    <Text
                      // @ts-ignore
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
                      // @ts-ignore
                      foregroundColor={T.purple}
                      font="callout"
                      bold
                    >
                      {iap.displayPrice}
                    </Text>
                  ) : null}
                  {iap.price ? (
                    <Text
                      // @ts-ignore
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
    <VStack
      // @ts-ignore
      background={T.bg}
    >
      <PageHeader
        title="内购查询"
        subtitle="查询 App 内购/订阅 productId · 解锁隐藏项目"
        desc="查询任意应用的内购和订阅项目详细信息，包括 productId、价格、类型等。"
      />

      {/* 地区选择 */}
      <ScrollView axes="horizontal">
        <HStack
          padding={{ leading: 16, trailing: 16, vertical: 6 }}
          spacing={8}
          alignment="center"
        >
          {IAP_REGIONS.map(r => {
            const active = r === region
            return (
              <VStack
                key={r}
                onTapGesture={() => setRegion(r)}
                padding={{ horizontal: 12, vertical: 6 }}
                // @ts-ignore
                background={active ? T.purple : T.surface}
                // @ts-ignore
                cornerRadius={14}
              >
                <Text
                  // @ts-ignore
                  foregroundColor={active ? '#fff' : T.text2}
                  font="footnote"
                  bold={active}
                >
                  {r}
                </Text>
              </VStack>
            )
          })}
        </HStack>
      </ScrollView>

      {/* 搜索类型选择 */}
      <HStack
        padding={{ leading: 20, trailing: 20, top: 6, bottom: 4 }}
        spacing={6}
        alignment="center"
      >
        <Text
          // @ts-ignore
          foregroundColor={T.text3}
          font="caption"
        >
          搜索类型:
        </Text>
        {IAP_SEARCH_TYPES.map(t => {
          const active = t === searchType
          return (
            <VStack
              key={t}
              onTapGesture={() => setSearchType(t)}
              padding={{ horizontal: 8, vertical: 4 }}
              // @ts-ignore
              background={active ? T.purple : T.surface2}
              // @ts-ignore
              cornerRadius={6}
            >
              <Text
                // @ts-ignore
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

      {/* 搜索框 */}
      <SearchBar textObs={searchObs} placeholder={
        searchType === '应用名称' ? '输入应用名称...'
        : searchType === 'Bundle ID' ? '如 com.openai.chat'
        : searchType === 'Track ID' ? '输入数字 ID'
        : '粘贴 App Store 链接'
      } />

      {/* 提示 */}
      <VStack
        padding={10}
        // @ts-ignore
        margin={{ leading: 16, trailing: 16, top: 2, bottom: 4 }}
        // @ts-ignore
        background="rgba(168,85,247,0.1)"
        // @ts-ignore
        cornerRadius={10}
      >
        <Text
          // @ts-ignore
          foregroundColor={T.text2}
          font="caption"
        >
          💡 {searchType === '应用名称'
            ? '直接输入应用名称，如 ChatGPT、Notion'
            : searchType === 'Bundle ID'
            ? '格式如 com.openai.chat'
            : searchType === 'Track ID'
            ? '数字 ID，从 App Store URL 提取'
            : '粘贴完整 App Store 链接'}
        </Text>
      </VStack>

      {/* 预设应用（仅在未搜索时显示） */}
      {!iapDetail && searchResults.length === 0 && !loading ? (
        <ScrollView axes="horizontal">
          <HStack
            padding={{ leading: 16, trailing: 16, vertical: 6 }}
            spacing={8}
            alignment="center"
          >
            {IAP_PRESETS.map(p => (
              <VStack
                key={p}
                onTapGesture={() => { searchObs.setValue(p); doSearchWithQuery(p) }}
                padding={{ horizontal: 12, vertical: 6 }}
                // @ts-ignore
                background={T.surface}
                // @ts-ignore
                cornerRadius={14}
              >
                <Text
                  // @ts-ignore
                  foregroundColor={T.text2}
                  font="footnote"
                >
                  {p}
                </Text>
              </VStack>
            ))}
          </HStack>
        </ScrollView>
      ) : null}

      {/* 搜索按钮 */}
      {!iapDetail ? (
        <VStack
          onTapGesture={doSearch}
          padding={{ top: 12, bottom: 12 }}
          margin={{ leading: 16, trailing: 16, top: 4, bottom: 8 }}
          // @ts-ignore
          background={T.purple}
          // @ts-ignore
          cornerRadius={12}
          alignment="center"
        >
          <HStack alignment="center" spacing={6}>
            <Text font="callout">🔍</Text>
            <Text
              // @ts-ignore
              foregroundColor="#fff"
              font="callout"
              bold
            >
              查询内购项目
            </Text>
          </HStack>
        </VStack>
      ) : null}

      {/* 内容区域 */}
      <ScrollView>
        {iapDetail ? renderIAPDetail() : renderSearchResults()}
      </ScrollView>
    </VStack>
  )
}
