// tabs/PriceTab.tsx - 应用比价 Tab
// 功能：搜索应用 → 选择 → 跨地区价格对比

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
import { PRICE_PRESETS } from '../data'

// API 基础配置
const BASE = 'https://sliverkiss-psi.vercel.app'
const HEADERS = {
  'Content-Type': 'application/json',
  'Origin': BASE,
  'Referer': `${BASE}/price`,
}

// 类型定义
interface AppItem {
  appId: string
  appName: string
  appDesc: string
  appImage: string
  platform: string
}

interface PriceInfo {
  area: string
  areaName: string
  cnyPrice: number
  currency: string
  currencyCode: string
  price: number
}

interface IAPItem {
  object: string
  price: PriceInfo
}

interface AreaData {
  appId: string
  area: string
  areaName: string
  name: string
  subtitle: string
  developer: string
  price: PriceInfo
  inAppPurchaseList: IAPItem[]
  appStoreUrl: string
}

// 国旗映射
const FLAG_MAP: Record<string, string> = {
  us: '🇺🇸', cn: '🇨🇳', tw: '🇹🇼', hk: '🇭🇰', jp: '🇯🇵',
  kr: '🇰🇷', ph: '🇵🇭', tr: '🇹🇷', ng: '🇳🇬', in: '🇮🇳',
  eg: '🇪🇬', pk: '🇵🇰', br: '🇧🇷', id: '🇮🇩', th: '🇹🇭',
  vn: '🇻🇳', my: '🇲🇾', sg: '🇸🇬', au: '🇦🇺', nz: '🇳🇿',
  gb: '🇬🇧', de: '🇩🇪', fr: '🇫🇷', it: '🇮🇹', es: '🇪🇸',
  ca: '🇨🇦', mx: '🇲🇽', ru: '🇷🇺', sa: '🇸🇦', ae: '🇦🇪',
}

// 缩小 App Store 图标 URL 列表尺寸（标准 iOS 列表图标 53pt）
function smallIcon(url: string): string {
  return url.replace(/\d+x\d+bb/, '53x53bb')
}

export function PriceTab() {
  const searchObs = useObservable<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [results, setResults] = useState<AppItem[]>([])
  const [selectedApp, setSelectedApp] = useState<AreaData[] | null>(null)
  const [selectedIAP, setSelectedIAP] = useState<string>('')
  const [viewMode, setViewMode] = useState<string>('全球比价')
  const [error, setError] = useState<string>('')

  // 搜索应用列表
  async function doSearch(query?: string) {
    const q = (query || searchObs.value).trim()
    if (!q) return
    setLoading(true)
    setError('')
    setSelectedApp(null)
    // 保留旧搜索结果，避免闪屏回到初始状态
    try {
      const res = await fetch(`${BASE}/api/price/getAppList`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({ appName: q, areaCode: 'us' }),
      })
      const data = await res.json()
      if (data.code === 0 && data.data) {
        // 只保留 iphone 和 ipad 平台
        const filtered = data.data.filter(
          (a: AppItem) => a.platform === 'iphone' || a.platform === 'ipad'
        )
        setResults(filtered)
        if (filtered.length === 0) setError('没有找到相关应用')
      } else {
        setError('搜索失败，请重试')
      }
    } catch (e) {
      setError('网络错误，请检查连接')
    }
    setLoading(false)
  }

  // 获取应用详情（跨地区比价）
  async function loadDetail(app: AppItem) {
    setLoading(true)
    setError('')
    setSelectedApp(null)
    try {
      const res = await fetch(`${BASE}/api/price/getAppInfo`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({ appId: app.appId }),
      })
      const data = await res.json()
      if (data.code === 0 && data.data && data.data.length > 0) {
        setSelectedApp(data.data)
        // 自动选中第一个 IAP
        const firstIAP = data.data[0].inAppPurchaseList
        if (firstIAP && firstIAP.length > 0) {
          setSelectedIAP(firstIAP[0].object)
        }
      } else {
        setError('获取价格详情失败')
      }
    } catch (e) {
      setError('网络错误，请检查连接')
    }
    setLoading(false)
  }

  // 获取所有 IAP 名称（去重）
  function getIAPNames(): string[] {
    if (!selectedApp || selectedApp.length === 0) return []
    const names = new Set<string>()
    for (const area of selectedApp) {
      if (area.inAppPurchaseList) {
        for (const iap of area.inAppPurchaseList) {
          names.add(iap.object)
        }
      }
    }
    return Array.from(names)
  }

  // 获取某个 IAP 在各地区的价格
  function getIAPPrices(iapName: string): { area: AreaData; iap: IAPItem }[] {
    if (!selectedApp) return []
    const list: { area: AreaData; iap: IAPItem }[] = []
    for (const area of selectedApp) {
      if (area.inAppPurchaseList) {
        const match = area.inAppPurchaseList.find(i => i.object === iapName)
        if (match) list.push({ area, iap: match })
      }
    }
    // 按人民币价格排序
    list.sort((a, b) => a.iap.price.cnyPrice - b.iap.price.cnyPrice)
    return list
  }

  // 格式化价格
  function fmtPrice(p: PriceInfo): string {
    if (p.price === 0) return '免费'
    return `${p.currency}${p.price.toLocaleString()}`
  }

  // 渲染：搜索结果列表
  function renderResults() {
    if (loading) return <LoadingView text="搜索中..." />
    if (error) return <EmptyView message={error} emoji="❌" />
    if (results.length === 0) return null

    return (
      <VStack padding={{ top: 4, bottom: 16 }} spacing={0}>
        <HStack padding={{ leading: 20, trailing: 20, bottom: 8 }}>
          {/* @ts-ignore */}
          <Text
            foregroundColor={T.text3}
            font="caption"
            bold
          >
            {`找到 ${results.length} 个应用`}
          </Text>
        </HStack>
        {results.map(app => (
          <VStack
            key={app.appId}
            onTapGesture={() => loadDetail(app)}
            padding={{ horizontal: 16, vertical: 12 }}
            margin={{ leading: 16, trailing: 16, bottom: 8 }}
          >
            <HStack alignment="center" spacing={12}>
              {app.appImage ? (
                <Image
                  imageUrl={smallIcon(app.appImage)}
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
              <VStack alignment="leading" spacing={3} frame={{ maxWidth: 220 }}>
                {/* @ts-ignore */}
                <Text
                  foregroundColor={T.text}
                  font="callout"
                  bold
                >
                  {app.appName}
                </Text>
                {/* @ts-ignore */}
                <Text
                  foregroundColor={T.text3}
                  font="caption"
                >
                  {app.appDesc}
                </Text>
              </VStack>
              <Spacer />
              {/* @ts-ignore */}
              <Text
                foregroundColor={T.orange}
                font="footnote"
                bold
              >
                比价 →
              </Text>
            </HStack>
          </VStack>
        ))}
      </VStack>
    )
  }

  // 渲染：价格详情
  function renderDetail() {
    if (!selectedApp || selectedApp.length === 0) return null
    const app = selectedApp[0]
    const iapNames = getIAPNames()

    return (
      <VStack spacing={0}>
        {/* 应用信息头部 */}
        <VStack
          padding={{ horizontal: 16, vertical: 14 }}
          margin={{ leading: 16, trailing: 16, top: 8, bottom: 8 }}
        >
          <HStack alignment="center" spacing={12}>
            {app.inAppPurchaseList?.[0]?.price?.area ? null : null}
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
                foregroundColor={T.text3}
                font="caption"
              >
                {app.subtitle}
              </Text>
              {/* @ts-ignore */}
              <Text
                foregroundColor={T.text4}
                font="caption2"
              >
                {app.developer}
              </Text>
            </VStack>
            <Spacer />
            {/* @ts-ignore */}
            <VStack
              onTapGesture={() => { setSelectedApp(null); setResults([]) }}
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

        {/* 视图切换 */}
        <HStack
          padding={{ leading: 16, trailing: 16, vertical: 6 }}
          spacing={8}
          alignment="center"
        >
          {['全球比价', '分地区详情'].map(mode => {
            const active = mode === viewMode
            return (
              <VStack
                key={mode}
                onTapGesture={() => setViewMode(mode)}
                padding={{ horizontal: 16, vertical: 10 }}
                background={active ? T.glassActive : T.glass}
                cornerRadius={22}
                stroke={active ? T.orange : T.glassBorder}
                strokeWidth={active ? 1.5 : 0.5}
                clipShape="capsule"
              >
                {/* @ts-ignore */}
                <Text
                  foregroundColor={active ? '#fff' : T.text2}
                  font="footnote"
                  bold={active}
                >
                  {mode}
                </Text>
              </VStack>
            )
          })}
        </HStack>

        {/* IAP 选择器 */}
        {iapNames.length > 1 ? (
          <ScrollView axes="horizontal">
            <HStack
              padding={{ leading: 16, trailing: 16, vertical: 6 }}
              spacing={8}
              alignment="center"
            >
              {iapNames.map(name => {
                const active = name === selectedIAP
                return (
                  <VStack
                    key={name}
                    onTapGesture={() => setSelectedIAP(name)}
                    padding={{ horizontal: 16, vertical: 8 }}
                    background={active ? T.glassActive : T.glass}
                    cornerRadius={20}
                    stroke={active ? T.blue : T.glassBorder}
                    strokeWidth={active ? 1.5 : 0.5}
                    clipShape="capsule"
                  >
                    {/* @ts-ignore */}
                    <Text
                      foregroundColor={active ? '#fff' : T.text2}
                      font="caption"
                      bold={active}
                    >
                      {name}
                    </Text>
                  </VStack>
                )
              })}
            </HStack>
          </ScrollView>
        ) : null}

        {/* 全球比价视图 */}
        {viewMode === '全球比价' ? renderGlobalComparison() : renderAreaDetail()}
      </VStack>
    )
  }

  // 渲染：全球比价
  function renderGlobalComparison() {
    if (!selectedApp) return null
    const iapNames = getIAPNames()
    const currentIAP = selectedIAP || (iapNames.length > 0 ? iapNames[0] : '')

    if (!currentIAP) {
      // 没有 IAP，显示本体价格
      const sorted = [...selectedApp].sort((a, b) => a.price.cnyPrice - b.price.cnyPrice)
      return (
        <ScrollView>
          <VStack padding={{ top: 8, bottom: 16 }} spacing={0}>
            <HStack padding={{ leading: 20, trailing: 20, bottom: 8 }}>
              {/* @ts-ignore */}
              <Text
                foregroundColor={T.text3}
                font="caption"
                bold
              >
                软件本体
              </Text>
            </HStack>
            {sorted.map((area, i) => renderPriceRow(area, area.price, i === 0))}
          </VStack>
        </ScrollView>
      )
    }

    const prices = getIAPPrices(currentIAP)
    return (
      <ScrollView>
        <VStack padding={{ top: 8, bottom: 16 }} spacing={0}>
          <HStack padding={{ leading: 20, trailing: 20, bottom: 8 }}>
            {/* @ts-ignore */}
            <Text
              foregroundColor={T.text3}
              font="caption"
              bold
            >
              {currentIAP}
            </Text>
          </HStack>
          {prices.map((item, i) => renderPriceRow(item.area, item.iap.price, i === 0))}
        </VStack>
      </ScrollView>
    )
  }

  // 渲染：分地区详情
  function renderAreaDetail() {
    if (!selectedApp) return null
    return (
      <ScrollView>
        <VStack padding={{ top: 8, bottom: 16 }} spacing={0}>
          {selectedApp.map(area => (
            <VStack
              key={area.area}
              padding={{ horizontal: 16, vertical: 12 }}
              margin={{ leading: 16, trailing: 16, bottom: 8 }}
            >
              <HStack alignment="center" spacing={8}>
                <Text font="callout">{FLAG_MAP[area.area] || '🌍'}</Text>
                {/* @ts-ignore */}
                <Text
                  foregroundColor={T.text}
                  font="callout"
                  bold
                >
                  {area.areaName}
                </Text>
                <Spacer />
                {/* @ts-ignore */}
                <Text
                  foregroundColor={T.orange}
                  font="callout"
                  bold
                >
                  ¥{area.price.cnyPrice.toFixed(2)}
                </Text>
              </HStack>
              {area.inAppPurchaseList && area.inAppPurchaseList.length > 0 ? (
                <VStack padding={{ top: 8 }} spacing={4}>
                  {area.inAppPurchaseList.map((iap, idx) => (
                    <HStack key={idx} alignment="center" spacing={8}>
                      {/* @ts-ignore */}
                      <Text
                        foregroundColor={T.text3}
                        font="caption"
                      >
                        {iap.object}
                      </Text>
                      <Spacer />
                      {/* @ts-ignore */}
                      <Text
                        foregroundColor={T.text2}
                        font="caption"
                      >
                        {fmtPrice(iap.price)} (¥{iap.price.cnyPrice.toFixed(2)})
                      </Text>
                    </HStack>
                  ))}
                </VStack>
              ) : null}
            </VStack>
          ))}
        </VStack>
      </ScrollView>
    )
  }

  // 渲染：价格行（全球比价用）
  function renderPriceRow(area: AreaData, price: PriceInfo, isCheapest: boolean) {
    return (
      <VStack
        key={area.area}
        padding={{ horizontal: 16, vertical: 12 }}
        margin={{ leading: 16, trailing: 16, bottom: 6 }}
        background={isCheapest ? T.greenGlass : undefined}
      >
        <HStack alignment="center" spacing={10}>
          <Text font="callout">{FLAG_MAP[area.area] || '🌍'}</Text>
          {/* @ts-ignore */}
          <Text
            foregroundColor={T.text}
            font="callout"
            bold
          >
            {area.areaName}
          </Text>
          <Spacer />
          <VStack alignment="trailing" spacing={2}>
            {/* @ts-ignore */}
            <Text
              foregroundColor={isCheapest ? T.green : T.text}
              font="callout"
              bold
            >
              ¥{price.cnyPrice.toFixed(2)}
            </Text>
            {/* @ts-ignore */}
            <Text
              foregroundColor={T.text4}
              font="caption2"
            >
              {fmtPrice(price)}
            </Text>
          </VStack>
          {isCheapest ? (
            <VStack
              padding={{ horizontal: 6, vertical: 2 }}
              background={T.green}
              cornerRadius={4}
              clipShape="capsule"
            >
              {/* @ts-ignore */}
              <Text
                foregroundColor="#fff"
                font="caption2"
                bold
              >
                最省
              </Text>
            </VStack>
          ) : null}
        </HStack>
      </VStack>
    )
  }

  return (
    <VStack>
      <PageHeader
        title="应用比价"
        subtitle="全球 App Store 价格对比 · 多地区实时比价"
        desc="输入应用名称即可查询该应用在全球多个 App Store 地区的价格，自动换算为人民币进行比较。"
      />

      {/* 搜索框 */}
      <SearchBar textObs={searchObs} placeholder="搜索应用名称..." />

      {/* 预设应用（仅在未搜索时显示） */}
      {!selectedApp && results.length === 0 && !loading ? (
        <ScrollView axes="horizontal">
          <HStack
            padding={{ leading: 16, trailing: 16, vertical: 6 }}
            spacing={8}
            alignment="center"
          >
            {PRICE_PRESETS.map(p => (
              <VStack
                key={p}
                onTapGesture={() => { searchObs.setValue(p); doSearch(p) }}
                padding={{ horizontal: 14, vertical: 7 }}
                background={T.glass}
                cornerRadius={20}
                stroke={T.glassBorder}
                strokeWidth={0.5}
                clipShape="capsule"
              >
                {/* @ts-ignore */}
                <Text
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
      {!selectedApp ? (
        <VStack
          onTapGesture={() => doSearch()}
          padding={{ top: 10, bottom: 10 }}
          margin={{ leading: 16, trailing: 16, top: 4, bottom: 8 }}
          background={T.orange}
          cornerRadius={22}
          alignment="center"
          clipShape="capsule"
        >
          <HStack alignment="center" spacing={6}>
            <Text font="callout">🔍</Text>
            {/* @ts-ignore */}
            <Text
              foregroundColor="#fff"
              font="callout"
              bold
            >
              搜索比价
            </Text>
          </HStack>
        </VStack>
      ) : null}

      <ScrollView>
        {selectedApp ? renderDetail() : renderResults()}
      </ScrollView>
    </VStack>
  )
}
