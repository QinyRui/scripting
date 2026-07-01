/**
 * 米游社自动助手 - 共享 UI 组件
 *
 * IconBadge / GlowIcon / Row / CardSection
 * 所有 UI 页面复用的基础组件
 */

import {
  HStack, VStack, Text, Image, Spacer,
  ZStack, Circle, RoundedRectangle,
} from 'scripting'

// ============ 常量 ============

export const MIHOYO_ICON_URL = 'https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/c1/ca/a0/c1caa0d0-92c3-270f-3b05-8d2e0e857dec/AppIcon-0-0-1x_U007ephone-0-1-85-220.png/200x200bb.jpg'

// ============ 彩色圆形图标徽章 ============

export function IconBadge({ icon, color, size }: {
  icon: string; color: string; size?: number
}) {
  const s = size || 32
  const iconSize = Math.round(s * 0.5)
  return (
    <ZStack frame={{ width: s, height: s }}>
      <Circle
        // @ts-ignore
        fill={color}
        // @ts-ignore
        opacity={0.15}
      />
      <Image systemName={icon}
        // @ts-ignore
        foregroundStyle={color}
        font={iconSize}
      />
    </ZStack>
  )
}

// ============ 彩色光晕 Logo ============

export function GlowIcon() {
  return (
    <ZStack frame={{ width: 80, height: 80 }}>
      <Image
        imageUrl={MIHOYO_ICON_URL}
        resizable={true}
        // @ts-ignore
        mask={<RoundedRectangle cornerRadius={18} fill="black" />}
        // @ts-ignore
        frame={{ width: 80, height: 80 }}
      />
    </ZStack>
  )
}

// ============ 可点击行 ============

export function Row({ icon, iconColor, title, subtitle, onTap, accessory }: {
  icon?: string; iconColor?: string; title: string; subtitle?: string;
  onTap?: () => void; accessory?: 'chevron' | 'toggle' | 'none';
}) {
  return (
    <HStack
      padding={{ horizontal: 16, vertical: 12 }}
      spacing={12}
      alignment="center"
      onTapGesture={onTap}
    >
      {icon ? <IconBadge icon={icon} color={iconColor || 'systemGray'} /> : null}
      <VStack spacing={1} frame={{ maxWidth: "infinity" }}>
        <Text fontWeight="bold">{title}</Text>
        {subtitle ? (
          <Text font="caption"
            // @ts-ignore
            foregroundStyle="secondaryLabel"
          >{subtitle}</Text>
        ) : null}
      </VStack>
      <Spacer />
      {accessory === 'chevron' ? (
        <Image systemName="chevron.right" font={12}
          // @ts-ignore
          foregroundStyle="tertiaryLabel"
        />
      ) : null}
    </HStack>
  )
}

// ============ 卡片容器 ============

export function CardSection({ title, trailing, children }: {
  title?: string; trailing?: string; children: any
}) {
  return (
    <VStack
      // @ts-ignore
      background="#1C1C1E"
      // @ts-ignore
      cornerRadius={16}
      spacing={0}
    >
      {(title || trailing) ? (
        <HStack padding={{ horizontal: 16, top: 14, bottom: 6 }} alignment="center">
          <Spacer />
          <Text font="footnote"
            // @ts-ignore
            foregroundStyle="secondaryLabel"
          >{title || ''}</Text>
          {trailing ? (
            <Text font="caption" fontWeight="bold"
              // @ts-ignore
              foregroundStyle="systemOrange"
            >{'  ' + trailing}</Text>
          ) : null}
          <Spacer />
        </HStack>
      ) : null}
      {children}
    </VStack>
  )
}
