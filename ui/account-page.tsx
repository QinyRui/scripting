/**
 * 米游社自动助手 - 账号管理页面
 */

import {
  HStack, VStack, Text, Image, Button,
  Spacer, ScrollView, Navigation,
  useState, useEffect,
  ZStack, Circle, TextField, RoundedRectangle,
} from 'scripting'
import {
  getCookie, isLoggedIn, addLog, clearLoginData,
  hasStoken, saveStokenFromCookie, clearStoken,
} from '../src/utils'
import { IconBadge } from './components'
import { getCookieViaWebView, saveLoginData } from '../src/webview-login'

export function AccountPage({
  onAuthChange,
  onDismiss,
}: {
  onAuthChange?: () => void
  onDismiss?: () => void
} = {}) {
  const dismiss = Navigation.useDismiss()
  const [cookie, setCookie] = useState('')
  const [isLoggedInState, setIsLoggedInState] = useState(false)
  const [autoSaved, setAutoSaved] = useState(false)
  const [accountInfo, setAccountInfo] = useState<{
    stuid?: string
    stoken?: string
    mid?: string
  }>({})

  const [cookieInput, setCookieInput] = useState('')
  const [stokenSaved, setStokenSaved] = useState(hasStoken())
  const [importMsg, setImportMsg] = useState('')
  const [showCookiePopup, setShowCookiePopup] = useState(false)

  useEffect(() => {
    loadCookieData()
  }, [])

  const loadCookieData = () => {
    try {
      const currentCookie = getCookie()
      setCookie(currentCookie)
      setIsLoggedInState(true)
      autoSaveCookie(currentCookie)
      addLog('info', '账号数据已自动保存')
    } catch (error) {
      setIsLoggedInState(false)
      setCookie('')
      addLog('info', '未检测到登录状态')
    }
    // 从 Storage 读取 stoken 数据显示
    const stuid = Storage.get<string>('mihoyo_stuid') || ''
    const stoken = Storage.get<string>('mihoyo_stoken') || ''
    const mid = Storage.get<string>('mihoyo_mid') || ''
    setAccountInfo({ stuid, stoken, mid })

    // 构建预览：优先显示完整 Web Cookie，其次显示 stoken 信息
    const webCookie = Storage.get<string>('mihoyo_cookie') || ''
    const lines: string[] = []
    const seenKeys = new Set<string>()
    if (webCookie) {
      const parts = webCookie.split(';').map(p => p.trim()).filter(Boolean)
      // 只显示每个字段的第一条
      for (const part of parts) {
        const eqIdx = part.indexOf('=')
        if (eqIdx <= 0) continue
        const key = part.substring(0, eqIdx)
        if (!seenKeys.has(key)) {
          seenKeys.add(key)
          lines.push(part)
        }
      }
    } else {
      // 没有 Web Cookie，显示 stuid/stoken/mid
      if (stuid) lines.push('stuid=' + stuid + ';')
      if (stoken) lines.push('stoken=' + stoken)
      if (mid) lines.push('mid=' + mid + ';')
    }
  }

  const parseCookie = (cookieStr: string) => {
    const result: { stuid?: string; stoken?: string; mid?: string } = {}
    const stuidMatch = cookieStr.match(/stuid=(\d+)/)
    if (stuidMatch) result.stuid = stuidMatch[1]
    const stokenMatch = cookieStr.match(/stoken=([^;]+)/)
    if (stokenMatch) result.stoken = stokenMatch[1]
    const midMatch = cookieStr.match(/mid=(\d+)/)
    if (midMatch) result.mid = midMatch[1]
    return result
  }

  const autoSaveCookie = (cookieStr: string) => {
    try {
      Storage.set('mihoyo_cookie', cookieStr)
      Storage.set('mihoyo_cookie_save_time', new Date().toISOString())
      setAutoSaved(true)
      setTimeout(() => setAutoSaved(false), 2000)
    } catch (error) {
      addLog('error', '自动保存失败: ' + error)
    }
  }

  const handleLogout = () => {
    clearLoginData()
    setIsLoggedInState(false)
    setCookie('')
    setAccountInfo({})
    addLog('info', '已退出登录')
    onAuthChange?.()
    dismiss()
  }

  const handleImportCookie = () => {
    if (!cookieInput.trim()) {
      setImportMsg('请粘贴 Cookie')
      return
    }
    const input = cookieInput.trim()
    const result = saveStokenFromCookie(input)
    if (result.success) {
      // 只有输入包含 Web Cookie 字段时才覆盖 mihoyo_cookie
      // 避免 stoken 字符串（stuid=xxx;stoken=xxx;mid=xxx）覆盖有效的 Web Cookie
      const isWebCookie = input.includes('ltoken=') || input.includes('cookie_token=')
      if (isWebCookie) {
        Storage.set('mihoyo_cookie', input)
        Storage.set('mihoyo_cookie_save_time', new Date().toISOString())
        addLog('success', 'Web Cookie 已保存')
      }
      setStokenSaved(true)
      setImportMsg('✅ ' + result.message + (isWebCookie ? '，已保存 Cookie' : ''))
      addLog('success', result.message)
      setCookieInput('')
      loadCookieData()
    } else {
      setImportMsg('❌ ' + result.message)
    }
  }

  const handleClearStoken = () => {
    clearStoken()
    setStokenSaved(false)
    setImportMsg('已清除 stoken')
    addLog('info', 'stoken 已清除')
  }

  const handleBack = () => {
    onDismiss?.()
    dismiss()
  }

  // ---- 卡片样式常量 ----
  const cardBg = '#1C1C1E'

  return (
    <ScrollView frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }}>
      <VStack spacing={20} padding={{ top: 0, bottom: 40, horizontal: 16 }}>

        {/* ===== 标题栏 ===== */}
        <HStack padding={{ vertical: 12 }} alignment="center">
          <Button action={handleBack}>
            <HStack padding={{ horizontal: 14, vertical: 6 }}
              background={{ style: 'secondarySystemBackground', shape: { type: 'rect', cornerRadius: 16 } }}
            >
              <Text font="subheadline">返回</Text>
            </HStack>
          </Button>
          <Spacer />
          <Text font="headline" fontWeight="bold">账号管理</Text>
          <Spacer />
          <Spacer frame={{ width: 56 }} />
        </HStack>

        {/* ===== 登录状态卡片 ===== */}
        <VStack
          // @ts-ignore
          background={cardBg}
          // @ts-ignore
          cornerRadius={16}
          // @ts-ignore
          padding={20}
          spacing={10}
          alignment="center"
        >
          <ZStack frame={{ width: 48, height: 48 }}>
            <Circle
              // @ts-ignore
              fill={isLoggedInState ? 'rgba(52,199,89,0.2)' : 'rgba(255,59,48,0.2)'}
            />
            <Image systemName={isLoggedInState ? 'checkmark.circle.fill' : 'xmark.circle.fill'} font={24}
              // @ts-ignore
              foregroundStyle={isLoggedInState ? 'systemGreen' : 'systemRed'}
            />
          </ZStack>
          <Text font="body" fontWeight="bold"
            frame={{ maxWidth: 'infinity' }}
            multilineTextAlignment="center"
          >
            {isLoggedInState ? '已登录' : '未登录'}
          </Text>
          <Text font="footnote"
            // @ts-ignore
            foregroundStyle="secondaryLabel"
            frame={{ maxWidth: 'infinity' }}
            multilineTextAlignment="center"
          >
            {isLoggedInState
              ? (accountInfo.stuid ? `UID: ${accountInfo.stuid}` : '账号已连接')
              : '无账号信息'}
          </Text>
          {autoSaved ? (
            <Text font="caption" fontWeight="bold"
              // @ts-ignore
              foregroundStyle="systemGreen"
            >已保存 ✓</Text>
          ) : null}
        </VStack>

        {/* ===== 操作卡片 ===== */}
        <VStack
          // @ts-ignore
          background={cardBg}
          // @ts-ignore
          cornerRadius={16}
          spacing={0}
        >
          {isLoggedInState ? (
            <>
              {/* 退出登录 */}
              <Button action={handleLogout}>
                <VStack padding={{ horizontal: 16, vertical: 13 }} spacing={6} alignment="center">
                  <IconBadge icon="rectangle.portrait.and.arrow.right" color="systemRed" />
                  <Text fontWeight="medium"
                    foregroundStyle="systemRed"
                  >退出登录</Text>
                </VStack>
              </Button>
            </>
          ) : (
            <Button action={async () => {
              try {
                const result = await getCookieViaWebView()
                if (result.success && result.cookieStr) {
                  const saveResult = await saveLoginData(result.cookieStr)
                  if (saveResult.success) {
                    const parts = result.cookieStr.split(';')
                    for (const part of parts) {
                      const t = part.trim()
                      if (t.startsWith('stuid=')) Storage.set('mihoyo_stuid', t.substring(6))
                      if (t.startsWith('stoken=')) Storage.set('mihoyo_stoken', t.substring(7))
                      if (t.startsWith('mid=')) Storage.set('mihoyo_mid', t.substring(4))
                    }
                    addLog('success', saveResult.message)
                    loadCookieData()
                    onAuthChange?.()
                  } else {
                    addLog('error', saveResult.message)
                  }
                } else {
                  addLog('error', result.message)
                }
              } catch (e: any) {
                addLog('error', '登录失败: ' + e.message)
              }
            }}>
              <HStack padding={{ horizontal: 16, vertical: 13 }} alignment="center">
                <Spacer />
                <IconBadge icon="person.circle" color="systemGreen" />
                <Text fontWeight="medium"
                  // @ts-ignore
                  foregroundStyle="systemGreen"
                >去登录</Text>
                <Spacer />
                <Image systemName="chevron.right" font={12}
                  // @ts-ignore
                  foregroundStyle="tertiaryLabel"
                />
              </HStack>
            </Button>
          )}
        </VStack>

        {/* ===== 个人 Cookie 按钮 ===== */}
        {isLoggedInState && cookie ? (
          <Button
            action={() => setShowCookiePopup(true)}
            popover={{
              isPresented: showCookiePopup,
              onChanged: (v: boolean) => setShowCookiePopup(v),
              presentationCompactAdaptation: 'popover',
              arrowEdge: 'bottom' as any,
              content: (
                <VStack
                  // @ts-ignore
                  background="rgba(35,35,35,0.95)"
                  // @ts-ignore
                  cornerRadius={20}
                  // @ts-ignore
                  padding={{ vertical: 16, horizontal: 14 }}
                  spacing={10}
                  frame={{ width: 280 }}
                >
                  <Text font="headline" fontWeight="bold" foregroundStyle="white">Cookie</Text>
                  <ScrollView frame={{ height: 260 }}>
                    <VStack spacing={4} frame={{ maxWidth: 'infinity' }}>
                      {cookie.split(';').map((part, i) => (
                        <Text key={i} font="caption" foregroundStyle="label"
                          multilineTextAlignment="leading"
                        >{part.trim()}</Text>
                      ))}
                    </VStack>
                  </ScrollView>
                  <Button action={() => {
                    try {
                      if (typeof Clipboard !== 'undefined') {
                        Clipboard.copyText(cookie)
                        addLog('success', 'Cookie 已复制到剪贴板')
                      }
                    } catch (e) {}
                    setShowCookiePopup(false)
                  }}>
                    <Text fontWeight="bold" foregroundStyle="systemGreen">复制</Text>
                  </Button>
                </VStack>
              )
            }}
          >
            <HStack padding={{ horizontal: 16, vertical: 13 }} spacing={12} alignment="center">
              <Spacer />
              <Text font="subheadline" fontWeight="bold"
                // @ts-ignore
                foregroundStyle="secondaryLabel"
              >个人 Cookie</Text>
              <Spacer />
              <Image systemName="doc.on.doc" font={12}
                // @ts-ignore
                foregroundStyle="tertiaryLabel"
              />
            </HStack>
          </Button>
        ) : null}


        {/* ===== Cookie 认证导入卡片 ===== */}
        <VStack
          // @ts-ignore
          background={cardBg}
          // @ts-ignore
          cornerRadius={16}
          // @ts-ignore
          padding={16}
          spacing={12}
        >
          <Text font="subheadline" fontWeight="bold"
            frame={{ maxWidth: 'infinity' }}
            multilineTextAlignment="center"
          >Cookie 认证导入（stoken）</Text>

          {/* 提示 */}
          <ZStack>
            <RoundedRectangle cornerRadius={10} fill="rgba(255,204,0,0.12)" />
            <VStack padding={12} spacing={4}>
              <Text font="footnote" fontWeight="bold"
                foregroundStyle="#FFCC00"
                frame={{ maxWidth: 'infinity' }}
                multilineTextAlignment="center"
              >💡 获取方法</Text>
              <Text font="footnote"
                foregroundStyle="secondaryLabel"
                multilineTextAlignment="center"
              >从米游社 APP 抓包工具（Stream / Thor）中复制包含 stoken 和 stuid 的 Cookie</Text>
            </VStack>
          </ZStack>

          {/* 输入框 */}
          <TextField
            title="粘贴 Cookie"
            prompt="stuid=xxx;stoken=xxx;mid=xxx"
            value={cookieInput}
            onChanged={(text: string) => setCookieInput(text)}
          />

          {/* 状态 + 按钮行 */}
          <HStack spacing={12} alignment="center" frame={{ maxWidth: 'infinity' }}>
            <Spacer />
            <Text font="footnote" fontWeight="medium"
              // @ts-ignore
              foregroundStyle={stokenSaved ? 'systemGreen' : 'systemOrange'}
            >{stokenSaved ? '✓ 已配置' : '未配置'}</Text>
            {stokenSaved ? (
              <Button title="清除" action={handleClearStoken} />
            ) : null}
            <Button
              title="保存"
              systemImage="checkmark.circle"
              action={handleImportCookie}
            />
            <Spacer />
          </HStack>

          {/* 状态消息 */}
          {importMsg ? (
            <Text font="footnote"
              // @ts-ignore
              foregroundStyle={importMsg.startsWith('✅') ? 'systemGreen' : importMsg.startsWith('❌') ? 'systemRed' : 'secondaryLabel'}
            >{importMsg}</Text>
          ) : null}
        </VStack>

        {/* ===== 底部提示 ===== */}
        <Text font="caption"
          // @ts-ignore
          foregroundStyle="tertiaryLabel"
          multilineTextAlignment="center"
          frame={{ maxWidth: 'infinity' }}
        >Cookie 数据会自动保存到本地，无需手动操作</Text>

      </VStack>
    </ScrollView>
  )
}
