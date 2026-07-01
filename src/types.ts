/**
 * 米游社自动助手 - 类型定义 v2.0
 *
 * 统一所有接口和类型，确保类型安全
 * 支持多账号、全游戏签到、耗时统计
 *
 * 向后兼容策略：
 *   - AppConfig 保留旧版扁平字段（tasks/micoin/signGames）
 *   - 新增多账号字段（activeAccountId/accountConfigs/settings）
 *   - GameRole 保持 snake_case（匹配 API 原始响应）
 *   - GameAccount 保留为 GameRole 别名
 */

// ============================================================
// 游戏相关类型
// ============================================================

/**
 * 支持的游戏类型
 * 统一使用小写驼峰命名，修复旧版不一致问题
 *
 * 旧版映射：
 *   'honkaisr' → 'starrail'（崩坏：星穹铁道）
 *   'tears' → 'tot'（未定事件簿）
 *   'honkai2' → 保留（崩坏学园2）
 */
export type GameId =
  | 'genshin'      // 原神
  | 'starrail'     // 崩坏：星穹铁道
  | 'zzz'          // 绝区零
  | 'honkai3rd'    // 崩坏3
  | 'tot'          // 未定事件簿
  | 'honkai2'      // 崩坏学园2

/** 向后兼容别名 */
export type GameType = GameId

/** 游戏配置 */
export interface GameConfig {
  /** 游戏唯一标识 */
  id: GameId
  /** 显示名称 */
  name: string
  /** Luna API 游戏代码（hk4e, hkrpg, nap, bh3, nxx, bh2） */
  gameCode: string
  /** 业务标识（hk4e_cn, hkrpg_cn 等） */
  biz: string
  /** Luna 签到活动 ID（需要定期更新） */
  actId: string
  /** 米游社版块 ID（用于米游币任务浏览帖子） */
  forumId: number
  /** SF Symbol 图标名称 */
  icon: string
  /** 主题色（十六进制或系统色） */
  color: string
}

/**
 * BBS 版块信息（用于米游币任务）
 * 保留旧版兼容，新代码优先使用 GameConfig
 */
export interface Board {
  /** 版块 ID */
  forumid: number
  /** 游戏标识 */
  key: GameId
  /** 业务标识 */
  biz: string
  /** 活动 ID（签到用） */
  actid?: string
  /** 显示名称 */
  name: string
  /** 版块 URL */
  url: string
  /** 获取签到 Referer */
  getReferer?: () => string
}

/** 版块配置映射（向后兼容） */
export type BoardsConfig = Record<string, Board>

// ============================================================
// 账号相关类型
// ============================================================

/**
 * 游戏角色信息（保持 snake_case 匹配 API 原始响应）
 * 从 getUserGameRolesByCookie API 返回
 */
export interface GameRole {
  /** 游戏 UID */
  game_uid: string
  /** 服务器区域代码 */
  region: string
  /** 服务器显示名称 */
  region_name: string
  /** 角色昵称 */
  nickname: string
  /** 角色等级 */
  level: number
  /** 业务标识 */
  game_biz: string
  /** 是否为选中角色 */
  is_chosen: boolean
  /** 头像 URL（可选） */
  avatar?: string
}

/** 向后兼容别名 */
export type GameAccount = GameRole

/**
 * 签到信息（保持 snake_case 匹配 API 原始响应）
 */
export interface SignInfo {
  /** 累计签到天数 */
  total_sign_day: number
  /** 是否首次绑定 */
  first_bind: boolean
  /** 今日是否已签到 */
  is_sign: boolean
}

/**
 * 签到信息（camelCase 版本，用于内部逻辑）
 */
export interface SignInfoCamel {
  totalSignDay: number
  firstBind: boolean
  isSign: boolean
}

/**
 * 账号信息
 * 存储完整的登录凭据和角色数据
 */
export interface AccountInfo {
  /** 唯一标识（UUID） */
  id: string
  /** 米游社 UID（从 Cookie 中提取） */
  uid: string
  /** 用户昵称 */
  nickname: string
  /** 头像 URL */
  avatar?: string
  /** 登录 Cookie 字符串 */
  cookie: string
  /** APP 级别 Token（可选，用于点赞/分享等需要 stoken 的操作） */
  stoken?: string
  /** stoken 用户 ID */
  stuid?: string
  /** stoken 中间件 ID */
  mid?: string
  /** 是否激活（可用） */
  isActive: boolean
  /** 创建时间（时间戳） */
  createdAt: number
  /** 上次签到时间（时间戳） */
  lastSignIn?: number
  /** 绑定的游戏角色列表 */
  gameRoles: GameRole[]
}

// ============================================================
// 米游币任务相关类型
// ============================================================

/** 米游币任务 ID */
export type MiCoinTaskId = 58 | 59 | 60 | 61

/** 米游币任务定义 */
export interface MiCoinTaskDef {
  id: MiCoinTaskId
  name: string
  reward: number
  icon: string
  /** 需要完成的次数 */
  targetTimes: number
}

/** 任务状态（从 API 返回） */
export interface TaskState {
  id: MiCoinTaskId
  times: number
  isGetAward: boolean
}

/** 任务类型枚举 */
export type TaskType = 'micoin' | 'sign'

/** 任务执行结果 */
export interface TaskResult {
  /** 是否成功 */
  success: boolean
  /** 结果消息 */
  message: string
  /** 执行耗时（毫秒） */
  duration?: number
  /** 获取的奖励列表 */
  rewards?: TaskReward[]
}

/** 任务奖励 */
export interface TaskReward {
  name: string
  count: number
  icon?: string
}

// ============================================================
// 签到奖励相关类型
// ============================================================

/** 签到奖励 */
export interface SignAward {
  /** 奖励名称 */
  name: string
  /** 奖励数量 */
  count: number
  /** 奖励图标 */
  icon?: string
}

/**
 * 游戏签到状态（用于 UI 展示）
 */
export interface GameSignStatus {
  /** 游戏 ID */
  gameId: GameId
  /** 游戏名称 */
  gameName: string
  /** 今日是否已签到 */
  signed: boolean
  /** 连续签到天数 */
  totalDays: number
  /** 今日奖励 */
  todayAward?: SignAward
  /** 上次签到时间 */
  lastSignIn?: number
  /** 签到角色昵称 */
  characterName?: string
}

// ============================================================
// API 响应类型
// ============================================================

/** 通用 API 响应 */
export interface ApiResponse<T = any> {
  retcode: number
  message: string
  data: T
}

/** 用户任务状态响应 */
export interface Mission {
  id: number
  name: string
  desc: string
  points: number
  next_points: number
  limit: number
  continuous_cycle_times: number
  happened_times?: number
  is_auto_send_award: boolean
  is_get_award?: boolean
  mission_key?: string
}

export interface MissionStateResponse {
  can_get_points: number
  total_points: number
  already_received_points: number
  today_total_points: number
  missions: Mission[]
  more_missions: Mission[]
  states: Array<{
    mission_id: number
    happened_times: number
    is_get_award: boolean
  }>
}

/** 帖子列表响应 */
export interface ForumPostListResponse {
  list: Array<{
    post: {
      post_id: string
      subject: string
      content: string
    }
  }>
}

/** 用户信息响应 */
export interface UserInfoResponse {
  list: GameRole[]
}

// ============================================================
// 配置相关类型
// ============================================================

/** 米游币任务配置 */
export interface MiCoinConfig {
  /** 执行任务的讨论区 ID 列表 */
  sections: number[]
  /** 需要执行的任务 ID 列表 */
  actions: MiCoinTaskId[]
}

/**
 * 全局配置
 *
 * 向后兼容：保留旧版扁平字段（tasks/micoin/signGames）
 * 新增多账号字段（activeAccountId/accountConfigs/settings）
 *
 * getConfig() 返回此类型，旧代码可直接访问 config.tasks 等字段
 */
export interface AppConfig {
  // === 向后兼容：旧版扁平字段（单账号模式） ===
  /** 启用的任务列表：'micoin'=米游币, 'sign'=游戏签到 */
  tasks: TaskType[]
  /** 米游币任务配置 */
  micoin: MiCoinConfig
  /** 启用的游戏签到列表 */
  signGames: GameId[]

  // === 新版：多账号支持（可选字段） ===
  /** 当前激活账号 ID */
  activeAccountId?: string
  /** 各账号独立配置（key = account.id） */
  accountConfigs?: Record<string, AccountConfig>
  /** 全局设置 */
  settings?: AppSettings
}

/**
 * 单账号配置（新版多账号结构）
 */
export interface AccountConfig {
  /** 启用的任务类型列表 */
  tasks: TaskType[]
  /** 米游币任务配置 */
  micoin: MiCoinConfig
  /** 启用的游戏签到列表 */
  signGames: GameId[]
}

/**
 * 全局设置（跨账号共享）
 */
export interface AppSettings {
  /** 自动签到 */
  autoSignIn: boolean
  /** 自动执行米游币任务 */
  autoMiCoin: boolean
  /** 通知开关 */
  notifications: boolean
  /** 定时执行 - 启用 */
  scheduleEnabled: boolean
  /** 定时执行 - 小时 (0-23) */
  scheduleHour: number
  /** 定时执行 - 分钟 (0-59) */
  scheduleMinute: number
  /** 小组件刷新间隔（分钟） */
  widgetRefreshInterval: number
  /** 小组件自动执行 */
  widgetAutoRun: boolean
  /** 小组件通知 */
  widgetNotify: boolean
}

/**
 * 默认配置（向后兼容旧版 getConfig/saveConfig）
 */
export const DEFAULT_CONFIG: AppConfig = {
  tasks: ['micoin', 'sign'],
  micoin: {
    sections: [34], // 默认大别野
    actions: [58, 59, 60, 61],
  },
  signGames: ['genshin'],
}

/**
 * 默认全局设置
 */
export const DEFAULT_SETTINGS: AppSettings = {
  autoSignIn: true,
  autoMiCoin: true,
  notifications: true,
  scheduleEnabled: false,
  scheduleHour: 8,
  scheduleMinute: 0,
  widgetRefreshInterval: 15,
  widgetAutoRun: false,
  widgetNotify: true,
}

// ============================================================
// Widget 数据类型
// ============================================================

/** 任务进度（Widget 用） */
export interface TaskProgress {
  id: number
  name: string
  current: number
  total: number
  reward: number
  done: boolean
}

/** 签到奖励展示（Widget 用） */
export interface SignReward {
  gameId: GameId
  gameName: string
  name: string
  count: number
  signed: boolean
}

/**
 * Widget 显示数据
 * 写入 Storage 供桌面组件读取
 */
export interface WidgetData {
  /** 角色昵称 */
  nickname: string
  /** 米游社 UID */
  uid: string
  /** 服务器名 */
  serverName: string
  /** 角色等级 */
  level: number
  /** 米游币余额 */
  coinBalance: number
  /** 今日可获取米游币 */
  coinToday: number
  /** 连续签到天数 */
  signDays: number
  /** 今日是否已签到 */
  signedToday: boolean
  /** 每日任务进度 */
  tasks: TaskProgress[]
  /** 今日签到奖励 */
  rewards: SignReward[]
  /** 游戏统计数据 */
  gameStats: Array<{ name: string; value: string }>
  /** 最近日志 */
  logs: Array<{ time: string; level: string; message: string }>
  /** 数据获取时间 */
  fetchTime: number
  /** 是否已登录 */
  loggedIn: boolean
}

// ============================================================
// 日志类型
// ============================================================

/** 日志条目 */
export interface LogEntry {
  /** 时间（HH:MM:SS 格式） */
  time: string
  /** 级别 */
  level: 'info' | 'success' | 'error' | 'warn'
  /** 消息内容 */
  message: string
  /** 耗时（毫秒，可选） */
  duration?: number
}

// ============================================================
// 定时调度类型
// ============================================================

/** 定时配置 */
export interface ScheduleConfig {
  enabled: boolean
  hour: number
  minute: number
}

// ============================================================
// 存储 Key 常量
// ============================================================

export const STORAGE_KEYS = {
  /** 账号列表 JSON（AccountInfo[]） */
  ACCOUNTS: 'mihoyo_accounts',
  /** 当前激活账号 ID */
  ACTIVE_ACCOUNT: 'mihoyo_active_account_id',
  /** 统一的 Cookie 字符串（向后兼容，新代码用 ACCOUNTS） */
  COOKIE: 'mihoyo_cookie',
  /** 应用配置 JSON（向后兼容，新代码用 AppConfig） */
  CONFIG: 'mihoyo_config',
  /** 任务执行历史 */
  TASK_HISTORY: 'mihoyo_task_history',
  /** 设备 ID */
  DEVICE_ID: 'mihoyo_device_id',
  /** 设备指纹 */
  DEVICE_FP: 'mihoyo_device_fp',
  /** 定时配置 */
  SCHEDULE: 'mihoyo_schedule',
  /** Widget 数据 */
  WIDGET_DATA: 'widget_role_data',
  /** Widget 刷新间隔 */
  WIDGET_REFRESH: 'widget_refresh_interval',
  /** Widget 自动执行 */
  WIDGET_AUTO_RUN: 'widget_auto_run',
  /** Widget 通知 */
  WIDGET_NOTIFY: 'widget_notify',
  /** 上次执行结果 */
  LAST_RESULT: 'mihoyo_last_result',
  /** 上次执行时间 */
  LAST_RUN_TIME: 'mihoyo_last_run_time',
  /** 调试模式 */
  DEBUG_MODE: 'mihoyo_debug_mode',
  /** stoken */
  STOKEN: 'mihoyo_stoken',
  /** stuid */
  STUID: 'mihoyo_stuid',
  /** mid */
  MID: 'mihoyo_mid',
} as const
