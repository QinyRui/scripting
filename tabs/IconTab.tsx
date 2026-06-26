// tabs/IconTab.tsx - 图标查询 Tab
// 还原网站：地区下拉 + 搜索框 + 平台选择 + 数量选择

import {
  VStack,
  HStack,
  Text,
  ScrollView,
  Spacer,
  useState,
  useObservable,
} from 'scripting'
import { T } from '../theme'
import { PageHeader, SearchBar } from '../components'
import { ICON_REGIONS, ICON_PLATFORMS, ICON_COUNTS } from '../data'

export function IconTab() {
  const [region, setRegion] = useState<string>('中国')
  const [platform, setPlatform] = useState<string>('iOS')
  const [count, setCount] = useState<string>('18 条')
  const searchObs = useObservable<string>('')
  const [toast, setToast] = useState<string>('')

  function showToast(text: string) {
    setToast(text)
    setTimeout(() => setToast(''), 2000)
  }

  function doSearch() {
    if (!searchObs.value.trim()) {
      showToast('请输入应用名称')
      return
    }
    showToast(`正在搜索 ${searchObs.value} (${region} / ${platform} / ${count}) ...`)
  }

  return (
    <VStack
      // @ts-ignore
      background={T.bg}
    >
      <PageHeader
        title="图标查询"
        subtitle="App Store 高清图标 · 一键获取"
        desc="从 App Store 搜索并获取应用的高清图标，支持获取 Apple 官方圆角图标和原始直角图标。一键复制苹果 CDN 直链。"
        badgeText="支持"
        statusText="24国/3平台"
        statusColor={T.green2}
      />

      {/* 地区 */}
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

      <SearchBar textObs={searchObs} placeholder="输入应用名称搜索 App Store 图标..." />

      {/* 平台选择 */}
      <VStack
        padding={{ top: 4, bottom: 4, leading: 20, trailing: 20 }}
        spacing={6}
      >
        <Text
          // @ts-ignore
          foregroundColor={T.text3}
          font="caption"
        >
          平台
        </Text>
        <HStack spacing={8}>
          {ICON_PLATFORMS.map(p => {
            const active = p === platform
            return (
              <VStack
                key={p}
                onTapGesture={() => setPlatform(p)}
                padding={{ horizontal: 14, vertical: 8 }}
                // @ts-ignore
                background={active ? T.blue : T.surface}
                // @ts-ignore
                cornerRadius={10}
              >
                <HStack alignment="center" spacing={4}>
                  <Text
                    font="caption"
                  >
                    {p === 'iOS' ? '📱' : p === 'iPadOS' ? '🖥️' : '💻'}
                  </Text>
                  <Text
                    // @ts-ignore
                    foregroundColor={active ? '#fff' : T.text2}
                    font="footnote"
                    bold={active}
                  >
                    {p}
                  </Text>
                </HStack>
              </VStack>
            )
          })}
        </HStack>
      </VStack>

      {/* 数量选择 */}
      <VStack
        padding={{ top: 4, bottom: 4, leading: 20, trailing: 20 }}
        spacing={6}
      >
        <Text
          // @ts-ignore
          foregroundColor={T.text3}
          font="caption"
        >
          数量
        </Text>
        <HStack spacing={8}>
          {ICON_COUNTS.map(c => {
            const active = c === count
            return (
              <VStack
                key={c}
                onTapGesture={() => setCount(c)}
                padding={{ horizontal: 12, vertical: 6 }}
                // @ts-ignore
                background={active ? T.purple : T.surface}
                // @ts-ignore
                cornerRadius={10}
              >
                <Text
                  // @ts-ignore
                  foregroundColor={active ? '#fff' : T.text2}
                  font="footnote"
                  bold={active}
                >
                  {c}
                </Text>
              </VStack>
            )
          })}
        </HStack>
      </VStack>

      {/* 当前选择摘要 */}
      <VStack
        padding={10}
        // @ts-ignore
        margin={{ leading: 16, trailing: 16, top: 6, bottom: 6 }}
        // @ts-ignore
        background="rgba(34,197,94,0.1)"
        // @ts-ignore
        cornerRadius={10}
      >
        <Text
          // @ts-ignore
          foregroundColor={T.text2}
          font="caption"
        >
          {`📍 ${region} · ${platform} · ${count}`}
        </Text>
      </VStack>

      {/* 搜索按钮 */}
      <VStack
        onTapGesture={doSearch}
        padding={{ top: 14, bottom: 14 }}
        margin={{ leading: 16, trailing: 16, top: 6, bottom: 12 }}
        // @ts-ignore
        background={T.green}
        // @ts-ignore
        cornerRadius={12}
        alignment="center"
      >
        <HStack alignment="center" spacing={6}>
          <Text font="callout">🖼️</Text>
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

      <ScrollView>
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
            输入应用名称搜索 App Store 图标
          </Text>
          <Text
            // @ts-ignore
            foregroundColor={T.text3}
            font="caption"
            padding={{ leading: 40, trailing: 40 }}
            multilineTextAlignment="center"
          >
            {`支持 24 个国家/地区和 3 种平台\n一键复制苹果 CDN 直链`}
          </Text>
        </VStack>
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
