// tabs/AccountsTab.tsx - 账号共享 Tab
// 调用真实 API：/api/accounts

import {
  VStack,
  HStack,
  Text,
  ScrollView,
  Spacer,
  useState,
  useObservable,
  useEffect,
  fetch,
} from 'scripting'
import { T, Account, ApiResponse, regionFlag, emailDomain, relTime, loadCache, saveCache, fetchAccounts } from '../theme'
import { PageHeader, SearchBar, ChipFilter, LoadingView, EmptyView } from '../components'

export function AccountsTab() {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [refreshing, setRefreshing] = useState<boolean>(false)
  const searchObs = useObservable<string>('')
  const [region, setRegion] = useState<string>('全部')
  const [toast, setToast] = useState<string>('')
  const [isCached, setIsCached] = useState<boolean>(false)

  async function loadNetwork() {
    const d = await fetchAccounts()
    if (d) {
      setData(d)
      setIsCached(false)
      saveCache(d)
    }
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => {
    const cached = loadCache()
    if (cached) {
      setData(cached)
      setIsCached(true)
      setLoading(false)
    }
    loadNetwork()
  }, [])

  function showToast(text: string) {
    setToast(text)
    setTimeout(() => setToast(''), 2000)
  }

  async function refresh() {
    if (refreshing) return
    setRefreshing(true)
    await loadNetwork()
  }

  // 提取地区
  const regionSet = new Set<string>(['全部'])
  data?.accounts.forEach(a => regionSet.add(a.regionName))
  const regions = Array.from(regionSet)

  // 过滤
  const filtered = (data?.accounts || []).filter(a => {
    if (region !== '全部' && a.regionName !== region) return false
    if (searchObs.value) {
      const q = searchObs.value.toLowerCase()
      if (!a.email.toLowerCase().includes(q) &&
          !a.regionName.toLowerCase().includes(q) &&
          !a.region.toLowerCase().includes(q)) {
        return false
      }
    }
    return true
  })

  const regionCount = data ? new Set(data.accounts.map(a => a.regionName)).size : 0
  const lastUpdate = data?.lastUpdate || ''

  return (
    <VStack
      // @ts-ignore
      background={T.bg}
    >
      <PageHeader
        title="账号共享"
        subtitle="共享账号 · 实时更新 · 多地区支持"
        desc="多地区 Apple ID 共享 · 每 30 分钟存活检测 · 仅限 App Store 登录下载"
        badgeText={`${regionCount} 地区在线`}
        statusText={`${data?.accounts.length || 0}`}
        statusColor={T.green}
      />
      {lastUpdate ? (
        <HStack
          alignment="center"
          spacing={4}
          padding={{ leading: 20, bottom: 6 }}
        >
          <Text
            font="caption"
            // @ts-ignore
            foregroundColor={T.green}
          >
            ●
          </Text>
          <Text
            // @ts-ignore
            foregroundColor={T.text3}
            font="caption"
          >
            {`最近更新 ${relTime(lastUpdate)}${isCached ? '（本地缓存）' : ''}`}
          </Text>
        </HStack>
      ) : null}

      <SearchBar textObs={searchObs} placeholder="搜索账号、地区、邮箱..." />

      <ChipFilter
        items={regions}
        selected={region}
        onSelect={setRegion}
      />

      <ScrollView>
        {loading ? (
          <LoadingView text="正在拉取账号..." />
        ) : filtered.length === 0 ? (
          <EmptyView message={searchObs.value || region !== '全部' ? '没有找到匹配的账号' : '暂无账号数据'} />
        ) : (
          <VStack padding={{ top: 6, bottom: 8 }} spacing={0}>
            <HStack
              alignment="center"
              padding={{ leading: 20, trailing: 20, bottom: 6 }}
            >
              <Text
                // @ts-ignore
                foregroundColor={T.text3}
                font="footnote"
              >
                {`共 ${filtered.length} 个账号 · ${region === '全部' ? '全部地区' : region}`}
              </Text>
              <Spacer />
              <VStack
                onTapGesture={refresh}
                opacity={refreshing ? 0.4 : 1}
              >
                <HStack alignment="center" spacing={4}>
                  <Text
                    // @ts-ignore
                    foregroundColor={T.blue2}
                    font="footnote"
                    bold
                  >
                    {refreshing ? '⟳ 刷新中' : '↻ 刷新'}
                  </Text>
                </HStack>
              </VStack>
            </HStack>
            {filtered.map(acc => (
              <AccountCardItem
                key={acc.id}
                acc={acc}
                onCopied={() => showToast('已复制到剪贴板 ✓')}
              />
            ))}
            <NoticeBlock />
          </VStack>
        )}
      </ScrollView>

      {toast ? (
        <VStack
          alignment="center"
          padding={{ top: 8, bottom: 8, leading: 18, trailing: 18 }}
          // @ts-ignore
          background={T.green}
          // @ts-ignore
          cornerRadius={20}
        >
          <Text
            // @ts-ignore
            foregroundColor="#fff"
            font="footnote"
            bold
          >
            {toast}
          </Text>
        </VStack>
      ) : null}
    </VStack>
  )
}

function AccountCardItem(props: { acc: Account; onCopied: () => void }) {
  const { acc, onCopied } = props
  const domain = emailDomain(acc.email)
  const flag = regionFlag(acc.region)
  const [realPassword, setRealPassword] = useState<string>('')

  // 组件加载时自动获取真实密码
  useEffect(() => {
    async function autoReveal() {
      try {
        const res = await fetch(`https://sliverkiss-psi.vercel.app/api/accounts/reveal?id=${acc.id}`, {
          headers: {
            'Origin': 'https://sliverkiss-psi.vercel.app',
            'Referer': 'https://sliverkiss-psi.vercel.app/accounts',
          },
        })
        const data = await res.json()
        if (data.password) {
          setRealPassword(data.password)
        }
      } catch {}
    }
    autoReveal()
  }, [])

  async function revealPassword(): Promise<string> {
    try {
      const res = await fetch(`https://sliverkiss-psi.vercel.app/api/accounts/reveal?id=${acc.id}`, {
        headers: {
          'Origin': 'https://sliverkiss-psi.vercel.app',
          'Referer': 'https://sliverkiss-psi.vercel.app/accounts',
        },
      })
      const data = await res.json()
      if (data.password) {
        setRealPassword(data.password)
        return data.password
      }
    } catch (e) {
      console.log('reveal failed:', e)
    }
    return ''
  }

  async function copy(field: 'email' | 'password') {
    if (field === 'password') {
      let pwd = realPassword
      if (!pwd) {
        pwd = await revealPassword()
      }
      await Pasteboard.setString(pwd || acc.password)
    } else {
      await Pasteboard.setString(acc.email)
    }
    onCopied()
  }

  return (
    <VStack
      padding={16}
      margin={{ leading: 16, trailing: 16, bottom: 10 }}
      // @ts-ignore
      background={T.surface}
      // @ts-ignore
      cornerRadius={14}
      spacing={10}
    >
      <HStack alignment="center">
        <HStack
          alignment="center"
          spacing={4}
          padding={{ horizontal: 8, vertical: 4 }}
          // @ts-ignore
          background="rgba(59,130,246,0.15)"
          // @ts-ignore
          cornerRadius={6}
        >
          <Text font="footnote">{flag}</Text>
          <Text
            // @ts-ignore
            foregroundColor={T.blue2}
            font="footnote"
            bold
          >
            {acc.regionName}
          </Text>
        </HStack>
        <Spacer />
        <HStack alignment="center" spacing={4}>
          <Text
            // @ts-ignore
            foregroundColor={T.green}
            font="caption"
          >
            ●
          </Text>
          <Text
            // @ts-ignore
            foregroundColor={T.green2}
            font="caption"
            bold
          >
            活跃
          </Text>
        </HStack>
      </HStack>

      <HStack alignment="center" spacing={12}>
        <VStack alignment="leading" spacing={3} frame={{ minWidth: 200 }}>
          <Text
            // @ts-ignore
            foregroundColor={T.text3}
            font="caption"
          >
            邮箱
          </Text>
          <Text
            // @ts-ignore
            foregroundColor={T.text}
            font="callout"
          >
            {acc.email}
          </Text>
        </VStack>
        <Spacer />
        <VStack
          onTapGesture={() => copy('email')}
          padding={{ horizontal: 10, vertical: 6 }}
          // @ts-ignore
          background="rgba(59,130,246,0.2)"
          // @ts-ignore
          cornerRadius={8}
        >
          <HStack alignment="center" spacing={4}>
            <Text
              // @ts-ignore
              foregroundColor={T.blue2}
              font="caption"
            >📋</Text>
            <Text
              // @ts-ignore
              foregroundColor={T.blue2}
              font="caption"
              bold
            >复制</Text>
          </HStack>
        </VStack>
      </HStack>

      <HStack alignment="center" spacing={12}>
        <VStack alignment="leading" spacing={3} frame={{ minWidth: 200 }}>
          <Text
            // @ts-ignore
            foregroundColor={T.text3}
            font="caption"
          >
            密码
          </Text>
          <Text
            // @ts-ignore
            foregroundColor={T.text}
            font="callout"
          >
            {realPassword || acc.password}
          </Text>
        </VStack>
        <Spacer />
        <VStack
          onTapGesture={() => copy('password')}
          padding={{ horizontal: 10, vertical: 6 }}
          // @ts-ignore
          background="rgba(168,85,247,0.2)"
          // @ts-ignore
          cornerRadius={8}
        >
          <HStack alignment="center" spacing={4}>
            <Text
              // @ts-ignore
              foregroundColor={T.purple}
              font="caption"
            >🔑</Text>
            <Text
              // @ts-ignore
              foregroundColor={T.purple}
              font="caption"
              bold
            >复制</Text>
          </HStack>
        </VStack>
      </HStack>

      <HStack alignment="center">
        <Text
          // @ts-ignore
          foregroundColor={T.text4}
          font="caption"
        >{`✉️ ${domain}`}</Text>
        <Text
          // @ts-ignore
          foregroundColor={T.text4}
          font="caption"
          padding={{ leading: 8 }}
        >{`#${acc.id}`}</Text>
        <Spacer />
        <Text
          // @ts-ignore
          foregroundColor={T.text4}
          font="caption"
        >{`检测于 ${relTime(acc.lastCheck)}`}</Text>
      </HStack>
    </VStack>
  )
}

function NoticeBlock() {
  return (
    <VStack
      padding={14}
      // @ts-ignore
      margin={{ leading: 16, trailing: 16, top: 8, bottom: 24 }}
      // @ts-ignore
      background="rgba(245,158,11,0.12)"
      // @ts-ignore
      cornerRadius={12}
      spacing={6}
    >
      <HStack alignment="center" spacing={6}>
        <Text font="body">⚠️</Text>
        <Text
          // @ts-ignore
          foregroundColor={T.orange}
          font="subheadline"
          bold
        >
          使用须知与安全提醒
        </Text>
      </HStack>
      <Text
        // @ts-ignore
        foregroundColor={T.text2}
        font="caption"
      >
        {'仅限在 App Store 中登录下载应用\n禁止在 iCloud、iMessage、FaceTime 中登录\n禁止更改密码或进行任何购买操作'}
      </Text>
    </VStack>
  )
}
