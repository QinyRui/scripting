/**
 * 米游社自动助手 - 游戏签到模块
 * 实现原神、崩坏3rd 等游戏的自动签到
 */

import type { GameType, TaskResult, Board, GameAccount, SignInfo } from './types'
import { boards, getSignableGames } from './config'
import {
  getUserInfo,
  getSignInfo,
  getSignAwards,
  postSign,
} from './api'
import { randomSleep, addLog, getConfig } from './utils'

/**
 * 执行所有游戏签到任务
 * @returns 任务执行结果
 */
export async function executeSignTasks(): Promise<TaskResult> {
  const config = getConfig()
  const { signGames } = config

  addLog('info', '========== 开始执行游戏签到任务 ==========')

  if (!signGames || signGames.length === 0) {
    return {
      success: true,
      message: '没有启用的游戏签到任务',
    }
  }

  const results: string[] = []

  for (const gameKey of signGames) {
    const board = boards[gameKey]
    if (!board || !board.actid) {
      addLog('warn', `跳过不支持签到的游戏: ${gameKey}`)
      continue
    }

    try {
      const result = await executeGameSign(board)
      results.push(result.message)
    } catch (error: any) {
      results.push(`❌ ${board.name} 签到失败: ${error.message}`)
    }

    await randomSleep()
  }

  return {
    success: true,
    message: `游戏签到结果:\n${results.join('\n')}`,
  }
}

/**
 * 执行单个游戏的签到
 * @param board 游戏版块信息
 */
async function executeGameSign(board: Board): Promise<TaskResult> {
  addLog('info', `----- ${board.name} 签到 -----`)

  try {
    // 1. 获取账号信息
    const account = await getUserInfo(board)
    await randomSleep()

    // 2. 获取签到信息
    const signInfo = await getSignInfo(board, account)
    await randomSleep()

    // 3. 如果已签到，直接返回
    if (signInfo.is_sign) {
      const award = await getSignAwards(board, signInfo.total_sign_day)
      const msg = `${board.name} 已签到: ${account.nickname} 累计 ${signInfo.total_sign_day} 天`
      addLog('success', msg)
      return { success: true, message: `✅ ${msg}` }
    }

    // 4. 获取奖励信息
    const award = await getSignAwards(board, signInfo.total_sign_day)
    await randomSleep()

    // 5. 执行签到
    await postSign(board, account)

    const msg = `${board.name} 签到成功: ${account.nickname} 领取了 ${award.name} x${award.count}`
    addLog('success', msg)

    return {
      success: true,
      message: `✅ ${msg}`,
    }
  } catch (error: any) {
    const msg = `${board.name} 签到失败: ${error.message}`
    addLog('error', msg)

    return {
      success: false,
      message: `❌ ${msg}`,
    }
  }
}

/**
 * 执行原神签到
 */
export async function executeGenshinSign(): Promise<TaskResult> {
  return executeGameSign(boards.genshin)
}

/**
 * 执行崩坏3rd 签到
 */
/**
 * 获取游戏签到状态
 * 用于 UI 显示
 */
export async function getGameSignStatus(): Promise<Array<{
  game: string
  name: string
  signed: boolean
  totalDays: number
  todayAward?: string
}>> {
  const config = getConfig()
  const { signGames } = config
  const statusList: Array<{
    game: string
    name: string
    signed: boolean
    totalDays: number
    todayAward?: string
  }> = []

  for (const gameKey of signGames) {
    const board = boards[gameKey]
    if (!board || !board.actid) continue

    try {
      const account = await getUserInfo(board)
      const gameCode = board.biz.replace('_cn', '')
      const headers = getSignHeaders(gameCode)

      // 这里简化处理，实际需要根据游戏类型调用不同的 API
      statusList.push({
        game: gameKey,
        name: board.name,
        signed: false, // 需要实际查询
        totalDays: 0, // 需要实际查询
      })
    } catch (error: any) {
      statusList.push({
        game: gameKey,
        name: board.name,
        signed: false,
        totalDays: 0,
      })
    }
  }

  return statusList
}

// 辅助函数导入
import { getSignHeaders } from './utils'