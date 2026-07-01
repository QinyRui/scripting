/**
 * 米游社自动助手 - 执行结果弹窗（图二风格）
 */

import {
  VStack, Text, Image, Button, Spacer, Divider,
  Navigation, ZStack, Circle, RoundedRectangle,
} from 'scripting'

export function ResultPopup({ result }: { result: string }) {
  const dismiss = Navigation.useDismiss()
  const isSuccess = !result.includes('失败')

  return (
    <VStack
      // @ts-ignore
      background="clear"
      // @ts-ignore
      padding={32}
      alignment="center"
      spacing={0}
    >
      <VStack frame={{ height: 80 }} />
      <VStack
        // @ts-ignore
        background="rgba(40,40,40,0.96)"
        // @ts-ignore
        mask={<RoundedRectangle cornerRadius={24} fill="black" />}
        // @ts-ignore
        padding={{ top: 28, bottom: 20, horizontal: 24 }}
        spacing={16}
      >
        {/* 图标 + 标题 */}
        <VStack alignment="center" spacing={8}>
          <ZStack frame={{ width: 52, height: 52 }}>
            <Circle
              // @ts-ignore
              fill={isSuccess ? 'systemGreen' : 'systemOrange'}
              // @ts-ignore
              opacity={0.15}
            />
            <Image systemName={isSuccess ? 'checkmark.seal.fill' : 'exclamationmark.triangle.fill'}
              // @ts-ignore
              foregroundStyle={isSuccess ? 'systemGreen' : 'systemOrange'}
              font={26}
            />
          </ZStack>
          <Text font="title3" fontWeight="bold">执行结果</Text>
        </VStack>

        <Divider />

        {/* 结果内容 */}
        <Text font="subheadline"
          // @ts-ignore
          foregroundStyle="secondaryLabel"
          multilineTextAlignment="leading"
        >{result}</Text>

        <Divider />

        {/* 确定按钮 */}
        <VStack
          // @ts-ignore
          background={isSuccess ? 'systemBlue' : 'systemGray'}
          // @ts-ignore
          cornerRadius={12}
          // @ts-ignore
          padding={{ vertical: 10 }}
          alignment="center"
          onTapGesture={dismiss}
        >
          <Text fontWeight="bold"
            // @ts-ignore
            foregroundStyle="white"
          >确定</Text>
        </VStack>
      </VStack>
    </VStack>
  )
}
