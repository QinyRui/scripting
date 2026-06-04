// @ts-nocheck
import { Script, Navigation, NavigationStack, ScrollView, VStack, HStack, ZStack, Text, Image, Button, Spacer, Widget, modifiers, useState, useEffect, RoundedRectangle, Circle, Divider } from 'scripting';

const BG_COLOR = '#050505';
const CARD_BG = 'rgba(255, 255, 255, 0.08)';
const CARD_BORDER = 'rgba(255, 255, 255, 0.2)';

const FEATURES = [
  { id: 'ip-info', title: 'IP 定位信息', icon: 'location.fill', color: '#00E676', url: 'https://ippure.com/' },
];

const WALLPAPER_MEDIUM_KEY = 'ippure.wallpaper.medium';
const WALLPAPER_LARGE_KEY = 'ippure.wallpaper.large';

// ─── 透明壁纸设置页 ─────────────────────────────────────────
function WallpaperSettingsPage() {
  const dismiss = Navigation.useDismiss();
  const [mediumSet, setMediumSet] = useState(Storage.contains(WALLPAPER_MEDIUM_KEY));
  const [largeSet, setLargeSet] = useState(Storage.contains(WALLPAPER_LARGE_KEY));
  const [mediumPreview, setMediumPreview] = useState(null);
  const [largePreview, setLargePreview] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const mData = Storage.getData(WALLPAPER_MEDIUM_KEY);
    if (mData) setMediumPreview(UIImage.fromData(mData));
    const lData = Storage.getData(WALLPAPER_LARGE_KEY);
    if (lData) setLargePreview(UIImage.fromData(lData));
  }, []);

  async function pickWallpaper(key: string, setter: (v: boolean) => void, previewSetter: (v: any) => void) {
    try {
      const images = await Photos.pickPhotos(1);
      if (images && images.length > 0) {
        const img = images[0];
        const data = img.toJPEGData(0.9);
        if (data) {
          Storage.setData(key, data);
          setter(true);
          previewSetter(img);
          setSaved(false);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  function clearWallpaper(key: string, setter: (v: boolean) => void, previewSetter: (v: any) => void) {
    Storage.remove(key);
    setter(false);
    previewSetter(null);
    setSaved(false);
  }

  function saveAndApply() {
    Widget.reloadAll();
    setSaved(true);
  }

  return (
    <ZStack alignment="top" background={BG_COLOR} frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }} ignoresSafeArea={true}>
      <Circle fill="rgba(41, 121, 255, 0.15)" frame={{ width: 300, height: 300 }} blur={60} offset={{ x: -100, y: -50 }} />
      <Circle fill="rgba(0, 230, 118, 0.1)" frame={{ width: 250, height: 250 }} blur={50} offset={{ x: 150, y: 200 }} />

      <VStack spacing={0} frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }}>
        <HStack alignment="center" padding={{ top: 60, bottom: 20, leading: 24, trailing: 24 }}>
          <VStack alignment="leading" spacing={4}>
            <Text styledText={{ content: 'WALLPAPER SETUP', foregroundColor: '#00E676', font: { name: 'Menlo', size: 10 }, bold: true }} />
            <Text styledText={{ content: '透明壁纸设置', foregroundColor: 'white', font: { name: 'System', size: 22, design: 'rounded' }, bold: true }} />
          </VStack>
          <Spacer />
          <Button action={dismiss}>
            <Image systemName="xmark.circle.fill" resizable={{}} frame={{ width: 28, height: 28 }} modifiers={modifiers().foregroundStyle('rgba(255,255,255,0.3)')} />
          </Button>
        </HStack>

        <ScrollView showsVerticalIndicator={false}>
          <VStack alignment="leading" spacing={20} padding={{ leading: 20, trailing: 20, bottom: 40 }}>

            <VStack alignment="leading" spacing={8} padding={{ bottom: 4 }}>
              <Text styledText={{ content: '使用说明', foregroundColor: 'rgba(255,255,255,0.6)', font: 13 }} />
              <Text styledText={{ content: '1. 截取主屏幕壁纸截图（去掉所有图标）', foregroundColor: 'rgba(255,255,255,0.5)', font: 12 }} />
              <Text styledText={{ content: '2. 分别为中号和大号小组件设置壁纸', foregroundColor: 'rgba(255,255,255,0.5)', font: 12 }} />
              <Text styledText={{ content: '3. 点击保存并应用后小组件背景将自动融入桌面', foregroundColor: 'rgba(255,255,255,0.5)', font: 12 }} />
            </VStack>

            <HStack alignment="center" spacing={10} background={saved ? 'rgba(0,230,118,0.1)' : 'rgba(255,255,255,0.05)'} cornerRadius={14} padding={{ top: 10, bottom: 10, leading: 14, trailing: 14 }}>
              <Image systemName={saved ? 'checkmark.circle.fill' : 'info.circle'} resizable={{}} frame={{ width: 18, height: 18 }} modifiers={modifiers().foregroundStyle(saved ? '#00E676' : 'rgba(255,255,255,0.4)')} />
              <Text styledText={{ content: saved ? '✅ 已保存并应用到小组件' : (mediumSet || largeSet) ? '⚠️ 已选择壁纸，请点击保存并应用' : 'ℹ️ 请选择壁纸图片', foregroundColor: saved ? '#00E676' : (mediumSet || largeSet) ? '#FFD600' : 'rgba(255,255,255,0.5)', font: 13 }} />
            </HStack>

            {/* 中号小组件 */}
            <VStack alignment="leading" spacing={12} background={CARD_BG} cornerRadius={20} padding={16} modifiers={modifiers().overlay(<RoundedRectangle cornerRadius={20} stroke={CARD_BORDER} strokeWidth={1} />)}>
              <HStack alignment="center" spacing={12}>
                <Image systemName="rectangle.split.2x1" resizable={{}} frame={{ width: 22, height: 22 }} modifiers={modifiers().foregroundStyle('#00E676')} />
                <VStack alignment="leading" spacing={2}>
                  <Text styledText={{ content: '中号小组件壁纸', foregroundColor: 'white', font: 15, bold: true }} />
                  <Text styledText={{ content: mediumSet ? '✅ 已设置' : '❌ 未设置', foregroundColor: mediumSet ? '#00E676' : 'rgba(255,255,255,0.4)', font: 11 }} />
                </VStack>
                <Spacer />
              </HStack>
              {mediumPreview && (
                <ZStack alignment="center" frame={{ maxWidth: 'infinity', height: 80 }} background="rgba(0,0,0,0.3)" cornerRadius={12} clipped={true}>
                  <Image image={mediumPreview} resizable={true} frame={{ maxWidth: 'infinity', height: 80 }} />
                  <Text styledText={{ content: '预览', foregroundColor: 'white', font: 10, bold: true }} background="rgba(0,0,0,0.5)" cornerRadius={6} padding={{ top: 3, bottom: 3, leading: 8, trailing: 8 }} />
                </ZStack>
              )}
              <HStack spacing={10}>
                <Button action={() => pickWallpaper(WALLPAPER_MEDIUM_KEY, setMediumSet, setMediumPreview)}>
                  <HStack alignment="center" spacing={6} background="#00E676" cornerRadius={10} padding={{ top: 9, bottom: 9, leading: 14, trailing: 14 }}>
                    <Image systemName="photo.on.rectangle" resizable={{}} frame={{ width: 13, height: 13 }} modifiers={modifiers().foregroundStyle('black')} />
                    <Text styledText={{ content: '选择图片', foregroundColor: 'black', font: 12, bold: true }} />
                  </HStack>
                </Button>
                {mediumSet && (
                  <Button action={() => clearWallpaper(WALLPAPER_MEDIUM_KEY, setMediumSet, setMediumPreview)}>
                    <HStack alignment="center" spacing={6} background="rgba(255,59,48,0.15)" cornerRadius={10} padding={{ top: 9, bottom: 9, leading: 14, trailing: 14 }}>
                      <Image systemName="trash" resizable={{}} frame={{ width: 13, height: 13 }} modifiers={modifiers().foregroundStyle('#FF3B30')} />
                      <Text styledText={{ content: '清除', foregroundColor: '#FF3B30', font: 12, bold: true }} />
                    </HStack>
                  </Button>
                )}
              </HStack>
            </VStack>

            {/* 大号小组件 */}
            <VStack alignment="leading" spacing={12} background={CARD_BG} cornerRadius={20} padding={16} modifiers={modifiers().overlay(<RoundedRectangle cornerRadius={20} stroke={CARD_BORDER} strokeWidth={1} />)}>
              <HStack alignment="center" spacing={12}>
                <Image systemName="rectangle" resizable={{}} frame={{ width: 22, height: 22 }} modifiers={modifiers().foregroundStyle('#2979FF')} />
                <VStack alignment="leading" spacing={2}>
                  <Text styledText={{ content: '大号小组件壁纸', foregroundColor: 'white', font: 15, bold: true }} />
                  <Text styledText={{ content: largeSet ? '✅ 已设置' : '❌ 未设置', foregroundColor: largeSet ? '#00E676' : 'rgba(255,255,255,0.4)', font: 11 }} />
                </VStack>
                <Spacer />
              </HStack>
              {largePreview && (
                <ZStack alignment="center" frame={{ maxWidth: 'infinity', height: 100 }} background="rgba(0,0,0,0.3)" cornerRadius={12} clipped={true}>
                  <Image image={largePreview} resizable={true} frame={{ maxWidth: 'infinity', height: 100 }} />
                  <Text styledText={{ content: '预览', foregroundColor: 'white', font: 10, bold: true }} background="rgba(0,0,0,0.5)" cornerRadius={6} padding={{ top: 3, bottom: 3, leading: 8, trailing: 8 }} />
                </ZStack>
              )}
              <HStack spacing={10}>
                <Button action={() => pickWallpaper(WALLPAPER_LARGE_KEY, setLargeSet, setLargePreview)}>
                  <HStack alignment="center" spacing={6} background="#2979FF" cornerRadius={10} padding={{ top: 9, bottom: 9, leading: 14, trailing: 14 }}>
                    <Image systemName="photo.on.rectangle" resizable={{}} frame={{ width: 13, height: 13 }} modifiers={modifiers().foregroundStyle('white')} />
                    <Text styledText={{ content: '选择图片', foregroundColor: 'white', font: 12, bold: true }} />
                  </HStack>
                </Button>
                {largeSet && (
                  <Button action={() => clearWallpaper(WALLPAPER_LARGE_KEY, setLargeSet, setLargePreview)}>
                    <HStack alignment="center" spacing={6} background="rgba(255,59,48,0.15)" cornerRadius={10} padding={{ top: 9, bottom: 9, leading: 14, trailing: 14 }}>
                      <Image systemName="trash" resizable={{}} frame={{ width: 13, height: 13 }} modifiers={modifiers().foregroundStyle('#FF3B30')} />
                      <Text styledText={{ content: '清除', foregroundColor: '#FF3B30', font: 12, bold: true }} />
                    </HStack>
                  </Button>
                )}
              </HStack>
            </VStack>

            {/* 保存按钮 */}
            <Button action={saveAndApply}>
              <HStack alignment="center" spacing={8} frame={{ maxWidth: 'infinity' }} background={(mediumSet || largeSet) ? '#00E676' : 'rgba(255,255,255,0.1)'} cornerRadius={16} padding={{ top: 14, bottom: 14, leading: 20, trailing: 20 }}>
                <Image systemName="square.and.arrow.down" resizable={{}} frame={{ width: 16, height: 16 }} modifiers={modifiers().foregroundStyle((mediumSet || largeSet) ? 'black' : 'rgba(255,255,255,0.4)')} />
                <Text styledText={{ content: '保存并应用', foregroundColor: (mediumSet || largeSet) ? 'black' : 'rgba(255,255,255,0.4)', font: 15, bold: true }} />
              </HStack>
            </Button>

          </VStack>
        </ScrollView>
      </VStack>
    </ZStack>
  );
}

// ─── 数据行组件 ─────────────────────────────────────────────
function InfoRow({ icon, label, value, color }: { icon: string, label: string, value: string, color?: string }) {
  return (
    <HStack alignment="center" spacing={12} frame={{ maxWidth: 'infinity' }} background="rgba(0,0,0,0.2)" cornerRadius={16} padding={{ top: 12, bottom: 12, leading: 16, trailing: 16 }}>
      <Text styledText={{ content: icon, font: 18 }} frame={{ width: 24, alignment: 'center' }} />
      <VStack alignment="leading" spacing={2} layoutPriority={1}>
        <Text styledText={{ content: label, foregroundColor: 'rgba(255,255,255,0.6)', font: 11 }} />
        <Text styledText={{ content: value, foregroundColor: color || 'white', font: 15, bold: true }} lineLimit={1} marquee={true} />
      </VStack>
    </HStack>
  );
}

// ─── 主应用界面 ─────────────────────────────────────────────
function App() {
  const dismiss = Navigation.useDismiss();
  const [loading, setLoading] = useState(true);
  const [ipData, setIpData] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        // 并行请求 ipwho.is（安全标志）+ IPPure（真实风险分数）
        const [ipwhoRes, ippureRes] = await Promise.allSettled([
          fetch('https://ipwho.is/'),
          fetch('https://my.ippure.com/v1/info')
        ]);

        // 解析 ipwho.is
        let ipwhoData: any = {};
        if (ipwhoRes.status === 'fulfilled' && ipwhoRes.value.ok) {
          const json = await ipwhoRes.value.json();
          if (json?.success !== false) ipwhoData = json;
        }
        const security = ipwhoData.security || {};
        const connection = ipwhoData.connection || {};
        const isProxy = Boolean(security.proxy);
        const isVpn = Boolean(security.vpn);
        const isHosting = Boolean(security.hosting);

        // 解析 IPPure
        let ippureData: any = {};
        if (ippureRes.status === 'fulfilled' && ippureRes.value.ok) {
          ippureData = await ippureRes.value.json();
        }

        // 优先使用 IPPure 的 fraudScore，回退到估算
        const riskCount = [isProxy, isVpn, isHosting].filter(Boolean).length;
        const ippureScore = typeof ippureData.fraudScore === 'number' ? ippureData.fraudScore : undefined;
        const fallbackScore = riskCount * 35;
        const fraudScore = ippureScore ?? fallbackScore;

        const org = ippureData.asOrganization || connection.org || connection.isp || '';
        const asnNum = ippureData.asn || connection.asn;
        const asn = asnNum ? `AS${asnNum}` : '';

        const merged = {
          ip: ippureData.ip || ipwhoData.ip,
          country: ippureData.country || ipwhoData.country,
          region: ippureData.region || ipwhoData.region,
          city: ippureData.city || ipwhoData.city,
          countryCode: ippureData.countryCode || ipwhoData.country_code,
          asn,
          asOrganization: org,
          isp: connection.isp || org,
          fraudScore,
          isProxy,
          isVpn,
          isHosting,
          isResidential: Boolean(ippureData.isResidential) || (!isProxy && !isVpn && !isHosting),
          isBroadcast: Boolean(ippureData.isBroadcast),
        };

        if (merged.ip) {
          setIpData(merged);
        } else {
          setError('获取 IP 信息失败');
        }
      } catch (e) {
        setError('网络请求失败');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // 风险数据（直接从 ipData 读取）
  const fraudScore = ipData?.fraudScore ?? 0;
  const isProxy = ipData?.isProxy ?? false;
  const isVpn = ipData?.isVpn ?? false;
  const isHosting = ipData?.isHosting ?? false;
  let riskColor = '#34C759';
  let riskLabel = '低风险';
  if (fraudScore > 70) { riskColor = '#FF3B30'; riskLabel = '极度风险'; }
  else if (fraudScore > 50) { riskColor = '#FF3B30'; riskLabel = '高风险'; }
  else if (fraudScore > 40) { riskColor = '#FF9500'; riskLabel = '中度风险'; }
  else if (fraudScore > 15) { riskColor = '#FFCC00'; riskLabel = '轻微风险'; }

  const tags: string[] = [];
  if (ipData?.isBroadcast) tags.push('广播 IP');
  if (isHosting) tags.push('机房 IP');
  if (ipData?.isResidential) tags.push('住宅 IP');
  if (isProxy) tags.push('代理');
  if (isVpn) tags.push('VPN');
  if (tags.length === 0 && ipData) tags.push('普通 IP');

  const locationStr = [ipData?.country, ipData?.region, ipData?.city].filter(Boolean).join(' · ') || '获取中...';
  const asnStr = ipData?.asn || '获取中...';
  const orgStr = ipData?.asOrganization || ipData?.isp || '获取中...';

  // 风险色条段
  const gaugeSegments = [
    { range: [0, 15], color: '#1B5E20' },
    { range: [15, 25], color: '#43A047' },
    { range: [25, 40], color: '#9CCC65' },
    { range: [40, 50], color: '#FFD54F' },
    { range: [50, 70], color: '#FF7043' },
    { range: [70, 100], color: '#E53935' },
  ];
  const gaugeWidth = 280;
  const gaugeHeight = 6;
  const rawX = (fraudScore / 100) * gaugeWidth;

  return (
    <ZStack alignment="top" background={BG_COLOR} frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }} ignoresSafeArea={true}>
      <Circle fill="rgba(41, 121, 255, 0.12)" frame={{ width: 300, height: 300 }} blur={60} offset={{ x: -100, y: -50 }} />
      <Circle fill="rgba(0, 230, 118, 0.08)" frame={{ width: 250, height: 250 }} blur={50} offset={{ x: 150, y: 250 }} />
      <Circle fill="rgba(255, 59, 48, 0.06)" frame={{ width: 350, height: 350 }} blur={70} offset={{ x: 50, y: 600 }} />

      <VStack spacing={0} frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }}>
        {/* ── 顶部标题栏 ────────────────────────────── */}
        <HStack alignment="center" padding={{ top: 60, bottom: 20, leading: 24, trailing: 24 }}>
          <VStack alignment="leading" spacing={4}>
            <Text styledText={{ content: 'SYSTEM ACTIVE', foregroundColor: '#00E676', font: { name: 'Menlo', size: 10 }, bold: true }} />
            <Text styledText={{ content: 'IP 实时监控定位', foregroundColor: 'white', font: { name: 'System', size: 24, design: 'rounded' }, bold: true }} />
          </VStack>
          <Spacer />
          <Button action={dismiss}>
            <Image systemName="xmark.circle.fill" resizable={{}} frame={{ width: 28, height: 28 }} modifiers={modifiers().foregroundStyle('rgba(255,255,255,0.3)')} />
          </Button>
        </HStack>

        <ScrollView showsVerticalIndicator={false}>
          <VStack alignment="leading" spacing={20} padding={{ leading: 20, trailing: 20, bottom: 40 }}>

            {/* ── 主数据卡片 ──────────────────────────── */}
            <VStack alignment="leading" spacing={14} background={CARD_BG} cornerRadius={24} padding={20} modifiers={modifiers().overlay(<RoundedRectangle cornerRadius={24} stroke={CARD_BORDER} strokeWidth={1} />)}>
              <HStack alignment="center" spacing={12}>
                <ZStack alignment="center" frame={{ width: 44, height: 44 }} background="rgba(0, 230, 118, 0.15)" cornerRadius={14}>
                  <Image systemName="location.fill" resizable={{}} frame={{ width: 22, height: 22 }} modifiers={modifiers().foregroundStyle('#00E676')} />
                </ZStack>
                <VStack alignment="leading" spacing={2}>
                  <Text styledText={{ content: 'REALTIME DATA', foregroundColor: 'rgba(255,255,255,0.6)', font: { name: 'Menlo', size: 10 } }} />
                  <Text styledText={{ content: loading ? '正在获取...' : (ipData?.ip || '获取失败'), foregroundColor: 'white', font: 22, bold: true }} />
                </VStack>
              </HStack>

              {error ? (
                <HStack alignment="center" spacing={8} background="rgba(255,59,48,0.1)" cornerRadius={12} padding={12}>
                  <Text styledText={{ content: '❌', font: 14 }} />
                  <Text styledText={{ content: error, foregroundColor: '#FF3B30', font: 13 }} />
                </HStack>
              ) : (
                <VStack alignment="leading" spacing={8}>
                  <InfoRow icon="📍" label="位置" value={locationStr} color="#34C759" />
                  <InfoRow icon="💻" label="IP 地址" value={ipData?.ip || '获取中...'} color="#2979FF" />
                  <InfoRow icon="🏢" label="ASN" value={asnStr} color="#AF52DE" />
                  <InfoRow icon="🌐" label="运营商" value={orgStr} color="#FF9500" />
                </VStack>
              )}

              {/* 风险仪表 */}
              {!loading && !error && (
                <VStack alignment="leading" spacing={8}>
                  <Divider />
                  <HStack alignment="center" spacing={8}>
                    <Text styledText={{ content: '🛡️ 风险评分', foregroundColor: 'rgba(255,255,255,0.5)', font: 12, bold: true }} />
                    <Spacer />
                    <Text styledText={{ content: `${fraudScore}% ${riskLabel}`, foregroundColor: riskColor, font: 13, bold: true }} background="rgba(255,255,255,0.06)" cornerRadius={8} padding={{ top: 3, bottom: 3, leading: 8, trailing: 8 }} modifiers={modifiers().overlay(<RoundedRectangle cornerRadius={8} stroke={riskColor} strokeWidth={1} frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }} />)} />
                  </HStack>
                  {/* 优化后的色条与刻度对齐布局 */}
                  <VStack spacing={6} frame={{ maxWidth: 'infinity' }}>
                    <HStack spacing={2} frame={{ maxWidth: 'infinity', height: 8 }}>
                      {gaugeSegments.map((seg, i) => (
                        <RoundedRectangle key={i} fill={seg.color} cornerRadius={2} frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }} />
                      ))}
                    </HStack>
                    <HStack frame={{ maxWidth: 'infinity' }}>
                      {['0', '15', '25', '40', '50', '70', '100'].map((label) => (
                        <Text key={label} styledText={{ content: label, foregroundColor: 'rgba(255,255,255,0.4)', font: 9 }} frame={{ maxWidth: 'infinity', alignment: 'center' }} />
                      ))}
                    </HStack>
                  </VStack>
                  {/* 标签 */}
                  <HStack spacing={8}>
                    {tags.map(tag => (
                      <Text styledText={{ content: tag, foregroundColor: '#EE7799', font: 11, bold: true }} background="rgba(255,255,255,0.06)" cornerRadius={8} padding={{ top: 3, bottom: 3, leading: 8, trailing: 8 }} modifiers={modifiers().overlay(<RoundedRectangle cornerRadius={8} stroke="#EE7799" strokeWidth={1} frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }} />)} />
                    ))}
                  </HStack>
                </VStack>
              )}
            </VStack>

            {/* ── 工具按钮组 ──────────────────────────── */}
            <VStack alignment="leading" spacing={10}>
              <Text styledText={{ content: 'TOOLS', foregroundColor: 'rgba(255,255,255,0.4)', font: { name: 'Menlo', size: 11 }, bold: true }} padding={{ leading: 4 }} />
              <HStack spacing={12} frame={{ maxWidth: 'infinity' }}>
                <Button action={() => Widget.preview({ family: 'systemMedium' })}>
                  <VStack alignment="center" spacing={6} frame={{ maxWidth: 'infinity' }} background={CARD_BG} cornerRadius={18} padding={{ top: 14, bottom: 14, leading: 10, trailing: 10 }} modifiers={modifiers().overlay(<RoundedRectangle cornerRadius={18} stroke={CARD_BORDER} strokeWidth={1} frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }} />)}>
                    <Image systemName="rectangle.split.2x1" resizable={{}} frame={{ width: 22, height: 22 }} modifiers={modifiers().foregroundStyle('#00E676')} />
                    <Text styledText={{ content: '中号预览', foregroundColor: 'white', font: 11, bold: true }} />
                  </VStack>
                </Button>
                <Button action={() => Widget.preview({ family: 'systemLarge' })}>
                  <VStack alignment="center" spacing={6} frame={{ maxWidth: 'infinity' }} background={CARD_BG} cornerRadius={18} padding={{ top: 14, bottom: 14, leading: 10, trailing: 10 }} modifiers={modifiers().overlay(<RoundedRectangle cornerRadius={18} stroke={CARD_BORDER} strokeWidth={1} frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }} />)}>
                    <Image systemName="rectangle" resizable={{}} frame={{ width: 22, height: 22 }} modifiers={modifiers().foregroundStyle('#2979FF')} />
                    <Text styledText={{ content: '大号预览', foregroundColor: 'white', font: 11, bold: true }} />
                  </VStack>
                </Button>
                <Button action={() => Navigation.present(<WallpaperSettingsPage />)}>
                  <VStack alignment="center" spacing={6} frame={{ maxWidth: 'infinity' }} background={CARD_BG} cornerRadius={18} padding={{ top: 14, bottom: 14, leading: 10, trailing: 10 }} modifiers={modifiers().overlay(<RoundedRectangle cornerRadius={18} stroke={CARD_BORDER} strokeWidth={1} frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }} />)}>
                    <Image systemName="photo" resizable={{}} frame={{ width: 22, height: 22 }} modifiers={modifiers().foregroundStyle('#AF52DE')} />
                    <Text styledText={{ content: '透明壁纸', foregroundColor: 'white', font: 11, bold: true }} />
                  </VStack>
                </Button>
              </HStack>
            </VStack>

            {/* ── 底部标识 ──────────────────────────── */}
            <VStack alignment="center" spacing={4} padding={{ top: 10 }}>
              <Text styledText={{ content: 'IP PURE MONITOR v2.0', foregroundColor: 'rgba(255,255,255,0.15)', font: { name: 'Menlo', size: 10 } }} />
              <Text styledText={{ content: 'REALTIME IP MONITORING', foregroundColor: 'rgba(0,230,118,0.3)', font: { name: 'Menlo', size: 10 } }} />
            </VStack>

          </VStack>
        </ScrollView>
      </VStack>
    </ZStack>
  );
}

async function run() {
  Script.onResume(() => {});

  await Navigation.present(<App />);
  Script.exit();
}

run();