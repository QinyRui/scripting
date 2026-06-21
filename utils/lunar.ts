/**
 * 🌤️ 彩云天气 - 农历/节气/节日/宜忌
 * 从 widget.tsx 拆分
 */
import {
  lunarInfo,
  heavenlyStems,
  earthlyBranches,
  yellowBlackDays,
  twentyEightMansions,
  solarTerms,
  solarTermOffsets,
  weekTitle,
  weekTitleShort,
} from "./constants"

// ─── 农历基础 ───
function lYearDays(y: number) {
  let i
  let sum = 348
  for (i = 0x8000; i > 0x8; i >>= 1) sum += (lunarInfo[y - 1900] & i) ? 1 : 0
  return sum + ((lunarInfo[y - 1900] & 0xf) ? ((lunarInfo[y - 1900] & 0x10000) ? 30 : 29) : 0)
}

export function getLunarDate_Precise(date: Date) {
  const lm = ["正月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "冬月", "腊月"]
  const ld = ["初一", "初二", "初三", "初四", "初五", "初六", "初七", "初八", "初九", "初十", "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十", "廿一", "廿二", "廿三", "廿四", "廿五", "廿六", "廿七", "廿八", "廿九", "三十"]
  const y = date.getFullYear()
  const m = date.getMonth() + 1
  const d = date.getDate()
  let offset = Math.floor((Date.UTC(y, m - 1, d) - Date.UTC(1900, 0, 31)) / 86400000)
  let year = 1900
  while (year < 2100 && offset >= lYearDays(year)) {
    offset -= lYearDays(year)
    year++
  }
  let leapMonth = lunarInfo[year - 1900] & 0xf
  let isLeap = false
  let month
  let monthDays
  for (month = 1; month <= 12; month++) {
    if (leapMonth > 0 && month === leapMonth + 1 && !isLeap) {
      monthDays = (lunarInfo[year - 1900] & 0x10000) ? 30 : 29
      if (offset < monthDays) {
        isLeap = true
        break
      }
      offset -= monthDays
      isLeap = true
    } else {
      monthDays = (lunarInfo[year - 1900] & (0x10000 >> month)) ? 30 : 29
      if (offset < monthDays) break
      offset -= monthDays
    }
  }
  let dayIndex = Math.floor(offset)
  if (dayIndex < 0) dayIndex = 0
  if (dayIndex >= ld.length) dayIndex = ld.length - 1
  const monthName = leapMonth > 0 && month === leapMonth + 1 && isLeap ? `闰${lm[leapMonth - 1]}` : lm[(month || 1) - 1]
  return { month: monthName, day: ld[dayIndex] }
}

export function safeGetLunarStr() {
  try {
    const o = getLunarDate_Precise(new Date())
    return o.month + o.day
  } catch {
    return ""
  }
}

// ─── 天干地支/黄黑道/二十八宿 ───
export function getStemBranchDay(date: Date) {
  const baseDate = new Date(1900, 0, 31)
  const daysDiff = Math.floor((date.getTime() - baseDate.getTime()) / (24 * 60 * 60 * 1000))
  const stemIndex = daysDiff % 10
  const branchIndex = daysDiff % 12
  return heavenlyStems[(stemIndex + 10) % 10] + earthlyBranches[(branchIndex + 12) % 12]
}

export function getYellowBlackDay(date: Date) {
  const lunarDate = getLunarDate_Precise(date)
  const monthMap: Record<string, number> = { "正月":1,"二月":2,"三月":3,"四月":4,"五月":5,"六月":6,"七月":7,"八月":8,"九月":9,"十月":10,"冬月":11,"腊月":12 }
  const dayMap: Record<string, number> = { "初一":1,"初二":2,"初三":3,"初四":4,"初五":5,"初六":6,"初七":7,"初八":8,"初九":9,"初十":10,"十一":11,"十二":12,"十三":13,"十四":14,"十五":15,"十六":16,"十七":17,"十八":18,"十九":19,"二十":20,"廿一":21,"廿二":22,"廿三":23,"廿四":24,"廿五":25,"廿六":26,"廿七":27,"廿八":28,"廿九":29,"三十":30 }
  const m = monthMap[lunarDate.month.replace("闰", "")] || 1
  const d = dayMap[lunarDate.day] || 1
  return yellowBlackDays[(m + d - 2) % 12]
}

export function getMansion(date: Date) {
  const baseDate = new Date(1900, 0, 31)
  const daysDiff = Math.floor((date.getTime() - baseDate.getTime()) / (24 * 60 * 60 * 1000))
  return twentyEightMansions[(daysDiff % 28 + 28) % 28]
}

function isAuspiciousDay(date: Date) {
  const yb = getYellowBlackDay(date)
  const man = getMansion(date)
  const goodYb = ["除", "危", "定", "执", "成", "开"]
  const goodMan = ["角", "房", "尾", "箕", "斗", "室", "壁", "娄", "胃", "毕", "参", "井", "张", "轸"]
  return goodYb.includes(yb) && goodMan.includes(man)
}

// ─── 宜忌 ───
export function getTraditionalYiJi(date: Date) {
  const sb = getStemBranchDay(date)
  const yb = getYellowBlackDay(date)
  const isAus = isAuspiciousDay(date)
  const yi: string[] = []
  const ji: string[] = []
  const stem = sb[0]
  if (["甲", "乙"].includes(stem)) {
    yi.push("祭祀", "祈福", "入学", "栽种")
    ji.push("动土", "开市", "破屋")
  } else if (["丙", "丁"].includes(stem)) {
    yi.push("嫁娶", "开市", "出行")
    ji.push("祭祀", "动土", "安葬")
  } else if (["戊", "己"].includes(stem)) {
    yi.push("修造", "动土", "入宅")
    ji.push("开市", "嫁娶", "出行")
  } else if (["庚", "辛"].includes(stem)) {
    yi.push("求医", "诉讼", "交易")
    ji.push("祈福", "祭祀", "安床")
  } else {
    yi.push("出行", "移徙", "纳财")
    ji.push("修造", "动土", "开仓")
  }
  const ybMap: Record<string, [string[], string[]]> = {
    建: [["祭祀", "祈福"], ["嫁娶", "开市"]],
    除: [["治病", "扫舍"], ["出行", "诉讼"]],
    满: [["祭祀", "开市"], ["嫁娶", "安葬"]],
    平: [["修造", "安床"], ["开市", "交易"]],
    定: [["嫁娶", "订盟"], ["词讼", "开渠"]],
    执: [["捕捉", "破土"], ["嫁娶", "移徙"]],
    破: [["破屋", "坏垣"], ["嫁娶", "开市"]],
    危: [["安床", "入宅"], ["破土", "开渠"]],
    成: [["嫁娶", "开市"], ["造桥", "安床"]],
    收: [["纳财", "交易"], ["开市", "安葬"]],
    开: [["开市", "交易"], ["破土", "安葬"]],
    闭: [["筑堤", "补垣"], ["开市", "出行"]],
  }
  if (ybMap[yb]) {
    yi.push(...ybMap[yb][0])
    ji.push(...ybMap[yb][1])
  }
  if (isAus) yi.push("嫁娶", "开市", "入宅")
  else ji.push("嫁娶", "开市", "出行")
  return { yi: [...new Set(yi)].slice(0, 6), ji: [...new Set(ji)].slice(0, 6) }
}

export function getYiJiSimple(date: Date, type: number) {
  const t = getTraditionalYiJi(date)
  return type === 0 ? t.yi : t.ji
}

// ─── 节气 ───
export function getSolarTerm(date: Date) {
  const year = date.getFullYear()
  const month = date.getMonth()
  const day = date.getDate()
  const targetUtc = Date.UTC(year, month, day)
  const base = Date.UTC(1900, 0, 6, 2, 5)
  const off = 31556925974.7 * (year - 1900)
  for (let i = 0; i < 24; i++) {
    const term = new Date(base + off + solarTermOffsets[i] * 60000)
    const termUtc = Date.UTC(term.getUTCFullYear(), term.getUTCMonth(), term.getUTCDate())
    if (termUtc === targetUtc) return solarTerms[i]
  }
  return null
}

export function getSolarTermDate(year: number, index: number) {
  const base = Date.UTC(1900, 0, 6, 2, 5)
  const off = 31556925974.7 * (year - 1900)
  return new Date(base + off + solarTermOffsets[index] * 60000)
}

export function getNextSolarTermInfo(date: Date) {
  const nowUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  const year = date.getFullYear()
  let nextTerm: { term: string; daysLeft: number } | null = null
  let minDays = Infinity
  for (let y = year; y <= year + 1; y++) {
    for (let i = 0; i < 24; i++) {
      const termDate = getSolarTermDate(y, i)
      const termUtc = Date.UTC(termDate.getUTCFullYear(), termDate.getUTCMonth(), termDate.getUTCDate())
      if (termUtc > nowUtc) {
        const days = Math.floor((termUtc - nowUtc) / (1000 * 60 * 60 * 24))
        if (days < minDays) {
          minDays = days
          nextTerm = { term: solarTerms[i], daysLeft: days }
        }
      }
    }
  }
  return nextTerm
}

// ─── 节日 ───
function nthWeekdayOfMonth(year: number, month: number, weekday: number, nth: number) {
  const first = new Date(year, month, 1)
  const offset = (7 + weekday - first.getDay()) % 7
  return new Date(year, month, 1 + offset + (nth - 1) * 7)
}

export function getNextFestivalInfo(date: Date) {
  const year = date.getFullYear()
  const fixedFestivals = [
    { name: "元旦", month: 1, day: 1 },
    { name: "情人节", month: 2, day: 14 },
    { name: "劳动节", month: 5, day: 1 },
    { name: "儿童节", month: 6, day: 1 },
    { name: "国庆节", month: 10, day: 1 },
    { name: "圣诞节", month: 12, day: 25 },
  ]
  const specialFestivals = [
    { name: "母亲节", date: nthWeekdayOfMonth(year, 4, 0, 2) },
    { name: "父亲节", date: nthWeekdayOfMonth(year, 5, 0, 3) },
  ]
  const all = [
    ...fixedFestivals.map((item) => ({ name: item.name, date: new Date(year, item.month - 1, item.day) })),
    ...specialFestivals,
    ...fixedFestivals.map((item) => ({ name: item.name, date: new Date(year + 1, item.month - 1, item.day) })),
    { name: "母亲节", date: nthWeekdayOfMonth(year + 1, 4, 0, 2) },
    { name: "父亲节", date: nthWeekdayOfMonth(year + 1, 5, 0, 3) },
  ]
  const today = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  let result: { name: string; daysLeft: number } | null = null
  for (const item of all) {
    const target = new Date(item.date.getFullYear(), item.date.getMonth(), item.date.getDate()).getTime()
    const daysLeft = Math.round((target - today) / 86400000)
    if (daysLeft >= 0 && (!result || daysLeft < result.daysLeft)) {
      result = { name: item.name, daysLeft }
    }
  }
  return result
}

// ─── 倒计时 ───
export function getPrimaryCountdownText(date: Date) {
  const todayTerm = getSolarTerm(date)
  const nextTermInfo = getNextSolarTermInfo(date)
  if (todayTerm && nextTermInfo) return `今日${todayTerm} · 距离${nextTermInfo.term}还有${nextTermInfo.daysLeft}天`
  if (todayTerm) return `今日节气：${todayTerm}`
  if (nextTermInfo) return `距离${nextTermInfo.term}还有${nextTermInfo.daysLeft}天`
  return ""
}

export function getSecondaryCountdownText(date: Date) {
  const nextFestivalInfo = getNextFestivalInfo(date)
  if (!nextFestivalInfo) return ""
  return nextFestivalInfo.daysLeft === 0 ? `${nextFestivalInfo.name}` : `距离${nextFestivalInfo.name}还有${nextFestivalInfo.daysLeft}天`
}

// ─── 农历月日编号映射（用于反向匹配节日） ───
const LUNAR_MONTH_INDEX: Record<string, number> = {
  "正月": 1, "二月": 2, "三月": 3, "四月": 4, "五月": 5, "六月": 6,
  "七月": 7, "八月": 8, "九月": 9, "十月": 10, "冬月": 11, "腊月": 12,
}
const LUNAR_DAY_INDEX: Record<string, number> = {
  "初一": 1, "初二": 2, "初三": 3, "初四": 4, "初五": 5, "初六": 6, "初七": 7, "初八": 8, "初九": 9, "初十": 10,
  "十一": 11, "十二": 12, "十三": 13, "十四": 14, "十五": 15, "十六": 16, "十七": 17, "十八": 18, "十九": 19, "二十": 20,
  "廿一": 21, "廿二": 22, "廿三": 23, "廿四": 24, "廿五": 25, "廿六": 26, "廿七": 27, "廿八": 28, "廿九": 29, "三十": 30,
}

// 农历节日：[农历月, 农历日, 名称]
// 说明：
//   · 春节是 1 月 1 日，正常枚举匹配
//   · 端午、七夕、中秋等是固定农历日期，不受闰月影响
//   · 闰月节日（如闰四月端午）通常仍按原月计算，这里以主月为准
//   · 除夕是腊月最后一天（非固定日），单独判定
const LUNAR_FESTIVALS: Array<[number, number, string]> = [
  [1, 1, "春节"],
  [1, 15, "元宵节"],
  [2, 2, "龙抬头"],
  [5, 5, "端午节"],
  [7, 7, "七夕节"],
  [7, 15, "中元节"],
  [8, 15, "中秋节"],
  [9, 9, "重阳节"],
  [10, 1, "寒衣节"],
  [10, 15, "下元节"],
  [12, 8, "腊八节"],
  [12, 23, "小年"],
]

/**
 * 判断给定公历日期是否为农历除夕（腊月最后一天）。
 * 判断逻辑：今天 lunar.month === "腊月" 且明天是正月初一。
 */
function isLunarNewYearsEve(date: Date, baseDayMs: number) {
  const lunar = getLunarDate_Precise(date)
  if (lunar.month !== "腊月") return false
  const tomorrowLunar = getLunarDate_Precise(new Date(baseDayMs + 86400000))
  return tomorrowLunar.month === "正月" && tomorrowLunar.day === "初一"
}

/**
 * 查找距离指定日期最近的下一个农历节日。
 * 返回 { name, daysLeft }；daysLeft=0 表示今天就是该节日。
 *
 * 算法：
 *   从今天起逐天枚举（最多 400 天），每天检查除夕（腊月最后一天）
 *   或匹配节日表中的固定节日；命中即返回。
 */
export function getNextLunarFestivalInfo(date: Date) {
  try {
    const today = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
    for (let i = 0; i <= 400; i++) {
      const targetMs = today + i * 86400000
      const target = new Date(targetMs)
      const lunar = getLunarDate_Precise(target)
      const m = LUNAR_MONTH_INDEX[lunar.month.replace("闰", "")] || 0
      const d = LUNAR_DAY_INDEX[lunar.day] || 0
      // 1. 检查除夕（腊月最后一天）
      if (isLunarNewYearsEve(target, targetMs)) {
        return { name: "除夕", daysLeft: i }
      }
      // 2. 检查其他固定节日（含春节）
      for (const [fm, fd, fname] of LUNAR_FESTIVALS) {
        if (m === fm && d === fd) {
          return { name: fname, daysLeft: i }
        }
      }
    }
    return null
  } catch {
    return null
  }
}

export function getLunarFestivalCountdownText(date: Date) {
  const info = getNextLunarFestivalInfo(date)
  if (!info) return ""
  return info.daysLeft === 0 ? `${info.name}` : `距离${info.name}还有${info.daysLeft}天`
}

// ─── 月历网格 ───
export function getMonthGrid(year: number, month: number) {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const days = last.getDate()
  const start = first.getDay()
  const grid: Array<Array<number | null>> = []
  let week: Array<number | null> = Array(start).fill(null)
  for (let i = 1; i <= days; i++) {
    week.push(i)
    if (week.length === 7) {
      grid.push(week)
      week = []
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null)
    grid.push(week)
  }
  return grid
}

