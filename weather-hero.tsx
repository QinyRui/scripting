/**
 * 🌤️ 首页品牌区 — 天气图标轮播动画
 *
 * 循环切换：晴 → 多云 → 阴 → 雨 → 雷雨 → 雪 → 风 → 夜空
 * · SF Symbol 替换过渡（symbolEffectReplace）
 * · 背景渐变随天气变色
 * · 各类天气附带连续呼吸 / 弹跳 / 摇晃动效
 */

import {
  VStack,
  ZStack,
  Circle,
  Image,
  Text,
  useState,
  useEffect,
} from "scripting"

// Animation / withAnimation / 定时器 为全局 API
declare const Animation: any
declare function withAnimation(animation: any, body: () => void): Promise<void>
declare function setTimeout(handler: () => void, timeout?: number): number
declare function clearTimeout(id: number): void

type WeatherScene = {
  icon: string
  /** 圆形背景渐变色 [顶部, 底部] */
  colors: [string, string]
  /** 离散符号动效名 */
  effect: "breathe" | "bounce" | "pulse" | "wiggle" | "rotate"
  /** 动效速度倍率 */
  speed?: number
}

/** 天气场景序列：展示「天气变化」氛围，非实时实况 */
const WEATHER_SCENES: WeatherScene[] = [
  {
    icon: "sun.max.fill",
    colors: ["#FFD54F", "#FF9800"],
    effect: "breathe",
    speed: 0.7,
  },
  {
    icon: "cloud.sun.fill",
    colors: ["#4facfe", "#00f2fe"],
    effect: "breathe",
    speed: 0.75,
  },
  {
    icon: "cloud.fill",
    colors: ["#90A4AE", "#607D8B"],
    effect: "breathe",
    speed: 0.8,
  },
  {
    icon: "cloud.rain.fill",
    colors: ["#5C6BC0", "#3949AB"],
    effect: "bounce",
    speed: 0.9,
  },
  {
    icon: "cloud.bolt.rain.fill",
    colors: ["#7E57C2", "#4527A0"],
    effect: "pulse",
    speed: 1.1,
  },
  {
    icon: "cloud.snow.fill",
    colors: ["#81D4FA", "#4FC3F7"],
    effect: "breathe",
    speed: 0.65,
  },
  {
    icon: "wind",
    colors: ["#26C6DA", "#00ACC1"],
    effect: "wiggle",
    speed: 1.0,
  },
  {
    icon: "moon.stars.fill",
    colors: ["#5C6BC0", "#1A237E"],
    effect: "breathe",
    speed: 0.7,
  },
]

/** 每种天气停留时长（毫秒） */
const SCENE_DURATION_MS = 2800

/**
 * 首页顶部天气英雄图标
 * 自动循环切换图标 + 渐变色 + 符号动效
 */
export function WeatherHeroIcon() {
  const [index, setIndex] = useState(0)
  const scene = WEATHER_SCENES[index] || WEATHER_SCENES[0]

  useEffect(() => {
    let cancelled = false
    let timerId = 0

    const tick = () => {
      if (cancelled) return
      // 切换时带缓动，背景色与图标过渡更顺滑
      withAnimation(Animation.smooth({ duration: 0.9 }), () => {
        setIndex((prev) => (prev + 1) % WEATHER_SCENES.length)
      })
      timerId = setTimeout(tick, SCENE_DURATION_MS)
    }

    timerId = setTimeout(tick, SCENE_DURATION_MS)

    return () => {
      cancelled = true
      clearTimeout(timerId)
    }
  }, [])

  return (
    <VStack spacing={16} alignment="center">
      <ZStack frame={{ width: 100, height: 100 }} alignment="center">
        {/* 渐变圆底：随天气切换颜色 */}
        <Circle
          fill={{
            colors: scene.colors as any,
            startPoint: "top",
            endPoint: "bottom",
          } as any}
          contentTransition="interpolate"
          animation={{
            animation: Animation.smooth({ duration: 0.9 }),
            value: index,
          }}
        />
        {/* 天气符号：替换过渡 + 连续微动 */}
        <Image
          systemName={scene.icon}
          font={40}
          foregroundStyle="white"
          contentTransition="symbolEffectReplace"
          symbolEffect={{
            effect: scene.effect,
            value: index,
            options: {
              speed: scene.speed || 0.8,
              repeat: "continuous",
            },
          }}
        />
      </ZStack>
      <VStack spacing={4} alignment="center">
        <Text font="title" fontWeight="bold">彩云天气</Text>
      </VStack>
    </VStack>
  )
}
