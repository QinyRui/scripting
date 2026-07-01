/**
 * 米游社自动助手 - 关于页面
 * 仿照九号 APP AboutView 设计
 */

import {
  HStack, VStack, Text, Image, Button, Spacer,
  ScrollView, ZStack, Circle, Navigation,
} from 'scripting'
import { MIHOYO_ICON_URL } from './components'

declare const Safari: any
declare const Pasteboard: any
declare const Dialog: any

export function AboutView() {
  const dismiss = Navigation.useDismiss()

  const openTelegram = async () => {
    try {
      await Safari.openURL("https://t.me/mihoyosign")
    } catch (error) {
      await Pasteboard.setString("https://t.me/mihoyosign")
      await Dialog.alert({
        title: "已复制链接",
        message: "Telegram 链接已复制到剪贴板",
        buttonLabel: "确定"
      })
    }
  }

  const openGithub = async () => {
    try {
      await Safari.openURL("https://github.com/QinyRui/scripting")
    } catch (error) {
      await Pasteboard.setString("https://github.com/QinyRui/scripting")
      await Dialog.alert({
        title: "已复制链接",
        message: "GitHub 仓库链接已复制到剪贴板",
        buttonLabel: "确定"
      })
    }
  }

  return (
    <ScrollView frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }} background="systemBackground">
      <VStack spacing={0}>
        {/* 顶部导航栏 */}
        <HStack padding={16} alignment="center">
          <Button action={dismiss}>
            <HStack padding={{ horizontal: 16, vertical: 8 }} background={{ style: 'secondarySystemBackground', shape: { type: 'rect', cornerRadius: 20 } }}>
              <Text font="headline">关闭</Text>
            </HStack>
          </Button>
          <Spacer />
          <Text font="headline">详情介绍</Text>
          <Spacer />
          <Spacer frame={{ width: 60 }} />
        </HStack>

        <VStack spacing={40} padding={20}>
          {/* 应用图标 + 名称 */}
          <VStack spacing={16} alignment="center">
            <ZStack frame={{ width: 100, height: 100 }}>
              <Circle
                // @ts-ignore
                fill={{ colors: ['#6C5CE7', '#A29BFE'], startPoint: 'top', endPoint: 'bottom' }}
              />
              <Image imageUrl={MIHOYO_ICON_URL}
                // @ts-ignore
                frame={{ width: 56, height: 56 }}
                // @ts-ignore
                position="absolute"
                // @ts-ignore
                top={22}
                // @ts-ignore
                leading={22}
              />
            </ZStack>
            <VStack spacing={4} alignment="center">
              <Text font="title" fontWeight="bold">米游社自动助手</Text>
              <Text font="subheadline" foregroundStyle="secondaryLabel">MiHoYo Auto Sign</Text>
            </VStack>
            <HStack spacing={12} alignment="center">
              <Text font="caption" fontWeight="bold" foregroundStyle="systemBlue"
                padding={{ horizontal: 12, vertical: 4 }}
                background={{ style: 'secondarySystemBackground', shape: { type: 'rect', cornerRadius: 8 } }}
              >v3.0.0</Text>
              <Text font="caption" foregroundStyle="secondaryLabel"
                padding={{ horizontal: 12, vertical: 4 }}
                background={{ style: 'secondarySystemBackground', shape: { type: 'rect', cornerRadius: 8 } }}
              >By QinyRui</Text>
            </HStack>
          </VStack>

          {/* 功能特性 2x2 网格 */}
          <VStack spacing={24}>
            <HStack spacing={20} alignment="top">
              <HStack spacing={16} frame={{ maxWidth: 'infinity' }} alignment="center">
                <ZStack frame={{ width: 44, height: 44 }}><Circle fill="yellow" opacity={0.2} /><Image systemName="bolt.fill" foregroundStyle="yellow" /></ZStack>
                <VStack alignment="leading" spacing={2}><Text fontWeight="bold">智能签到</Text><Text font="caption" foregroundStyle="secondaryLabel">全自动打卡领积分</Text></VStack>
              </HStack>
              <HStack spacing={16} frame={{ maxWidth: 'infinity' }} alignment="center">
                <ZStack frame={{ width: 44, height: 44 }}><Circle fill="green" opacity={0.2} /><Image systemName="gamecontroller.fill" foregroundStyle="green" /></ZStack>
                <VStack alignment="leading" spacing={2}><Text fontWeight="bold">游戏签到</Text><Text font="caption" foregroundStyle="secondaryLabel">原神/星铁/绝区零</Text></VStack>
              </HStack>
            </HStack>
            <HStack spacing={20} alignment="top">
              <HStack spacing={16} frame={{ maxWidth: 'infinity' }} alignment="center">
                <ZStack frame={{ width: 44, height: 44 }}><Circle fill="blue" opacity={0.2} /><Image systemName="clock.fill" foregroundStyle="blue" /></ZStack>
                <VStack alignment="leading" spacing={2}><Text fontWeight="bold">定时执行</Text><Text font="caption" foregroundStyle="secondaryLabel">小组件自动签到</Text></VStack>
              </HStack>
              <HStack spacing={16} frame={{ maxWidth: 'infinity' }} alignment="center">
                <ZStack frame={{ width: 44, height: 44 }}><Circle fill="purple" opacity={0.2} /><Image systemName="puzzlepiece.extension.fill" foregroundStyle="purple" /></ZStack>
                <VStack alignment="leading" spacing={2}><Text fontWeight="bold">桌面组件</Text><Text font="caption" foregroundStyle="secondaryLabel">小/中/大三种尺寸</Text></VStack>
              </HStack>
            </HStack>
          </VStack>

          {/* 加入社区 */}
          <VStack alignment="leading" spacing={16} padding={20}
            background={{ style: 'secondarySystemBackground', shape: { type: 'rect', cornerRadius: 20 } }}
          >
            <HStack alignment="center">
              <VStack alignment="leading" spacing={4}>
                <Text font="headline">加入社区</Text>
                <Text font="caption" foregroundStyle="secondaryLabel">获取技术支持</Text>
              </VStack>
              <Spacer />
              <Image systemName="bubble.left.and.bubble.right.fill" font={24} foregroundStyle="systemBlue" />
            </HStack>

            <HStack spacing={8} alignment="center" onTapGesture={openTelegram}>
              <Image systemName="paperplane.fill" foregroundStyle="systemBlue" />
              <Text fontWeight="bold" foregroundStyle="systemBlue">Telegram 频道</Text>
            </HStack>

            <HStack spacing={0} padding={{ top: 12 }}>
              <Spacer />
              <VStack frame={{ maxWidth: 'infinity', height: 1 }} background="separator" />
              <Spacer />
            </HStack>

            <HStack spacing={8} alignment="center" onTapGesture={openGithub}>
              <Image systemName="chevron.left.forwardslash.chevron.right" foregroundStyle="label" />
              <Text fontWeight="bold" foregroundStyle="label">GitHub 仓库</Text>
            </HStack>
          </VStack>
        </VStack>

        <Spacer />
        <VStack frame={{ maxWidth: 'infinity' }} alignment="center" padding={20}>
          <Text font="caption2" foregroundStyle="tertiaryLabel">© 2025 QinyRui. All rights reserved.</Text>
          <Text font="caption2" foregroundStyle="tertiaryLabel">Made with ❤️ for MiHoYo Users</Text>
        </VStack>
      </VStack>
    </ScrollView>
  )
}
