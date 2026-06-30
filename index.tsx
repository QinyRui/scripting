// index.tsx - 多功能宝箱主入口
// TabView selection + Observable

import {
  VStack,
  HStack,
  Text,
  Image,
  TabView,
  Label,
  Spacer,
  ScrollView,
  useObservable,
  Navigation,
  NavigationStack,
  Script,
} from 'scripting'

declare namespace Safari {
  function present(url: string, fullscreen?: boolean): Promise<void>
}

import { T } from './theme'
import { AccountsTab } from './tabs/AccountsTab'
import { SwitchTab } from './tabs/SwitchTab'
import { PriceTab } from './tabs/PriceTab'
import { FreeTab } from './tabs/FreeTab'
import { IapTab } from './tabs/IapTab'
import { IconTab } from './tabs/IconTab'
import { ProxyTab } from './tabs/ProxyTab'
import { ImageToolsTab } from './tabs/ImageToolsTab'

// ============================================
// 关于页面 Tab
// ============================================
function AboutTab() {
  return (
    <VStack
      // @ts-ignore
      background={T.bg}
    >
      <ScrollView>
        <VStack padding={{ top: 16, bottom: 30, leading: 20, trailing: 20 }} spacing={20}>

          {/* 头部 */}
          <VStack alignment="center" spacing={6} padding={{ top: 10 }}>
            <Text
              // @ts-ignore
              foregroundColor={T.text}
              font="title2"
              bold
            >
              Sakura 樱花交流会
            </Text>
            <Text
              // @ts-ignore
              foregroundColor={T.text2}
              font="footnote"
            >
              面向 Apple 用户的中文服务平台
            </Text>
          </VStack>

          {/* 关于作者 */}
          <VStack spacing={8}>
            <Text
              // @ts-ignore
              foregroundColor={T.text}
              font="headline"
              bold
            >
              关于作者
            </Text>
            <Text
              // @ts-ignore
              foregroundColor={T.text2}
              font="subheadline"
            >
              Sliverkiss，一个乐观的虚无主义者。
            </Text>
            <Text
              // @ts-ignore
              foregroundColor={T.text3}
              font="footnote"
            >
              全栈开发者，专注于 JS 逆向工程、iOS 自动化脚本和 MCP 协议集成。
            </Text>
          </VStack>

          {/* 技术栈 */}
          <VStack spacing={8}>
            <Text
              // @ts-ignore
              foregroundColor={T.text}
              font="headline"
              bold
            >
              技术栈
            </Text>
            {[
              { label: '框架', value: 'Next.js + React + TypeScript' },
              { label: '样式', value: 'Tailwind CSS + Apple 设计系统' },
              { label: '部署', value: 'Vercel（SSR + API Routes）' },
              { label: '自动化', value: 'GitHub Actions' },
              { label: 'AI', value: 'SSE 流式聊天 + 多模型' },
            ].map((item, i) => (
              <HStack key={i} alignment="center" spacing={8}>
                <Text
                  // @ts-ignore
                  foregroundColor={T.text4}
                  font="caption"
                  frame={{ width: 60 }}
                >
                  {item.label}
                </Text>
                <Text
                  // @ts-ignore
                  foregroundColor={T.text2}
                  font="footnote"
                >
                  {item.value}
                </Text>
              </HStack>
            ))}
          </VStack>

          {/* 联系我们 */}
          <VStack spacing={8}>
            <Text
              // @ts-ignore
              foregroundColor={T.text}
              font="headline"
              bold
            >
              联系我们
            </Text>
            {[
              { icon: '🐙', label: 'GitHub', value: 'github.com/Sliverkiss', url: 'https://github.com/Sliverkiss' },
              { icon: '✈️', label: 'Telegram', value: '@Sliverkiss777', url: 'https://t.me/Sliverkiss777' },
              { icon: '📝', label: '博客', value: 'blog.xn--ug8h.eu.org', url: 'http://blog.xn--ug8h.eu.org/' },
            ].map((item, i) => (
              <VStack
                key={i}
                onTapGesture={() => Safari.present(item.url)}
                padding={{ horizontal: 14, vertical: 12 }}
                // @ts-ignore
                background={T.surface}
                // @ts-ignore
                cornerRadius={12}
              >
                <HStack alignment="center" spacing={10}>
                  <Text font="title3">{item.icon}</Text>
                  <VStack spacing={2}>
                    <Text
                      // @ts-ignore
                      foregroundColor={T.text}
                      font="footnote"
                      bold
                    >
                      {item.label}
                    </Text>
                    <Text
                      // @ts-ignore
                      foregroundColor={T.text3}
                      font="caption"
                    >
                      {item.value}
                    </Text>
                  </VStack>
                  <Spacer />
                  <Text
                    // @ts-ignore
                    foregroundColor={T.text4}
                    font="caption"
                  >
                    →
                  </Text>
                </HStack>
              </VStack>
            ))}
          </VStack>

          <Text
            // @ts-ignore
            foregroundColor={T.text4}
            font="caption2"
            multilineTextAlignment="center"
            padding={{ top: 10 }}
          >
            数据来自外部 API，仅供学习交流使用
          </Text>
        </VStack>
      </ScrollView>
    </VStack>
  )
}

// ============================================
// 根组件 — 参考哔咔漫画 V4 的 TabView 模式
// ============================================
function App() {
  const mainTabIndex = useObservable<number>(0)

  return (
    <NavigationStack>
      <TabView selection={mainTabIndex}>
        <VStack
          tag={0}
          tabItem={
            <Label title="图片" systemImage="wand.and.stars" />
          }
        >
          <ImageToolsTab />
        </VStack>

        <VStack
          tag={1}
          tabItem={
            <Label title="账号" systemImage="person.2" />
          }
        >
          <AccountsTab />
        </VStack>

        <VStack
          tag={2}
          tabItem={
            <Label title="比价" systemImage="scalemass" />
          }
        >
          <PriceTab />
        </VStack>

        <VStack
          tag={3}
          tabItem={
            <Label title="内购" systemImage="hammer" />
          }
        >
          <IapTab />
        </VStack>

        <VStack
          tag={4}
          tabItem={
            <Label title="切换" systemImage="globe.americas" />
          }
        >
          <SwitchTab />
        </VStack>

        <VStack
          tag={5}
          tabItem={
            <Label title="限免" systemImage="gift" />
          }
        >
          <FreeTab />
        </VStack>

        <VStack
          tag={6}
          tabItem={
            <Label title="图标" systemImage="photo" />
          }
        >
          <IconTab />
        </VStack>

        <VStack
          tag={7}
          tabItem={
            <Label title="代理" systemImage="gearshape" />
          }
        >
          <ProxyTab />
        </VStack>

        <VStack
          tag={8}
          tabItem={
            <Label title="关于" systemImage="info.circle" />
          }
        >
          <AboutTab />
        </VStack>
      </TabView>
    </NavigationStack>
  )
}

// ============================================
// 启动入口
// ============================================
async function run() {
  try {
    await Navigation.present(<App />)
  } finally {
    Script.exit()
  }
}
run()
