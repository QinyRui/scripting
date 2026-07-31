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
  Path,
  Markdown,
  useState,
  useEffect,
  useObservable,
  Color,
  HStack,
  Spacer,
  fetch,
  VStack,
  Divider,
  ZStack,
  Circle,
  Capsule,
  Image,
  ScrollView,
  ProgressView,
  Notification,
  Rectangle,
  Widget
} from "scripting"

import { getNinebotInfo, autoOpenBlindBoxes, getOpenableBlindBoxes, receiveBlindBox, getAllTasks, getTaskList, TASK_CATEGORY_LABELS, type NinebotWidgetData, type TaskInfo } from "./api"
import { BlindBoxCeremony, GuideGesture, CeremonyTitle, BB } from "./utils/BlindBoxVisuals"
import { useReleaseNotesSheet } from "./components/what-is-new"


declare const Storage: any
declare const Dialog: any
declare const Safari: any
declare const Pasteboard: any
declare const UIImage: any


// ==================== 应用 Logo ====================
// 使用当前项目 photos 目录下的真实品牌 logo（紫底抽象"7"形）
const LOGO_PATH = "/var/mobile/Library/Mobile Documents/iCloud~com~thomfang~Scripting/Documents/scripts/九号APP签到/photos/ninebot-logo-new.jpg"
const logoImage = UIImage.fromFile(LOGO_PATH)

// 顶部品牌区固定尺寸（与原本 emoji 圆形视觉权重对齐）
const HERO_LOGO_SIZE = 96

// ==================== 版本信息 ====================
const VERSION = "2.2.1"
const BUILD_DATE = "2026-07-31"


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
  // 成就数据（排行榜API所需）
  achievementUid: string
  achievementVehicleType: string
  achievementWnumber: string
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
  achievementUid: "",
  achievementVehicleType: "",
  achievementWnumber: "",
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
    const uidUrl = baseUrl + "/query/data/ninebot.achievementUid"
    const vtypeUrl = baseUrl + "/query/data/ninebot.achievementVehicleType"
    const wnumberUrl = baseUrl + "/query/data/ninebot.achievementWnumber"
    const authUrl = baseUrl + "/query/data/ninebot.authorization"
    const deviceUrl = baseUrl + "/query/data/ninebot.deviceId"
    
    console.log("📡 从 BoxJs 同步鉴权 + 成就数据")
    
    const fetchVal = async (url: string) => {
      try {
        const r = await fetch(url, {
          method: "GET",
          headers: { "Accept": "application/json", "Referer": baseUrl },
          timeout: 10000
        })
        if (!r.ok) return ""
        const d = JSON.parse(await r.text())
        return d?.val || d?.value || d?.data || ""
      } catch { return "" }
    }

    const [authorization, deviceId, uid, vtype, wnumber] = await Promise.all([
      fetchVal(authUrl),
      fetchVal(deviceUrl),
      fetchVal(uidUrl),
      fetchVal(vtypeUrl),
      fetchVal(wnumberUrl),
    ])

    console.log("  authorization:", authorization ? "✅" : "❌")
    console.log("  deviceId:", deviceId ? "✅" : "❌")
    console.log("  uid:", uid ? "✅" : "❌")
    console.log("  vehicleType:", vtype ? "✅" : "❌")
    console.log("  wnumber:", wnumber ? "✅" : "❌")

    if (!authorization || !deviceId) {
      const missing = []
      if (!authorization) missing.push("authorization")
      if (!deviceId) missing.push("deviceId")
      throw new Error("BoxJs 中未找到 " + missing.join(" 和 "))
    }

    console.log("✅ 同步成功")
    return { 
      success: true, 
      authorization, 
      deviceId,
      achievementUid: uid,
      achievementVehicleType: vtype,
      achievementWnumber: wnumber,
      message: "成功从 BoxJs 同步鉴权 + 成就数据"
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
// ==================== HomeQuickButton ====================
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

// ==================== 盲盒页面组件 ====================

type BlindBoxInfo = {
  id?: number | string
  awardDays: number
  leftDaysToOpen: number
  status?: number
  [k: string]: any
}

function BlindBoxRow({ box, status }: { box: BlindBoxInfo; status: "ready" | "waiting" }) {
  const isReady = status === "ready"
  const accent = isReady ? "#FF9500" : "#8E8E93"
  return (
    <HStack
      background={{ style: "secondarySystemGroupedBackground", shape: { type: "rect", cornerRadius: 14 } }}
      padding={14}
      spacing={12}
      alignment="center"
      frame={{ maxWidth: "infinity" }}
    >
      <ZStack frame={{ width: 44, height: 44 }}>
        <Circle fill={accent} opacity={0.15} />
        <Image
          systemName={isReady ? "gift.fill" : "lock.fill"}
          font={22}
          foregroundStyle={accent}
        />
      </ZStack>
      <VStack spacing={2} frame={{ maxWidth: "infinity" }}>
        <Text fontWeight="semibold" foregroundStyle="label">{box.awardDays} 天签到盲盒</Text>
        <Text font="caption" foregroundStyle="secondaryLabel">
          {isReady ? "已可领取" : `还剩 ${box.leftDaysToOpen} 天冷却`}
        </Text>
      </VStack>
      {isReady ? (
        <HStack padding={{ horizontal: 10, vertical: 4 }} background={{ style: "#FF9500", shape: { type: "rect", cornerRadius: 8 } }}>
          <Text font="caption2" fontWeight="bold" foregroundStyle="white">READY</Text>
        </HStack>
      ) : (
        <Text font="caption" fontWeight="medium" foregroundStyle="tertiaryLabel">D-{box.leftDaysToOpen}</Text>
      )}
    </HStack>
  )
}

function BlindBoxView({ onBack }: { onBack: () => void }) {
  const dismiss = Navigation.useDismiss()
  const [data, setData] = useState<NinebotWidgetData | null>(null)
  const [loading, setLoading] = useState(true)
  const [opening, setOpening] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const auth = (Storage.get("ninebot.authorization") as string) || ""
  const deviceId = (Storage.get("ninebot.deviceId") as string) || ""
  const hasAuth = !!auth && !!deviceId

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getNinebotInfo(auth, deviceId)
      setData(result)
    } catch (e: any) {
      setError(e?.message || String(e) || "加载失败，请检查网络或重新同步鉴权")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (hasAuth) loadData()
    else { setLoading(false); setError("未配置 authorization 与 deviceId，请先在设置页同步") }
  }, [])

  const handleOpenAll = async () => {
    if (opening || !data) return
    setOpening(true)
    try {
      const result = { total: readyBoxes.length, openSuccess: 0, receiveSuccess: 0, failed: 0, rewards: [] as any[], errors: [] as string[] }

      for (const box of readyBoxes) {
        // 直接使用 blindBoxIds[0] 作为 rewardId 调用 /receive（/open 端点已下线）
        const rewardId = box.blindBoxIds?.[0] || ''
        console.log(`📦 领取盲盒 (${box.awardDays}天): blindBoxId=${rewardId}`)

        if (!rewardId) {
          result.failed++
          result.errors.push(`盲盒 (${box.awardDays}天): 无 blindBoxId`)
          console.log(`❌ 盲盒 (${box.awardDays}天) blindBoxIds 为空`, JSON.stringify(box))
          continue
        }

        result.openSuccess++
        const recvResult = await receiveBlindBox(auth, deviceId, rewardId)
        if (recvResult.success) {
          result.receiveSuccess++
          result.rewards.push({ awardDays: box.awardDays || 0, rewardId, reward: recvResult.reward })
          console.log(`✅ 盲盒领取成功! reward=${JSON.stringify(recvResult.reward)}`)
        } else {
          result.failed++
          result.errors.push(`领取失败 (${box.awardDays}天): ${recvResult.message}`)
          console.log(`❌ 盲盒领取失败: ${recvResult.message}`)
        }
        await new Promise<void>((r) => setTimeout(() => r(), 1000))
      }

      // 奖励描述
      const rewardLines = (result.rewards || []).map((r: any) => {
        const reward = r.reward
        if (reward?.rewardType === 1) return `${r.awardDays}天盲盒 · +${reward.rewardValue} 等级经验`
        if (reward?.rewardType === 2) return `${r.awardDays}天盲盒 · +${reward.rewardValue} N币`
        return `${r.awardDays}天盲盒 · +${reward?.rewardValue || 0} 奖励`
      })
      const summary = [
        `成功领取 ${result.receiveSuccess} 个盲盒`,
        ...rewardLines,
        result.failed > 0 ? `失败 ${result.failed} 个` : "",
        // 展示具体错误原因，方便排查
        ...result.errors.map((e: string) => `• ${e}`),
      ].filter(Boolean).join("\n")
      Dialog.alert({ title: result.receiveSuccess > 0 ? "🎁 开启完成" : "⚠️ 开启异常", message: summary })

      // 清除已通知记录
      try { Storage.set("ninebot.lastNotifiedReadyBoxIds", []) } catch { }
      // 刷新数据
      await loadData()
    } catch (e: any) {
      Dialog.alert({ title: "开启失败", message: e?.message || String(e) })
    } finally {
      setOpening(false)
    }
  }

  const readyBoxes: BlindBoxInfo[] = (data?.notOpenedBoxesDetail || []).filter(b => b.leftDaysToOpen === 0)
  const waitingBoxes: BlindBoxInfo[] = (data?.notOpenedBoxesDetail || []).filter(b => b.leftDaysToOpen > 0)
  const openedCount = (data as any)?.openedBlindBoxCount ?? 0

  // 盒盖浮动动画相位（每次渲染时从 Date.now() 计算，无需 setInterval）
  const capPhase = readyBoxes.length > 0 && !opening
    ? ((Date.now() % 2000) / 2000)
    : 0

  return (
    <VStack frame={{ maxWidth: "infinity", maxHeight: "infinity" }} background="systemGroupedBackground">
      {/* 顶部导航栏（固定在屏幕最上方） */}
      <HStack
        background="systemBackground"
        padding={{ horizontal: 16, vertical: 10 }}
        alignment="center"
        frame={{ maxWidth: "infinity" }}
      >
        <Button action={onBack}>
          <HStack spacing={4} padding={{ horizontal: 10, vertical: 6 }}>
            <Image systemName="chevron.left" font={14} foregroundStyle="systemBlue" fontWeight="semibold" />
            <Text foregroundStyle="systemBlue" fontWeight="medium">返回</Text>
          </HStack>
        </Button>
        <Spacer />
        <Text font="headline" fontWeight="bold">盲盒管理</Text>
        <Spacer />
        <Button action={loading ? () => {} : loadData}>
          <HStack padding={{ horizontal: 10, vertical: 6 }}>
            <Image
              systemName={loading ? "arrow.triangle.2.circlepath" : "arrow.clockwise"}
              font={14}
              foregroundStyle={loading ? "tertiaryLabel" : "systemBlue"}
            />
          </HStack>
        </Button>
      </HStack>
      <Divider />

      <ScrollView
        frame={{ maxWidth: "infinity", maxHeight: "infinity" }}
      >
        <VStack spacing={16} padding={16}>
          {loading && !data ? (
            <VStack alignment="center" padding={40} spacing={12}>
              <ProgressView />
              <Text foregroundStyle="secondaryLabel" font="subheadline">加载中…</Text>
            </VStack>
          ) : error ? (
            <VStack alignment="center" padding={40} spacing={12}>
              <ZStack frame={{ width: 72, height: 72 }}>
                <Circle fill="#FF9500" opacity={0.15} />
                <Image systemName="exclamationmark.triangle.fill" font={36} foregroundStyle="systemOrange" />
              </ZStack>
              <Text fontWeight="semibold" font={17}>出错了</Text>
              <Text foregroundStyle="secondaryLabel" multilineTextAlignment="center" font="subheadline">{error}</Text>
              <Button action={loadData}>
                <HStack padding={{ horizontal: 20, vertical: 10 }} background={{ style: "systemFill", shape: { type: "rect", cornerRadius: 10 } }}>
                  <Text foregroundStyle="systemBlue" fontWeight="semibold">重试</Text>
                </HStack>
              </Button>
            </VStack>
          ) : !data ? null : (
            <>
              {/* === 仪式感区域：中央盲盒 + 大标题 + 引导手势 === */}
              <VStack
                frame={{ maxWidth: "infinity" }}
                padding={20}
                spacing={16}
                background={{ style: "systemBackground", shape: { type: "rect", cornerRadius: 16 } }}
                alignment="center"
              >
                {/* 大标题 */}
                <VStack alignment="center" spacing={4} frame={{ maxWidth: "infinity" }}>
                  {/* @ts-ignore - CommonViewProps fontSize/fontWeight/foregroundStyle on Text */}
                  <Text font={22} fontWeight="bold" foregroundStyle="label">
                    {opening ? "开启中…" : readyBoxes.length > 0 ? "开启你的盲盒" : "今日盲盒"}
                  </Text>
                  {/* @ts-ignore - CommonViewProps fontSize/foregroundStyle on Text */}
                  <Text font={13} foregroundStyle="secondaryLabel">
                    {opening 
                      ? `正在领取 ${readyBoxes.length} 个盲盒` 
                      : readyBoxes.length > 0 
                        ? `有 ${readyBoxes.length} 个盲盒等待开启` 
                        : "继续签到累积盲盒"
                    }
                  </Text>
                </VStack>

                {/* 中央盲盒主体（带光晕与浮动盒盖）*/}
                {opening ? (
                  <VStack alignment="center" spacing={10} padding={{ vertical: 40 }}>
                    <ProgressView />
                  </VStack>
                ) : (
                  <BlindBoxCeremony
                    isReady={readyBoxes.length > 0}
                    size={160}
                    capPhase={capPhase}
                  />
                )}

                {/* 引导手势 / 状态提示 */}
                {opening ? null : readyBoxes.length > 0 ? (
                  <GuideGesture label="点击下方按钮一键开启" />
                ) : (
                  <HStack
                    spacing={6}
                    alignment="center"
                    padding={{ horizontal: 12, vertical: 6 }}
                    background={{ style: BB.primarySoft, shape: { type: "rect", cornerRadius: 12 } }}
                  >
                    {/* @ts-ignore - CommonViewProps foregroundStyle/font on Image */}
                    <Image systemName="lock.fill" font={12} foregroundStyle={BB.primary} />
                    {/* @ts-ignore - CommonViewProps foregroundStyle/font on Text */}
                    <Text font={12} foregroundStyle={BB.primary}>签到累积更多盲盒</Text>
                  </HStack>
                )}
              </VStack>

              {/* 概览统计卡 */}
              <ZStack
                frame={{ maxWidth: "infinity" }}
                padding={20}
                background={{ style: "systemBackground", shape: { type: "rect", cornerRadius: 16 } }}
              >
                <HStack alignment="center" spacing={0} frame={{ maxWidth: "infinity" }}>
                  <VStack alignment="center" spacing={4} frame={{ maxWidth: "infinity" }}>
                    <Text font="title" fontWeight="bold" foregroundStyle="label">{data.notOpenedBlindBoxCount}</Text>
                    <Text font="caption" foregroundStyle="secondaryLabel">待开启</Text>
                  </VStack>
                  <Rectangle frame={{ width: 1, height: 36 }} foregroundStyle="separator" />
                  <VStack alignment="center" spacing={4} frame={{ maxWidth: "infinity" }}>
                    <Text font="title" fontWeight="bold" foregroundStyle="systemOrange">{readyBoxes.length}</Text>
                    <Text font="caption" foregroundStyle="secondaryLabel">可领取</Text>
                  </VStack>
                  <Rectangle frame={{ width: 1, height: 36 }} foregroundStyle="separator" />
                  <VStack alignment="center" spacing={4} frame={{ maxWidth: "infinity" }}>
                    <Text font="title" fontWeight="bold" foregroundStyle="label">{openedCount}</Text>
                    <Text font="caption" foregroundStyle="secondaryLabel">已开启</Text>
                  </VStack>
                </HStack>
              </ZStack>

              {/* 主操作按钮 */}
              {readyBoxes.length > 0 ? (
                <Button action={opening ? () => {} : handleOpenAll}>
                  <ZStack
                    frame={{ maxWidth: "infinity" }}
                    padding={16}
                    background={{ style: "systemOrange", shape: { type: "rect", cornerRadius: 16 } }}
                    alignment="center"
                  >
                    {opening && (
                      <HStack frame={{ maxWidth: "infinity", maxHeight: "infinity" }} alignment="center" opacity={0.4}>
                        <ProgressView />
                      </HStack>
                    )}
                    <HStack spacing={8} alignment="center">
                      <Image systemName={opening ? "hourglass" : "gift.fill"} font={18} foregroundStyle="white" />
                      <Text foregroundStyle="white" fontWeight="bold" font={17}>
                        {opening ? "开启中…" : `一键开启 ${readyBoxes.length} 个盲盒`}
                      </Text>
                    </HStack>
                  </ZStack>
                </Button>
              ) : (
                <HStack
                  frame={{ maxWidth: "infinity" }}
                  padding={16}
                  background={{ style: "secondarySystemGroupedBackground", shape: { type: "rect", cornerRadius: 16 } }}
                  alignment="center"
                  spacing={12}
                >
                  <ZStack frame={{ width: 40, height: 40 }}>
                    <Circle fill="#34C759" opacity={0.15} />
                    <Image systemName="checkmark.seal.fill" font={22} foregroundStyle="systemGreen" />
                  </ZStack>
                  <VStack spacing={2} frame={{ maxWidth: "infinity" }}>
                    <Text fontWeight="semibold" foregroundStyle="label">暂无可领取的盲盒</Text>
                    <Text font="caption" foregroundStyle="secondaryLabel">继续每日签到累积更多盲盒</Text>
                  </VStack>
                </HStack>
              )}

              {/* 可领取列表 */}
              {readyBoxes.length > 0 && (
                <VStack spacing={10} frame={{ maxWidth: "infinity" }}>
                  <HStack padding={{ horizontal: 4 }}>
                    <Text font="subheadline" fontWeight="semibold" foregroundStyle="secondaryLabel">可领取</Text>
                    <Spacer />
                    <Text font="caption" foregroundStyle="tertiaryLabel">{readyBoxes.length} 个</Text>
                  </HStack>
                  <VStack spacing={8}>
                    {readyBoxes.map((box, idx) => (
                      <BlindBoxRow key={`r-${box.id ?? idx}`} box={box} status="ready" />
                    ))}
                  </VStack>
                </VStack>
              )}

              {/* 冷却中列表 */}
              {waitingBoxes.length > 0 && (
                <VStack spacing={10} frame={{ maxWidth: "infinity" }}>
                  <HStack padding={{ horizontal: 4 }}>
                    <Text font="subheadline" fontWeight="semibold" foregroundStyle="secondaryLabel">冷却中</Text>
                    <Spacer />
                    <Text font="caption" foregroundStyle="tertiaryLabel">{waitingBoxes.length} 个</Text>
                  </HStack>
                  <VStack spacing={8}>
                    {waitingBoxes.map((box, idx) => (
                      <BlindBoxRow key={`w-${box.id ?? idx}`} box={box} status="waiting" />
                    ))}
                  </VStack>
                </VStack>
              )}

              {/* 奖励历史 */}
              {(() => {
                const calInfo = data?.calendarInfo || []
                const now = Date.now()
                const oneMonthMs = 30 * 24 * 60 * 60 * 1000
                const recentRewards = calInfo.filter(entry => {
                  if (!entry.rewardInfo) return false
                  const age = now - entry.timestamp
                  return age >= 0 && age <= oneMonthMs
                })
                if (recentRewards.length === 0) return null
                return (
                  <VStack spacing={10} frame={{ maxWidth: "infinity" }}>
                    <HStack padding={{ horizontal: 4 }}>
                      {/* @ts-ignore */}
                      <Text font="subheadline" fontWeight="semibold" foregroundStyle="secondaryLabel">最近奖励</Text>
                      <Spacer />
                      {/* @ts-ignore */}
                      <Text font="caption" foregroundStyle="tertiaryLabel">{recentRewards.length} 条</Text>
                    </HStack>
                    <VStack spacing={6}>
                      {recentRewards.map((entry, idx) => {
                        const d = new Date(entry.timestamp)
                        const dateStr = (d.getMonth() + 1) + "/" + d.getDate()
                        const r = entry.rewardInfo!
                        const isExp = r.rewardType === 1
                        const accent = isExp ? "#BF5AF2" : "#34C759"
                        const icon = isExp ? "star.fill" : "n.circle.fill"
                        const rewardName = isExp ? "经验" : "N币"
                        const received = r.receiveStatus === 2
                        return (
                          <HStack
                            key={"reward-" + idx}
                            alignment="center"
                            spacing={10}
                            frame={{ maxWidth: "infinity" }}
                            padding={{ horizontal: 12, vertical: 10 }}
                            background={{ style: "secondarySystemGroupedBackground", shape: { type: "rect", cornerRadius: 10 } }}
                          >
                            <ZStack frame={{ width: 32, height: 32 }} alignment="center">
                              <Circle fill={accent} frame={{ width: 32, height: 32 }} opacity={0.15} />
                              {/* @ts-ignore */}
                              <Image systemName={icon} font={16} foregroundStyle={{ color: accent, opacity: 1 }} />
                            </ZStack>
                            <VStack spacing={1} frame={{ maxWidth: "infinity" }}>
                              {/* @ts-ignore */}
                              <Text font={13} fontWeight="semibold" foregroundStyle="label">
                                {r.days + "天签到盲盒"}
                              </Text>
                              {/* @ts-ignore */}
                              <Text font={11} foregroundStyle="secondaryLabel">
                                {dateStr + " · +" + r.rewardValue + " " + rewardName}
                              </Text>
                            </VStack>
                            {/* @ts-ignore */}
                            <Text font={11} fontWeight="semibold" foregroundStyle={{ color: received ? "#34C759" : "#FF9500", opacity: 1 }}>
                              {received ? "已领" : "待领"}
                            </Text>
                          </HStack>
                        )
                      })}
                    </VStack>
                  </VStack>
                )
              })()}

              {/* 底部提示 */}
              <HStack
                frame={{ maxWidth: "infinity" }}
                padding={{ horizontal: 14, vertical: 12 }}
                background={{ style: "secondarySystemGroupedBackground", shape: { type: "rect", cornerRadius: 12 } }}
                spacing={10}
                alignment="center"
              >
                <Image systemName="info.circle" font={16} foregroundStyle="tertiaryLabel" />
                <Text font="caption" foregroundStyle="secondaryLabel" multilineTextAlignment="leading" frame={{ maxWidth: "infinity" }}>
                  盲盒会从当日签到起开始计时，到期后变更为“READY”状态，可手动开启或开启自动领取。
                </Text>
              </HStack>
            </>
          )}
        </VStack>
      </ScrollView>
    </VStack>
  )
}

function SettingsView({ onOpenBlindBox }: { onOpenBlindBox?: () => void }) {
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
  const achievementUidObs = useObservable(initial.achievementUid || Storage.get("ninebot.uid") || " ")
  const achievementVehicleTypeObs = useObservable(initial.achievementVehicleType || Storage.get("ninebot.vehicleType") || " ")
  const achievementWnumberObs = useObservable(initial.achievementWnumber || Storage.get("ninebot.wnumber") || " ")
  const [testing, setTesting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [tasks, setTasks] = useState<TaskInfo[]>([])
  const [tasksLoading, setTasksLoading] = useState(false)

  // 加载每日任务（多 typeCode 合并）
  const loadTasks = async () => {
    if (!authorization || !deviceId) {
      console.log("任务跳过: 无鉴权信息")
      return
    }
    setTasksLoading(true)
    try {
      console.log("开始加载每日任务（多类型）...")
      const list = await getAllTasks(authorization, deviceId)
      console.log("任务加载成功:", list.length, "个")
      setTasks(list)
    } catch (e) {
      console.log("任务加载失败:", e)
    } finally {
      setTasksLoading(false)
    }
  }

  useEffect(() => {
    console.log("SettingsView mount, auth:", !!authorization, "device:", !!deviceId)
    if (authorization && deviceId) loadTasks()
  }, [authorization, deviceId])

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
      achievementUid: (achievementUidObs.value || "").trim(),
      achievementVehicleType: (achievementVehicleTypeObs.value || "").trim(),
      achievementWnumber: (achievementWnumberObs.value || "").trim(),
    }

    Storage.set(SETTINGS_KEY, newSettings)
    Storage.set("ninebot.authorization", newSettings.authorization)
    Storage.set("ninebot.deviceId", newSettings.deviceId)
    Storage.set("ninebot.userAgent", newSettings.userAgent)
    // 成就数据存储
    Storage.set("ninebot.uid", newSettings.achievementUid)
    Storage.set("ninebot.vehicleType", newSettings.achievementVehicleType)
    Storage.set("ninebot.wnumber", newSettings.achievementWnumber)
    
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
        if (result.achievementUid) achievementUidObs.setValue(result.achievementUid)
        if (result.achievementVehicleType) achievementVehicleTypeObs.setValue(result.achievementVehicleType)
        if (result.achievementWnumber) achievementWnumberObs.setValue(result.achievementWnumber)
        
        await Dialog.alert({
          title: "✅ 同步成功",
          message: `${result.message}\n\n已自动填充到下方输入框\n请点击右上角\"完成\"按钮保存配置`,
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
                  <Text font="subheadline" fontWeight="medium" foregroundStyle="label">保存</Text>
                </HStack>
              </Button>
            </HStack>,
          ],
        }}
      >
        {/* ==================== 顶部视觉区域 ==================== */}
        <Section>
          <VStack spacing={24} padding={{ vertical: 20 }}>
            {/* 应用 Logo 和标题 */}
            <VStack spacing={16} alignment="center">
              {logoImage ? (
                // 用 Circle 作为 mask 将方形 logo 图片裁剪为圆形，并增加紫色发光阴影
                <Image
                  image={logoImage}
                  resizable={true}
                  // @ts-ignore
                  frame={{ width: HERO_LOGO_SIZE, height: HERO_LOGO_SIZE }}
                  // @ts-ignore
                  mask={<Circle />}
                  // @ts-ignore
                  shadow={{ color: "#9B7BD8", radius: 18, x: 0, y: 8 }}
                />
              ) : (
                // Logo 文件缺失时的降级方案：保留原本的 emoji 圆形
                <ZStack frame={{ width: HERO_LOGO_SIZE, height: HERO_LOGO_SIZE }}>
                  <Circle fill={{ colors: ["#4facfe", "#00f2fe"], startPoint: "top", endPoint: "bottom" }} />
                  <Text font={48}>🛴</Text>
                </ZStack>
              )}
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
                subtitle="点击安装与同步" 
                action={openBoxJsSubscription} 
                tint="systemBlue" 
              />
              <HomeQuickButton 
                icon="puzzlepiece.extension" 
                title="Loon 插件" 
                subtitle="点击安装与使用" 
                action={installLoonPlugin} 
                tint="systemPurple" 
              />
            </HStack>
            <HStack spacing={0} alignment="top" frame={{ maxWidth: "infinity" }}>
              <HomeQuickButton 
                icon="rectangle.split.2x2" 
                title="预览中号组件" 
                subtitle="systemMedium" 
                action={async () => {
                  try {
                    await Widget.preview({ family: "systemMedium" })
                  } catch (e: any) {
                    Dialog.alert({ title: "预览失败", message: String(e) })
                  }
                }} 
                tint="systemIndigo" 
              />
              <HomeQuickButton 
                icon="rectangle.split.3x3" 
                title="预览大号组件" 
                subtitle="systemLarge" 
                action={async () => {
                  try {
                    await Widget.preview({ family: "systemLarge" })
                  } catch (e: any) {
                    Dialog.alert({ title: "预览失败", message: String(e) })
                  }
                }} 
                tint="systemTeal" 
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
              <Text font="caption" foregroundStyle="tertiaryLabel">
                下方三项用于排行榜API，可从BoxJS同步或手动填写
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

          <HStack padding={16} spacing={12} alignment="center">
            <ZStack frame={{ width: 32, height: 32 }}>
              <Circle fill="systemBlue" opacity={0.15} />
              <Image systemName="person.circle.fill" foregroundStyle="systemBlue" font={16} />
            </ZStack>
            <VStack alignment="leading" spacing={2} frame={{ maxWidth: "infinity" }}>
              <Text fontWeight="bold">用户ID (uid)</Text>
              <TextField value={achievementUidObs} label={<Text>{" "}</Text>} prompt="排行榜API所需" />
            </VStack>
          </HStack>

          <HStack padding={16} spacing={12} alignment="center">
            <ZStack frame={{ width: 32, height: 32 }}>
              <Circle fill="systemGreen" opacity={0.15} />
              <Image systemName="car.fill" foregroundStyle="systemGreen" font={16} />
            </ZStack>
            <VStack alignment="leading" spacing={2} frame={{ maxWidth: "infinity" }}>
              <Text fontWeight="bold">车型编号</Text>
              <TextField value={achievementVehicleTypeObs} label={<Text>{" "}</Text>} prompt="排行榜API所需" />
            </VStack>
          </HStack>

          <HStack padding={16} spacing={12} alignment="center">
            <ZStack frame={{ width: 32, height: 32 }}>
              <Circle fill="systemPurple" opacity={0.15} />
              <Image systemName="number" foregroundStyle="systemPurple" font={16} />
            </ZStack>
            <VStack alignment="leading" spacing={2} frame={{ maxWidth: "infinity" }}>
              <Text fontWeight="bold">设备序列号 (wnumber)</Text>
              <TextField value={achievementWnumberObs} label={<Text>{" "}</Text>} prompt="排行榜API所需" />
            </VStack>
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

          {onOpenBlindBox ? (
            <HStack
              padding={16}
              spacing={12}
              alignment="center"
              onTapGesture={onOpenBlindBox}
            >
              <ZStack frame={{ width: 32, height: 32 }}>
                <Circle fill="systemOrange" opacity={0.15} />
                <Image systemName="gift.circle.fill" foregroundStyle="systemOrange" font={18} />
              </ZStack>
              <VStack alignment="leading" spacing={2}>
                <Text fontWeight="semibold" foregroundStyle="label">盲盒管理</Text>
                <Text font="caption" foregroundStyle="secondaryLabel">查看待开盲盒、一键领取</Text>
              </VStack>
              <Spacer />
              <Image systemName="chevron.right" font={14} foregroundStyle="tertiaryLabel" fontWeight="semibold" />
            </HStack>
          ) : null}
        </Section>


        {/* ==================== 每日任务 ==================== */}
        {tasks.length > 0 ? (
          <Section header={<Text font="headline">每日任务</Text>}
            footer={<Text font="footnote" foregroundStyle="secondaryLabel">共 {tasks.length} 个任务，{tasks.filter(t => t.rewardStatus === 3).length} 个已完成</Text>}
          >
            {tasks.map((task) => (
              <HStack key={task.taskId} padding={16} spacing={12} alignment="center" frame={{ maxWidth: "infinity" }}>
                <ZStack frame={{ width: 32, height: 32 }}>
                  <Circle fill={task.rewardStatus === 3 ? "systemGreen" : "systemBlue"} opacity={0.15} />
                  <Image systemName={task.rewardStatus === 3 ? "checkmark.circle.fill" : "circle.dashed"} foregroundStyle={task.rewardStatus === 3 ? "systemGreen" : "systemBlue"} font={16} />
                </ZStack>
                <VStack alignment="leading" spacing={2} frame={{ maxWidth: "infinity" }}>
                  <Text fontWeight="semibold" foregroundStyle="label" multilineTextAlignment="leading">{task.title}</Text>
                  <HStack spacing={6}>
                    <Text font="caption2" foregroundStyle="systemBlue">{TASK_CATEGORY_LABELS[task.taskCategory] || "其他"}</Text>
                    <Text font="caption" foregroundStyle="secondaryLabel" multilineTextAlignment="leading">{task.rewardDescription}</Text>
                  </HStack>
                </VStack>
                <Text font="caption" foregroundStyle={task.rewardStatus === 3 ? "systemGreen" : "secondaryLabel"}>
                  {task.rewardStatus === 3 ? "✅" : "❌"}
                </Text>
              </HStack>
            ))}
          </Section>
        ) : tasksLoading ? (
          <Section header={<Text font="headline">每日任务</Text>}>
            <HStack padding={16} alignment="center" frame={{ maxWidth: "infinity" }}>
              <Spacer />
              <Text font="subheadline" foregroundStyle="secondaryLabel">加载中...</Text>
              <Spacer />
            </HStack>
          </Section>
        ) : null}

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

// 根据启动原因（点击通知 / 手动启动）决定首屏
function getInitialView(): "settings" | "blindbox" {
  try {
    const notif = Notification.current
    const type = (notif?.userInfo as any)?.type
    if (type === "blindbox_ready" || type === "blindbox") {
      return "blindbox"
    }
  } catch { }
  return "settings"
}

export default function App(_props: AppProps) {
  const [view, setView] = useState<"settings" | "blindbox">(getInitialView)
  const releaseNotes = useReleaseNotesSheet()

  return (
    <NavigationStack sheet={releaseNotes.sheet}>
      {view === "blindbox" ? (
        <BlindBoxView onBack={() => setView("settings")} />
      ) : (
        <SettingsView onOpenBlindBox={() => setView("blindbox")} />
      )}
    </NavigationStack>
  )
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