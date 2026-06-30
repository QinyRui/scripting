// tabs/SwitchTab.tsx - 商店切换 Tab
// 仿照 App Store Region 组件：原生 List + Section + Button 风格
// 使用 iTunes dsf 链接实现 App Store 地区切换

import {
  VStack,
  HStack,
  Text,
  Image,
  ScrollView,
  Spacer,
  useState,
  useEffect,
  useObservable,
} from 'scripting'
import { T } from '../theme'
import { PageHeader, SearchBar, LoadingView, EmptyView } from '../components'

// 地区数据（id 为 iTunes dsf 编号）
type RegionItem = { id: string; region: string; enabled: boolean }

const DEFAULT_REGIONS: RegionItem[] = [
  { id: "143465", region: "CN", enabled: true },
  { id: "143441", region: "US", enabled: true },
  { id: "143462", region: "JP", enabled: true },
  { id: "143463", region: "HK", enabled: true },
  { id: "143470", region: "TW", enabled: true },
  { id: "143444", region: "GB", enabled: true },
  { id: "143442", region: "FR", enabled: true },
  { id: "143443", region: "DE", enabled: true },
  { id: "143466", region: "KR", enabled: true },
  { id: "143464", region: "SG", enabled: true },
  { id: "143460", region: "AU", enabled: true },
  { id: "143455", region: "CA", enabled: true },
  { id: "143467", region: "IN", enabled: true },
  { id: "143458", region: "DK", enabled: true },
  { id: "143456", region: "SE", enabled: true },
  { id: "143457", region: "NO", enabled: true },
  { id: "143447", region: "FI", enabled: true },
  { id: "143452", region: "NL", enabled: true },
  { id: "143453", region: "PT", enabled: true },
  { id: "143454", region: "ES", enabled: true },
  { id: "143450", region: "IT", enabled: true },
  { id: "143445", region: "AT", enabled: true },
  { id: "143446", region: "BE", enabled: true },
  { id: "143449", region: "IE", enabled: true },
  { id: "143448", region: "GR", enabled: true },
  { id: "143451", region: "LU", enabled: true },
  { id: "143459", region: "CH", enabled: true },
  { id: "143478", region: "PL", enabled: false },
  { id: "143489", region: "CZ", enabled: false },
  { id: "143482", region: "HU", enabled: false },
  { id: "143487", region: "RO", enabled: false },
  { id: "143496", region: "SK", enabled: false },
  { id: "143494", region: "HR", enabled: false },
  { id: "143499", region: "SI", enabled: false },
  { id: "143518", region: "EE", enabled: false },
  { id: "143519", region: "LV", enabled: false },
  { id: "143520", region: "LT", enabled: false },
  { id: "143557", region: "CY", enabled: false },
  { id: "143521", region: "MT", enabled: false },
  { id: "143481", region: "AE", enabled: false },
  { id: "143479", region: "SA", enabled: false },
  { id: "143493", region: "KW", enabled: false },
  { id: "143498", region: "QA", enabled: false },
  { id: "143559", region: "BH", enabled: false },
  { id: "143562", region: "OM", enabled: false },
  { id: "143497", region: "LB", enabled: false },
  { id: "143528", region: "JO", enabled: false },
  { id: "143491", region: "IL", enabled: false },
  { id: "143480", region: "TR", enabled: false },
  { id: "143469", region: "RU", enabled: false },
  { id: "143492", region: "UA", enabled: false },
  { id: "143565", region: "BY", enabled: false },
  { id: "143523", region: "MD", enabled: false },
  { id: "143474", region: "PH", enabled: false },
  { id: "143473", region: "MY", enabled: false },
  { id: "143475", region: "TH", enabled: false },
  { id: "143477", region: "PK", enabled: false },
  { id: "143484", region: "NP", enabled: false },
  { id: "143486", region: "LK", enabled: false },
  { id: "143476", region: "ID", enabled: false },
  { id: "143471", region: "VN", enabled: false },
  { id: "143579", region: "KH", enabled: false },
  { id: "143587", region: "LA", enabled: false },
  { id: "143592", region: "MN", enabled: false },
  { id: "143503", region: "BR", enabled: false },
  { id: "143501", region: "CO", enabled: false },
  { id: "143483", region: "CL", enabled: false },
  { id: "143505", region: "AR", enabled: false },
  { id: "143507", region: "PE", enabled: false },
  { id: "143500", region: "MX", enabled: false },
  { id: "143508", region: "DO", enabled: false },
  { id: "143509", region: "EC", enabled: false },
  { id: "143504", region: "GT", enabled: false },
  { id: "143506", region: "SV", enabled: false },
  { id: "143495", region: "CR", enabled: false },
  { id: "143485", region: "PA", enabled: false },
  { id: "143510", region: "HN", enabled: false },
  { id: "143512", region: "NI", enabled: false },
  { id: "143556", region: "BO", enabled: false },
  { id: "143513", region: "PY", enabled: false },
  { id: "143514", region: "UY", enabled: false },
  { id: "143502", region: "VE", enabled: false },
  { id: "143524", region: "AM", enabled: false },
  { id: "143568", region: "AZ", enabled: false },
  { id: "143529", region: "GE", enabled: false },
  { id: "143517", region: "KZ", enabled: false },
  { id: "143586", region: "KG", enabled: false },
  { id: "143603", region: "TJ", enabled: false },
  { id: "143604", region: "TM", enabled: false },
  { id: "143566", region: "UZ", enabled: false },
  { id: "143472", region: "ZA", enabled: false },
  { id: "143573", region: "GH", enabled: false },
  { id: "143561", region: "NG", enabled: false },
  { id: "143529", region: "KE", enabled: false },
  { id: "143572", region: "TZ", enabled: false },
  { id: "143537", region: "UG", enabled: false },
  { id: "143535", region: "SN", enabled: false },
  { id: "143532", region: "ML", enabled: false },
  { id: "143578", region: "BF", enabled: false },
  { id: "143582", region: "CG", enabled: false },
  { id: "143563", region: "DZ", enabled: false },
  { id: "143516", region: "EG", enabled: false },
  { id: "143536", region: "TN", enabled: false },
  { id: "143560", region: "MA", enabled: false },
  { id: "143461", region: "NZ", enabled: false },
  { id: "143526", region: "FJ", enabled: false },
  { id: "143550", region: "PG", enabled: false },
]

// 国旗转码：2字母 → emoji
function toFlag(code: string): string {
  return code.length === 2
    ? String.fromCodePoint(
        127397 + (code.charCodeAt(0) & 223),
        127397 + (code.charCodeAt(1) & 223)
      )
    : '🌍'
}

// 国家代码 → 中文名
const REGION_NAMES: Record<string, string> = {
  CN: '中国', US: '美国', JP: '日本', HK: '香港', TW: '台湾', GB: '英国',
  FR: '法国', DE: '德国', KR: '韩国', SG: '新加坡', AU: '澳大利亚', CA: '加拿大',
  IN: '印度', DK: '丹麦', SE: '瑞典', NO: '挪威', FI: '芬兰', NL: '荷兰',
  PT: '葡萄牙', ES: '西班牙', IT: '意大利', AT: '奥地利', BE: '比利时', IE: '爱尔兰',
  GR: '希腊', LU: '卢森堡', CH: '瑞士', PL: '波兰', CZ: '捷克', HU: '匈牙利',
  RO: '罗马尼亚', SK: '斯洛伐克', HR: '克罗地亚', SI: '斯洛文尼亚', EE: '爱沙尼亚',
  LV: '拉脱维亚', LT: '立陶宛', CY: '塞浦路斯', MT: '马耳他', AE: '阿联酋',
  SA: '沙特', KW: '科威特', QA: '卡塔尔', BH: '巴林', OM: '阿曼', LB: '黎巴嫩',
  JO: '约旦', IL: '以色列', TR: '土耳其', RU: '俄罗斯', UA: '乌克兰', BY: '白俄罗斯',
  MD: '摩尔多瓦', PH: '菲律宾', MY: '马来西亚', TH: '泰国', PK: '巴基斯坦',
  NP: '尼泊尔', LK: '斯里兰卡', ID: '印尼', VN: '越南', KH: '柬埔寨', LA: '老挝',
  MN: '蒙古', BR: '巴西', CO: '哥伦比亚', CL: '智利', AR: '阿根廷', PE: '秘鲁',
  MX: '墨西哥', DO: '多米尼加', EC: '厄瓜多尔', GT: '危地马拉', SV: '萨尔瓦多',
  CR: '哥斯达黎加', PA: '巴拿马', HN: '洪都拉斯', NI: '尼加拉瓜', BO: '玻利维亚',
  PY: '巴拉圭', UY: '乌拉圭', VE: '委内瑞拉', AM: '亚美尼亚', AZ: '阿塞拜疆',
  GE: '格鲁吉亚', KZ: '哈萨克斯坦', KG: '吉尔吉斯斯坦', TJ: '塔吉克斯坦',
  TM: '土库曼斯坦', UZ: '乌兹别克斯坦', ZA: '南非', GH: '加纳', NG: '尼日利亚',
  KE: '肯尼亚', TZ: '坦桑尼亚', UG: '乌干达', SN: '塞内加尔', ML: '马里',
  BF: '布基纳法索', CG: '刚果', DZ: '阿尔及利亚', EG: '埃及', TN: '突尼斯',
  MA: '摩洛哥', NZ: '新西兰', FJ: '斐济', PG: '巴布亚新几内亚',
}

// 构造 App Store 切换链接（和 App Store Region 组件一致）
function openurl(dsf: string): string {
  return `https://itunes.apple.com/WebObjects/MZStore.woa/wa/resetAndRedirect?dsf=${dsf}&mt=8&url=/WebObjects/MZStore.woa/wa/viewSoftware?mt=8`
}

const STORAGE_KEY = 'switch_regions_v3'

function loadRegions(): RegionItem[] {
  try {
    const raw = Storage.get(STORAGE_KEY) as string | null
    if (raw) return JSON.parse(raw) as RegionItem[]
  } catch {}
  return DEFAULT_REGIONS
}

function saveRegions(regions: RegionItem[]) {
  try { Storage.set(STORAGE_KEY, JSON.stringify(regions)) } catch {}
}

export function SwitchTab() {
  const [regions, setRegions] = useState<RegionItem[]>(DEFAULT_REGIONS)
  const searchObs = useObservable<string>('')
  const [toast, setToast] = useState<string>('')

  useEffect(() => {
    setRegions(loadRegions())
  }, [])

  function showToast(text: string) {
    setToast(text)
    setTimeout(() => setToast(''), 2000)
  }

  async function switchTo(item: RegionItem) {
    const url = openurl(item.id)
    // 直接用 Safari 打开链接，触发 App Store 地区切换
    Safari.openURL(url)
    const name = REGION_NAMES[item.region] || item.region
    showToast(`正在切换到 ${toFlag(item.region)} ${name} 商店...`)
  }

  function toggleEnabled(idx: number) {
    const next = regions.map((r, i) =>
      i === idx ? { ...r, enabled: !r.enabled } : r
    )
    setRegions(next)
    saveRegions(next)
  }

  const q = searchObs.value.trim().toLowerCase()
  const filtered = q
    ? regions.filter(r =>
        r.region.toLowerCase().includes(q) ||
        (REGION_NAMES[r.region] || '').toLowerCase().includes(q)
      )
    : regions

  const enabledCount = regions.filter(r => r.enabled).length

  return (
    <VStack>
      <PageHeader
        title="商店切换"
        subtitle="一键切换 AppStore 地区"
        desc={`仿照 App Store Region 组件设计，使用 iTunes dsf 链接实现一键切换。支持 ${regions.length} 个国家/地区，点击即复制切换链接到剪贴板。`}
        badgeText="支持地区"
        statusText={`${regions.length}`}
        statusColor={T.blue2}
      />

      {/* 操作栏 */}
      <HStack
        alignment="center"
        padding={{ leading: 20, trailing: 20, top: 8, bottom: 6 }}
        spacing={8}
      >
        <Text foregroundColor={T.text3} font="footnote">
          {q
            ? `找到 ${filtered.length} 个地区`
            : `共 ${regions.length} 个地区 · 已启用 ${enabledCount}`}
        </Text>
      </HStack>

      {/* 搜索框 */}
      <SearchBar textObs={searchObs} placeholder="搜索国家/地区代码或名称..." />

      {/* 地区列表 */}
      <ScrollView>
        {filtered.length === 0 ? (
          <EmptyView message={`没有找到 "${searchObs.value}"`} emoji="🌍" />
        ) : (
          <VStack padding={{ top: 4, bottom: 24 }} spacing={0}>
            {/* 地区列表 */}
            <VStack padding={{ bottom: 8 }}>
              {filtered.map((item) => (
                <RegionRow
                  key={item.region}
                  item={item}
                  onSwitch={() => switchTo(item)}
                />
              ))}
            </VStack>

            <VStack
              alignment="center"
              padding={{ top: 16, bottom: 8 }}
              spacing={6}
            >
              <Text font="title2">🌍</Text>
              <Text foregroundColor={T.text3} font="caption">
                {`已展示 ${filtered.length} / ${regions.length} 个地区`}
              </Text>
            </VStack>
          </VStack>
        )}
      </ScrollView>

      {/* Toast */}
      {toast ? (
        <VStack alignment="center" padding={{ top: 10, bottom: 10, leading: 20, trailing: 20 }} background={T.green} cornerRadius={22} clipShape="capsule">
          <Text foregroundColor="#fff" font="footnote" bold>{toast}</Text>
        </VStack>
      ) : null}
    </VStack>
  )
}

// 单行地区组件（仿 App Store Region 的 HStack 行）
function RegionRow(props: {
  item: RegionItem
  onSwitch: () => void
}) {
  const { item, onSwitch } = props
  const flag = toFlag(item.region)
  const name = REGION_NAMES[item.region] || item.region

  return (
    <VStack
      onTapGesture={onSwitch}
      padding={{ horizontal: 16, vertical: 12 }}
      margin={{ leading: 16, trailing: 16, bottom: 4 }}
      background={T.glass}
      cornerRadius={18}
      stroke={T.glassBorder}
      strokeWidth={0.5}
      clipShape="capsule"
    >
      <HStack alignment="center" spacing={12}>
        {/* 国旗 */}
        <Text font="title2">{flag}</Text>

        {/* 国家信息 */}
        <VStack alignment="leading" spacing={1}>
          <HStack alignment="center" spacing={6}>
            <Text foregroundColor={T.text} font="callout" bold>{item.region}</Text>
            <Text foregroundColor={T.text3} font="caption">{name}</Text>
          </HStack>
        </VStack>

        <Spacer />

        {/* 切换按钮 */}
        <VStack
          padding={{ horizontal: 12, vertical: 6 }}
          background={T.greenGlass}
          cornerRadius={20}
          stroke={T.glassBorder}
          strokeWidth={0.5}
          clipShape="capsule"
        >
          <Text foregroundColor={T.green} font="caption" bold>切换 →</Text>
        </VStack>

        {/* Chevron */}
        <Image systemName="chevron.forward" foregroundColor={T.text4} />
      </HStack>
    </VStack>
  )
}
