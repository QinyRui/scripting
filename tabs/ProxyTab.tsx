// tabs/ProxyTab.tsx - 代理脚本 Tab
// 真实 API：/api/proxy?page=1&pageSize=10
// 数据：2598 个脚本，7 个来源（chxm1023 636, Sliverkiss 115, Jsforbaby 95, fm200 736, yFamily 487, XiaoMao 525, ONZ3V 4）

import {
  VStack,
  HStack,
  Text,
  Image,
  ScrollView,
  Spacer,
  useState,
  useEffect,
  useObservable,
} from 'scripting'
import { fetch } from 'scripting'
import { T } from '../theme'
import { PageHeader, SearchBar, ChipFilter, LoadingView, EmptyView } from '../components'

type ScriptItem = {
  id: number
  name: string
  script_url: string
  icon_url: string
  author: string
  script_type: string
  update_date: string
  app_name: string
  source_name: string
  source_label: string
  bundle_id: string
  app_store_url: string
}

type Source = {
  id: number
  name: string
  label: string
  description: string
  count: number
}

type ProxyApiResp = {
  scripts: ScriptItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  sources: Source[]
}

const API = 'https://sliverkiss-psi.vercel.app/api/proxy'
const CACHE = 'sakura_proxy_cache'

function loadCache(): ProxyApiResp | null {
  try {
    const raw = Storage.get(CACHE) as string | null
    if (!raw) return null
    return JSON.parse(raw) as ProxyApiResp
  } catch { return null }
}

function saveCache(d: ProxyApiResp) {
  try { Storage.set(CACHE, JSON.stringify(d)) } catch {}
}

async function fetchProxy(source: string, search: string, page: number = 1): Promise<ProxyApiResp | null> {
  try {
    const url = `${API}?page=${page}&pageSize=20${source !== '全部' ? `&source=${source}` : ''}${search ? `&keyword=${encodeURIComponent(search)}` : ''}`
    const res = await fetch(url, {
      headers: {
        Origin: 'https://sliverkiss-psi.vercel.app',
        Referer: 'https://sliverkiss-psi.vercel.app/proxy',
      },
      timeout: 15,
    })
    if (!res.ok) return null
    return await res.json() as ProxyApiResp
  } catch (e) {
    console.error('proxy fetch err:', String(e))
    return null
  }
}

export function ProxyTab() {
  const [data, setData] = useState<ProxyApiResp | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [refreshing, setRefreshing] = useState<boolean>(false)
  const [sourceName, setSourceName] = useState<string>('全部')
  const [currentPage, setCurrentPage] = useState<number>(1)
  const searchObs = useObservable<string>('')
  const [toast, setToast] = useState<string>('')

  // label -> name 映射
  const sourceMap = new Map(data?.sources.map(s => [s.label, s.name]) || [])
  const reverseMap = new Map(data?.sources.map(s => [s.name, s.label]) || [])

  async function loadPage(page: number = 1) {
    const d = await fetchProxy(sourceName, searchObs.value, page)
    if (d) {
      setData(d)
      setCurrentPage(d.page)
      if (sourceName === '全部' && !searchObs.value && page === 1) saveCache(d)
    }
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => {
    if (sourceName === '全部' && !searchObs.value) {
      const c = loadCache()
      if (c) {
        setData(c)
        setLoading(false)
      }
    }
    setCurrentPage(1)
    setLoading(true)
    loadPage(1)
  }, [sourceName, searchObs.value])

  function showToast(text: string) {
    setToast(text)
    setTimeout(() => setToast(''), 2000)
  }

  async function copyScript(s: ScriptItem) {
    await Pasteboard.setString(s.script_url)
    showToast(`已复制 ${s.name} 脚本链接 ✓`)
  }

  async function copyApp(s: ScriptItem) {
    await Pasteboard.setString(s.app_store_url)
    showToast(`已复制 App Store 链接 ✓`)
  }

  const sourceLabels = ['全部', ...(data?.sources.map(s => s.label) || [])]
  const scripts = data?.scripts || []

  // 当前选中 source 的 label（用于显示）
  const currentLabel = sourceName === '全部' ? '全部' : (reverseMap.get(sourceName) || sourceName)
  const currentSource = data?.sources.find(s => s.name === sourceName)
  const currentCount = currentSource?.count || (sourceName === '全部' ? data?.total : 0)

  return (
    <VStack
      // @ts-ignore
      background={T.bg}
    >
      <PageHeader
        title="代理脚本"
        subtitle="一键复制脚本链接 · 解锁应用功能"
        desc="收录 QuantumultX、Surge、Loon、Shadowrocket、Stash 五大代理软件的自动化脚本，来自 6 个优质数据源。"
        badgeText="脚本总数"
        statusText={`${data?.total || 0}`}
        statusColor={T.yellow}
      />

      <SearchBar textObs={searchObs} placeholder="搜索脚本..." />

      <ChipFilter
        items={sourceLabels}
        selected={currentLabel}
        onSelect={(label) => {
          // label -> name 转换
          const name = label === '全部' ? '全部' : (sourceMap.get(label) || label)
          setSourceName(name)
        }}
      />

      <HStack
        alignment="center"
        padding={{ leading: 20, trailing: 20, bottom: 4 }}
      >
        <Text
          // @ts-ignore
          foregroundColor={T.text3}
          font="footnote"
        >
          {sourceName === '全部'
            ? `共 ${data?.total || 0} 个脚本`
            : `${currentLabel} · ${currentCount} 个脚本`}
        </Text>
        <Spacer />
        <VStack
          onTapGesture={() => { setRefreshing(true); loadPage(currentPage) }}
          opacity={refreshing ? 0.4 : 1}
        >
          <Text
            // @ts-ignore
            foregroundColor={T.yellow}
            font="footnote"
            bold
          >
            {refreshing ? '⟳ 刷新中' : '↻ 刷新'}
          </Text>
        </VStack>
      </HStack>

      <ScrollView>
        {loading ? (
          <LoadingView text="正在加载代理脚本..." />
        ) : scripts.length === 0 ? (
          <EmptyView message={searchObs.value ? `没有找到 "${searchObs.value}"` : '暂无脚本'} emoji="⚙️" />
        ) : (
          <VStack padding={{ top: 4, bottom: 16 }} spacing={0}>
            {scripts.map(s => (
              <ProxyScriptCard
                key={s.id}
                item={s}
                onCopyScript={() => copyScript(s)}
                onCopyApp={() => copyApp(s)}
              />
            ))}
            {/* 翻页导航 */}
            <VStack alignment="center" padding={{ top: 14, bottom: 20 }} spacing={8}>
              <Text font="title2">⚙️</Text>
              <HStack alignment="center" spacing={8}>
                {/* 上一页 */}
                <VStack
                  onTapGesture={() => { if (currentPage > 1) { setLoading(true); loadPage(currentPage - 1) } }}
                  padding={{ horizontal: 14, vertical: 10 }}
                  // @ts-ignore
                  background={currentPage > 1 ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)'}
                  // @ts-ignore
                  cornerRadius={10}
                >
                  <Text
                    // @ts-ignore
                    foregroundColor={currentPage > 1 ? T.text : T.text4}
                    font="body"
                    bold
                  >
                    {'<'}
                  </Text>
                </VStack>

                {/* 页码按钮 */}
                {Array.from({ length: data?.totalPages || 1 }, (_, i) => i + 1)
                  .filter(p => {
                    const total = data?.totalPages || 1
                    const cur = currentPage
                    if (total <= 5) return true
                    if (p === 1 || p === total) return true
                    if (Math.abs(p - cur) <= 1) return true
                    return false
                  })
                  .map((p, idx, arr) => {
                    // 在不连续的地方加省略号
                    const prev = idx > 0 ? arr[idx - 1] : 0
                    const showEllipsis = prev > 0 && p - prev > 1
                    return (
                      <VStack key={p} alignment="center" spacing={0}>
                        {showEllipsis ? (
                          <Text
                            // @ts-ignore
                            foregroundColor={T.text4}
                            font="footnote"
                            padding={{ horizontal: 2 }}
                          >
                            ...
                          </Text>
                        ) : null}
                        <VStack
                          onTapGesture={() => { if (p !== currentPage) { setLoading(true); loadPage(p) } }}
                          padding={{ horizontal: 14, vertical: 10 }}
                          // @ts-ignore
                          background={p === currentPage ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)'}
                          // @ts-ignore
                          cornerRadius={10}
                        >
                          <Text
                            // @ts-ignore
                            foregroundColor={p === currentPage ? '#fff' : T.text2}
                            font="body"
                            bold={p === currentPage}
                          >
                            {p}
                          </Text>
                        </VStack>
                      </VStack>
                    )
                  })}

                {/* 下一页 */}
                <VStack
                  onTapGesture={() => { if (currentPage < (data?.totalPages || 1)) { setLoading(true); loadPage(currentPage + 1) } }}
                  padding={{ horizontal: 14, vertical: 10 }}
                  // @ts-ignore
                  background={currentPage < (data?.totalPages || 1) ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)'}
                  // @ts-ignore
                  cornerRadius={10}
                >
                  <Text
                    // @ts-ignore
                    foregroundColor={currentPage < (data?.totalPages || 1) ? T.text : T.text4}
                    font="body"
                    bold
                  >
                    {'>'}
                  </Text>
                </VStack>
              </HStack>
              <Text
                // @ts-ignore
                foregroundColor={T.text4}
                font="caption"
              >
                {`第 ${currentPage} / ${data?.totalPages || 1} 页`}
              </Text>
            </VStack>
          </VStack>
        )}
      </ScrollView>

      {toast ? (
        <VStack
          alignment="center"
          padding={{ top: 8, bottom: 8, leading: 18, trailing: 18 }}
          // @ts-ignore
          background={T.green}
          // @ts-ignore
          cornerRadius={20}
        >
          <Text
            // @ts-ignore
            foregroundColor="#fff"
            font="footnote"
            bold
          >
            {toast}
          </Text>
        </VStack>
      ) : null}
    </VStack>
  )
}

function ProxyScriptCard(props: {
  item: ScriptItem
  onCopyScript: () => void
  onCopyApp: () => void
}) {
  const { item: s, onCopyScript, onCopyApp } = props
  return (
    <VStack
      padding={14}
      margin={{ leading: 16, trailing: 16, bottom: 10 }}
      // @ts-ignore
      background={T.surface}
      // @ts-ignore
      cornerRadius={14}
      spacing={10}
    >
      {/* 顶部：图标 + 名称 + 来源标签 */}
      <HStack alignment="center" spacing={12}>
        <VStack
          frame={{ width: 48, height: 48 }}
          alignment="center"
          // @ts-ignore
          background="rgba(255,255,255,0.08)"
          // @ts-ignore
          cornerRadius={10}
          // @ts-ignore
          clipShape={{ type: 'rect', rounded: 10 }}
        >
          {s.icon_url ? (
            <Image
              imageUrl={s.icon_url}
              resizable
              scaleToFit
              frame={{ width: 44, height: 44 }}
              // @ts-ignore
              cornerRadius={8}
            />
          ) : (
            <Text font="title2">📜</Text>
          )}
        </VStack>
        <VStack alignment="leading" spacing={3} frame={{ minWidth: 200 }}>
          <Text
            // @ts-ignore
            foregroundColor={T.text}
            font="callout"
            bold
          >
            {s.name}
          </Text>
          <HStack alignment="center" spacing={4}>
            <VStack
              padding={{ horizontal: 6, vertical: 2 }}
              // @ts-ignore
              background="rgba(234,179,8,0.2)"
              // @ts-ignore
              cornerRadius={4}
            >
              <Text
                // @ts-ignore
                foregroundColor={T.yellow}
                font="caption"
                bold
              >
                {s.source_label}
              </Text>
            </VStack>
            <Text
              // @ts-ignore
              foregroundColor={T.text4}
              font="caption"
              padding={{ leading: 4 }}
            >
              {s.author}
            </Text>
          </HStack>
        </VStack>
        <Spacer />
        <HStack alignment="center" spacing={4}>
          <Text
            // @ts-ignore
            foregroundColor={T.green}
            font="caption"
          >●</Text>
          <Text
            // @ts-ignore
            foregroundColor={T.green2}
            font="caption"
            bold
          >{s.script_type}</Text>
        </HStack>
      </HStack>

      {/* 中间：Bundle ID + App 名 */}
      <VStack alignment="leading" spacing={3}>
        {s.bundle_id ? (
          <Text
            // @ts-ignore
            foregroundColor={T.text3}
            font="caption"
          >
            {`📦 ${s.bundle_id}`}
          </Text>
        ) : null}
        <Text
          // @ts-ignore
          foregroundColor={T.text4}
          font="caption"
        >
          {`📅 更新于 ${s.update_date}`}
        </Text>
      </VStack>

      {/* 底部：复制按钮组 */}
      <HStack alignment="center" spacing={8}>
        <VStack
          onTapGesture={onCopyScript}
          padding={{ horizontal: 12, vertical: 7 }}
          // @ts-ignore
          background="rgba(234,179,8,0.2)"
          // @ts-ignore
          cornerRadius={8}
        >
          <HStack alignment="center" spacing={4}>
            <Text
              // @ts-ignore
              foregroundColor={T.yellow}
              font="caption"
            >📋</Text>
            <Text
              // @ts-ignore
              foregroundColor={T.yellow}
              font="caption"
              bold
            >脚本链接</Text>
          </HStack>
        </VStack>
        <VStack
          onTapGesture={onCopyApp}
          padding={{ horizontal: 12, vertical: 7 }}
          // @ts-ignore
          background="rgba(59,130,246,0.2)"
          // @ts-ignore
          cornerRadius={8}
        >
          <HStack alignment="center" spacing={4}>
            <Text
              // @ts-ignore
              foregroundColor={T.blue2}
              font="caption"
            >🍎</Text>
            <Text
              // @ts-ignore
              foregroundColor={T.blue2}
              font="caption"
              bold
            >App Store</Text>
          </HStack>
        </VStack>
      </HStack>
    </VStack>
  )
}
