/**
 * 二维码扫码登录页面
 * 图一：二维码 + 取消/完成按钮
 * 图二：扫码成功后 → 账号配置页面
 */

import {
  VStack, HStack, Text, Button, Image,
  Spacer, Navigation,
  useState, useEffect, useRef,
} from 'scripting'
import { fetchQRCode, queryQRCodeStatus, generateDeviceId, exchangeTokensForCookie, QRLoginResult } from '../src/qr-login'

/** 在线 QR API */
function getQRImageUrl(url: string): string {
  return 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&format=png&data=' + encodeURIComponent(url)
}

interface QRLoginPageProps {
  onLoginSuccess: (cookie: string, uid: string) => void
  onBack: () => void
}

export function QRLoginPage({ onLoginSuccess, onBack }: QRLoginPageProps) {
  // === 图一：二维码页面状态 ===
  const [status, setStatus] = useState<'loading' | 'ready' | 'scanning' | 'confirmed' | 'success' | 'error' | 'expired'>('loading')
  const [qrUrl, setQrUrl] = useState('')
  const deviceIdRef = useRef(generateDeviceId())
  const [ticket, setTicket] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const pollingRef = useRef<any>(null)

  // === 登录结果数据 ===
  const loginResultRef = useRef<QRLoginResult | null>(null)
  const [loginResult, setLoginResult] = useState<QRLoginResult | null>(null)

  // 初始化
  useEffect(() => {
    ;(async () => {
      const data = await fetchQRCode(deviceIdRef.current)
      if (data) {
        setQrUrl(getQRImageUrl(data.url))
        setTicket(data.ticket)
        setStatus('ready')
        startPolling(data.ticket)
      } else {
        setErrorMsg('获取二维码失败')
        setStatus('error')
      }
    })()
    return () => {
      if (pollingRef.current) (globalThis as any).clearInterval?.(pollingRef.current)
    }
  }, [])

  const startPolling = (tl: string) => {
    if (pollingRef.current) (globalThis as any).clearInterval?.(pollingRef.current)
    pollingRef.current = (globalThis as any).setInterval?.(async () => {
      const result = await queryQRCodeStatus(tl, deviceIdRef.current)
      if (result.expired) {
        ;(globalThis as any).clearInterval?.(pollingRef.current)
        setStatus('expired')
      } else if (result.uid && result.gameToken) {
        ;(globalThis as any).clearInterval?.(pollingRef.current)
        setStatus('confirmed')
        // 执行 token 交换（后台进行，不阻塞 UI）
        const res = await exchangeTokensForCookie(result.uid, result.gameToken, deviceIdRef.current)
        loginResultRef.current = res
        setLoginResult(res)
        if (res.success) {
          setStatus('success')
        } else {
          setErrorMsg(res.error || '登录失败')
          setStatus('error')
        }
      } else if (result.scanned) {
        setStatus('scanning')
      }
    }, 3000)
  }

  const refreshQR = async () => {
    setStatus('loading')
    const data = await fetchQRCode(deviceIdRef.current)
    if (data) {
      setQrUrl(getQRImageUrl(data.url))
      setTicket(data.ticket)
      setStatus('ready')
      startPolling(data.ticket)
    } else {
      setErrorMsg('刷新二维码失败')
      setStatus('error')
    }
  }

  // 跳转米游社
  const jumpToMiYouShe = () => {
    try {
      const urlClass = (globalThis as any).NSURL
      if (urlClass) {
        const url = urlClass.URLWithString('mihoyobbs://')
        const appClass = (globalThis as any).UIApplication
        if (url && appClass) appClass.sharedApplication().openURL(url)
      }
    } catch {}
  }

  // 点击「完成」→ 进入图二（账号配置页面）
  const handleDone = () => {
    if (loginResult?.success) {
      onLoginSuccess(loginResult.cookie || '', loginResult.uid || '')
    }
  }

  // 状态文字
  const statusText = status === 'scanning' ? '已扫描，请检查'
    : status === 'confirmed' ? '已确认，正在登录...'
    : status === 'success' ? '登录成功！'
    : status === 'expired' ? '二维码已过期'
    : status === 'error' ? errorMsg
    : ''

  return (
    <VStack
      // @ts-ignore
      background="#000000"
      frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }}
      spacing={0}
    >
      {/* 顶部导航栏：取消 + 标题 + 完成 */}
      <HStack padding={{ horizontal: 16, vertical: 12 }} alignment="center">
        <Button action={onBack}>
          <HStack padding={{ horizontal: 16, vertical: 8 }}
            // @ts-ignore
            background={{ style: 'secondarySystemBackground', shape: { type: 'rect', cornerRadius: 20 } }}
          >
            <Text font="subheadline">取消</Text>
          </HStack>
        </Button>
        <Spacer />
        <Text font="headline" fontWeight="bold">通过扫描二维码登录</Text>
        <Spacer />
        {(status === 'success' || status === 'confirmed') ? (
          <Button action={handleDone}>
            <HStack padding={{ horizontal: 16, vertical: 8 }}
              // @ts-ignore
              background={{ style: 'secondarySystemBackground', shape: { type: 'rect', cornerRadius: 20 } }}
            >
              <Text font="subheadline" foregroundStyle="systemBlue" fontWeight="bold">完成</Text>
            </HStack>
          </Button>
        ) : (
          <Spacer frame={{ width: 60 }} />
        )}
      </HStack>

      {/* 内容区域 */}
      <VStack padding={{ horizontal: 16 }} spacing={0} frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }}>
        {/* 二维码卡片 */}
        <VStack
          // @ts-ignore
          background="#1C1C1E"
          // @ts-ignore
          cornerRadius={16}
          padding={20}
          alignment="center"
          spacing={12}
        >
          <VStack alignment="center" spacing={8} frame={{ width: 260, height: 260 }}>
            {status === 'loading' ? (
              <VStack alignment="center" spacing={8} frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }}>
                <Text font="body" foregroundStyle="secondaryLabel">加载中...</Text>
              </VStack>
            ) : (status === 'expired' || status === 'error') ? (
              <VStack alignment="center" spacing={8} frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }}>
                <Text font="title" foregroundStyle="systemRed">⏰</Text>
                <Text font="caption" foregroundStyle="secondaryLabel">{statusText}</Text>
              </VStack>
            ) : status === 'success' ? (
              <VStack alignment="center" spacing={8} frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }}>
                <Text font="title" foregroundStyle="systemGreen">✅</Text>
                <Text font="caption" foregroundStyle="systemGreen">登录成功</Text>
              </VStack>
            ) : (
              <VStack alignment="center" frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }}>
                {qrUrl ? (
                  <Image imageUrl={qrUrl} resizable={true}
                    // @ts-ignore
                    frame={{ width: 240, height: 240 }}
                  />
                ) : (
                  <Text font="caption" foregroundStyle="secondaryLabel">加载中...</Text>
                )}
              </VStack>
            )}
          </VStack>
          <Text font="caption" foregroundStyle="secondaryLabel">点击该二维码以保存</Text>
        </VStack>

        <VStack
          // @ts-ignore
          background="separator"
          frame={{ maxWidth: 'infinity', height: 0.5 }}
        />

        {/* 菜单项 */}
        {statusText && status !== 'success' ? (
          <>
            <HStack padding={14}>
              <Text font="body" foregroundStyle={
                status === 'scanning' ? 'systemBlue' :
                status === 'confirmed' ? 'systemOrange' :
                'systemRed'
              }>{statusText}</Text>
            </HStack>
            <VStack
          // @ts-ignore
          background="separator"
          frame={{ maxWidth: 'infinity', height: 0.5 }}
        />
          </>
        ) : null}

        <Button action={refreshQR}>
          <HStack padding={14} frame={{ maxWidth: 'infinity' }}>
            <Text font="body" foregroundStyle="systemBlue">重新生成二维码</Text>
          </HStack>
        </Button>
        <VStack
          // @ts-ignore
          background="separator"
          frame={{ maxWidth: 'infinity', height: 0.5 }}
        />

        <Button action={jumpToMiYouShe}>
          <HStack padding={14} frame={{ maxWidth: 'infinity' }}>
            <Text font="body" foregroundStyle="systemBlue">点此跳转至米游社</Text>
          </HStack>
        </Button>
        <VStack
          // @ts-ignore
          background="separator"
          frame={{ maxWidth: 'infinity', height: 0.5 }}
        />

        <VStack padding={{ horizontal: 8, vertical: 16 }} spacing={4}>
          <Text font="caption" foregroundStyle="secondaryLabel"
            multilineTextAlignment="leading"
          >请使用米游社 App 扫描该二维码。您也可以将该二维码用屏幕截图的方式存下来扫描。</Text>
        </VStack>
      </VStack>
    </VStack>
  )
}
