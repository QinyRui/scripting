// @ts-nocheck
import { Script, Navigation, NavigationStack, ScrollView, VStack, HStack, ZStack, Text, Image, Button, Spacer, Widget, modifiers, useState, useEffect, RoundedRectangle, Circle, WebView } from 'scripting';

const BASE_URL = 'https://ippure.com';
const STORAGE_KEY = 'ippure.selectedFeature';
const BG_COLOR = '#0B0C10';
const CARD_BG = 'rgba(255, 255, 255, 0.04)';
const CARD_BORDER = 'rgba(255, 255, 255, 0.1)';

const FEATURES = [
  { id: 'ip-info', group: '核心检测', title: 'IP 定位信息', subtitle: '精准获悉 IP 地理位置与运营商信息', detailTitle: '当前 IP 地理与运营商概览', detail: '展示公网 IP、国家/地区、城市、ASN、运营商组织等基础定位数据，适合快速确认当前网络出口。', data: ['公网 IP 与定位', '国家 / 省市 / 城市', 'ASN 与运营商', '经纬度与时区'], icon: 'location.fill', emoji: '📍', color: '#00E676', url: 'https://ippure.com/' },
  { id: 'risk', group: '核心检测', title: 'IP 风险检测', subtitle: '识别欺诈、代理及黑名单风险', detailTitle: '风险评分与纯净度数据', detail: '汇总欺诈分、代理/VPN/机房识别、住宅属性、广播 IP 等风险维度，帮助判断 IP 是否适合账号注册、登录与业务访问。', data: ['欺诈风险评分', '代理 / VPN / 机房识别', '住宅 IP 判断', '黑名单与异常标签'], icon: 'shield.lefthalf.filled', emoji: '🛡️', color: '#FF9100', url: 'https://ippure.com/' },
  { id: 'fingerprint', group: '浏览器隐私', title: '指纹信息分析', subtitle: '深度解析浏览器与设备指纹特征', detailTitle: '浏览器指纹明细', detail: '查看 User-Agent、系统语言、屏幕尺寸、时区、Canvas/WebGL 等设备与浏览器特征，用于评估浏览器唯一性。', data: ['User-Agent 与平台', '语言 / 时区 / 分辨率', 'Canvas / WebGL 指纹', '字体与硬件特征'], icon: 'touchid', emoji: '👆', color: '#D500F9', url: 'https://ippure.com/fingerprint' },
  { id: 'outbound', group: '网络链路', title: 'IP 出口地图', subtitle: '可视化展示网络链路与出口节点', detailTitle: '网络出口链路数据', detail: '通过地图与链路信息展示当前访问出口、节点位置和运营商路径，便于排查代理线路与跨区访问问题。', data: ['出口节点位置', '链路与地图视图', '运营商路径', '访问区域对比'], icon: 'map.fill', emoji: '🗺️', color: '#2979FF', url: 'https://ippure.com/IP-Outbound-Detect' },
  { id: 'vpn-leak', group: '泄露检测', title: 'VPN 泄露检测', subtitle: '检测是否存在 VPN 穿透与伪装', detailTitle: 'VPN 泄露检测数据', detail: '检测 VPN 是否正确接管网络访问，识别真实出口与代理出口不一致、IPv6 穿透等潜在隐私泄露。', data: ['真实出口对比', 'VPN / 代理状态', 'IPv4 / IPv6 泄露', '伪装一致性'], icon: 'lock.shield.fill', emoji: '🔐', color: '#651FFF', url: 'https://ippure.com/IP-leak-Detect' },
  { id: 'webrtc', group: '泄露检测', title: 'WebRTC 检测', subtitle: '防止真实 IP 通过 WebRTC 协议泄露', detailTitle: 'WebRTC 暴露数据', detail: '检查浏览器 WebRTC 是否暴露本地地址、局域网地址或真实公网 IP，适合浏览器隐私配置核验。', data: ['WebRTC 公网候选地址', '局域网 IP 暴露', '浏览器策略状态', '泄露风险建议'], icon: 'video.badge.ellipsis', emoji: '🧩', color: '#00B0FF', url: 'https://ippure.com/Browser-WebRTC-Leak-Detect' },
  { id: 'dns-leak', group: '泄露检测', title: 'DNS 泄露检测', subtitle: '确保域名解析请求的安全隐私', detailTitle: 'DNS 解析泄露数据', detail: '检查 DNS 请求是否走预期线路，展示解析服务器、所属地区和运营商，避免 DNS 侧暴露真实网络环境。', data: ['DNS 服务器列表', '解析地区与运营商', '代理线路一致性', '泄露风险判断'], icon: 'network', emoji: '🌐', color: '#00E5FF', url: 'https://ippure.com/DNS-Leak-Detect' },
  { id: 'advanced', group: '更多服务', title: '高级检测服务', subtitle: '更多检测能力开发中', detailTitle: '高级检测能力', detail: '预留更多综合检测入口，用于扩展账号环境、网络质量、访问连通性等高级数据面板。', data: ['综合检测入口', '网络质量扩展', '账号环境评估', '更多能力开发中'], icon: 'sparkles', emoji: '✨', color: '#FF1744', url: 'https://ippure.com/todo' },
];

function readSelectedId() {
  const saved = Storage.get<any>(STORAGE_KEY) || Storage.get<any>(STORAGE_KEY, { shared: true });
  return typeof saved === 'string' ? saved : saved?.id || 'ip-info';
}

function saveSelectedFeature(feature: any) {
  Storage.set(STORAGE_KEY, { id: feature.id, title: feature.title, url: feature.url, updatedAt: new Date().toISOString() });
  Storage.set(STORAGE_KEY, { id: feature.id, title: feature.title, url: feature.url, updatedAt: new Date().toISOString() }, { shared: true });
  Widget.reloadAll();
}

function chunkArray(array: any[], size: number) {
  const chunked = [];
  for (let i = 0; i < array.length; i += size) {
    chunked.push(array.slice(i, i + size));
  }
  return chunked;
}

const WALLPAPER_MEDIUM_KEY = 'ippure.wallpaper.medium';
const WALLPAPER_LARGE_KEY = 'ippure.wallpaper.large';

function WallpaperSettingsPage() {
  const dismiss = Navigation.useDismiss();
  const [mediumSet, setMediumSet] = useState(Storage.contains(WALLPAPER_MEDIUM_KEY));
  const [largeSet, setLargeSet] = useState(Storage.contains(WALLPAPER_LARGE_KEY));
  const [mediumPreview, setMediumPreview] = useState(null);
  const [largePreview, setLargePreview] = useState(null);
  const [saved, setSaved] = useState(false);

  // Load existing previews on mount
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
            <Text styledText={{ content: '\u900f\u660e\u58c1\u7eb8\u8bbe\u7f6e', foregroundColor: 'white', font: { name: 'System', size: 22, design: 'rounded' }, bold: true }} />
          </VStack>
          <Spacer />
          <Button action={dismiss}>
            <Image systemName="xmark.circle.fill" resizable={{}} frame={{ width: 28, height: 28 }} modifiers={modifiers().foregroundStyle('rgba(255,255,255,0.3)')} />
          </Button>
        </HStack>

        <ScrollView showsVerticalIndicator={false}>
          <VStack alignment="leading" spacing={20} padding={{ leading: 20, trailing: 20, bottom: 40 }}>

            <VStack alignment="leading" spacing={8} padding={{ bottom: 4 }}>
              <Text styledText={{ content: '\u4f7f\u7528\u8bf4\u660e', foregroundColor: 'rgba(255,255,255,0.6)', font: 13 }} />
              <Text styledText={{ content: '1. \u622a\u53d6\u4e3b\u5c4f\u5e55\u58c1\u7eb8\u622a\u56fe\uff08\u53bb\u6389\u6240\u6709\u56fe\u6807\uff09', foregroundColor: 'rgba(255,255,255,0.5)', font: 12 }} />
              <Text styledText={{ content: '2. \u5206\u522b\u4e3a\u4e2d\u53f7\u548c\u5927\u53f7\u5c0f\u7ec4\u4ef6\u8bbe\u7f6e\u58c1\u7eb8', foregroundColor: 'rgba(255,255,255,0.5)', font: 12 }} />
              <Text styledText={{ content: '3. \u70b9\u51fb\u4fdd\u5b58\u5e76\u5e94\u7528\u540e\u5c0f\u7ec4\u4ef6\u80cc\u666f\u5c06\u81ea\u52a8\u878d\u5165\u684c\u9762', foregroundColor: 'rgba(255,255,255,0.5)', font: 12 }} />
            </VStack>

            {/* \u72b6\u6001\u6307\u793a\u5668 */}
            <HStack alignment="center" spacing={10} background={saved ? 'rgba(0,230,118,0.1)' : 'rgba(255,255,255,0.05)'} cornerRadius={14} padding={{ top: 10, bottom: 10, leading: 14, trailing: 14 }}>
              <Image systemName={saved ? 'checkmark.circle.fill' : 'info.circle'} resizable={{}} frame={{ width: 18, height: 18 }} modifiers={modifiers().foregroundStyle(saved ? '#00E676' : 'rgba(255,255,255,0.4)')} />
              <Text styledText={{ content: saved ? '\u2705 \u5df2\u4fdd\u5b58\u5e76\u5e94\u7528\u5230\u5c0f\u7ec4\u4ef6' : (mediumSet || largeSet) ? '\u26a0\ufe0f \u5df2\u9009\u62e9\u58c1\u7eb8\uff0c\u8bf7\u70b9\u51fb\u4fdd\u5b58\u5e76\u5e94\u7528' : '\u2139\ufe0f \u8bf7\u9009\u62e9\u58c1\u7eb8\u56fe\u7247', foregroundColor: saved ? '#00E676' : (mediumSet || largeSet) ? '#FFD600' : 'rgba(255,255,255,0.5)', font: 13 }} />
            </HStack>

            {/* \u4e2d\u53f7\u5c0f\u7ec4\u4ef6 */}
            <VStack alignment="leading" spacing={12} background={CARD_BG} cornerRadius={20} padding={16} modifiers={modifiers().overlay(<RoundedRectangle cornerRadius={20} stroke={CARD_BORDER} strokeWidth={1} />)}>
              <HStack alignment="center" spacing={12}>
                <Image systemName="rectangle.split.2x1" resizable={{}} frame={{ width: 22, height: 22 }} modifiers={modifiers().foregroundStyle('#00E676')} />
                <VStack alignment="leading" spacing={2}>
                  <Text styledText={{ content: '\u4e2d\u53f7\u5c0f\u7ec4\u4ef6\u58c1\u7eb8', foregroundColor: 'white', font: 15, bold: true }} />
                  <Text styledText={{ content: mediumSet ? '\u2705 \u5df2\u8bbe\u7f6e' : '\u274c \u672a\u8bbe\u7f6e', foregroundColor: mediumSet ? '#00E676' : 'rgba(255,255,255,0.4)', font: 11 }} />
                </VStack>
                <Spacer />
              </HStack>
              {mediumPreview && (
                <ZStack alignment="center" frame={{ maxWidth: 'infinity', height: 80 }} background="rgba(0,0,0,0.3)" cornerRadius={12} clipped={true}>
                  <Image image={mediumPreview} resizable={true} frame={{ maxWidth: 'infinity', height: 80 }} />
                  <Text styledText={{ content: '\u9884\u89c8', foregroundColor: 'white', font: 10, bold: true }} background="rgba(0,0,0,0.5)" cornerRadius={6} padding={{ top: 3, bottom: 3, leading: 8, trailing: 8 }} />
                </ZStack>
              )}
              <HStack spacing={10}>
                <Button action={() => pickWallpaper(WALLPAPER_MEDIUM_KEY, setMediumSet, setMediumPreview)}>
                  <HStack alignment="center" spacing={6} background="#00E676" cornerRadius={10} padding={{ top: 9, bottom: 9, leading: 14, trailing: 14 }}>
                    <Image systemName="photo.on.rectangle" resizable={{}} frame={{ width: 13, height: 13 }} modifiers={modifiers().foregroundStyle('black')} />
                    <Text styledText={{ content: '\u9009\u62e9\u56fe\u7247', foregroundColor: 'black', font: 12, bold: true }} />
                  </HStack>
                </Button>
                {mediumSet && (
                  <Button action={() => clearWallpaper(WALLPAPER_MEDIUM_KEY, setMediumSet, setMediumPreview)}>
                    <HStack alignment="center" spacing={6} background="rgba(255,59,48,0.15)" cornerRadius={10} padding={{ top: 9, bottom: 9, leading: 14, trailing: 14 }}>
                      <Image systemName="trash" resizable={{}} frame={{ width: 13, height: 13 }} modifiers={modifiers().foregroundStyle('#FF3B30')} />
                      <Text styledText={{ content: '\u6e05\u9664', foregroundColor: '#FF3B30', font: 12, bold: true }} />
                    </HStack>
                  </Button>
                )}
              </HStack>
            </VStack>

            {/* \u5927\u53f7\u5c0f\u7ec4\u4ef6 */}
            <VStack alignment="leading" spacing={12} background={CARD_BG} cornerRadius={20} padding={16} modifiers={modifiers().overlay(<RoundedRectangle cornerRadius={20} stroke={CARD_BORDER} strokeWidth={1} />)}>
              <HStack alignment="center" spacing={12}>
                <Image systemName="rectangle" resizable={{}} frame={{ width: 22, height: 22 }} modifiers={modifiers().foregroundStyle('#2979FF')} />
                <VStack alignment="leading" spacing={2}>
                  <Text styledText={{ content: '\u5927\u53f7\u5c0f\u7ec4\u4ef6\u58c1\u7eb8', foregroundColor: 'white', font: 15, bold: true }} />
                  <Text styledText={{ content: largeSet ? '\u2705 \u5df2\u8bbe\u7f6e' : '\u274c \u672a\u8bbe\u7f6e', foregroundColor: largeSet ? '#00E676' : 'rgba(255,255,255,0.4)', font: 11 }} />
                </VStack>
                <Spacer />
              </HStack>
              {largePreview && (
                <ZStack alignment="center" frame={{ maxWidth: 'infinity', height: 100 }} background="rgba(0,0,0,0.3)" cornerRadius={12} clipped={true}>
                  <Image image={largePreview} resizable={true} frame={{ maxWidth: 'infinity', height: 100 }} />
                  <Text styledText={{ content: '\u9884\u89c8', foregroundColor: 'white', font: 10, bold: true }} background="rgba(0,0,0,0.5)" cornerRadius={6} padding={{ top: 3, bottom: 3, leading: 8, trailing: 8 }} />
                </ZStack>
              )}
              <HStack spacing={10}>
                <Button action={() => pickWallpaper(WALLPAPER_LARGE_KEY, setLargeSet, setLargePreview)}>
                  <HStack alignment="center" spacing={6} background="#2979FF" cornerRadius={10} padding={{ top: 9, bottom: 9, leading: 14, trailing: 14 }}>
                    <Image systemName="photo.on.rectangle" resizable={{}} frame={{ width: 13, height: 13 }} modifiers={modifiers().foregroundStyle('white')} />
                    <Text styledText={{ content: '\u9009\u62e9\u56fe\u7247', foregroundColor: 'white', font: 12, bold: true }} />
                  </HStack>
                </Button>
                {largeSet && (
                  <Button action={() => clearWallpaper(WALLPAPER_LARGE_KEY, setLargeSet, setLargePreview)}>
                    <HStack alignment="center" spacing={6} background="rgba(255,59,48,0.15)" cornerRadius={10} padding={{ top: 9, bottom: 9, leading: 14, trailing: 14 }}>
                      <Image systemName="trash" resizable={{}} frame={{ width: 13, height: 13 }} modifiers={modifiers().foregroundStyle('#FF3B30')} />
                      <Text styledText={{ content: '\u6e05\u9664', foregroundColor: '#FF3B30', font: 12, bold: true }} />
                    </HStack>
                  </Button>
                )}
              </HStack>
            </VStack>

            {/* \u4fdd\u5b58\u6309\u94ae */}
            <Button action={saveAndApply}>
              <HStack alignment="center" spacing={8} frame={{ maxWidth: 'infinity' }} background={(mediumSet || largeSet) ? '#00E676' : 'rgba(255,255,255,0.1)'} cornerRadius={16} padding={{ top: 14, bottom: 14, leading: 20, trailing: 20 }}>
                <Image systemName="square.and.arrow.down" resizable={{}} frame={{ width: 16, height: 16 }} modifiers={modifiers().foregroundStyle((mediumSet || largeSet) ? 'black' : 'rgba(255,255,255,0.4)')} />
                <Text styledText={{ content: '\u4fdd\u5b58\u5e76\u5e94\u7528', foregroundColor: (mediumSet || largeSet) ? 'black' : 'rgba(255,255,255,0.4)', font: 15, bold: true }} />
              </HStack>
            </Button>

            <VStack alignment="center" spacing={4} padding={{ top: 10 }}>
              <Text styledText={{ content: 'TRANSPARENT WIDGET', foregroundColor: 'rgba(255,255,255,0.2)', font: { name: 'Menlo', size: 10 } }} />
              <Text styledText={{ content: '\u8bbe\u7f6e\u540e\u5c0f\u7ec4\u4ef6\u5c06\u81ea\u52a8\u5e94\u7528\u900f\u660e\u80cc\u666f', foregroundColor: 'rgba(0,230,118,0.4)', font: { name: 'Menlo', size: 10 } }} />
            </VStack>

          </VStack>
        </ScrollView>
      </VStack>
    </ZStack>
  );
}

function App() {
  const dismiss = Navigation.useDismiss();
  const [selectedId, setSelectedId] = useState(readSelectedId());
  const selected = FEATURES.find(item => item.id === selectedId) || FEATURES[0];

  const [ip, setIp] = useState('');
  useEffect(() => {
    fetch('https://ipwho.is/').then(res => res.json()).then(data => {
      if (data.ip) setIp(data.ip);
    }).catch(e => console.error(e));
  }, []);

  const [webController, setWebController] = useState(null);
  useEffect(() => {
    const controller = new WebViewController({ ephemeral: true });
    setWebController(controller);
    return () => controller.dispose();
  }, []);

  useEffect(() => {
    if (webController && selected.id === 'vpn-leak') {
      webController.loadURL(`https://ippure.com/IP-leak-Detect.html#/ip/${ip || ''}`);
    }
  }, [selected.id, ip, webController]);

  function choose(feature: any) {
    saveSelectedFeature(feature);
    setSelectedId(feature.id);
  }

  return (
    <ZStack alignment="top" background={BG_COLOR} frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }} ignoresSafeArea={true}>
      <Circle fill="rgba(41, 121, 255, 0.15)" frame={{ width: 300, height: 300 }} blur={60} offset={{ x: -100, y: -50 }} />
      <Circle fill="rgba(0, 230, 118, 0.1)" frame={{ width: 250, height: 250 }} blur={50} offset={{ x: 150, y: 200 }} />
      <Circle fill="rgba(213, 0, 249, 0.1)" frame={{ width: 350, height: 350 }} blur={70} offset={{ x: 50, y: 600 }} />

      <VStack spacing={0} frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }}>
        <HStack alignment="center" padding={{ top: 60, bottom: 20, leading: 24, trailing: 24 }}>
          <VStack alignment="leading" spacing={4}>
            <Text styledText={{ content: 'SYSTEM ACTIVE', foregroundColor: '#00E676', font: { name: 'Menlo', size: 10 }, bold: true }} />
            <Text styledText={{ content: 'IPPure', foregroundColor: 'white', font: { name: 'System', size: 24, design: 'rounded' }, bold: true }} />
          </VStack>
          <Spacer />
          <Button action={dismiss}>
            <Image systemName="xmark.circle.fill" resizable={{}} frame={{ width: 28, height: 28 }} modifiers={modifiers().foregroundStyle('rgba(255,255,255,0.3)')} />
          </Button>
        </HStack>

        <ScrollView showsVerticalIndicator={false}>
          <VStack alignment="leading" spacing={24} padding={{ leading: 20, trailing: 20, bottom: 40 }}>
            
            <VStack alignment="leading" spacing={16} background={CARD_BG} cornerRadius={24} padding={20} modifiers={modifiers().overlay(<RoundedRectangle cornerRadius={24} stroke={CARD_BORDER} strokeWidth={1} />)}>
              <HStack alignment="center" spacing={12}>
                <ZStack alignment="center" frame={{ width: 50, height: 50 }} background={`rgba(${selected.color.replace('#', '')}, 0.2)`} cornerRadius={16}>
                  <Image systemName={selected.icon} resizable={{}} frame={{ width: 24, height: 24 }} modifiers={modifiers().foregroundStyle(selected.color)} />
                </ZStack>
                <VStack alignment="leading" spacing={4}>
                  <Text styledText={{ content: 'SELECTED MODULE', foregroundColor: 'rgba(255,255,255,0.5)', font: { name: 'Menlo', size: 10 } }} />
                  <Text styledText={{ content: selected.title, foregroundColor: 'white', font: 20, bold: true }} />
                </VStack>
                <Spacer />
                <ZStack alignment="center" frame={{ width: 44, height: 44 }} background="rgba(255,255,255,0.05)" cornerRadius={22}>
                  <Text styledText={{ content: selected.emoji, font: 20 }} />
                </ZStack>
              </HStack>

              <Text styledText={{ content: selected.detail, foregroundColor: 'rgba(255,255,255,0.7)', font: 14 }} lineLimit={4} />

              {selected.id === 'vpn-leak' && webController ? (
                <VStack background="rgba(0,0,0,0.5)" cornerRadius={16} padding={0} frame={{ height: 280 }} clipped={true}>
                  <WebView controller={webController} />
                </VStack>
              ) : (
                <VStack alignment="leading" spacing={8} padding={{ top: 8, bottom: 8 }}>
                  {chunkArray(selected.data, 2).map(row => (
                    <HStack spacing={12} frame={{ maxWidth: 'infinity' }}>
                      {row.map((item: string) => (
                        <HStack alignment="center" spacing={6} frame={{ maxWidth: 'infinity' }} background="rgba(0,0,0,0.3)" cornerRadius={10} padding={{ top: 8, bottom: 8, leading: 10, trailing: 10 }}>
                          <Circle fill={selected.color} frame={{ width: 6, height: 6 }} />
                          <Text styledText={{ content: item, foregroundColor: 'rgba(255,255,255,0.9)', font: 12, bold: true }} lineLimit={1} />
                        </HStack>
                      ))}
                    </HStack>
                  ))}
                </VStack>
              )}

              <HStack spacing={12}>
                <Button action={() => {}}>
                  <HStack alignment="center" spacing={6} background={selected.color} cornerRadius={12} padding={{ top: 12, bottom: 12, leading: 20, trailing: 20 }}>
                    <Image systemName="bolt.fill" resizable={{}} frame={{ width: 14, height: 14 }} modifiers={modifiers().foregroundStyle('white')} />
                    <Text styledText={{ content: 'MODULE ACTIVE', foregroundColor: 'white', font: 13, bold: true }} />
                  </HStack>
                </Button>
                <Button action={() => Widget.preview({ family: 'systemMedium' })}>
                  <HStack alignment="center" spacing={6} background="rgba(255,255,255,0.1)" cornerRadius={12} padding={{ top: 12, bottom: 12, leading: 20, trailing: 20 }}>
                    <Image systemName="widget.small" resizable={{}} frame={{ width: 14, height: 14 }} modifiers={modifiers().foregroundStyle('white')} />
                    <Text styledText={{ content: '中号预览', foregroundColor: 'white', font: 13, bold: true }} />
                  </HStack>
                </Button>
                <Button action={() => Widget.preview({ family: 'systemLarge' })}>
                  <HStack alignment="center" spacing={6} background="rgba(255,255,255,0.1)" cornerRadius={12} padding={{ top: 12, bottom: 12, leading: 20, trailing: 20 }}>
                    <Image systemName="widget.large" resizable={{}} frame={{ width: 14, height: 14 }} modifiers={modifiers().foregroundStyle('white')} />
                    <Text styledText={{ content: '大号预览', foregroundColor: 'white', font: 13, bold: true }} />
                  </HStack>
                </Button>
              </HStack>
              
              <Button action={() => {
                Navigation.present(<WallpaperSettingsPage />);
              }}>
                <HStack alignment="center" spacing={6} background="rgba(255,255,255,0.1)" cornerRadius={12} padding={{ top: 12, bottom: 12, leading: 20, trailing: 20 }}>
                  <Image systemName="photo" resizable={{}} frame={{ width: 14, height: 14 }} modifiers={modifiers().foregroundStyle('white')} />
                  <Text styledText={{ content: '设置透明壁纸', foregroundColor: 'white', font: 13, bold: true }} />
                </HStack>
              </Button>
            </VStack>

            <VStack alignment="leading" spacing={12}>
              <Text styledText={{ content: 'AVAILABLE MODULES', foregroundColor: 'rgba(255,255,255,0.5)', font: { name: 'Menlo', size: 12 }, bold: true }} padding={{ leading: 4 }} />
              
              <VStack spacing={12}>
                {chunkArray(FEATURES.filter(f => f.id !== selectedId), 2).map(row => (
                  <HStack spacing={12} frame={{ maxWidth: 'infinity' }}>
                    {row.map((feature: any) => (
                      <Button action={() => choose(feature)}>
                        <VStack alignment="leading" spacing={12} frame={{ maxWidth: 'infinity' }} background={CARD_BG} cornerRadius={20} padding={16} modifiers={modifiers().overlay(<RoundedRectangle cornerRadius={20} stroke={CARD_BORDER} strokeWidth={1} />)}>
                          <HStack alignment="center" spacing={0} frame={{ maxWidth: 'infinity' }}>
                            <Image systemName={feature.icon} resizable={{}} frame={{ width: 20, height: 20 }} modifiers={modifiers().foregroundStyle(feature.color)} />
                            <Spacer />
                            <Image systemName="chevron.right" resizable={{}} frame={{ width: 8, height: 12 }} modifiers={modifiers().foregroundStyle('rgba(255,255,255,0.2)')} />
                          </HStack>
                          <VStack alignment="leading" spacing={4}>
                            <Text styledText={{ content: feature.title, foregroundColor: 'white', font: 14, bold: true }} lineLimit={1} />
                            <Text styledText={{ content: feature.group, foregroundColor: 'rgba(255,255,255,0.4)', font: { name: 'Menlo', size: 10 } }} lineLimit={1} />
                          </VStack>
                        </VStack>
                      </Button>
                    ))}
                    {row.length === 1 && <Spacer frame={{ maxWidth: 'infinity' }} />}
                  </HStack>
                ))}
              </VStack>
            </VStack>

            <VStack alignment="center" spacing={4} padding={{ top: 20 }}>
              <Text styledText={{ content: 'IPPURE TERMINAL v1.0', foregroundColor: 'rgba(255,255,255,0.2)', font: { name: 'Menlo', size: 10 } }} />
              <Text styledText={{ content: 'ALL SYSTEMS NOMINAL', foregroundColor: 'rgba(0,230,118,0.4)', font: { name: 'Menlo', size: 10 } }} />
            </VStack>

          </VStack>
        </ScrollView>
      </VStack>
    </ZStack>
  );
}

async function run() {
  const featureId = Script.queryParameters?.feature;
  if (featureId) {
    const feature = FEATURES.find(item => item.id === featureId);
    if (feature) saveSelectedFeature(feature);
  }
  await Navigation.present(<App />);
  Script.exit();
}

run();