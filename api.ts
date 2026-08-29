import { httpGet, httpPost } from './utils/request'

// 定义小组件展示的数据结构
export interface NinebotWidgetData {
  isSigned: boolean
  nCoin: number
  experience: number
  level: number
  consecutiveDays: number
  signCardsNum: number
  blindBoxCount: number
  notOpenedBlindBoxCount: number
  openedBlindBoxCount: number
  minLeftDaysToOpen: number | null
  // 新增详细盲盒信息
  notOpenedBoxesDetail: Array<{
    awardDays: number
    leftDaysToOpen: number
    rewardStatus: number
  }>
  openedBoxesDetail: Array<{
    awardDays: number
    openedTime: string
  }>
  // 日历奖励信息（来自签到状态 API）
  calendarInfo: Array<{
    sign: number           // 1=已签, 2=未签
    timestamp: number      // 日期时间戳(ms)
    supplementStatus: number
    rewardInfo?: {
      blindBoxType: number
      receiveStatus: number // 1=未领取, 2=已领取
      rewardValue: number
      rewardType: number    // 1=经验, 2=N币
      days: number
      rewardId: string
    }
  }>
  // 成就数据（来自排行 API）
  achievement: AchievementInfo | null
  // token 过期标记（经验/成就 API 返回 401903 时设置）
  tokenExpired: boolean
}

// 盲盒信息
export interface BlindBoxInfo {
  id: string
  blindBoxIds?: string[]
  leftDaysToOpen: number
  status: number
  type: number
  rewardStatus?: number
  awardDays?: number
}

// 任务中心 - 每日任务
export interface TaskInfo {
  taskId: string
  title: string
  description: string
  subTitle: string
  rewardDescription: string
  rewardQuantity: number
  rewardStatus: number  // 1=未完成, 3=已完成
  taskCategory: number  // 1=完善资料, 3=车辆激活, 7=内容点赞
  bannerUrl: string
  url: string
  startTime: number
  endTime: number
}

// 从抓包中获取的 appVersion (用于 balance 接口)
const APP_VERSION = "609113620"

// 九号电动车接口地址
// 成就信息接口
export interface AchievementInfo {
  avatar: string
  co2: string            // 减碳量
  continuous_days: string // 连续骑行天数
  cost_saving: string    // 节省费用
  mileage: string        // 今日里程(km)
  odometer: string       // 总里程(km)
  rank: string           // 排名
  save_fuel: number      // 节省燃油
  title: string          // 标题
  total_days: string     // 累计骑行天数
  uid: string
  vehicle_name: string   // 车型名称
  vehicle_type: string   // 车型编号
  wnumber: string        // 车架号
  nickname: string
  username: string
}

const API_ENDPOINTS = {
  signStatus: `https://cn-cbu-gateway.ninebot.com/portal/api/user-sign/v2/status?t=${Date.now()}`, 
  sign: `https://cn-cbu-gateway.ninebot.com/portal/api/user-sign/v2/sign?t=${Date.now()}`,
  calendar: `https://cn-cbu-gateway.ninebot.com/portal/api/user-sign/v2/calendar?t=${Date.now()}`,
  balance: `https://cn-cbu-gateway.ninebot.com/portal/self-service/task/account/money/balance?appVersion=${APP_VERSION}`, 
  creditInfo: 'https://api5-h5-app-bj.ninebot.com/web/credit/get-msg',
  blindBoxList: `https://cn-cbu-gateway.ninebot.com/portal/api/user-sign/v2/blind-box/list?t=${Date.now()}`,
  receiveBlindBox: 'https://cn-cbu-gateway.ninebot.com/portal/api/user-sign/v2/blind-box/receive',
  taskList: 'https://cn-cbu-gateway.ninebot.com/portal/api/task-center/task/v3/list',
  taskReward: 'https://cn-cbu-gateway.ninebot.com/portal/self-service/task/reward',
  myAchievement: 'https://api5-h5-app-bj.ninebot.com/web/rank/my-achievement',
}

// 使用抓包中获取的 User-Agent
const NINEBOT_USER_AGENT = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Segway v6 C 609113620"

/**
 * 构造请求头（接收外部传入的鉴权信息）
 */
const getAuthHeaders = (authorization: string, deviceId: string): Record<string, string> => {
  if (!authorization || !deviceId) {
    throw new Error('鉴权信息不完整: authorization 或 deviceId 为空')
  }

  const dynamicCookie = "KLBRSID=ecf4c07eae7a7caf8c71ec8fd4d9263e|1765980756|1765980713"
  const dynamicAid = "1000004"

  return {
    'Authorization': authorization,
    'device_id': deviceId,
    'User-Agent': NINEBOT_USER_AGENT,
    'Content-Type': 'application/json',
    'sys_language': 'zh-CN',
    'accept': 'application/json, text/plain, */*',
    'platform': 'h5',
    'origin': 'https://h5-bj.ninebot.com',
    'language': 'zh',
    'referer': 'https://h5-bj.ninebot.com/',
    'sec-fetch-dest': 'empty',
    'sec-fetch-site': 'same-site',
    'sec-fetch-mode': 'cors',
    'Cookie': dynamicCookie,
    'aid': dynamicAid,
  }
}

/**
 * 获取九号电动车用户信息（支持传入鉴权参数）
 */
export async function getNinebotInfo(authorization: string, deviceId: string): Promise<NinebotWidgetData> {
  try {
    const headers = getAuthHeaders(authorization, deviceId)

    // 请求签到状态
    console.log("请求签到状态...")
    const statusResp = await httpGet(API_ENDPOINTS.signStatus, { headers })
    
    let isSigned = false
    let consecutiveDays = 0
    let signCardsNum = 0 
    
    if (statusResp.data && statusResp.data.code === 0 && statusResp.data.data) {
      isSigned = statusResp.data.data.currentSignStatus === 1
      consecutiveDays = statusResp.data.data.consecutiveDays || 0
      signCardsNum = statusResp.data.data.signCardsNum || 0 
      console.log("✅ 签到状态解析成功:", { isSigned, consecutiveDays, signCardsNum })
    } else {
      console.warn("⚠️ 签到状态 API 返回错误:", statusResp.data?.msg || statusResp.data?.message || JSON.stringify(statusResp.data))
    }

    // 请求日历奖励信息（独立端点）
    console.log("请求日历奖励信息...")
    let calendarInfo: NinebotWidgetData['calendarInfo'] = []
    try {
      const calendarResp = await httpGet(API_ENDPOINTS.calendar, { headers })
      if (calendarResp.data && calendarResp.data.code === 0 && calendarResp.data.data) {
        calendarInfo = calendarResp.data.data.calendarInfo || []
        console.log(`📅 calendarInfo 条目数: ${calendarInfo.length}`)
        // 提取第一个可用的 rewardId
        for (const c of calendarInfo) {
          if (c.rewardInfo && c.rewardInfo.rewardId) {
            console.log(`  🔑 找到 rewardId: ${c.rewardInfo.rewardId}`)
            try { Storage.set('ninebot.blindBoxRewardId', c.rewardInfo.rewardId) } catch { }
            break
          }
        }
      }
    } catch (e) {
      console.warn("⚠️ 日历 API 请求失败:", e)
    }

    // 请求N币余额
    console.log("请求N币余额...")
    const balanceResp = await httpGet(API_ENDPOINTS.balance, { headers })
    
    let nCoin = 0
    
    if (balanceResp.data && balanceResp.data.code === 0 && balanceResp.data.data) {
      nCoin = balanceResp.data.data.balance || 0 
      console.log("✅ N币余额解析成功:", nCoin)
    } else {
      console.warn("⚠️ N币余额 API 返回错误:", balanceResp.data?.msg || balanceResp.data?.message || JSON.stringify(balanceResp.data))
    }

    // 请求经验等级
    console.log("请求经验等级...")
    const creditResp = await httpGet(API_ENDPOINTS.creditInfo, { headers })
    
    let level = 0
    let experience = 0
    let tokenExpired = false
    
    if (creditResp.data && creditResp.data.code === 1 && creditResp.data.data) {
      level = creditResp.data.data.level || 0
      experience = creditResp.data.data.credit || 0
      console.log("✅ 经验等级解析成功:", { level, experience })
    } else {
      const errCode = creditResp.data?.code
      const errMsg = creditResp.data?.desc || creditResp.data?.msg || creditResp.data?.message || JSON.stringify(creditResp.data)
      console.warn("⚠️ 经验等级 API 返回错误:", errMsg)
      if (errCode === 401903) {
        tokenExpired = true
        console.warn("🔑 检测到 token 过期 (401903)")
      }
    }

    // 请求盲盒数据
    console.log("请求盲盒数据...")
    const blindBoxResp = await httpGet(API_ENDPOINTS.blindBoxList, { headers })

    let blindBoxCount = 0
    let notOpenedBlindBoxCount = 0
    let openedBlindBoxCount = 0
    let minLeftDaysToOpen: number | null = null
    let notOpenedBoxesDetail: Array<{awardDays: number, leftDaysToOpen: number, rewardStatus: number, blindBoxIds?: string[]}> = []
    let openedBoxesDetail: Array<{awardDays: number, openedTime: string}> = []

    if (blindBoxResp.data && blindBoxResp.data.code === 0 && blindBoxResp.data.data) {
      const notOpenedBoxes = blindBoxResp.data.data.notOpenedBoxes || []
      const openedBoxes = blindBoxResp.data.data.openedBoxes || []

      notOpenedBlindBoxCount = notOpenedBoxes.length
      openedBlindBoxCount = openedBoxes.length
      blindBoxCount = notOpenedBlindBoxCount + openedBlindBoxCount

      // 提取详细信息
      notOpenedBoxesDetail = notOpenedBoxes.map((box: any) => ({
        awardDays: box.awardDays || 0,
        leftDaysToOpen: box.leftDaysToOpen || 0,
        rewardStatus: box.rewardStatus || 0,
        blindBoxIds: box.blindBoxIds || []
      }))

      openedBoxesDetail = openedBoxes.map((box: any) => ({
        awardDays: box.awardDays || 0,
        openedTime: box.openedTime || ''
      }))

      if (notOpenedBlindBoxCount > 0) {
        minLeftDaysToOpen = Math.min(...notOpenedBoxes.map((box: any) => box.leftDaysToOpen))
      }
      
      console.log("✅ 盲盒数据解析成功:", { 
        notOpenedBlindBoxCount, 
        openedBlindBoxCount, 
        minLeftDaysToOpen,
        notOpenedBoxesDetail,
        openedBoxesDetail
      })
    } else {
      console.warn("⚠️ 盲盒 API 返回错误:", blindBoxResp.data?.msg || blindBoxResp.data?.message || JSON.stringify(blindBoxResp.data))
    }

    const result = { 
      isSigned, 
      nCoin, 
      experience, 
      level, 
      consecutiveDays,
      signCardsNum,
      blindBoxCount,
      notOpenedBlindBoxCount,
      openedBlindBoxCount,
      minLeftDaysToOpen,
      notOpenedBoxesDetail,
      openedBoxesDetail,
      calendarInfo,
      achievement: null,
      tokenExpired,
    }
    
    console.log("📊 最终解析结果:", JSON.stringify(result))
    
    return result
  } catch (error) {
    console.error("❌ API 请求错误:", error)
    throw new Error(`接口请求失败: ${(error as Error).message}`)
  }
}

/**
 * 获取可开启的盲盒列表
 */
export async function getOpenableBlindBoxes(authorization: string, deviceId: string): Promise<BlindBoxInfo[]> {
  try {
    const headers = getAuthHeaders(authorization, deviceId)
    const blindBoxResp = await httpGet(API_ENDPOINTS.blindBoxList, { headers })

    if (blindBoxResp.data && blindBoxResp.data.code === 0 && blindBoxResp.data.data) {
      const notOpenedBoxes = blindBoxResp.data.data.notOpenedBoxes || []
      const openedBoxes = blindBoxResp.data.data.openedBoxes || []
      
      // 详细日志：打印所有盲盒原始数据
      console.log(`📋 盲盒列表: 未开启 ${notOpenedBoxes.length} 个, 已开启 ${openedBoxes.length} 个`)
      notOpenedBoxes.forEach((box: any, i: number) => {
        console.log(`  [${i}] blindBoxIds=${JSON.stringify(box.blindBoxIds)}, awardDays=${box.awardDays}, leftDaysToOpen=${box.leftDaysToOpen}, rewardStatus=${box.rewardStatus}, status=${box.status}`)
      })
      
      const openableBoxes = notOpenedBoxes
        .filter((box: any) => (box.leftDaysToOpen || 0) === 0)
        .map((box: any) => ({
          id: box.id,
          blindBoxIds: box.blindBoxIds || [],
          leftDaysToOpen: box.leftDaysToOpen,
          status: box.status || 0,
          type: box.type || 0,
          rewardStatus: box.rewardStatus || 0,
          awardDays: box.awardDays || 0
        }))
      
      console.log(`✅ 找到 ${openableBoxes.length} 个可领取的盲盒 (leftDaysToOpen === 0)`)
      return openableBoxes
    }
    
    console.warn("⚠️ 盲盒列表获取失败")
    return []
  } catch (error) {
    console.error("❌ 获取盲盒列表错误:", error)
    throw error
  }
}

/**
 * 领取盲盒奖励 — 使用 open 返回的 rewardId
 */
export async function receiveBlindBox(authorization: string, deviceId: string, rewardId: string): Promise<{success: boolean, reward?: any, message?: string}> {
  try {
    const headers = getAuthHeaders(authorization, deviceId)
    const url = `${API_ENDPOINTS.receiveBlindBox}?t=${Date.now()}`
    
    const response = await httpPost(url, { 
      body: { rewardId },
      headers: headers
    })
    
    console.log(`📦 receive 原始返回 (rewardId=${rewardId}):`, JSON.stringify(response.data))
    
    if (response.data && response.data.code === 0) {
      console.log(`✅ 盲盒领取成功, reward=${JSON.stringify(response.data.data)}`)
      return {
        success: true,
        reward: response.data.data,
        message: '领取成功'
      }
    } else {
      const errorMsg = response.data?.msg || response.data?.message || '领取失败'
      console.warn(`⚠️ 盲盒领取失败 (rewardId=${rewardId}):`, errorMsg)
      return {
        success: false,
        message: errorMsg
      }
    }
  } catch (error) {
    console.error(`❌ 领取盲盒错误 (rewardId=${rewardId}):`, error)
    return {
      success: false,
      message: (error as Error).message
    }
  }
}

/**
 * 执行自动签到
 */
export async function doSign(authorization: string, deviceId: string): Promise<{ success: boolean; message: string }> {
  try {
    const headers = getAuthHeaders(authorization, deviceId)
    const url = `${API_ENDPOINTS.sign}`
    
    // According to Ninebot js script, sign endpoint is a POST with { deviceId: "..." }
    const postResponse = await httpPost(url, { 
      headers, 
      body: { deviceId: deviceId }
    })
    
    if (postResponse.data && postResponse.data.code === 0) {
      console.log(`✅ 签到成功`)
      return { success: true, message: '签到成功' }
    } else {
      const errorMsg = postResponse.data?.msg || postResponse.data?.message || '签到失败'
      console.warn(`⚠️ 签到失败:`, errorMsg)
      return { success: false, message: errorMsg }
    }
  } catch (error) {
    console.error(`❌ 签到错误:`, error)
    return { success: false, message: (error as Error).message }
  }
}

// ==================== 车辆监控 API (OpenClaw) ====================

// OpenClaw API 基础配置
const OPENCLAW_BASE = "https://cn-cbu-gateway.ninebot.com"

// 车辆信息数据结构
export interface VehicleInfo {
  sn: string
  name: string
  dumpEnergy: number          // 电量 0-100
  powerStatus: number         // 0=关机 1=开机
  estimateMileage: number     // 预估续航 km
  chargingState: number       // 0=未充电 1=充电中
  remainChargeTime: number    // 剩余充电时间(分钟)
  chargingCurrent: number     // 充电电流 A
  chargingPower: number       // 充电功率 W
  cellVoltages: number[]      // 各节电芯电压
  locationDesc: string        // 位置描述
  locationLat: number         // 纬度
  locationLng: number         // 经度
  raw: any                    // 原始 API 响应
}

// 车辆列表中每项的结构
interface DeviceItem {
  sn: string
  name: string
  model: string
  [key: string]: any
}

/**
 * 获取车辆设备列表
 */
export async function getDeviceList(deviceServiceKey: string): Promise<DeviceItem[]> {
  try {
    const resp = await httpGet(`${OPENCLAW_BASE}/ai-skill/api/device/info/get-device-list`, {
      headers: {
        'Authorization': `Bearer ${deviceServiceKey}`,
        'Content-Type': 'application/json',
      }
    })
    if (resp.data && resp.data.code === 0 && resp.data.data) {
      const list = Array.isArray(resp.data.data) ? resp.data.data : (resp.data.data.list || [])
      console.log("✅ 车辆设备列表获取成功:", list.length, "台设备")
      return list
    }
    console.warn("⚠️ 设备列表 API 返回:", JSON.stringify(resp.data))
    return []
  } catch (error) {
    console.error("❌ 获取设备列表失败:", error)
    return []
  }
}

/**
 * 获取单台车辆的动态信息（电量、里程、位置等）
 */
export async function getVehicleInfo(deviceServiceKey: string, sn: string): Promise<VehicleInfo | null> {
  try {
    const resp = await httpPost(`${OPENCLAW_BASE}/ai-skill/api/device/info/get-device-dynamic-info`, {
      headers: {
        'Authorization': `Bearer ${deviceServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: { sn }
    })
    if (resp.data && resp.data.code === 0 && resp.data.data) {
      const d = resp.data.data
      const loc = d.locationInfo || {}
      const info: VehicleInfo = {
        sn,
        name: d.name || '',
        dumpEnergy: d.dumpEnergy || 0,
        powerStatus: d.powerStatus || 0,
        estimateMileage: d.estimateMileage || 0,
        chargingState: d.chargingState || 0,
        remainChargeTime: d.remainChargeTime || 0,
        chargingCurrent: d.chargingCurrent || 0,
        chargingPower: d.chargingPower || 0,
        cellVoltages: d.cellVoltages || [],
        locationDesc: loc.locationDesc || '',
        locationLat: loc.latitude || 0,
        locationLng: loc.longitude || 0,
        raw: d,
      }
      console.log("✅ 车辆信息获取成功:", info.name, "电量:", info.dumpEnergy + "%")
      // 缓存到 Storage 供 Widget 读取
      try {
        Storage.set('ninebot.vehicleInfo', JSON.stringify(info))
        Storage.set('ninebot.vehicleInfoTime', Date.now())
      } catch { }
      return info
    }
    console.warn("⚠️ 车辆信息 API 返回:", JSON.stringify(resp.data))
    return null
  } catch (error) {
    console.error("❌ 获取车辆信息失败:", error)
    return null
  }
}

/**
 * 刷新所有车辆信息（获取列表 → 逐台查询动态信息）
 * 返回第一台车辆的信息（简化处理）
 */
export async function refreshVehicleData(deviceServiceKey: string): Promise<VehicleInfo | null> {
  try {
    const devices = await getDeviceList(deviceServiceKey)
    if (devices.length === 0) {
      console.warn("⚠️ 未找到绑定的车辆设备")
      return null
    }
    // 取第一台设备
    const firstDevice = devices[0]
    console.log("🛵 查询车辆:", firstDevice.name || firstDevice.sn)
    return await getVehicleInfo(deviceServiceKey, firstDevice.sn)
  } catch (error) {
    console.error("❌ 刷新车辆数据失败:", error)
    return null
  }
}

// ==================== 每日分享任务奖励 ====================

/** 每日分享任务 ID（九号 APP 固定） */
const DAILY_SHARE_TASK_ID = '1823622692036079618'

/** 每日分享奖励状态 */
export interface DailyShareTaskStatus {
  taskId: string
  title: string
  rewardQuantity: number
  rewardStatus: number  // 1=待领取, 2=已领取, 3=不可参与
  rewardDescription: string
}

/** 查询每日分享任务状态（通过任务列表 API） */
export async function getDailyShareTaskStatus(
  authorization: string, deviceId: string
): Promise<DailyShareTaskStatus | null> {
  try {
    const tasks = await getTaskList(authorization, deviceId, 2)
    const shareTask = tasks.find((t: any) => t.taskId === DAILY_SHARE_TASK_ID)
    if (!shareTask) {
      console.log('ℹ️ 未找到每日分享任务')
      return null
    }
    const result: DailyShareTaskStatus = {
      taskId: shareTask.taskId,
      title: shareTask.title || '每日分享',
      rewardQuantity: shareTask.rewardQuantity || 1,
      rewardStatus: shareTask.rewardStatus || 3,
      rewardDescription: shareTask.rewardDescription || '',
    }
    console.log('✅ 每日分享任务状态:', result.title, 'status=' + result.rewardStatus, 'reward=' + result.rewardQuantity + 'N币')
    return result
  } catch (e) {
    console.error('❌ 查询每日分享任务失败:', e)
    return null
  }
}

/** 领取每日分享任务奖励 */
export async function claimDailyShareReward(
  authorization: string, deviceId: string
): Promise<{ success: boolean; reward?: number; message?: string }> {
  try {
    const headers = getAuthHeaders(authorization, deviceId)
    const url = API_ENDPOINTS.taskReward + '?t=' + Date.now()
    const body = { taskId: DAILY_SHARE_TASK_ID }
    console.log('🎁 领取每日分享奖励, taskId=' + DAILY_SHARE_TASK_ID)
    const resp: any = await httpPost(url, body, { headers })
    console.log('📦 每日分享领取返回:', JSON.stringify(resp.data))
    if (resp.data && resp.data.code === 0) {
      console.log('✅ 每日分享奖励领取成功')
      return { success: true, reward: 1, message: '领取成功' }
    } else {
      const msg = resp.data?.msg || resp.data?.message || '领取失败'
      console.warn('⚠️ 每日分享奖励领取失败:', msg)
      return { success: false, message: msg }
    }
  } catch (e) {
    console.error('❌ 领取每日分享奖励异常:', e)
    return { success: false, message: (e as Error).message }
  }
}

// ==================== 盲盒奖励领取 ====================

async function directReceiveBlindBox(
  authorization: string,
  deviceId: string,
  box: BlindBoxInfo
): Promise<{success: boolean, reward?: any, message?: string}> {
  const headers = getAuthHeaders(authorization, deviceId)
  const url = `${API_ENDPOINTS.receiveBlindBox}?t=${Date.now()}`
  
  // 策略1: awardDays 作为 rewardId (string)
  const body1 = { rewardId: String(box.awardDays) }
  console.log(`📦 尝试直接领取 (策略1: rewardId="${box.awardDays}")`)
  let response = await httpPost(url, { body: body1, headers })
  console.log(`📦 策略1 返回:`, JSON.stringify(response.data))
  if (response.data && response.data.code === 0) {
    return { success: true, reward: response.data.data, message: '领取成功' }
  }
  
  await new Promise<void>((r) => setTimeout(() => r(), 500))
  
  // 策略2: awardDays 作为 rewardId (number)
  const body2 = { rewardId: box.awardDays }
  console.log(`📦 尝试直接领取 (策略2: rewardId=${box.awardDays})`)
  response = await httpPost(url, { body: body2, headers })
  console.log(`📦 策略2 返回:`, JSON.stringify(response.data))
  if (response.data && response.data.code === 0) {
    return { success: true, reward: response.data.data, message: '领取成功' }
  }
  
  await new Promise<void>((r) => setTimeout(() => r(), 500))
  
  // 策略3: awardDays + boxId
  const body3 = { boxId: box.awardDays, awardDays: box.awardDays }
  console.log(`📦 尝试直接领取 (策略3: boxId+awardDays)`)
  response = await httpPost(url, { body: body3, headers })
  console.log(`📦 策略3 返回:`, JSON.stringify(response.data))
  if (response.data && response.data.code === 0) {
    return { success: true, reward: response.data.data, message: '领取成功' }
  }
  
  await new Promise<void>((r) => setTimeout(() => r(), 500))
  
  // 策略4: 空 body
  console.log(`📦 尝试直接领取 (策略4: 空 body)`)
  response = await httpPost(url, { body: {}, headers })
  console.log(`📦 策略4 返回:`, JSON.stringify(response.data))
  if (response.data && response.data.code === 0) {
    return { success: true, reward: response.data.data, message: '领取成功' }
  }
  
  return { success: false, message: '所有领取策略均失败' }
}

/**
 * 自动开启所有可开启的盲盒
 * 流程: 1) 尝试旧的 open+receive 两步流程
 *       2) 如果 open 端点 404，直接调用 receive 尝试一步领取
 */
export async function autoOpenBlindBoxes(authorization: string, deviceId: string): Promise<{
  total: number
  openSuccess: number
  receiveSuccess: number
  failed: number
  rewards: any[]
  errors: string[]
}> {
  try {
    console.log("🎁 开始自动开启盲盒...")
    
    const openableBoxes = await getOpenableBlindBoxes(authorization, deviceId)
    
    if (openableBoxes.length === 0) {
      console.log("ℹ️ 暂无可开启的盲盒")
      return { total: 0, openSuccess: 0, receiveSuccess: 0, failed: 0, rewards: [], errors: [] }
    }
    
    const results = {
      total: openableBoxes.length,
      openSuccess: 0,
      receiveSuccess: 0,
      failed: 0,
      rewards: [] as any[],
      errors: [] as string[]
    }
    
    for (const box of openableBoxes) {
      // 直接使用 blindBoxIds[0] 作为 rewardId 调用 /receive（/open 端点已下线）
      const rewardId = box.blindBoxIds?.[0] || ''
      console.log(`🎁 处理盲盒 (${box.awardDays}天, rewardStatus=${box.rewardStatus}): blindBoxId=${rewardId}`)

      if (!rewardId) {
        results.failed++
        results.errors.push(`盲盒 (${box.awardDays}天): 无 blindBoxId`)
        console.log(`❌ 盲盒 (${box.awardDays}天) blindBoxIds 为空`, JSON.stringify(box))
        continue
      }

      results.openSuccess++
      const receiveResult = await receiveBlindBox(authorization, deviceId, rewardId)
      if (receiveResult.success) {
        results.receiveSuccess++
        if (receiveResult.reward) {
          results.rewards.push({ awardDays: box.awardDays, rewardId, reward: receiveResult.reward })
        }
        console.log(`✅ 盲盒领取成功! reward=${JSON.stringify(receiveResult.reward)}`)
      } else {
        results.failed++
        results.errors.push(`盲盒领取失败 (${box.awardDays}天): ${receiveResult.message}`)
        console.log(`❌ 盲盒领取失败: ${receiveResult.message}`)
      }
      await new Promise<void>((r) => setTimeout(() => r(), 1000))
    }
    
    console.log(`🎁 盲盒处理完成: 总计 ${results.total}, 开启成功 ${results.openSuccess}, 领取成功 ${results.receiveSuccess}, 失败 ${results.failed}`)
    return results
  } catch (error) {
    console.error("❌ 自动开启盲盒错误:", error)
    throw error
  }
}

// ========================
// 任务中心 API
// ========================

/** 任务分类标签 */
export const TASK_CATEGORY_LABELS: Record<number, string> = {
  1: "完善资料",
  3: "车辆激活",
  7: "内容点赞",
}

/** 获取指定 typeCode 的任务列表 */
export async function getTaskList(authorization: string, deviceId: string, typeCode: number = 1): Promise<TaskInfo[]> {
  const headers = getAuthHeaders(authorization, deviceId)
  const url = API_ENDPOINTS.taskList + "?typeCode=" + typeCode + "&appVersion=" + APP_VERSION + "&platformType=iOS"
  const resp: any = await httpGet(url, { headers })
  if (!resp.data || resp.data.code !== 0) {
    throw new Error("任务列表获取失败: " + (resp.data?.msg || "code=" + resp.data?.code))
  }
  return (resp.data.data || []) as TaskInfo[]
}

/** 获取所有类型的任务（合并去重） */
export async function getAllTasks(authorization: string, deviceId: string): Promise<TaskInfo[]> {
  const allTasks: TaskInfo[] = []
  const seen = new Set<string>()
  for (const code of [1, 2, 3]) {
    try {
      const tasks = await getTaskList(authorization, deviceId, code)
      for (const t of tasks) {
        if (!seen.has(t.taskId)) {
          seen.add(t.taskId)
          allTasks.push(t)
        }
      }
    } catch { }
  }
  return allTasks
}

/** 获取个人成就数据（里程/排名/骑行天数等）
 * POST请求，需要 body 参数
 * uid 从 JWT token 解码获取，vehicle_type/wnumber 从 Storage 缓存获取
 */
export async function getMyAchievement(authorization: string, deviceId: string): Promise<AchievementInfo | null> {
  try {
    // 优先级：Settings手动输入 > Loon抓包自动获取 > JWT解码
    let uid = Storage.get("ninebot.achievementUid") || Storage.get("ninebot.uid") || ""
    if (!uid && authorization) {
      try {
        const parts = authorization.replace("Bearer ", "").split(".")
        if (parts.length >= 2) {
          const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")))
          uid = String(payload.sub || payload.uid || payload.userId || "")
          if (uid) {
            console.log("📊 从JWT解码uid:", uid)
            Storage.set("ninebot.uid", uid)
          }
        }
      } catch (e) { console.log("JWT解码失败:", e) }
    }

    // 优先级：Settings > Loon抓包 > 空
    const vehicleType = Storage.get("ninebot.vehicleType") || Storage.get("ninebot.achievementVehicleType") || ""
    const wnumber = Storage.get("ninebot.wnumber") || Storage.get("ninebot.achievementWnumber") || ""
    const lat = Storage.get("ninebot.latitude") || "31.386363755490787"
    const lng = Storage.get("ninebot.longitude") || "121.40895602493238"

    if (!uid) {
      console.log("成就数据: uid为空，跳过")
      return null
    }

    const headers: Record<string, string> = {
      "Accept": "application/json, text/plain, */*",
      "Accept-Language": "zh-CN,zh-Hans;q=0.9",
      "Authorization": authorization,
      "Content-Type": "application/json",
      "Origin": "https://api5-h5-app-bj.ninebot.com",
      "Referer": "https://api5-h5-app-bj.ninebot.com/rankings/rankingdatashow.html",
      "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Segway v6 C 610083803",
    }
    const body = {
      device_id: deviceId,
      lang: "zh",
      language: "zh",
      latitude: lat,
      longitude: lng,
      rank_source: 1,
      rank_type: 1,
      regionx: "h5",
      uid: uid,
      vehicle_type: vehicleType,
      wnumber: wnumber,
    }
    console.log("📊 请求成就API(POST): uid=" + uid + " vehicleType=" + vehicleType + " wnumber=" + wnumber)
    const resp: any = await httpPost(API_ENDPOINTS.myAchievement, body, { headers })
    console.log("📊 成就API状态:", resp.status, "code:", resp.data?.code, "desc:", resp.data?.desc)
    if (resp.data?.data) {
      console.log("📊 成就数据:", resp.data.data.vehicle_name, "里程:", resp.data.data.odometer)
      // 缓存从返回数据中获取的值
      if (resp.data.data.uid) Storage.set("ninebot.uid", resp.data.data.uid)
      if (resp.data.data.vehicle_type) Storage.set("ninebot.vehicleType", resp.data.data.vehicle_type)
      if (resp.data.data.wnumber) Storage.set("ninebot.wnumber", resp.data.data.wnumber)
    }
    if (!resp.data || resp.data.code !== 1) {
      console.log("成就数据获取失败:", resp.data?.desc || "code=" + resp.data?.code)
      return null
    }
    return resp.data.data as AchievementInfo
  } catch (e) {
    console.log("成就数据请求异常:", e)
    return null
  }
}

