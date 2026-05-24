import {
  Navigation,
  NavigationStack,
  List,
  Section,
  TextField,
  Button,
  Text,
  Toggle,
  Script,
  useState,
  Color,
  HStack,
  Spacer,
  fetch,
  VStack,
  Divider,
  ZStack,
  Circle,
  Image,
  ScrollView
} from "scripting"

declare const Storage: any
declare const Dialog: any
declare const Safari: any
declare const Pasteboard: any

// ==================== 版本信息 ====================
const VERSION = "1.0.2"
const BUILD_DATE = "2025-12-19"

// ==================== 存储键 ====================
const SETTINGS_KEY = "ninebotSettings"
const FULLSCREEN_KEY = "ninebotSettingsFullscreen"

// ==================== 九号的 BoxJs / 模块链接 ====================
const NINEBOT_BOXJS_JSON_URL =
  "https://raw.githubusercontent.com/QinyRui/QYR-/jiuhao/2.9.boxjs.json"

const NINEBOT_BOXJS_SUB_URL =
  `http://boxjs.com/#/sub/add/${encodeURIComponent(NINEBOT_BOXJS_JSON_URL)}`

const NINEBOT_LOON_PLUGIN_URL =
  "https://raw.githubusercontent.com/QinyRui/QYR-/jiuhao/九号智能电动车.plugin"

const NINEBOT_LOON_INSTALL_URL =
  `loon://import?plugin=${encodeURIComponent(NINEBOT_LOON_PLUGIN_URL)}`

// ==================== API测试地址 ====================
const NINEBOT_TEST_SIGN_URL = "https://cn-cbu-gateway.ninebot.com/portal/api/user-sign/v2/status"

// ==================== 设置数据结构 ====================
export interface NinebotSettings {
  authorization: string
  deviceId: string
  userAgent: string
  enableBoxJs: boolean
  boxJsUrl: string
  refreshInterval: number
  autoSign: boolean
  autoSignTime: string
  autoOpenBlindBox: boolean
  titleDayColor: Color
  titleNightColor: Color
  descDayColor: Color
  descNightColor: Color
}

// ==================== 默认设置 ====================
const defaultSettings: NinebotSettings = {
  authorization: "",
  deviceId: "",
  userAgent: "Ninebot/3620 CFNetwork/3860.200.71 Darwin/25.1.0",
  enableBoxJs: false,
  boxJsUrl: "https://boxjs.com",
  refreshInterval: 15,
  autoSign: false,
  autoSignTime: "00:30",
  autoOpenBlindBox: false,
  titleDayColor: "#333333" as unknown as Color,
  titleNightColor: "#FFFFFF" as unknown as Color,
  descDayColor: "#666666" as unknown as Color,
  descNightColor: "#CCCCCC" as unknown as Color,
}

// ==================== 工具函数 ====================
const validateDeviceId = (deviceId: string): boolean => {
  return /^[0-9A-F-]{32,}$/i.test(deviceId)
}

const testApiConnection = async (auth: string, deviceId: string, ua: string) => {
  try {
    if (!auth) {
      throw new Error("Authorization不能为空")
    }
    if (!validateDeviceId(deviceId)) {
      throw new Error("DeviceId格式错误，应为UUID格式")
    }

    const response = await fetch(NINEBOT_TEST_SIGN_URL, {
      method: "GET",
      headers: {
        "Authorization": auth,
        "device_id": deviceId,
        "User-Agent": ua || defaultSettings.userAgent,
        "Content-Type": "application/json"
      },
      timeout: 10
    })

    if (response.ok) {
      return { success: true, message: "API连接成功，鉴权信息有效" }
    } else {
      return { success: false, message: `API请求失败，状态码：${response.status}` }
    }
  } catch (error: any) {
    return { success: false, message: `连接异常：${error.message || "未知错误"}` }
  }
}

const testBoxJsConnection = async (url: string) => {
  try {
    const testUrl = `${url.replace(/\/$/, "")}/api/v1/status`
    const response = await fetch(testUrl, { timeout: 5 })
    return response.ok 
      ? { success: true, message: "BoxJs服务连接正常" } 
      : { success: false, message: `BoxJs响应异常，状态码：${response.status}` }
  } catch (error: any) {
    return { success: false, message: `BoxJs连接失败：${error.message || "请检查地址是否正确"}` }
  }
}

const syncAuthFromBoxJs = async (boxJsUrl: string) => {
  try {
    const baseUrl = boxJsUrl.replace(/\/$/, "")
    const authUrl = `${baseUrl}/query/data/ninebot.authorization`
    const deviceUrl = `${baseUrl}/query/data/ninebot.deviceId`
    
    console.log(`📡 从 BoxJs 同步鉴权信息`)
    console.log(`   Auth URL: ${authUrl}`)
    console.log(`   Device URL: ${deviceUrl}`)
    
    const [authResponse, deviceResponse] = await Promise.all([
      fetch(authUrl, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "User-Agent": "NinebotSettings/1.0.2",
          "Referer": baseUrl,
        },
        timeout: 10000
      }),
      fetch(deviceUrl, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "User-Agent": "NinebotSettings/1.0.2",
          "Referer": baseUrl,
        },
        timeout: 10000
      })
    ])

    console.log(`   Auth Status: ${authResponse.status}`)
    console.log(`   Device Status: ${deviceResponse.status}`)

    if (!authResponse.ok || !deviceResponse.ok) {
      throw new Error("BoxJS 请求失败")
    }

    const authText = await authResponse.text()
    const deviceText = await deviceResponse.text()
    
    console.log(`   Auth Response: ${authText}`)
    console.log(`   Device Response: ${deviceText}`)

    const authData = JSON.parse(authText)
    const deviceData = JSON.parse(deviceText)

    const authorization = authData?.val || authData?.value || authData?.data || ""
    const deviceId = deviceData?.val || deviceData?.value || deviceData?.data || ""

    console.log(`   提取 authorization: ${authorization ? '成功' : '失败'}`)
    console.log(`   提取 deviceId: ${deviceId ? '成功' : '失败'}`)

    if (!authorization || !deviceId) {
      const missing = []
      if (!authorization) missing.push("authorization")
      if (!deviceId) missing.push("deviceId")
      throw new Error(
        `BoxJs 中未找到 ${missing.join(" 和 ")}\n\n` +
        `请确保已在 BoxJs 中配置:\n` +
        `• ninebot.authorization\n` +
        `• ninebot.deviceId`
      )
    }

    console.log("✅ 同步成功")
    return { 
      success: true, 
      authorization, 
      deviceId,
      message: `成功从 BoxJs 同步鉴权信息`
    }

  } catch (error: any) {
    console.error("❌ 同步失败:", error)
    return { 
      success: false, 
      authorization: "",
      deviceId: "",
      message: `同步失败：${error.message || "未知错误"}` 
    }
  }
}

function AboutView() {
  const dismiss = Navigation.useDismiss()
  
  const openTelegram = async () => {
    try {
      await Safari.openURL("https://t.me/JiuHaoAPP")
    } catch (error) {
      await Pasteboard.setString("https://t.me/JiuHaoAPP")
      await Dialog.alert({
        title: "已复制链接",
        message: "Telegram 链接已复制到剪贴板",
        buttonLabel: "确定"
      })
    }
  }
  
  const openGithub = async () => {
    try {
      await Safari.openURL("https://github.com/QinyRui/scripting/tree/JH")
    } catch (error) {
      await Pasteboard.setString("https://github.com/QinyRui/scripting/tree/JH")
      await Dialog.alert({
        title: "已复制链接",
        message: "GitHub 仓库链接已复制到剪贴板",
        buttonLabel: "确定"
      })
    }
  }
  
  return (
    <ScrollView frame={{ maxWidth: "infinity", maxHeight: "infinity" }} background="systemBackground">
      <VStack spacing={0}>
        <HStack padding={16} alignment="center">
          <Button action={dismiss}>
            <HStack padding={{ horizontal: 16, vertical: 8 }} background={{ style: "secondarySystemBackground", shape: { type: "rect", cornerRadius: 20 } }}>
              <Text font="headline">关闭</Text>
            </HStack>
          </Button>
          <Spacer />
          <Text font="headline">详情介绍</Text>
          <Spacer />
          <Spacer frame={{ width: 60 }} />
        </HStack>

        <VStack spacing={40} padding={20}>
          <VStack spacing={16} alignment="center">
            <ZStack frame={{ width: 100, height: 100 }}>
              <Circle fill={{ colors: ["#4facfe", "#00f2fe"], startPoint: "top", endPoint: "bottom" }} />
              <Text font={48}>🛴</Text>
            </ZStack>
            <VStack spacing={4} alignment="center">
              <Text font="title" fontWeight="bold">九号电动车助手</Text>
              <Text font="subheadline" foregroundStyle="secondaryLabel">Ninebot Assistant</Text>
            </VStack>
            <HStack spacing={12} alignment="center">
              <Text font="caption" fontWeight="bold" foregroundStyle="systemBlue" padding={{ horizontal: 12, vertical: 4 }} background={{ style: "secondarySystemBackground", shape: { type: "rect", cornerRadius: 8 } }}>v{VERSION}</Text>
              <Text font="caption" foregroundStyle="secondaryLabel" padding={{ horizontal: 12, vertical: 4 }} background={{ style: "secondarySystemBackground", shape: { type: "rect", cornerRadius: 8 } }}>By QinyRui</Text>
            </HStack>
          </VStack>

          <VStack spacing={24}>
            <HStack spacing={20} alignment="top">
              <HStack spacing={16} frame={{ maxWidth: "infinity" }} alignment="center">
                <ZStack frame={{ width: 44, height: 44 }}><Circle fill="yellow" opacity={0.2} /><Image systemName="bolt.fill" foregroundStyle="yellow" /></ZStack>
                <VStack alignment="leading" spacing={2}><Text fontWeight="bold">智能签到</Text><Text font="caption" foregroundStyle="secondaryLabel">全自动打卡领积分</Text></VStack>
              </HStack>
              <HStack spacing={16} frame={{ maxWidth: "infinity" }} alignment="center">
                <ZStack frame={{ width: 44, height: 44 }}><Circle fill="green" opacity={0.2} /><Image systemName="gift.fill" foregroundStyle="green" /></ZStack>
                <VStack alignment="leading" spacing={2}><Text fontWeight="bold">盲盒开启</Text><Text font="caption" foregroundStyle="secondaryLabel">自动开盲盒不错过</Text></VStack>
              </HStack>
            </HStack>
            <HStack spacing={20} alignment="top">
              <HStack spacing={16} frame={{ maxWidth: "infinity" }} alignment="center">
                <ZStack frame={{ width: 44, height: 44 }}><Circle fill="blue" opacity={0.2} /><Image systemName="shippingbox.fill" foregroundStyle="blue" /></ZStack>
                <VStack alignment="leading" spacing={2}><Text fontWeight="bold">云端同步</Text><Text font="caption" foregroundStyle="secondaryLabel">BoxJs 配置无缝同步</Text></VStack>
              </HStack>
              <HStack spacing={16} frame={{ maxWidth: "infinity" }} alignment="center">
                <ZStack frame={{ width: 44, height: 44 }}><Circle fill="purple" opacity={0.2} /><Image systemName="puzzlepiece.extension.fill" foregroundStyle="purple" /></ZStack>
                <VStack alignment="leading" spacing={2}><Text fontWeight="bold">生态扩展</Text><Text font="caption" foregroundStyle="secondaryLabel">支持各类网络代理插件</Text></VStack>
              </HStack>
            </HStack>
          </VStack>

          <VStack alignment="leading" spacing={16} padding={20} background={{ style: "secondarySystemBackground", shape: { type: "rect", cornerRadius: 20 } }}>
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
              <VStack frame={{ maxWidth: "infinity", height: 1 }} background="separator" />
              <Spacer />
            </HStack>
            
            <HStack spacing={8} alignment="center" onTapGesture={openGithub}>
              <Image systemName="chevron.left.forwardslash.chevron.right" foregroundStyle="label" />
              <Text fontWeight="bold" foregroundStyle="label">GitHub 仓库</Text>
            </HStack>
          </VStack>
        </VStack>

        <Spacer />
        <VStack frame={{ maxWidth: "infinity" }} alignment="center" padding={20}>
          <Text font="caption2" foregroundStyle="tertiaryLabel">© 2025 QinyRui. All rights reserved.</Text>
          <Text font="caption2" foregroundStyle="tertiaryLabel">Made with ❤️ for Ninebot Users</Text>
        </VStack>
      </VStack>
    </ScrollView>
  )
}

// ==================== 辅助组件 ====================
function HomeQuickButton({ icon, title, subtitle, action, tint }: { icon: string; title: string; subtitle: string; action: () => void; tint: string }) {
  return (
    <HStack spacing={12} frame={{ maxWidth: "infinity" }} alignment="center" padding={{ vertical: 8, horizontal: 4 }} onTapGesture={action}>
      <ZStack frame={{ width: 44, height: 44 }}>
        <Circle fill={tint as any} opacity={0.2} />
        <Image systemName={icon} foregroundStyle={tint as any} font={20} />
      </ZStack>
      <VStack alignment="leading" spacing={2} frame={{ maxWidth: "infinity" }}>
        <Text fontWeight="bold" foregroundStyle="label" lineLimit={1}>{title}</Text>
        <Text font="caption" foregroundStyle="secondaryLabel" lineLimit={1}>{subtitle}</Text>
      </VStack>
    </HStack>
  )
}

function SettingsView() {
  const dismiss = Navigation.useDismiss()
  
  const storedFullscreen = Storage.get(FULLSCREEN_KEY)
  const [fullscreenPref, setFullscreenPref] = useState<boolean>(
    typeof storedFullscreen === "boolean" ? storedFullscreen : true
  )
  
  const toggleFullscreen = () => {
    const newValue = !fullscreenPref
    setFullscreenPref(newValue)
    Storage.set(FULLSCREEN_KEY, newValue)
  }

  const stored = Storage.get(SETTINGS_KEY) as NinebotSettings | null
  const initial: NinebotSettings = stored ?? defaultSettings

  const [authorization, setAuthorization] = useState(initial.authorization || "")
  const [deviceId, setDeviceId] = useState(initial.deviceId || "")
  const [userAgent, setUserAgent] = useState(initial.userAgent || defaultSettings.userAgent)
  const [enableBoxJs, setEnableBoxJs] = useState(initial.enableBoxJs ?? false)
  const [boxJsUrl, setBoxJsUrl] = useState(initial.boxJsUrl ?? "https://boxjs.com")
  const [refreshInterval, setRefreshInterval] = useState(initial.refreshInterval ?? 15)
  const [autoSign, setAutoSign] = useState(initial.autoSign ?? false)
  const [autoSignTime, setAutoSignTime] = useState(initial.autoSignTime || "00:30")
  const [autoOpenBlindBox, setAutoOpenBlindBox] = useState(initial.autoOpenBlindBox ?? false)
  const [testing, setTesting] = useState(false)
  const [syncing, setSyncing] = useState(false)

  // 计算配置完成度
  const hasAuth = !!authorization && !!deviceId
  const configCount = [hasAuth, enableBoxJs].filter(Boolean).length
  const readinessBadge = hasAuth ? "已就绪" : "待完善"
  const authStatusText = hasAuth ? "已配置" : "未配置"
  const boxJsStatusText = enableBoxJs ? "已启用" : "未启用"

  const handleSave = () => {
    const newSettings: NinebotSettings = {
      authorization: (authorization ?? "").trim(),
      deviceId: (deviceId ?? "").trim(),
      userAgent: (userAgent ?? "").trim() || defaultSettings.userAgent,
      enableBoxJs: !!enableBoxJs,
      boxJsUrl: (boxJsUrl ?? "").trim() || "https://boxjs.com",
      refreshInterval: Number(refreshInterval) || 15,
      autoSign: !!autoSign,
      autoSignTime: (autoSignTime || "00:30").trim(),
      autoOpenBlindBox: !!autoOpenBlindBox,
      titleDayColor: initial.titleDayColor,
      titleNightColor: initial.titleNightColor,
      descDayColor: initial.descDayColor,
      descNightColor: initial.descNightColor,
    }

    Storage.set(SETTINGS_KEY, newSettings)
    Storage.set("ninebot.authorization", newSettings.authorization)
    Storage.set("ninebot.deviceId", newSettings.deviceId)
    Storage.set("ninebot.userAgent", newSettings.userAgent)
    
    Dialog.alert({
      title: "保存成功",
      message: "配置已更新,小组件将使用新的设置",
      buttonLabel: "确定"
    }).then(dismiss)
  }

  const handleSyncFromBoxJs = async () => {
    if (!boxJsUrl) {
      await Dialog.alert({ 
        title: "参数缺失", 
        message: "请先填写 BoxJs 地址", 
        buttonLabel: "确定" 
      })
      return
    }
    
    setSyncing(true)
    
    try {
      const result = await syncAuthFromBoxJs(boxJsUrl)
      setSyncing(false)
      
      if (result.success) {
        setAuthorization(result.authorization)
        setDeviceId(result.deviceId)
        
        await Dialog.alert({
          title: "✅ 同步成功",
          message: `${result.message}\n\n已自动填充到下方输入框\n请点击右上角"完成"按钮保存配置`,
          buttonLabel: "确定"
        })
      } else {
        // 优化点：同步失败时，引导用户通过简单方式获取
        const shouldOpenApp = await Dialog.confirm({
          title: "❌ 同步失败",
          message: `${result.message}\n\n是否打开九号 App 引导获取鉴权？`,
          confirmButtonLabel: "打开 App",
          cancelButtonLabel: "取消"
        })
        
        if (shouldOpenApp) {
          try {
            await Safari.openURL("segway-ninebot://")
          } catch {
            await Dialog.alert({ title: "提示", message: "无法打开九号 App，请手动打开并访问签到页进行抓包", buttonLabel: "确定" })
          }
        }
      }
    } catch (error: any) {
      setSyncing(false)
      await Dialog.alert({
        title: "❌ 同步出错",
        message: `${error.message || "未知错误"}`,
        buttonLabel: "确定"
      })
    }
  }

  const clearAuth = () => {
    setAuthorization("")
    Storage.remove("ninebot.authorization")
    Dialog.alert({ title: "清除成功", message: "Authorization 已清除", buttonLabel: "确定" })
  }

  const clearDeviceId = () => {
    setDeviceId("")
    Storage.remove("ninebot.deviceId")
    Dialog.alert({ title: "清除成功", message: "DeviceId 已清除", buttonLabel: "确定" })
  }

  const handleAbout = async () => {
    await Navigation.present({
      element: <AboutView />,
      modalPresentationStyle: "pageSheet"
    })
  }

  const openBoxJsSubscription = async () => {
    try {
      await Safari.openURL(NINEBOT_BOXJS_SUB_URL)
    } catch (error) {
      try {
        await Pasteboard.setString(NINEBOT_BOXJS_JSON_URL)
        await Dialog.alert({
          title: "已复制链接",
          message: `BoxJS 配置链接已复制到剪贴板：\n\n${NINEBOT_BOXJS_JSON_URL}\n\n请在 BoxJS 中手动添加订阅。`,
          buttonLabel: "知道了",
        })
      } catch {
        await Dialog.alert({
          title: "打开失败",
          message: `无法打开 BoxJS 订阅页面\n\n链接：${NINEBOT_BOXJS_JSON_URL}`,
          buttonLabel: "确定",
        })
      }
    }
  }

  const installLoonPlugin = async () => {
    try {
      await Safari.openURL(NINEBOT_LOON_INSTALL_URL)
    } catch (error) {
      try {
        await Pasteboard.setString(NINEBOT_LOON_PLUGIN_URL)
        await Dialog.alert({
          title: "已复制链接",
          message: `Loon 插件链接已复制到剪贴板：\n\n${NINEBOT_LOON_PLUGIN_URL}\n\n请在 Loon 中手动添加插件。`,
          buttonLabel: "知道了",
        })
      } catch {
        await Dialog.alert({
          title: "跳转失败",
          message: `无法打开 Loon 应用。\n\n插件链接：\n\n${NINEBOT_LOON_PLUGIN_URL}`,
          buttonLabel: "确定",
        })
      }
    }
  }

  const handleTestApi = async () => {
    if (!authorization || !deviceId) {
      await Dialog.alert({ title: "参数缺失", message: "请先填写 Authorization 和 DeviceId", buttonLabel: "确定" })
      return
    }
    setTesting(true)
    const result = await testApiConnection(authorization, deviceId, userAgent)
    setTesting(false)
    await Dialog.alert({
      title: result.success ? "测试成功" : "测试失败",
      message: result.message,
      buttonLabel: "确定"
    })
  }

  const handleTestBoxJs = async () => {
    if (!enableBoxJs) return
    setTesting(true)
    const result = await testBoxJsConnection(boxJsUrl)
    setTesting(false)
    await Dialog.alert({
      title: result.success ? "连接成功" : "连接失败",
      message: result.message,
      buttonLabel: "确定"
    })
  }

  return (
    <ZStack frame={{ maxWidth: "infinity", maxHeight: "infinity" }}>
    <NavigationStack>
      <List
        navigationBarTitleDisplayMode="inline"
        toolbar={{
          topBarLeading: [
            <Button action={dismiss}>
              <HStack spacing={6} padding={{ horizontal: 12, vertical: 6 }} background={{ style: "secondarySystemFill", shape: { type: "capsule", style: "continuous" } }}>
                <ZStack frame={{ width: 20, height: 20 }}>
                  <Circle fill="systemRed" opacity={0.2} />
                  <Image systemName="xmark" font={10} foregroundStyle="systemRed" fontWeight="bold" />
                </ZStack>
                <Text font="subheadline" foregroundStyle="label">关闭</Text>
              </HStack>
            </Button>
          ],
          topBarTrailing: [
            <HStack spacing={12} background={{ style: "secondarySystemFill", shape: { type: "capsule", style: "continuous" } }} padding={{ horizontal: 12, vertical: 6 }}>
              <Button action={toggleFullscreen}>
                <ZStack frame={{ width: 20, height: 20 }}>
                  <Circle fill="systemBlue" opacity={0.2} />
                  <Image systemName={fullscreenPref ? "rectangle.arrowtriangle.2.outward" : "rectangle.arrowtriangle.2.inward"} font={10} foregroundStyle="systemBlue" fontWeight="bold" />
                </ZStack>
              </Button>
              <Button action={handleSave}>
                <HStack spacing={6}>
                  <ZStack frame={{ width: 20, height: 20 }}>
                    <Circle fill="systemGreen" opacity={0.2} />
                    <Image systemName="checkmark" font={10} foregroundStyle="systemGreen" fontWeight="bold" />
                  </ZStack>
                  <Text font="subheadline" fontWeight="medium" foregroundStyle="label">完成</Text>
                </HStack>
              </Button>
            </HStack>,
          ],
        }}
      >
        {/* ==================== 顶部视觉区域 ==================== */}
        <Section>
          <VStack spacing={24} padding={{ vertical: 20 }}>
            {/* 应用图标和标题 */}
            <VStack spacing={16} alignment="center">
              <ZStack frame={{ width: 100, height: 100 }}>
                <Circle fill={{ colors: ["#4facfe", "#00f2fe"], startPoint: "top", endPoint: "bottom" }} />
                <Text font={48}>🛴</Text>
              </ZStack>
              <VStack spacing={4} alignment="center">
                <Text font="title" fontWeight="bold">九号电动车助手</Text>
                <Text font="subheadline" foregroundStyle="secondaryLabel">Ninebot Assistant</Text>
              </VStack>
            </VStack>

            {/* 状态卡片 */}
            <VStack spacing={16} padding={16} background={{ style: "secondarySystemBackground", shape: { type: "rect", cornerRadius: 16 } }}>
              <HStack alignment="center" spacing={8}>
                <Text font="title3" fontWeight="bold">配置状态</Text>
                <Spacer />
                <HStack spacing={6} padding={{ horizontal: 12, vertical: 4 }} background={{ style: readinessBadge === "待完善" ? "systemRed" : "systemGreen", shape: { type: "rect", cornerRadius: 8 } }}>
                  <Image systemName={readinessBadge === "待完善" ? "exclamationmark.triangle.fill" : "checkmark.seal.fill"} font={10} foregroundStyle="white" />
                  <Text font="caption" fontWeight="bold" foregroundStyle="white">{readinessBadge}</Text>
                </HStack>
              </HStack>
              
              <VStack spacing={12}>
                <HStack alignment="center">
                  <HStack spacing={8}>
                    <ZStack frame={{ width: 24, height: 24 }}>
                      <Circle fill={hasAuth ? "systemGreen" : "systemGray"} opacity={0.2} />
                      <Image systemName="key.fill" font={12} foregroundStyle={hasAuth ? "systemGreen" : "systemGray"} />
                    </ZStack>
                    <Text font="subheadline">鉴权信息</Text>
                  </HStack>
                  <Spacer />
                  <Text font="caption" foregroundStyle="secondaryLabel">{authStatusText}</Text>
                </HStack>
                
                <HStack alignment="center">
                  <HStack spacing={8}>
                    <ZStack frame={{ width: 24, height: 24 }}>
                      <Circle fill={enableBoxJs ? "systemBlue" : "systemGray"} opacity={0.2} />
                      <Image systemName="shippingbox.fill" font={12} foregroundStyle={enableBoxJs ? "systemBlue" : "systemGray"} />
                    </ZStack>
                    <Text font="subheadline">BoxJs 同步</Text>
                  </HStack>
                  <Spacer />
                  <Text font="caption" foregroundStyle="secondaryLabel">{boxJsStatusText}</Text>
                </HStack>
              </VStack>
            </VStack>

            {/* 快捷操作按钮 */}
            <HStack spacing={0} alignment="top" frame={{ maxWidth: "infinity" }}>
              <HomeQuickButton 
                icon="shippingbox" 
                title="BoxJs 配置" 
                subtitle="订阅与同步" 
                action={openBoxJsSubscription} 
                tint="systemBlue" 
              />
              <HomeQuickButton 
                icon="puzzlepiece.extension" 
                title="Loon 插件" 
                subtitle="安装与使用" 
                action={installLoonPlugin} 
                tint="systemPurple" 
              />
            </HStack>
          </VStack>
        </Section>

        {/* ==================== BoxJs 配置 ==================== */}
        <Section header={<Text font="headline">BoxJs 配置</Text>}>
          <HStack padding={16} spacing={12} alignment="center">
            <ZStack frame={{ width: 32, height: 32 }}><Circle fill="systemGreen" opacity={0.15} /><Image systemName="switch.2" foregroundStyle="systemGreen" font={16} /></ZStack>
            <VStack alignment="leading" spacing={0} frame={{ maxWidth: "infinity" }}>
              <Toggle
                title="启用 BoxJs 读取鉴权"
                value={enableBoxJs}
                onChanged={(value) => {
                  setEnableBoxJs(value)
                  if (value && !boxJsUrl) setBoxJsUrl("https://boxjs.com")
                }}
              />
            </VStack>
          </HStack>

          {enableBoxJs ? (
            <>
              <HStack padding={16} spacing={12} alignment="center">
                <ZStack frame={{ width: 32, height: 32 }}><Circle fill="systemBlue" opacity={0.15} /><Image systemName="link" foregroundStyle="systemBlue" font={16} /></ZStack>
                <VStack alignment="leading" spacing={4} frame={{ maxWidth: "infinity" }}>
                  <HStack alignment="center">
                    <Text fontWeight="bold">BoxJs 地址</Text>
                    <Spacer />
                    <HStack alignment="center" spacing={4} onTapGesture={handleTestBoxJs}>
                      <Image systemName="wifi" font={12} foregroundStyle="systemBlue" />
                      <Text font="subheadline" foregroundStyle="systemBlue">测试</Text>
                    </HStack>
                  </HStack>
                  <TextField 
                    label={<Text>{""}</Text>}
                    value={boxJsUrl} 
                    onChanged={setBoxJsUrl}
                    prompt="例如: https://boxjs.com"
                    frame={{ maxWidth: 'infinity' }}
                  />
                  <Text font="caption2" foregroundStyle="secondaryLabel">
                    点击右上角测试 BoxJs 连接状态
                  </Text>
                </VStack>
              </HStack>
              
              <HStack padding={16} spacing={12} alignment="center" onTapGesture={syncing ? undefined : handleSyncFromBoxJs}>
                <ZStack frame={{ width: 32, height: 32 }}><Circle fill={syncing ? "systemGray" : "systemBlue"} opacity={0.15} /><Image systemName="arrow.triangle.2.circlepath" foregroundStyle={syncing ? "systemGray" : "systemBlue"} font={16} /></ZStack>
                <VStack alignment="leading" spacing={2} frame={{ maxWidth: "infinity" }}>
                  <Text fontWeight="bold" foregroundStyle={syncing ? "secondaryLabel" : "systemBlue"}>{syncing ? "同步中..." : "从 BoxJS 同步鉴权信息"}</Text>
                  <Text font="caption2" foregroundStyle="secondaryLabel">自动拉取并填充下方鉴权信息</Text>
                </VStack>
                <Spacer />
                <Image systemName="chevron.right" font={12} foregroundStyle="secondaryLabel" />
              </HStack>
            </>
          ) : null}
        </Section>

        {/* ==================== 鉴权信息 ==================== */}
        <Section 
          header={<Text font="headline">鉴权信息</Text>}
          footer={
            <>
              <Text font="footnote" foregroundStyle="secondaryLabel">
                {enableBoxJs 
                  ? "可使用上方同步按钮自动填充，或手动填写" 
                  : "请先运行签到脚本抓包获取 Authorization 和 Device ID"}
              </Text>
              {deviceId && !validateDeviceId(deviceId) ? (
                <Text font="caption2" foregroundStyle="red">
                  ⚠️ DeviceId 格式错误，应为 UUID 格式
                </Text>
              ) : null}
            </>
          }
        >
          <HStack padding={16} spacing={12} alignment="center">
            <ZStack frame={{ width: 32, height: 32 }}><Circle fill="systemOrange" opacity={0.15} /><Image systemName="lock.fill" foregroundStyle="systemOrange" font={16} /></ZStack>
            <VStack alignment="leading" spacing={4} frame={{ maxWidth: "infinity" }}>
              <HStack alignment="center">
                <Text fontWeight="bold">Authorization</Text>
                <Spacer />
                {!!authorization && <Button action={clearAuth}><Image systemName="trash.circle.fill" foregroundStyle="systemRed" font={20} /></Button>}
              </HStack>
              <TextField
                label={<Text>{""}</Text>}
                value={authorization}
                prompt="直接粘贴抓包获取的令牌"
                onChanged={setAuthorization}
                frame={{ maxWidth: 'infinity' }}
              />
            </VStack>
          </HStack>

          <HStack padding={16} spacing={12} alignment="center">
            <ZStack frame={{ width: 32, height: 32 }}><Circle fill="systemGreen" opacity={0.15} /><Image systemName="iphone" foregroundStyle="systemGreen" font={16} /></ZStack>
            <VStack alignment="leading" spacing={4} frame={{ maxWidth: "infinity" }}>
              <HStack alignment="center">
                <Text fontWeight="bold">DeviceId</Text>
                <Spacer />
                {!!deviceId && <Button action={clearDeviceId}><Image systemName="trash.circle.fill" foregroundStyle="systemRed" font={20} /></Button>}
              </HStack>
              <TextField
                label={<Text>{""}</Text>}
                value={deviceId}
                prompt="例如: 06965B02-DE89..."
                onChanged={setDeviceId}
                frame={{ maxWidth: 'infinity' }}
              />
            </VStack>
          </HStack>

          <HStack padding={16} spacing={12} alignment="center">
            <ZStack frame={{ width: 32, height: 32 }}><Circle fill="systemTeal" opacity={0.15} /><Image systemName="network" foregroundStyle="systemTeal" font={16} /></ZStack>
            <VStack alignment="leading" spacing={4} frame={{ maxWidth: "infinity" }}>
              <Text fontWeight="bold">User-Agent</Text>
              <TextField
                label={<Text>{""}</Text>}
                value={userAgent}
                prompt="留空使用默认值"
                onChanged={setUserAgent}
                frame={{ maxWidth: 'infinity' }}
              />
            </VStack>
          </HStack>

          <HStack padding={16} spacing={12} alignment="center" onTapGesture={handleTestApi}>
            <ZStack frame={{ width: 32, height: 32 }}><Circle fill={testing ? "systemGray" : "systemBlue"} opacity={0.15} /><Image systemName="bolt.horizontal.fill" foregroundStyle={testing ? "systemGray" : "systemBlue"} font={16} /></ZStack>
            <Text fontWeight="bold" foregroundStyle={testing ? "secondaryLabel" : "systemBlue"}>{testing ? "测试中..." : "测试 API 连接"}</Text>
            <Spacer />
            <Image systemName="chevron.right" font={12} foregroundStyle="secondaryLabel" />
          </HStack>
        </Section>

        {/* ==================== 小组件配置 ==================== */}
        <Section 
          header={<Text font="headline">小组件配置</Text>}
          footer={
            <Text font="footnote" foregroundStyle="secondaryLabel">
              刷新间隔：小组件自动刷新的时间间隔（分钟），建议不小于15分钟{"\n"}
              自动开启盲盒：小组件刷新时自动开启所有可开启的盲盒
            </Text>
          }
        >
          <HStack padding={16} spacing={12} alignment="center">
            <ZStack frame={{ width: 32, height: 32 }}><Circle fill="systemIndigo" opacity={0.15} /><Image systemName="clock.arrow.2.circlepath" foregroundStyle="systemIndigo" font={16} /></ZStack>
            <VStack alignment="leading" spacing={2} frame={{ maxWidth: "infinity" }}>
              <HStack alignment="center">
                <Text fontWeight="bold">刷新间隔 (分钟)</Text>
                <Spacer />
                <Text font="caption2" foregroundStyle="secondaryLabel">当前: {refreshInterval}</Text>
              </HStack>
              <TextField
                label={<Text>{""}</Text>}
                value={String(refreshInterval)}
                onChanged={(v) => setRefreshInterval(Number(v) || 15)}
                keyboardType="numberPad"
                frame={{ maxWidth: 'infinity' }}
              />
            </VStack>
          </HStack>
          
          <HStack padding={16} spacing={12} alignment="center">
            <ZStack frame={{ width: 32, height: 32 }}><Circle fill="systemPink" opacity={0.15} /><Image systemName="calendar.badge.clock" foregroundStyle="systemPink" font={16} /></ZStack>
            <VStack alignment="leading" spacing={4} frame={{ maxWidth: "infinity" }}>
              <Toggle
                title="自动签到"
                value={autoSign}
                onChanged={setAutoSign}
              />
              {autoSign && (
                <TextField
                  label={<Text>{""}</Text>}
                  value={autoSignTime}
                  onChanged={setAutoSignTime}
                  prompt="签到时间 (例如 08:30)"
                  frame={{ maxWidth: 'infinity' }}
                />
              )}
            </VStack>
          </HStack>
          
          <HStack padding={16} spacing={12} alignment="center">
            <ZStack frame={{ width: 32, height: 32 }}><Circle fill="systemYellow" opacity={0.15} /><Image systemName="gift.fill" foregroundStyle="systemYellow" font={16} /></ZStack>
            <VStack alignment="leading" spacing={0} frame={{ maxWidth: "infinity" }}>
              <Toggle
                title="自动开启盲盒"
                value={autoOpenBlindBox}
                onChanged={setAutoOpenBlindBox}
              />
            </VStack>
          </HStack>
        </Section>

      </List>
    </NavigationStack>
      <VStack frame={{ maxWidth: "infinity", maxHeight: "infinity" }} padding={20}>
        <Spacer />
        <HStack frame={{ maxWidth: "infinity" }}>
          <Spacer />
          <Button action={handleAbout}>
            <ZStack frame={{ width: 44, height: 44 }}>
              <Circle fill="#333333" />
              <Image systemName="info.circle.fill" font={24} foregroundStyle="white" />
            </ZStack>
          </Button>
          <Spacer />
        </HStack>
      </VStack>
    </ZStack>
  )
}

type AppProps = { interactiveDismissDisabled?: boolean }
export default function App(_props: AppProps) {
  return <SettingsView />
}

function readFullscreenPrefForRun(): boolean {
  try {
    const v = Storage.get(FULLSCREEN_KEY)
    if (typeof v === "boolean") return v
  } catch { }
  return true
}

async function run() {
  const fullscreen = readFullscreenPrefForRun()
  await Navigation.present({
    element: <App interactiveDismissDisabled />,
    ...(fullscreen ? { modalPresentationStyle: "fullScreen" } : {}),
  })
  Script.exit()
}

run()