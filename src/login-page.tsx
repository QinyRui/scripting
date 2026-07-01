/**
 * 米游社自动助手 - 登录页面（仅 WebView 登录）
 * Cookie 认证已移至设置页
 */

import {
  HStack, VStack, Text, Button, Spacer,
  ScrollView, Navigation, Image,
  ZStack, Circle,
  useState,
} from 'scripting'
import {
  getCookieViaWebView, saveLoginData, checkLoginStatus, clearLoginData,
} from './webview-login'
import { addLog } from './utils'
import { QRLoginPage } from '../ui/qr-login-page'

export function LoginPage({ onDismiss }: { onDismiss?: () => void } = {}) {
  const dismiss = Navigation.useDismiss()
  const [isProcessing, setIsProcessing] = useState(false)

  const existing = checkLoginStatus()
  const isLoggedIn = existing.isLoggedIn
  const uid = existing.uid || ''

  const handleLogin = async () => {
    if (isProcessing) return
    setIsProcessing(true)
    try {
      const cookieResult = await getCookieViaWebView()
      if (!cookieResult.success || !cookieResult.cookieStr) {
        addLog('error', cookieResult.message)
        setIsProcessing(false)
        return
      }
      const saveResult = await saveLoginData(cookieResult.cookieStr)
      if (saveResult.success) {
        addLog('success', saveResult.message)
        onDismiss?.()
        setTimeout(() => dismiss(), 100)
      } else {
        addLog('error', saveResult.message)
      }
    } catch (e: any) {
      addLog('error', '登录失败: ' + e.message)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleClear = () => {
    clearLoginData()
    addLog('info', '已清除登录数据')
    onDismiss?.()
    setTimeout(() => dismiss(), 100)
  }

  return (
    <ScrollView frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }}>
      <VStack spacing={0}>
        {/* 标题栏 */}
        <HStack padding={16} alignment="center">
          <Button action={dismiss}>
            <HStack padding={{ horizontal: 16, vertical: 8 }}
              background={{ style: 'secondarySystemBackground', shape: { type: 'rect', cornerRadius: 20 } }}
            >
              <Text font="subheadline">关闭</Text>
            </HStack>
          </Button>
          <Spacer />
          <Text font="headline">米游社登录</Text>
          <Spacer />
          <Spacer frame={{ width: 60 }} />
        </HStack>

        {/* 登录内容 */}
        <VStack padding={{ horizontal: 16 }} spacing={16}>
          {/* 提示 */}
          <VStack
            // @ts-ignore
            background="rgba(255,204,0,0.12)"
            // @ts-ignore
            cornerRadius={12}
            // @ts-ignore
            padding={{ horizontal: 14, vertical: 12 }}
            spacing={4}
          >
            <Text font="caption" fontWeight="bold"
              // @ts-ignore
              foregroundStyle="#FFCC00"
            >💡 登录说明</Text>
            <Text font="caption"
              // @ts-ignore
              foregroundStyle="secondaryLabel"
              multilineTextAlignment="leading"
            >{'点击下方按钮打开米游社网页，输入账号密码登录后关闭，系统自动提取 Cookie。'}</Text>
            <Text font="caption"
              // @ts-ignore
              foregroundStyle="secondaryLabel"
              multilineTextAlignment="leading"
            >{'如需导入 APP Cookie（抓包方式），请前往设置页面。'}</Text>
          </VStack>

          {/* 已登录状态 */}
          {isLoggedIn ? (
            <VStack spacing={8}>
              <HStack spacing={8} alignment="center">
                <ZStack frame={{ width: 36, height: 36 }}>
                  <Circle
                    // @ts-ignore
                    fill="rgba(52,199,89,0.15)"
                  />
                  <Image systemName="checkmark.circle.fill" font={18}
                    // @ts-ignore
                    foregroundStyle="systemGreen"
                  />
                </ZStack>
                <VStack spacing={1} frame={{ maxWidth: 'infinity' }}>
                  <Text font="subheadline" fontWeight="bold">已登录</Text>
                  <Text font="caption"
                    // @ts-ignore
                    foregroundStyle="secondaryLabel"
                  >UID: {uid}</Text>
                </VStack>
              </HStack>
              <HStack spacing={10}>
                <Button title="重新登录" systemImage="arrow.triangle.2.circlepath"
                  action={handleLogin}
                />
                <Button title="退出登录" systemImage="rectangle.portrait.and.arrow.right"
                  action={handleClear}
                />
              </HStack>
            </VStack>
          ) : (
            <VStack spacing={10}>
              <Button
                title={isProcessing ? '处理中...' : 'WebView 登录'}
                systemImage="person.circle"
                action={handleLogin}
              />
              <Button
                title="扫码登录（推荐）"
                systemImage="qrcode"
                action={() => {
                  Navigation.present(
                    <QRLoginPage
                      onLoginSuccess={(cookie: string, uid: string) => {
                        addLog('success', `扫码登录成功! UID: ${uid}`)
                        onDismiss?.()
                        setTimeout(() => dismiss(), 100)
                      }}
                      onBack={() => dismiss()}
                    />
                  )
                }}
              />
            </VStack>
          )}

          {/* 底部占位 */}
          <VStack frame={{ height: 40 }} />
        </VStack>
      </VStack>
    </ScrollView>
  )
}
