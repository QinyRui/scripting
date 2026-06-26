// tabs/IconTab.tsx - 图标查询 Tab
// 从 App Store 搜索图标，显示结果，支持复制图标链接

import {
  VStack,
  HStack,
  Text,
  Image,
  ScrollView,
  Spacer,
  useState,
  useObservable,
  fetch,
} from 'scripting'
import { T } from '../theme'
import { PageHeader, SearchBar, LoadingView, EmptyView } from '../components'
import { ICON_REGIONS } from '../data'

// 地区名到国家代码映射
const REGION_CODE: Record<string, string> = {
  '中国': 'cn', '美国': 'us', '日本': 'jp', '韩国': 'kr',
  '台湾': 'tw', '香港': 'hk', '新加坡': 'sg', '英国': 'gb',
  '法国': 'fr', '德国': 'de',
}

// 缩小图标 URL
function smallIcon(url: string, size: number = 200): string {
  return url.replace(/\d+x\d+bb/, `${size}x${size}bb`)
}

interface IconResult {
  trackId: number
  trackName: string
  bundleId: string
  artistName: string
  artworkUrl512: string
  trackViewUrl: string
}

export function IconTab() {
  const [region, setRegion] = useState<string>('中国')
  const searchObs = useObservable<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [results, setResults] = useState<IconResult[]>([])
  const [error, setError] = useState<string>('')
  const [toast, setToast] = useState<string>('')

  function showToast(text: string) {
    setToast(text)
    setTimeout(() => setToast(''), 2000)
  }

  async function doSearch() {
    const q = searchObs.value.trim()
    if (!q) {
      showToast('请输入应用名称')
      return
    }
    setLoading(true)
    setError('')
    setResults([])

    const code = REGION_CODE[region] || 'cn'
    try {
      const res = await fetch(
        `https://sliverkiss-psi.vercel.app/api/icon?term=${encodeURIComponent(q)}&country=${code}&entity=software&limit=18`,
        {
          headers: {
            'Origin': 'https://sliverkiss-psi.vercel.app',
            'Referer': 'https://sliverkiss-psi.vercel.app/icon',
          },
        }
      )
      const data = await res.json()
      if (data.results && data.results.length > 0) {
        setResults(data.results)
      } else {
        setError('没有找到相关应用')
      }
    } catch (e) {
      setError('网络错误，请检查连接')
    }
    setLoading(false)
  }

  async function copyUrl(url: string) {
    await Pasteboard.setString(url)
    showToast('图标链接已复制 ✓')
  }

  return (
    <VStack
      // @ts-ignore
      background={T.bg}
    >
      <PageHeader
        title="图标查询"
        subtitle="App Store 高清图标 · 一键获取"
        desc="从 App Store 搜索并获取应用的高清图标，支持获取 Apple 官方圆角图标。一键复制 CDN 直链。"
        badgeText="支持"
        statusText={`${ICON_REGIONS.length}国`}
        statusColor={T.green2}
      />

      {/* 地区选择 */}
      <ScrollView axes="horizontal">
        <HStack
          padding={{ leading: 16, trailing: 16, vertical: 6 }}
          spacing={8}
          alignment="center"
        >
          {ICON_REGIONS.map(r => {
            const active = r === region
            return (
              <VStack
                key={r}
                onTapGesture={() => setRegion(r)}
                padding={{ horizontal: 12, vertical: 6 }}
                // @ts-ignore
                background={active ? T.green : T.surface}
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

      {/* 搜索框 */}
      <SearchBar textObs={searchObs} placeholder="输入应用名称搜索图标..." />

      {/* 搜索按钮 */}
      <VStack
        onTapGesture={doSearch}
        padding={{ top: 10, bottom: 10 }}
        margin={{ leading: 16, trailing: 16, top: 4, bottom: 8 }}
        // @ts-ignore
        background={T.green}
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
            搜索图标
          </Text>
        </HStack>
      </VStack>

      {/* 当前选择 */}
      <VStack
        padding={8}
        // @ts-ignore
        margin={{ leading: 16, trailing: 16, bottom: 6 }}
        // @ts-ignore
        background="rgba(34,197,94,0.1)"
        // @ts-ignore
        cornerRadius={8}
      >
        <Text
          // @ts-ignore
          foregroundColor={T.text3}
          font="caption"
        >
          {`📍 ${region} · iOS · ${results.length > 0 ? `${results.length} 条结果` : '等待搜索'}`}
        </Text>
      </VStack>

      {/* 搜索结果 */}
      <ScrollView>
        {loading ? (
          <LoadingView text="搜索图标中..." />
        ) : error ? (
          <EmptyView message={error} emoji="🔍" />
        ) : results.length > 0 ? (
          <VStack padding={{ top: 4, bottom: 16 }} spacing={0}>
            {results.map(app => (
              <VStack
                key={app.trackId}
                padding={{ horizontal: 16, vertical: 12 }}
                margin={{ leading: 16, trailing: 16, bottom: 8 }}
                // @ts-ignore
                background={T.surface}
                // @ts-ignore
                cornerRadius={12}
              >
                <HStack alignment="center" spacing={12}>
                  {/* 图标 - 点击复制 */}
                  <VStack
                    onTapGesture={() => copyUrl(app.artworkUrl512)}
                  >
                    <Image
                      imageUrl={smallIcon(app.artworkUrl512, 200)}
                      resizable
                      scaleToFit
                      frame={{ width: 56, height: 56 }}
                      // @ts-ignore
                      cornerRadius={12}
                    />
                  </VStack>

                  {/* 应用信息 */}
                  <VStack alignment="leading" spacing={3} frame={{ maxWidth: 180 }}>
                    <Text
                      // @ts-ignore
                      foregroundColor={T.text}
                      font="callout"
                      bold
                      numberOfLines={1}
                    >
                      {app.trackName}
                    </Text>
                    <Text
                      // @ts-ignore
                      foregroundColor={T.text3}
                      font="caption2"
                      numberOfLines={1}
                    >
                      {app.bundleId}
                    </Text>
                    <Text
                      // @ts-ignore
                      foregroundColor={T.text4}
                      font="caption2"
                    >
                      {app.artistName}
                    </Text>
                  </VStack>

                  <Spacer />

                  {/* 复制按钮 */}
                  <VStack
                    onTapGesture={() => copyUrl(app.artworkUrl512)}
                    padding={{ horizontal: 10, vertical: 6 }}
                    // @ts-ignore
                    background="rgba(34,197,94,0.15)"
                    // @ts-ignore
                    cornerRadius={8}
                  >
                    <HStack alignment="center" spacing={4}>
                      <Text
                        // @ts-ignore
                        foregroundColor={T.green2}
                        font="caption"
                      >
                        📋 复制
                      </Text>
                    </HStack>
                  </VStack>
                </HStack>

                {/* 尺寸选项 */}
                <HStack
                  spacing={6}
                  padding={{ top: 8 }}
                  alignment="center"
                >
                  {['60x60', '120x120', '200x200', '512x512'].map(size => (
                    <VStack
                      key={size}
                      onTapGesture={() => {
                        const [w] = size.split('x')
                        const url = app.artworkUrl512.replace(/\d+x\d+bb/, `${w}x${w}bb`)
                        copyUrl(url)
                      }}
                      padding={{ horizontal: 8, vertical: 4 }}
                      // @ts-ignore
                      background="rgba(255,255,255,0.08)"
                      // @ts-ignore
                      cornerRadius={6}
                    >
                      <Text
                        // @ts-ignore
                        foregroundColor={T.text3}
                        font="caption2"
                      >
                        {size}
                      </Text>
                    </VStack>
                  ))}
                </HStack>
              </VStack>
            ))}
          </VStack>
        ) : (
          <VStack
            alignment="center"
            padding={{ top: 30, bottom: 30 }}
            spacing={12}
          >
            <Text font="largeTitle">🖼️</Text>
            <Text
              // @ts-ignore
              foregroundColor={T.text}
              font="headline"
            >
              输入应用名称搜索图标
            </Text>
            <Text
              // @ts-ignore
              foregroundColor={T.text3}
              font="caption"
              padding={{ leading: 40, trailing: 40 }}
              multilineTextAlignment="center"
            >
              {`支持 ${ICON_REGIONS.length} 个国家/地区\n一键复制苹果 CDN 直链`}
            </Text>
          </VStack>
        )}
      </ScrollView>

      {/* Toast */}
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
