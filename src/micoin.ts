/**
 * 米游社自动助手 - 米游币任务模块
 * 实现浏览帖子、点赞、分享等功能
 */

import type { TaskResult, TaskState, MiCoinTaskId, Mission } from './types'
import { getBoardById, GAMES, getGameConfig } from './config'
import {
  getUserMissionState,
  getForumPostList,
  getPostFull,
  postUpVotePost,
  sharePost,
  postDiscussionSignIn,
} from './api'
import { randomSleep, addLog, getConfig, getBBSHeaders, getDS } from './utils'
import { fetch } from 'scripting'

/**
 * 执行米游币任务
 * @returns 任务执行结果
 */
export async function executeMiCoinTasks(): Promise<TaskResult> {
  const config = getConfig()
  const { sections, actions } = config.micoin

  addLog('info', '========== 开始执行米游币任务 ==========')

  // 根据主应用选择的游戏获取对应论坛板块
  const selectedGameId = config.signGames?.[0] || 'genshin'
  const gameConfig = getGameConfig(selectedGameId)
  const forumId = gameConfig?.forumId || 26 // 默认原神板块
  const board = getBoardById(forumId)

  if (!board) {
    const msg = `无效的版块 ID: ${forumId}`
    addLog('error', msg)
    return { success: false, message: msg }
  }

  addLog('info', `执行版块: ${board.name} (ID: ${forumId})`)

  try {
    // 1. 获取任务状态
    const missionState = await getUserMissionState()

    // 2. 获取帖子列表（后续任务需要）
    const posts = await getForumPostList(forumId)
    await randomSleep()

    // 3. 解析任务状态（从 API 动态获取）
    const allMissions = [...(missionState.missions || []), ...(missionState.more_missions || [])]
    const tasks = parseTaskStates(allMissions, missionState.states, actions)

    // 4. 执行各任务
    const results: string[] = []

    for (const task of tasks) {
      // 跳过已完成的任务
      if (task.isGetAward) {
        addLog('info', `跳过已完成任务: ${getTaskName(task.id)}`)
        continue
      }

      let success = false

      switch (task.id) {
        case 58: // 讨论区签到（连续打卡奖励: 30/40/50）
          const signInResult = await postDiscussionSignIn(forumId)
          if (signInResult.success) {
            const rewardDesc = getCheckInRewardDesc(signInResult.points)
            results.push(`✅ 讨论区签到 (+${signInResult.points} 米游币${rewardDesc})`)
          } else {
            results.push('❌ 讨论区签到失败')
          }
          break

        case 59: // 浏览帖子
          const browseCount = await executeBrowseTask(posts, task.times)
          results.push(
            browseCount >= 3
              ? '✅ 浏览 3 个帖子 (+20 米游币)'
              : `⚠️ 浏览帖子未完成 (${browseCount}/3)`
          )
          break

        case 60: // 点赞帖子
          const voteCount = await executeVoteTask(posts, task.times)
          results.push(
            voteCount >= 5
              ? '✅ 点赞 5 次 (+30 米游币)'
              : `⚠️ 点赞未完成 (${voteCount}/5)`
          )
          break

        case 61: // 分享帖子
          const shareSuccess = await executeShareTask(posts)
          results.push(shareSuccess ? '✅ 分享帖子 (+10 米游币)' : '❌ 分享帖子失败')
          break
      }

      await randomSleep()
    }

    // 5. 获取连续打卡天数（从积分记录 API 计算，保存到 Storage 供组件使用）
    try {
      console.log('[micoin] 获取连续打卡天数...')
      const pointUrl = 'https://bbs-api.miyoushe.com/common/homutreasure/v1/web/user/record?app_id=1&point_sn=myb&action=1&size=20'
      const pointDs = getDS('', 'app_id=1&point_sn=myb&action=1&size=20')
      const pointRes = await fetch(pointUrl, {
        method: 'GET',
        headers: { ...getBBSHeaders(pointUrl), 'DS': pointDs },
      }).then((r: any) => r.json()).catch(() => null)
      const pointList = pointRes?.data?.list || []
      const checkInRecords = pointList.filter((r: any) => r.title === '打卡' && r.num > 0)
      let streak = 0
      if (checkInRecords.length > 0) {
        const now = new Date()
        let expectedDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        for (const record of checkInRecords) {
          const recordDate = new Date(parseInt(record.order_time) * 1000)
          const recordDay = new Date(recordDate.getFullYear(), recordDate.getMonth(), recordDate.getDate())
          const diffDays = Math.round((expectedDate.getTime() - recordDay.getTime()) / 86400000)
          if (diffDays === 0 || diffDays === 1) {
            streak++
            expectedDate = new Date(recordDay.getTime() - 86400000)
          } else {
            break
          }
        }
      }
      if (streak > 0) {
        Storage.set('mihoyo_checkin_streak', String(streak))
        console.log('[micoin] ✅ 连续打卡天数:', streak, '天')
      }
    } catch (e: any) {
      console.log('[micoin] 获取连续打卡天数异常:', e.message)
    }

    // 6. 汇总结果
    if (results.length === 0) {
      return {
        success: true,
        message: '没有需要执行的米游币任务',
      }
    }

    return {
      success: true,
      message: `米游币任务完成:\n${results.join('\n')}`,
    }
  } catch (error: any) {
    const msg = `米游币任务执行失败: ${error.message}`
    addLog('error', msg)
    return { success: false, message: msg }
  }
}

/**
 * 解析任务状态
 */
function parseTaskStates(
  missions: Mission[],
  states: Array<{ mission_id: number; happened_times: number; is_get_award: boolean }>,
  enabledActions: MiCoinTaskId[]
): TaskState[] {
  // 从 API 动态获取任务列表，如果没有则用默认值
  const missionIds = missions.length > 0
    ? missions.map(m => m.id as MiCoinTaskId)
    : [58, 59, 60, 61] as MiCoinTaskId[]

  return missionIds
    .filter(id => enabledActions.includes(id))
    .map(id => {
      // 优先从 missions 获取，兼容旧版 states
      const mission = missions.find(m => m.id === id)
      const state = states.find(s => s.mission_id === id)
      const times = mission?.continuous_cycle_times || mission?.happened_times || state?.happened_times || 0
      const isGetAward = mission?.is_auto_send_award || state?.is_get_award || false
      const limit = mission?.limit || 1
      return {
        id,
        times,
        isGetAward: times >= limit && isGetAward,
      }
    })
}

/**
 * 获取任务名称
 */
function getTaskName(taskId: MiCoinTaskId): string {
  const names: Record<MiCoinTaskId, string> = {
    58: '讨论区签到',
    59: '浏览帖子',
    60: '点赞帖子',
    61: '分享帖子',
  }
  return names[taskId] || `未知任务(${taskId})`
}

/**
 * 根据签到奖励米游币数推断打卡状态描述
 * 奖励规则: 普通打卡 +30, 连续满3天 +40, 连续满5天 +50
 */
function getCheckInRewardDesc(points: number): string {
  if (points >= 50) return ', 连续打卡≥5天'
  if (points >= 40) return ', 连续打卡≥3天'
  return ''
}

/**
 * 执行浏览帖子任务
 * @param posts 帖子列表
 * @param currentTimes 已完成次数
 */
async function executeBrowseTask(
  posts: Array<{ post: { post_id: string } }>,
  currentTimes: number
): Promise<number> {
  let count = currentTimes

  for (let i = currentTimes; i < 3 && i < posts.length; i++) {
    const postId = posts[i]?.post?.post_id
    if (postId) {
      const success = await getPostFull(postId)
      if (success) count++
      await randomSleep()
    }
  }

  return count
}

/**
 * 执行点赞任务
 * @param posts 帖子列表
 * @param currentTimes 已完成次数
 */
async function executeVoteTask(
  posts: Array<{ post: { post_id: string } }>,
  currentTimes: number
): Promise<number> {
  let count = currentTimes

  for (let i = currentTimes; i < 5 && i < posts.length; i++) {
    const postId = posts[i]?.post?.post_id
    if (postId) {
      const success = await postUpVotePost(postId)
      if (success) count++
      await randomSleep()
    }
  }

  return count
}

/**
 * 执行分享任务
 * @param posts 帖子列表
 */
async function executeShareTask(
  posts: Array<{ post: { post_id: string } }>
): Promise<boolean> {
  const postId = posts[0]?.post?.post_id
  if (!postId) {
    addLog('error', '没有可用的帖子进行分享')
    return false
  }

  return await sharePost(postId)
}
