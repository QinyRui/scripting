// components.tsx - 通用 UI 组件

import {
  VStack,
  HStack,
  ZStack,
  Text,
  Image,
  ScrollView,
  Spacer,
  TextField,
} from 'scripting'
import { T, relTime } from './theme'

// ============================================
// 通用 Header（标题 + 副标题 + 描述）
// ============================================
export function PageHeader(props: {
  title: string
  subtitle: string
  desc: string
  badgeText?: string
  statusText?: string
  statusColor?: string
}) {
  const { title, subtitle, desc, badgeText, statusText, statusColor } = props
  const showBadge = badgeText !== undefined
  return (
    <VStack
      padding={{ top: 14, bottom: 14, leading: 20, trailing: 20 }}
      spacing={4}
      alignment="center"
    >
      <Text
        foregroundColor={T.text}
        font="title2"
        bold
        multilineTextAlignment="center"
      >
        {title}
      </Text>
      <Text
        foregroundColor={T.text2}
        font="footnote"
        multilineTextAlignment="center"
      >
        {subtitle}
      </Text>
      <Text
        foregroundColor={T.text3}
        font="caption"
        multilineTextAlignment="center"
      >
        {desc}
      </Text>
      {showBadge ? (
        <VStack
          alignment="trailing"
          spacing={0}
          padding={{ horizontal: 14, vertical: 8 }}
          background={T.glass}
          cornerRadius={20}
          stroke={T.glassBorder}
          strokeWidth={0.5}
          clipShape="capsule"
        >
          <Text
            foregroundColor={T.text3}
            font="caption"
          >
            {badgeText}
          </Text>
          <Text
            foregroundColor={statusColor || T.green}
            font="title3"
            bold
          >
            {statusText || ''}
          </Text>
        </VStack>
      ) : null}
    </VStack>
  )
}

// ============================================
// 搜索框（Observable 模式，打字不触发 setState）
// ============================================
export function SearchBar(props: {
  textObs: Observable<string>
  placeholder?: string
}) {
  const { textObs, placeholder } = props
  return (
    <HStack
      alignment="center"
      spacing={8}
      padding={{ horizontal: 16, vertical: 12 }}
      margin={{ leading: 16, trailing: 16, top: 4, bottom: 4 }}
      background={T.glass}
      cornerRadius={22}
      stroke={T.glassBorder}
      strokeWidth={0.5}
      clipShape="capsule"
    >
      <Text
        font="footnote"
        foregroundColor={T.text3}
      >
        🔍
      </Text>
      <VStack>
        <TextField
          title="搜索"
          value={textObs}
          prompt={placeholder || '搜索...'}
        />
      </VStack>
      <Spacer />
      {textObs.value ? (
        <VStack onTapGesture={() => textObs.setValue('')} padding={4}>
          <Text
            font="footnote"
            foregroundColor={T.text3}
          >
            ✕
          </Text>
        </VStack>
      ) : null}
    </HStack>
  )
}

// ============================================
// 横向 Chip 选择器
// ============================================
export function ChipFilter(props: {
  items: string[]
  selected: string
  onSelect: (v: string) => void
}) {
  const { items, selected, onSelect } = props
  return (
    <ScrollView axes="horizontal">
      <HStack
        padding={{ leading: 16, trailing: 16, vertical: 6 }}
        spacing={8}
        alignment="center"
      >
        {items.map(r => {
          const active = r === selected
          return (
            <VStack
              key={r}
              onTapGesture={() => onSelect(r)}
              padding={{ horizontal: 16, vertical: 8 }}
              background={active ? T.glassActive : T.glass}
              cornerRadius={22}
              stroke={active ? T.blue : T.glassBorder}
              strokeWidth={active ? 1.5 : 0.5}
              clipShape="capsule"
            >
              <Text
                foregroundColor={active ? T.blue2 : T.text2}
                font="footnote"
                bold={active}
              >
                {r}
              </Text>
            </VStack>
          )
        })}
      </HStack>
    </ScrollView>
  )
}

// ============================================
// 加载中视图
// ============================================
export function LoadingView(props: { text?: string }) {
  return (
    <VStack
      alignment="center"
      spacing={10}
      padding={{ top: 60, bottom: 60 }}
    >
      <Text font="title">⏳</Text>
      <Text
        foregroundColor={T.text2}
        font="callout"
      >
        {props.text || '加载中...'}
      </Text>
    </VStack>
  )
}

// ============================================
// 空状态视图
// ============================================
export function EmptyView(props: { message: string; emoji?: string }) {
  return (
    <VStack
      alignment="center"
      spacing={10}
      padding={{ top: 50, bottom: 50 }}
    >
      <Text font="title">{props.emoji || '📭'}</Text>
      <Text
        foregroundColor={T.text2}
        font="callout"
      >
        {props.message}
      </Text>
    </VStack>
  )
}

// ============================================
// 列表行（带左图标 + 标题 + 副标题 + 右操作）
// ============================================
export function ListRow(props: {
  emoji?: string
  title: string
  subtitle?: string
  rightText?: string
  onTap?: () => void
  accent?: string
}) {
  const { emoji, title, subtitle, rightText, onTap, accent } = props
  return (
    <VStack
      onTapGesture={onTap}
      padding={{ horizontal: 16, vertical: 12 }}
      background={T.surface}
      cornerRadius={12}
      margin={{ leading: 16, trailing: 16, bottom: 8 }}
      clipShape="capsule"
    >
      <HStack alignment="center" spacing={12}>
        {emoji ? (
          <VStack
            frame={{ width: 36, height: 36 }}
            alignment="center"
            background={accent || T.surface2}
            cornerRadius={10}
            clipShape="capsule"
          >
            <Text font="title3">{emoji}</Text>
          </VStack>
        ) : null}
        <VStack alignment="leading" spacing={2}>
          <Text
            foregroundColor={T.text}
            font="callout"
            bold
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              foregroundColor={T.text3}
              font="caption"
            >
              {subtitle}
            </Text>
          ) : null}
        </VStack>
        <Spacer />
        {rightText ? (
          <Text
            foregroundColor={T.blue2}
            font="footnote"
            bold
          >
            {rightText}
          </Text>
        ) : null}
      </HStack>
    </VStack>
  )
}