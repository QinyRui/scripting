/**
 * 积分记录页面
 * 显示米游币获取历史（打卡、浏览帖子、点赞等）
 */

import {
  VStack, HStack, Text, Button, Spacer,
  ScrollView, Navigation,
  useState, useEffect,
} from 'scripting'
import { getUserPointRecords, PointRecord } from '../src/api'

export function PointHistoryPage() {
  const dismiss = Navigation.useDismiss()
  const [records, setRecords] = useState<PointRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const data = await getUserPointRecords()
      setRecords(data)
      setLoading(false)
    })()
  }, [])

  /** 格式化时间戳 */
  const formatTime = (ts: string): string => {
    const d = new Date(parseInt(ts) * 1000)
    const month = d.getMonth() + 1
    const day = d.getDate()
    const hour = String(d.getHours()).padStart(2, '0')
    const min = String(d.getMinutes()).padStart(2, '0')
    return `${month}/${day} ${hour}:${min}`
  }

  /** 格式化今日/昨日 */
  const relativeDay = (ts: string): string => {
    const d = new Date(parseInt(ts) * 1000)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const target = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    const diff = today.getTime() - target.getTime()
    if (diff === 0) return '今天'
    if (diff === 86400000) return '昨天'
    if (diff < 86400000 * 7) return `${Math.floor(diff / 86400000)}天前`
    return `${d.getMonth() + 1}/${d.getDate()}`
  }

  /** 统计总积分 */
  const totalPoints = records.reduce((sum: number, r: PointRecord) => sum + r.num, 0)

  return (
    <ScrollView frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }}>
      <VStack spacing={0}>
        {/* 导航栏 */}
        <HStack padding={16} alignment="center">
          <Button action={dismiss}>
            <HStack padding={{ horizontal: 16, vertical: 8 }}
              // @ts-ignore
              background={{ style: 'secondarySystemBackground', shape: { type: 'rect', cornerRadius: 20 } }}
            >
              <Text font="subheadline">关闭</Text>
            </HStack>
          </Button>
          <Spacer />
          <Text font="headline">积分记录</Text>
          <Spacer />
          <Spacer frame={{ width: 60 }} />
        </HStack>

        <VStack padding={{ horizontal: 16 }} spacing={16}>

          {/* 统计卡片 */}
          <VStack
            // @ts-ignore
            background="#1C1C1E"
            // @ts-ignore
            cornerRadius={16}
            padding={{ horizontal: 20, vertical: 16 }}
            alignment="center"
            spacing={4}
          >
            <Text font="caption" foregroundStyle="secondaryLabel">累计获得米游币</Text>
            <Text font="title" fontWeight="bold"
              // @ts-ignore
              foregroundStyle="#FFD700"
            >{totalPoints}</Text>
            <Text font="caption" foregroundStyle="secondaryLabel">共 {records.length} 条记录</Text>
          </VStack>

          {/* 记录列表 */}
          {loading ? (
            <VStack alignment="center" padding={20}>
              <Text font="body" foregroundStyle="secondaryLabel">加载中...</Text>
            </VStack>
          ) : records.length === 0 ? (
            <VStack alignment="center" padding={20}>
              <Text font="body" foregroundStyle="secondaryLabel">暂无积分记录</Text>
            </VStack>
          ) : (
            <VStack
              // @ts-ignore
              background="#1C1C1E"
              // @ts-ignore
              cornerRadius={16}
              spacing={0}
            >
              {records.map((record: PointRecord, idx: number) => (
                <VStack key={`${idx}`}>
                  <HStack padding={{ horizontal: 16, vertical: 12 }} alignment="center" spacing={12}>
                    {/* 任务图标 */}
                    <VStack
                      // @ts-ignore
                      background="rgba(255,215,0,0.15)"
                      // @ts-ignore
                      cornerRadius={8}
                      frame={{ width: 32, height: 32 }}
                      alignment="center"
                    >
                      <Text font="caption" fontWeight="bold"
                        // @ts-ignore
                        foregroundStyle="#FFD700"
                      >B</Text>
                    </VStack>

                    {/* 任务信息 */}
                    <VStack spacing={2} frame={{ maxWidth: 'infinity' }}>
                      <HStack alignment="center">
                        <Text font="subheadline" fontWeight="bold">{record.title}</Text>
                        <Spacer />
                        <Text font="subheadline" fontWeight="bold"
                          // @ts-ignore
                          foregroundStyle="#FFD700"
                        >+{record.num}</Text>
                      </HStack>
                      <HStack alignment="center">
                        <Text font="caption" foregroundStyle="secondaryLabel">
                          {relativeDay(record.order_time)} {formatTime(record.order_time)}
                        </Text>
                        <Spacer />
                        <Text font="caption" foregroundStyle="secondaryLabel">
                          {record.source_name}
                        </Text>
                      </HStack>
                    </VStack>
                  </HStack>
                  {idx < records.length - 1 ? (
                    <VStack
                      // @ts-ignore
                      background="separator"
                      frame={{ height: 0.5 }}
                      padding={{ horizontal: 16 }}
                    />
                  ) : null}
                </VStack>
              ))}
            </VStack>
          )}

          {/* 底部占位 */}
          <VStack frame={{ height: 40 }} />
        </VStack>
      </VStack>
    </ScrollView>
  )
}
