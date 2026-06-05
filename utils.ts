/**
 * 九号系统签到 - 工具类和公共函数
 * 提取了通用的文件I/O、缓存、JSON处理等功能
 */

declare const FileManager: any

// ============ 常量定义 ============

export const CACHE_EXPIRY_MS = 10 * 60 * 1000 // 10分钟缓存过期时间

// ============ 文件I/O工具 ============

/**
 * 安全读取 JSON 文件
 */
export function readJson<T>(path: string): T | null {
  try {
    if (!FileManager.existsSync(path)) return null
    return JSON.parse(FileManager.readAsStringSync(path)) as T
  } catch (error) {
    console.warn(`[readJson] Failed to read ${path}:`, error)
    return null
  }
}

/**
 * 安全写入 JSON 文件
 */
export function writeJson(path: string, data: unknown) {
  try {
    FileManager.writeAsStringSync(path, JSON.stringify(data))
  } catch (error) {
    console.error(`[writeJson] Failed to write ${path}:`, error)
  }
}

/**
 * 安全删除文件
 */
export function removeFile(path: string): boolean {
  try {
    if (FileManager.existsSync(path)) {
      FileManager.removeSync(path)
      return true
    }
    return false
  } catch (error) {
    console.error(`[removeFile] Failed to remove ${path}:`, error)
    return false
  }
}

/**
 * 检查文件是否存在
 */
export function fileExists(path: string): boolean {
  try {
    return FileManager.existsSync(path)
  } catch {
    return false
  }
}

// ============ 缓存管理 ============

export interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl?: number
}

/**
 * 从缓存中读取数据（带TTL检查）
 */
export function readCacheWithExpiry<T>(path: string, maxAgeMs: number = CACHE_EXPIRY_MS): T | null {
  try {
    const cache = readJson<CacheEntry<T>>(path)
    if (!cache) return null

    const age = Date.now() - cache.timestamp
    if (age > (cache.ttl || maxAgeMs)) {
      console.log(`[cache] Expired: ${path} (${Math.round(age / 1000)}s old)`)
      return null
    }

    console.log(`[cache] Hit: ${path} (${Math.round(age / 1000)}s old)`)
    return cache.data
  } catch (error) {
    console.warn(`[readCacheWithExpiry] Error reading ${path}:`, error)
    return null
  }
}

/**
 * 写入缓存数据
 */
export function writeCacheData<T>(path: string, data: T, ttl?: number) {
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    }
    writeJson(path, entry)
  } catch (error) {
    console.error(`[writeCacheData] Error writing ${path}:`, error)
  }
}

/**
 * 清除过期缓存
 */
export function clearExpiredCache(path: string, maxAgeMs: number = CACHE_EXPIRY_MS): boolean {
  try {
    const cache = readJson<CacheEntry<any>>(path)
    if (!cache) return false

    const age = Date.now() - cache.timestamp
    if (age > (cache.ttl || maxAgeMs)) {
      return removeFile(path)
    }
    return false
  } catch {
    return false
  }
}

// ============ 批量操作优化 ============

/**
 * 批量读取多个路径，避免重复I/O
 */
export function readMultipleJson<T extends Record<string, any>>(paths: Record<keyof T, string>): Partial<T> {
  const results: Partial<T> = {}
  for (const [key, path] of Object.entries(paths)) {
    results[key as keyof T] = readJson(path) as any
  }
  return results
}

/**
 * 批量写入多个路径，避免重复I/O
 */
export function writeMultipleJson(data: Record<string, unknown>) {
  for (const [path, value] of Object.entries(data)) {
    writeJson(path, value)
  }
}

// ============ 字符串和格式化工具 ============

/**
 * 格式化更新时间
 */
export function formatUpdateTime(timestamp?: number): string {
  if (!timestamp || !Number.isFinite(timestamp)) return "--:--"
  const date = new Date(timestamp)
  return `${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`
}

/**
 * 去重数组
 */
export function deduplicateArray<T>(arr: T[], key?: (item: T) => any): T[] {
  if (!key) {
    return Array.from(new Set(arr))
  }
  const seen = new Set()
  return arr.filter((item) => {
    const k = key(item)
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

/**
 * 防抖函数 - 用于减少频繁的 widget 重载
 */
export function createDebounce<T extends any[]>(fn: (...args: T) => void, delayMs: number) {
  let timeoutId: any = null
  return function debounced(...args: T) {
    if (timeoutId !== null) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => {
      fn(...args)
      timeoutId = null
    }, delayMs)
  }
}

// ============ 验证和转换工具 ============

/**
 * 安全的数字解析
 */
export function safeParseNumber(value: any, defaultValue: number = 0): number {
  const num = Number(value)
  return Number.isFinite(num) ? num : defaultValue
}

/**
 * 安全的 JSON 解析
 */
export function safeJsonParse<T>(json: string, defaultValue: T): T {
  try {
    return JSON.parse(json)
  } catch {
    return defaultValue
  }
}

/**
 * 验证颜色代码
 */
export function isValidHexColor(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color)
}

/**
 * 验证坐标
 */
export function isValidCoordinate(lat: any, lng: any): boolean {
  const latitude = safeParseNumber(lat)
  const longitude = safeParseNumber(lng)
  return Number.isFinite(latitude) && Number.isFinite(longitude)
}

// ============ 日期和时间工具 ============

/**
 * 获取格式化的当前日期时间字符串
 */
export function getCurrentDateTimeString(): string {
  return new Date().toLocaleString("zh-CN")
}

/**
 * 检查缓存是否需要刷新（基于时间间隔）
 */
export function shouldRefreshCache(lastRefreshTime?: number, intervalMs: number = CACHE_EXPIRY_MS): boolean {
  if (!lastRefreshTime) return true
  return Date.now() - lastRefreshTime > intervalMs
}

// ============ 数组和对象工具 ============

/**
 * 合并对象，后者覆盖前者
 */
export function mergeObjects<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  return { ...target, ...source }
}

/**
 * 过滤和映射数组
 */
export function filterAndMap<T, U>(arr: T[], predicate: (item: T) => boolean, mapper: (item: T) => U): U[] {
  return arr.filter(predicate).map(mapper)
}

// ============ 错误处理工具 ============

/**
 * 安全的异步执行
 */
export async function safeExecute<T>(fn: () => Promise<T>, defaultValue: T, errorLabel?: string): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    console.error(`[safeExecute${errorLabel ? ` (${errorLabel})` : ""}]`, error)
    return defaultValue
  }
}

/**
 * 带重试的异步执行
 */
export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000,
  errorLabel?: string
): Promise<T | null> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      if (attempt === maxRetries) {
        console.error(`[executeWithRetry${errorLabel ? ` (${errorLabel})` : ""}] All ${maxRetries} attempts failed:`, error)
        return null
      }
      console.warn(`[executeWithRetry] Attempt ${attempt}/${maxRetries} failed, retrying in ${delayMs}ms...`)
      await new Promise<void>((resolve) => setTimeout(() => resolve(), delayMs))
    }
  }
  return null
}
