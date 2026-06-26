// index.tsx - 多功能宝箱主入口
// 参考哔咔漫画 V4：NavigationStack + TabView selection + Observable

import {
  VStack,
  HStack,
  Text,
  Image,
  TabView,
  Label,
  Spacer,
  useObservable,
  Navigation,
  NavigationStack,
  Script,
} from 'scripting'

import { T } from './theme'
import { AccountsTab } from './tabs/AccountsTab'
import { SwitchTab } from './tabs/SwitchTab'
import { PriceTab } from './tabs/PriceTab'
import { FreeTab } from './tabs/FreeTab'
import { IapTab } from './tabs/IapTab'
import { IconTab } from './tabs/IconTab'
import { ProxyTab } from './tabs/ProxyTab'

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
            <Label title="账号" systemImage="person.2" />
          }
        >
          <AccountsTab />
        </VStack>

        <VStack
          tag={1}
          tabItem={
            <Label title="比价" systemImage="scalemass" />
          }
        >
          <PriceTab />
        </VStack>

        <VStack
          tag={2}
          tabItem={
            <Label title="内购" systemImage="hammer" />
          }
        >
          <IapTab />
        </VStack>

        <VStack
          tag={3}
          tabItem={
            <Label title="切换" systemImage="globe.americas" />
          }
        >
          <SwitchTab />
        </VStack>

        <VStack
          tag={4}
          tabItem={
            <Label title="限免" systemImage="gift" />
          }
        >
          <FreeTab />
        </VStack>

        <VStack
          tag={5}
          tabItem={
            <Label title="图标" systemImage="photo" />
          }
        >
          <IconTab />
        </VStack>

        <VStack
          tag={6}
          tabItem={
            <Label title="代理" systemImage="gearshape" />
          }
        >
          <ProxyTab />
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
