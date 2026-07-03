/**
 * 米游社自动助手 - 游戏配置 v2.0
 *
 * 定义所有支持的游戏版块信息、Luna API 端点、签到参数
 * 支持：原神、崩坏：星穹铁道、绝区零、崩坏3、未定事件簿、崩坏学园2
 *
 * 数据来源：
 *   - PizzaHelperUnited (iOS 原生 APP 抓包)
 *   - MihoyoBBSTools (国际服 API 对照)
 *   - hoyolab-auto-sign (act_id 参考)
 */

import type { GameId, GameConfig, Board, BoardsConfig, MiCoinTaskDef, MiCoinTaskId } from './types'

// ============================================================
// 游戏配置表
// ============================================================

/**
 * 所有支持的游戏配置
 *
 * act_id 说明：
 *   - 国际服(HoYoLAB)和国服(米游社)的 act_id 不同
 *   - 以下 act_id 为国服版本，可能随活动更新而变化
 *   - 如签到失败，首先检查 act_id 是否过期
 *
 * signGameHeader 说明：
 *   - 部分游戏签到 API 需要额外的 x-rpc-signgame 请求头
 *   - 绝区零必须携带 x-rpc-signgame: nap
 *   - 星穹铁道必须携带 x-rpc-signgame: hkrpg
 */
export const GAMES: Record<GameId, GameConfig> = {
  // ---- 原神 ----
  genshin: {
    id: 'genshin',
    name: '原神',
    gameCode: 'hk4e',
    biz: 'hk4e_cn',
    actId: 'e202311201442471',
    forumId: 26,
    icon: 'sparkles',
    color: '#E2A93B',
  },

  // ---- 崩坏：星穹铁道 ----
  starrail: {
    id: 'starrail',
    name: '崩坏：星穹铁道',
    gameCode: 'hkrpg',
    biz: 'hkrpg_cn',
    actId: 'e202304121431091',
    forumId: 52,
    icon: 'moon.stars',
    color: '#6B7BFF',
  },

  // ---- 绝区零 ----
  zzz: {
    id: 'zzz',
    name: '绝区零',
    gameCode: 'nap',
    biz: 'nap_cn',
    actId: 'e202407291442471',
    forumId: 83,
    icon: 'bolt.fill',
    color: '#FF4D4D',
  },

  // ---- 崩坏3 ----
  honkai3rd: {
    id: 'honkai3rd',
    name: '崩坏3',
    gameCode: 'bh3',
    biz: 'bh3_cn',
    actId: 'e202203021431091',
    forumId: 8,
    icon: 'flame.fill',
    color: '#FF6B35',
  },

  // ---- 未定事件簿 ----
  tot: {
    id: 'tot',
    name: '未定事件簿',
    gameCode: 'nxx',
    biz: 'nxx_cn',
    actId: 'e202203021431091',
    forumId: 37,
    icon: 'heart.fill',
    color: '#FF6B9D',
  },

  // ---- 崩坏学园2 ----
  honkai2: {
    id: 'honkai2',
    name: '崩坏学园2',
    gameCode: 'bh2',
    biz: 'bh2_cn',
    actId: '', // 崩坏学园2 使用旧版签到 API，非 Luna
    forumId: 30,
    icon: 'gamecontroller.fill',
    color: '#9B59B6',
  },
}

// ============================================================
// BBS 版块配置（用于米游币任务）
// ============================================================

/**
 * 米游社版块配置
 * 保留向后兼容，新代码优先使用 GAMES
 */
export const boards: BoardsConfig = {
  genshin: {
    forumid: 26,
    key: 'genshin',
    biz: 'hk4e_cn',
    actid: GAMES.genshin.actId,
    name: '原神',
    url: 'https://bbs.mihoyo.com/ys/',
    getReferer() {
      return `https://webstatic.mihoyo.com/bbs/event/signin-ys/index.html?bbs_auth_required=true&act_id=${this.actid}&utm_source=bbs&utm_medium=mys&utm_campaign=icon`
    },
  },

  honkai2: {
    forumid: 30,
    key: 'honkai2',
    biz: 'bh2_cn',
    actid: GAMES.honkai2.actId || undefined,
    name: '崩坏学园2',
    url: 'https://bbs.mihoyo.com/bh2/',
  },

  tot: {
    forumid: 37,
    key: 'tot',
    biz: 'nxx_cn',
    name: '未定事件簿',
    url: 'https://bbs.mihoyo.com/wd/',
  },

  house: {
    forumid: 34,
    key: 'genshin',
    biz: 'hk4e_cn',
    name: '大别野',
    url: 'https://bbs.mihoyo.com/dby/',
  },

  starrail: {
    forumid: 52,
    key: 'starrail',
    biz: 'hkrpg_cn',
    name: '崩坏：星穹铁道',
    url: 'https://bbs.mihoyo.com/sr/',
  },

  honkai3rd: {
    forumid: 8,
    key: 'honkai3rd',
    biz: 'bh3_cn',
    name: '崩坏3',
    url: 'https://bbs.mihoyo.com/bh3/',
  },

  zzz: {
    forumid: 83,
    key: 'zzz',
    biz: 'nap_cn',
    name: '绝区零',
    url: 'https://bbs.mihoyo.com/zzz/',
  },
}

// ============================================================
// Luna API 端点模板
// ============================================================

/**
 * Luna 签到 API 端点
 * 通过 gameCode 参数化，支持所有使用 Luna 系统的游戏
 */
export const LUNA_API = {
  /** 签到信息查询 */
  info: 'https://api-takumi.mihoyo.com/event/luna/{gameCode}/info?lang=zh-cn&region={region}&act_id={actId}&uid={uid}',

  /** 奖励列表查询 */
  home: 'https://api-takumi.mihoyo.com/event/luna/{gameCode}/home?lang=zh-cn&act_id={actId}',

  /** 执行签到 */
  sign: 'https://api-takumi.mihoyo.com/event/luna/{gameCode}/sign',

  /** 补签信息查询 */
  resignInfo: 'https://api-takumi.mihoyo.com/event/luna/{gameCode}/resign_info?uid={uid}&region={region}&act_id={actId}',

  /** 执行补签 */
  resign: 'https://api-takumi.mihoyo.com/event/luna/{gameCode}/resign',
}

/**
 * 游戏签到需要的额外请求头
 * 不同游戏可能需要不同的 x-rpc-signgame 值
 */
export const SIGN_HEADERS: Partial<Record<GameId, Record<string, string>>> = {
  zzz: { 'x-rpc-signgame': 'nap' },
  starrail: { 'x-rpc-signgame': 'hkrpg' },
  genshin: { 'x-rpc-signgame': 'hk4e' },
  honkai3rd: { 'x-rpc-signgame': 'bh3' },
  tot: { 'x-rpc-signgame': 'nxx' },
}

// ============================================================
// 米游币任务配置
// ============================================================

// Scripting 平台内部引用，需导出空数组
export const CHANNEL_EXP_TASKS: any[] = []

/**
 * 米游币任务定义
 * 58=讨论区签到, 59=浏览帖子, 60=点赞帖子, 61=分享帖子
 */
export const MICOIN_TASKS: readonly MiCoinTaskDef[] = [
  { id: 58, name: '讨论区签到', reward: 30, icon: 'checkmark.circle.fill', targetTimes: 1 },
  { id: 59, name: '浏览帖子', reward: 20, icon: 'doc.text.fill', targetTimes: 3 },
  { id: 60, name: '点赞帖子', reward: 30, icon: 'hand.thumbsup.fill', targetTimes: 5 },
  { id: 61, name: '分享帖子', reward: 10, icon: 'square.and.arrow.up', targetTimes: 1 },
] as const

// ============================================================
// 辅助函数
// ============================================================

/**
 * 根据游戏 ID 获取游戏配置
 * @param gameId 游戏 ID
 */
export function getGameConfig(gameId: GameId): GameConfig | undefined {
  return GAMES[gameId]
}

/**
 * 根据版块 ID 获取版块信息
 * @param forumId 版块 ID
 */
export function getBoardById(forumId: number): Board | undefined {
  for (const key of Object.keys(boards)) {
    const board = boards[key as keyof BoardsConfig]
    if (board && board.forumid === forumId) {
      return board
    }
  }
  return undefined
}

/**
 * 获取所有可选的版块列表（用于配置 UI）
 */
export function getBoardOptions(): Array<{ id: number; name: string }> {
  return Object.values(GAMES)
    .filter(g => g.forumId > 0)
    .map(g => ({ id: g.forumId, name: g.name }))
}

/**
 * 获取所有支持签到的游戏列表（有 actId 的游戏）
 * 用于游戏签到配置 UI
 */
export function getSignableGames(): Array<{ id: GameId; name: string; biz: string; actId: string }> {
  return Object.values(GAMES)
    .filter(g => g.actId !== '')
    .map(g => ({
      id: g.id,
      name: g.name,
      biz: g.biz,
      actId: g.actId,
    }))
}

/**
 * 获取所有游戏列表（用于 UI 展示）
 * 包含签到和非签到游戏
 */
export function getAllGames(): Array<{ id: GameId; name: string; icon: string; color: string }> {
  return Object.values(GAMES).map(g => ({
    id: g.id,
    name: g.name,
    icon: g.icon,
    color: g.color,
  }))
}

/**
 * 根据 gameCode 查找游戏 ID
 * @param gameCode Luna API 游戏代码（hk4e, hkrpg, nap 等）
 */
export function getGameIdByCode(gameCode: string): GameId | undefined {
  for (const [id, config] of Object.entries(GAMES)) {
    if (config.gameCode === gameCode) {
      return id as GameId
    }
  }
  return undefined
}

/**
 * 根据 forumId 查找游戏 ID
 * @param forumId 米游社版块 ID
 */
export function getGameIdByForumId(forumId: number): GameId | undefined {
  for (const [id, config] of Object.entries(GAMES)) {
    if (config.forumId === forumId) {
      return id as GameId
    }
  }
  return undefined
}

/**
 * 获取任务名称
 * @param taskId 任务 ID
 */
export function getTaskName(taskId: number): string {
  const task = MICOIN_TASKS.find(t => t.id === taskId)
  return task ? task.name : `未知任务(${taskId})`
}

/**
 * 获取任务配置
 * @param taskId 任务 ID
 */
export function getTaskDef(taskId: MiCoinTaskId): MiCoinTaskDef | undefined {
  return MICOIN_TASKS.find(t => t.id === taskId)
}

/**
 * 构建 Luna API URL
 * @param template URL 模板
 * @param params 参数映射
 */
export function buildLunaUrl(
  template: string,
  params: { gameCode: string; actId: string; region?: string; uid?: string }
): string {
  return template
    .replace('{gameCode}', params.gameCode)
    .replace('{actId}', params.actId)
    .replace('{region}', params.region || '')
    .replace('{uid}', params.uid || '')
}
