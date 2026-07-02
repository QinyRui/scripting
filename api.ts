import { httpGet, httpPost } from './utils/request'

// 声明 Scripting 全局 run() 函数
declare function run(command: string, options?: {timeout?: number}): Promise<{stdout: string, stderr: string, exitCode: number}>

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

// 从抓包中获取的 appVersion (用于 balance 接口)
const APP_VERSION = "609113620"

// 九号电动车接口地址
const API_ENDPOINTS = {
  signStatus: `https://cn-cbu-gateway.ninebot.com/portal/api/user-sign/v2/status?t=${Date.now()}`, 
  sign: `https://cn-cbu-gateway.ninebot.com/portal/api/user-sign/v2/sign?t=${Date.now()}`,
  balance: `https://cn-cbu-gateway.ninebot.com/portal/self-service/task/account/money/balance?appVersion=${APP_VERSION}`, 
  creditInfo: 'https://api5-h5-app-bj.ninebot.com/web/credit/get-msg',
  blindBoxList: `https://cn-cbu-gateway.ninebot.com/portal/api/user-sign/v2/blind-box/list?t=${Date.now()}`,
  openBlindBox: 'https://cn-cbu-gateway.ninebot.com/portal/api/user-sign/v2/blind-box/open',
  receiveBlindBox: 'https://cn-cbu-gateway.ninebot.com/portal/api/user-sign/v2/blind-box/receive',
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
      // 从日历中提取 rewardId 存入 Storage
      const calInfo = statusResp.data.data.calendarInfo || []
      console.log(`📅 calendarInfo 条目数: ${calInfo.length}`)
      for (const c of calInfo) {
        console.log(`  📅 calendar 条目:`, JSON.stringify(c))
        if (c.rewardInfo && c.rewardInfo.rewardId) {
          console.log(`  🔑 找到 rewardId: ${c.rewardInfo.rewardId}`)
          try { Storage.set('ninebot.blindBoxRewardId', c.rewardInfo.rewardId) } catch { }
          break
        }
      }
      console.log("✅ 签到状态解析成功:", { isSigned, consecutiveDays, signCardsNum })
    } else {
      console.warn("⚠️ 签到状态 API 返回错误:", statusResp.data?.msg || statusResp.data?.message || JSON.stringify(statusResp.data))
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
    
    if (creditResp.data && creditResp.data.code === 1 && creditResp.data.data) {
      level = creditResp.data.data.level || 0
      experience = creditResp.data.data.credit || 0
      console.log("✅ 经验等级解析成功:", { level, experience })
    } else {
      console.warn("⚠️ 经验等级 API 返回错误:", creditResp.data?.msg || creditResp.data?.message || JSON.stringify(creditResp.data))
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
 * 开启盲盒 — 返回 rewardId 供后续领取使用
 */
export async function openBlindBox(authorization: string, deviceId: string, boxId?: string | number): Promise<{success: boolean, rewardId?: string, data?: any, message?: string}> {
  try {
    const headers = getAuthHeaders(authorization, deviceId)
    const url = `${API_ENDPOINTS.openBlindBox}?t=${Date.now()}`
    
    // 优先传 boxId（如果有），否则空 body 让服务端自动处理下一个到期盲盒
    const body = boxId != null ? { id: boxId, boxId: boxId } : {}
    console.log(`📦 open 请求 body:`, JSON.stringify(body))
    const response = await httpPost(url, { 
      body,
      headers: headers
    })
    
    console.log(`📦 open 接口原始返回:`, JSON.stringify(response.data))
    
    if (response.data && response.data.code === 0) {
      const data = response.data.data || {}
      // 多层嵌套提取 rewardId —— 兼容各种可能的响应结构
      const rewardId = (
        data.rewardId || data.id || data.rewardID ||
        // 深层嵌套：openBoxInfo / reward / boxInfo
        data.openBoxInfo?.rewardId ||
        data.reward?.rewardId ||
        data.boxInfo?.rewardId ||
        // 数组形式：data.list[0].rewardId
        (Array.isArray(data.list) && data.list[0]?.rewardId) ||
        // 用 awardDays 作为兜底（如果存在）
        (data.awardDays != null ? String(data.awardDays) : '')
      )
      console.log(`✅ 盲盒开启成功, rewardId=${rewardId}, data keys=${Object.keys(data).join(',')}`)
      return {
        success: true,
        rewardId,
        data,
        message: '开启成功'
      }
    } else {
      const rawMsg = response.data?.msg || response.data?.message || ''
      const rawCode = response.data?.code ?? 'unknown'
      const errorMsg = `code=${rawCode}, msg=${rawMsg}`
      console.warn(`⚠️ 盲盒开启失败:`, errorMsg, '完整返回:', JSON.stringify(response.data))
      return {
        success: false,
        message: errorMsg,
        data: response.data
      }
    }
  } catch (error) {
    console.error(`❌ 开启盲盒错误:`, error)
    return {
      success: false,
      message: (error as Error).message
    }
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

/**
 * API 诊断探测 —— 尝试多种端点和参数组合，找出可用的盲盒领取方式
 */
export async function diagnoseBlindBoxApi(authorization: string, deviceId: string): Promise<string> {
  const headers = getAuthHeaders(authorization, deviceId)
  const t = Date.now()
  const lines: string[] = []
  const log = (s: string) => { lines.push(s); console.log(s) }

  log('===== 盲盒 API 诊断开始 =====')

  // 获取盲盒列表，提取第一个可领取的盲盒信息
  const listResp = await httpGet(API_ENDPOINTS.blindBoxList, { headers })
  const boxes = listResp.data?.data?.notOpenedBoxes || []
  const readyBox = boxes.find((b: any) => (b.leftDaysToOpen || 0) === 0)
  log(`📋 盲盒总数: ${boxes.length}, 可领取: ${readyBox ? readyBox.awardDays + '天' : '无'}`)
  if (readyBox) log(`  完整数据: ${JSON.stringify(readyBox)}`)

  // 测试 1: 尝试不同的 open 端点
  const openUrls = [
    'https://cn-cbu-gateway.ninebot.com/portal/api/user-sign/v2/blind-box/open',
    'https://cn-cbu-gateway.ninebot.com/portal/api/user-sign/blind-box/open',
    'https://cn-cbu-gateway.ninebot.com/portal/api/user-sign/v3/blind-box/open',
  ]
  log('\n--- 测试 /open 端点 ---')
  for (const url of openUrls) {
    const resp = await httpPost(url + `?t=${t}`, { body: {}, headers })
    const tag = resp.data?.status === 404 ? '❌404' : (resp.data?.code === 0 ? '✅' : '⚠️')
    log(`${tag} ${url.replace('https://cn-cbu-gateway.ninebot.com', '')} → ${JSON.stringify(resp.data).slice(0, 200)}`)
  }

  // 如果有可领取盲盒，尝试不同的 /receive 参数组合
  if (readyBox) {
    log('\n--- 测试 /receive 端点 (多种 body) ---')
    const receiveUrl = `${API_ENDPOINTS.receiveBlindBox}?t=${t}`
    const bodies = [
      { rewardId: String(readyBox.awardDays) },
      { rewardId: readyBox.awardDays },
      { awardDays: readyBox.awardDays },
      { boxId: readyBox.awardDays },
      { id: readyBox.awardDays },
      { awardDays: readyBox.awardDays, rewardStatus: readyBox.rewardStatus },
      { type: readyBox.type, awardDays: readyBox.awardDays },
      {},
    ]
    for (const body of bodies) {
      const resp = await httpPost(receiveUrl, { body, headers })
      const code = resp.data?.code ?? resp.data?.status ?? '?'
      const msg = resp.data?.msg || resp.data?.message || resp.data?.error || ''
      const tag = code === 0 ? '✅' : '❌'
      log(`${tag} body=${JSON.stringify(body)} → code=${code} msg=${msg}`)
    }

    // 测试 3: 尝试用 open 端点的不同路径变体
    log('\n--- 测试其他可能的端点 ---')
    const otherEndpoints = [
      { url: 'https://cn-cbu-gateway.ninebot.com/portal/api/user-sign/v2/blind-box/receiveBlindBox', body: { awardDays: readyBox.awardDays } },
      { url: 'https://cn-cbu-gateway.ninebot.com/portal/api/user-sign/v2/blind-box/openBox', body: { awardDays: readyBox.awardDays } },
      { url: 'https://cn-cbu-gateway.ninebot.com/portal/api/user-sign/v2/blind-box/unbox', body: { awardDays: readyBox.awardDays } },
    ]
    for (const ep of otherEndpoints) {
      const resp = await httpPost(ep.url + `?t=${t}`, { body: ep.body, headers })
      const tag = resp.data?.status === 404 ? '❌404' : (resp.data?.code === 0 ? '✅' : '⚠️')
      log(`${tag} ${ep.url.replace('https://cn-cbu-gateway.ninebot.com', '')} → ${JSON.stringify(resp.data).slice(0, 200)}`)
    }
  }

  log('\n===== 诊断完成 =====')
  return lines.join('\n')
}

// ==================== 车辆监控 (OpenClaw Skill API) ====================

export interface VehicleInfo {
  deviceName: string
  sn: string
  // 基础数据
  battery: number | null              // 电量百分比 (dumpEnergy)
  powerStatus: number | null          // 0=关机, 1=开机
  estimateMileage: number | null      // 预估里程(km)
  chargingState: number | null        // 0=未充电, 1=充电中
  remainChargeTime: string | null     // 剩余充电时间
  locationDesc: string | null         // 位置描述
  // v1.1.0 扩展字段（充电详情）
  chargingCurrent: number | null      // 充电电流(A)
  chargingPower: number | null        // 充电功率(W)
  cellVoltages: any | null            // 单节电芯电压数据
  raw: any                            // 原始 API 响应 data
}

const VEHICLE_BASE = 'https://cn-cbu-gateway.ninebot.com'

function vehicleHeaders(apiKey: string): Record<string, string> {
  return {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }
}

/**
 * 获取九号车辆设备列表
 */
export async function getVehicleDeviceList(apiKey: string): Promise<{sn: string, deviceName: string}[]> {
  try {
    const url = `${VEHICLE_BASE}/ai-skill/api/device/info/get-device-list?t=${Date.now()}`
    const response = await httpGet(url, { headers: vehicleHeaders(apiKey) })
    if (response.data && response.data.code === 1 && response.data.data) {
      const devices = response.data.data.map((d: any) => ({
        sn: d.sn || '',
        deviceName: d.deviceName || '',
      }))
      console.log('✅ 车辆列表获取成功:', devices.length, '辆')
      return devices
    }
    console.warn('⚠️ 车辆列表获取失败:', response.data?.desc || JSON.stringify(response.data))
    return []
  } catch (error) {
    console.error('❌ 获取车辆列表错误:', error)
    return []
  }
}

/**
 * 查询车辆动态信息（电量、里程、位置、充电状态）
 */
export async function getVehicleInfo(apiKey: string, sn: string): Promise<VehicleInfo | null> {
  try {
    const url = `${VEHICLE_BASE}/ai-skill/api/device/info/get-device-dynamic-info?t=${Date.now()}`
    const response = await httpPost(url, {
      body: { sn },
      headers: vehicleHeaders(apiKey),
    })
    if (response.data && response.data.code === 1 && response.data.data) {
      const d = response.data.data
      const info: VehicleInfo = {
        deviceName: '',
        sn,
        battery: d.dumpEnergy ?? null,
        powerStatus: d.powerStatus ?? null,
        estimateMileage: d.estimateMileage ?? null,
        chargingState: d.chargingState ?? null,
        remainChargeTime: d.remainChargeTime || null,
        locationDesc: d.locationInfo?.locationDesc || null,
        // v1.1.0 扩展字段
        chargingCurrent: d.chargingCurrent ?? d.chargeCurrent ?? null,
        chargingPower: d.chargingPower ?? d.chargePower ?? d.power ?? null,
        cellVoltages: d.cellVoltages ?? d.batteryCellInfo ?? null,
        raw: d,
      }
      console.log('✅ 车辆信息获取成功:', info.battery + '%', info.locationDesc)
      return info
    }
    console.warn('⚠️ 车辆信息获取失败:', response.data?.desc || JSON.stringify(response.data))
    return null
  } catch (error) {
    console.error('❌ 获取车辆信息错误:', error)
    return null
  }
}

/**
 * 一键获取所有车辆信息
 */
export async function getAllVehicleInfo(apiKey: string): Promise<VehicleInfo[]> {
  try {
    const devices = await getVehicleDeviceList(apiKey)
    if (devices.length === 0) return []
    const results: VehicleInfo[] = []
    for (const dev of devices) {
      const info = await getVehicleInfo(apiKey, dev.sn)
      if (info) {
        info.deviceName = dev.deviceName || `车辆 ${dev.sn.slice(-4)}`
        results.push(info)
      }
      await new Promise<void>((r) => setTimeout(() => r(), 500))
    }
    return results
  } catch (error) {
    console.error('❌ 获取所有车辆信息错误:', error)
    return []
  }
}

// ==================== 九号原生 API (RSA 加密) ====================

// 全局 run() 无需 import，用于执行 openssl RSA 命令

/**
 * RSA 加密 (PKCS#1) — 通过 openssl 命令行实现
 */
async function rsaEncryptNative(plainText: string, publicKeyPem: string): Promise<string> {
  const tempDir = '/tmp/ninebot_rsa'
  const keyFile = `${tempDir}/pub.pem`
  const plainFile = `${tempDir}/plain.txt`
  const cipherFile = `${tempDir}/cipher.bin`
  
  await run(`mkdir -p ${tempDir}`)
  await run(`cat > ${keyFile} << 'PEMEOF'\n${publicKeyPem}\nPEMEOF`)
  await run(`cat > ${plainFile} << 'TEXTEOF'\n${plainText}\nTEXTEOF`)
  await run(`openssl pkeyutl -encrypt -pubin -inkey ${keyFile} -pkeyopt rsa_padding_mode:pkcs1 -in ${plainFile} -out ${cipherFile} 2>/dev/null || openssl rsautl -encrypt -pkcs -inkey ${keyFile} -in ${plainFile} -out ${cipherFile}`)
  const result = await run(`base64 < ${cipherFile}`)
  return result.stdout.trim()
}

/**
 * RSA 解密 (PKCS#1) — 通过 openssl 命令行实现
 */
async function rsaDecryptNative(cipherBase64: string, privateKeyPem: string): Promise<string> {
  const tempDir = '/tmp/ninebot_rsa'
  const keyFile = `${tempDir}/priv.pem`
  const cipherFile = `${tempDir}/cipher.bin`
  const plainFile = `${tempDir}/plain.txt`
  
  await run(`mkdir -p ${tempDir}`)
  await run(`cat > ${keyFile} << 'PEMEOF'\n${privateKeyPem}\nPEMEOF`)
  await run(`echo '${cipherBase64}' | base64 -d > ${cipherFile}`)
  await run(`openssl rsautl -decrypt -pkcs -inkey ${keyFile} -in ${cipherFile} -out ${plainFile}`)
  const result = await run(`cat ${plainFile}`)
  return result.stdout.trim()
}

/**
 * 生成随机字符串
 */
function randomString(len: number = 16): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < len; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * 九号原生 API — 获取车辆列表 (RSA 加密)
 */
export async function getNativeDeviceList(
  authorization: string,
  deviceId: string,
  rsaPublicKey: string
): Promise<{deviceId: string, deviceName: string}[]> {
  try {
    const encrypted = await rsaEncryptNative('{}', rsaPublicKey)
    const payload = {
      v: 101,
      s: encrypted,
      r: randomString(),
    }
    
    const response = await httpPost('https://api.ninebot.com/v1/device/list', {
      body: payload,
      headers: {
        'Authorization': authorization,
        'deviceId': deviceId,
        'Content-Type': 'application/json',
      },
    })
    
    if (response.data && response.data.s) {
      const decrypted = await rsaDecryptNative(response.data.s, rsaPublicKey)
      const data = JSON.parse(decrypted)
      if (data && data.devices) {
        console.log('✅ 原生API车辆列表获取成功:', data.devices.length, '辆')
        return data.devices
      }
    }
    console.warn('⚠️ 原生API车辆列表获取失败')
    return []
  } catch (error) {
    console.error('❌ 原生API获取车辆列表错误:', error)
    return []
  }
}

/**
 * 九号原生 API — 获取车辆状态 (RSA 加密)
 */
export async function getNativeDeviceStatus(
  authorization: string,
  deviceId: string,
  rsaPublicKey: string,
  rsaPrivateKey: string,
  targetDeviceId: string
): Promise<VehicleInfo | null> {
  try {
    const encrypted = await rsaEncryptNative(JSON.stringify({ deviceId: targetDeviceId }), rsaPublicKey)
    const payload = {
      v: 101,
      s: encrypted,
      r: randomString(),
    }
    
    const response = await httpPost('https://api.ninebot.com/v1/device/status', {
      body: payload,
      headers: {
        'Authorization': authorization,
        'deviceId': deviceId,
        'Content-Type': 'application/json',
      },
    })
    
    if (response.data && response.data.s) {
      const decrypted = await rsaDecryptNative(response.data.s, rsaPrivateKey)
      const data = JSON.parse(decrypted)
      if (data) {
        const info: VehicleInfo = {
          deviceName: data.deviceName || '',
          sn: targetDeviceId,
          battery: data.batteryPercent ?? data.dumpEnergy ?? null,
          powerStatus: data.powerStatus ?? null,
          estimateMileage: data.estimatedRange ?? data.estimateMileage ?? null,
          chargingState: data.chargingState ?? null,
          remainChargeTime: data.remainChargeTime ?? null,
          locationDesc: data.locationDesc ?? data.locationInfo?.locationDesc ?? null,
          chargingCurrent: data.chargingCurrent ?? null,
          chargingPower: data.chargingPower ?? null,
          cellVoltages: data.cellVoltages ?? null,
          raw: data,
        }
        console.log('✅ 原生API车辆信息获取成功:', info.battery + '%')
        return info
      }
    }
    console.warn('⚠️ 原生API车辆信息获取失败')
    return null
  } catch (error) {
    console.error('❌ 原生API获取车辆信息错误:', error)
    return null
  }
}

