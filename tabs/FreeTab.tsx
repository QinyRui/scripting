// tabs/FreeTab.tsx - 应用限免 Tab
// 和网站一模一样：60x60 图标 + 名称 + 标签，点击跳转 App Store

import {
  VStack,
  HStack,
  Text,
  Image,
  ScrollView,
  Spacer,
  useState,
  useObservable,
  useEffect,
  fetch,
} from 'scripting'
import { T } from '../theme'
import { PageHeader, SearchBar, ChipFilter, LoadingView, EmptyView } from '../components'
import { FREE_FILTERS } from '../data'

declare namespace Safari {
  function openURL(url: string): Promise<boolean>
}

// API 基础配置
const BASE = 'https://sliverkiss-psi.vercel.app'
const HEADERS = {
  'Origin': BASE,
  'Referer': `${BASE}/appfree`,
}

// 类型定义
interface FreeApp {
  id: string
  name: string
  nameZh: string
  url: string
  icon: string
  description: string
  seller: string
}

interface FreeData {
  '内购限免': FreeApp[]
  '本体限免': FreeApp[]
}

export function FreeTab() {
  const [filter, setFilter] = useState<string>('全部')
  const searchObs = useObservable<string>('')
  const [apps, setApps] = useState<FreeData>({ '内购限免': [], '本体限免': [] })
  const [loading, setLoading] = useState<boolean>(true)
  const [lastUpdate, setLastUpdate] = useState<string>('')

  // 从 API 获取限免数据
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${BASE}/api/appfree`, { headers: HEADERS })
        const data = await res.json()
        if (data.apps) {
          setApps(data.apps)
          const now = new Date()
          setLastUpdate(`${now.getMonth()+1}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`)
        }
      } catch (e) {
        console.log('加载限免数据失败:', e)
      }
      setLoading(false)
    }
    load()
  }, [])

  // 合并所有应用
  const allItems: { app: FreeApp; type: string }[] = [
    ...apps['内购限免'].map(a => ({ app: a, type: '内购限免' })),
    ...apps['本体限免'].map(a => ({ app: a, type: '本体限免' })),
  ]

  // 过滤
  const filtered = allItems.filter(item => {
    if (filter !== '全部' && item.type !== filter) return false
    if (searchObs.value) {
      const q = searchObs.value.toLowerCase()
      const name = (item.app.nameZh || item.app.name).toLowerCase()
      if (!name.includes(q) && !item.app.name.toLowerCase().includes(q)) return false
    }
    return true
  })

  // 双列网格 - 和网站完全一致
  const COLS = 2
  const GAP = 12

  return (
    <VStack>
      {/* 顶部标题 */}
      <HStack
        alignment="center"
        padding={{ top: 14, bottom: 4, leading: 20, trailing: 20 }}
      >
        <VStack spacing={2}>
          <Text foregroundColor={T.text} font="title2" bold>
            应用限免
          </Text>
          <Text foregroundColor={T.text2} font="footnote">
            实时追踪 App Store 限时免费应用和内购限免
          </Text>
        </VStack>
      </HStack>

      {/* 同步状态 */}
      {lastUpdate ? (
        <HStack
          alignment="center"
          spacing={4}
          padding={{ leading: 20, bottom: 6 }}
        >
          <Text font="caption" foregroundColor={T.green}>
            ●
          </Text>
          <Text foregroundColor={T.text3} font="caption">
            {`已同步 · ${lastUpdate}`}
          </Text>
        </HStack>
      ) : null}

      {/* 搜索框 */}
      <SearchBar textObs={searchObs} placeholder="搜索应用..." />

      {/* 筛选标签 */}
      <ChipFilter
        items={FREE_FILTERS}
        selected={filter}
        onSelect={setFilter}
      />

      {/* 应用手动双列网格 */}
      <ScrollView>
        {loading ? (
          <LoadingView text="加载限免数据..." />
        ) : filtered.length === 0 ? (
          <EmptyView
            message={searchObs.value ? `没有找到 "${searchObs.value}"` : '暂无限免应用'}
            emoji="🎁"
          />
        ) : (
          <VStack
            padding={{ leading: 14, trailing: 14, top: 8, bottom: 20 }}
            spacing={GAP}
          >
            {(() => {
              // 手动分组为双列行
              const rows: { app: FreeApp; type: string }[][] = []
              for (let i = 0; i < filtered.length; i += COLS) {
                rows.push(filtered.slice(i, i + COLS))
              }
              return rows.map((row, rowIdx) => (
                <HStack key={rowIdx} spacing={GAP}>
                  {row.map(item => (
                    <VStack
                      key={item.app.id}
                      onTapGesture={() => { Safari.openURL(item.app.url) }}
                      frame={{ maxWidth: 'infinity' }}
                      alignment="center"
                      padding={{ horizontal: 12, vertical: 16 }}
                      spacing={8}
                    >
                      {/* 应用图标 - 网站同款 60x60 */}
                      <Image
                        imageUrl={item.app.icon}
                        resizable
                        scaleToFit
                        frame={{ width: 60, height: 60 }}
                        cornerRadius={14}
                      />

                      {/* 应用名称 - 单行省略 */}
                      <Text foregroundColor={T.text} font="footnote" bold numberOfLines={1} frame={{ maxWidth: 'infinity' }}>
                        {item.app.name}
                      </Text>

                      {/* 限免标签 */}
                      <HStack
                        alignment="center"
                        spacing={2}
                        background={item.type === '内购限免' ? 'rgba(59,130,246,0.15)' : 'rgba(34,197,94,0.15)'}
                        cornerRadius={20}
                        padding={{ horizontal: 8, vertical: 2 }}
                        clipShape="capsule"
                      >
                        <Text foregroundColor={item.type === '内购限免' ? T.blue2 : T.green2} font="caption2" bold>
                          {item.type}
                        </Text>
                      </HStack>
                    </VStack>
                  ))}
                  {/* 补齐空位 */}
                  {row.length < COLS ? (
                    <VStack frame={{ maxWidth: 'infinity' }} />
                  ) : null}
                </HStack>
              ))
            })()}
          </VStack>
        )}
      </ScrollView>
    </VStack>
  )
}
