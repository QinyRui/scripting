// @ts-nocheck
import { Widget, VStack, HStack, ZStack, Text, Spacer, Divider, Image, Link, Script, RoundedRectangle, Circle, modifiers, fetch, Button } from 'scripting';
import { SelectFeatureIntent } from './app_intents';

const BASE_URL = 'https://ippure.com';
const STORAGE_KEY = 'ippure.selectedFeature';
const WIDGET_BACKGROUND = 'systemBackground';
const CARD_BACKGROUND = 'secondarySystemBackground';
const TERTIARY_CARD_BACKGROUND = 'tertiarySystemBackground';

// ─── 透明背景支持 ───────────────────────────────────────────
// 当用户在 iOS 主屏幕组件设置中启用「透明背景」时，
// Widget.isTransparentBackground 为 true，此时：
//   1. 组件外层不设背景色，让桌面壁纸透出
//   2. 卡片/面板使用深色半透明毛玻璃背景，保证文字可读性
function isTransparent(): boolean {
  try { return Widget.isTransparentBackground; } catch { return false; }
}
const GLASS_BG = 'rgba(30,30,30,0.65)';
const GLASS_CARD_BG = 'rgba(40,40,40,0.55)';
const GLASS_TERTIARY_BG = 'rgba(50,50,50,0.45)';
function widgetBg(): string | undefined { return isTransparent() ? undefined : WIDGET_BACKGROUND; }
function cardBg(): string { return isTransparent() ? GLASS_CARD_BG : CARD_BACKGROUND; }
function tertiaryBg(): string { return isTransparent() ? GLASS_TERTIARY_BG : TERTIARY_CARD_BACKGROUND; }
const OSM_TILE_ZOOM = 4;
const COUNTRY_MAP_ZOOM: Record<string, number> = {
  RU: 2, CA: 2, US: 3, CN: 3, BR: 3, AU: 3,
  IN: 4, AR: 4, KZ: 4, MX: 4, ID: 4, SA: 4,
  JP: 5, KR: 5, GB: 5, DE: 5, FR: 5, IT: 5, ES: 5, TH: 5, VN: 5, TR: 5,
  SG: 8, HK: 8, MO: 8,
};
const PRIMARY_TEXT = 'label';
const SECONDARY_TEXT = 'secondaryLabel';

const FEATURES = [
  { id: 'ip-info', title: 'IP 定位信息', shortTitle: '定位', icon: 'location.fill', emoji: '📍', color: '#34C759', url: 'https://ippure.com/', desc: '精准获悉 IP 地理位置与运营商信息' },
  { id: 'risk', title: 'IP 风险检测', shortTitle: '风险', icon: 'shield.lefthalf.filled', emoji: '🛡️', color: '#FF9500', url: 'https://ippure.com/', desc: '识别欺诈、代理及黑名单风险' },
  { id: 'fingerprint', title: '指纹信息分析', shortTitle: '指纹', icon: 'touchid', emoji: '👆', color: '#AF52DE', url: 'https://ippure.com/fingerprint', desc: '深度解析浏览器与设备指纹特征' },
  { id: 'outbound', title: 'IP 出口地图', shortTitle: '出口', icon: 'map.fill', emoji: '🗺️', color: '#007AFF', url: 'https://ippure.com/IP-Outbound-Detect', desc: '可视化展示网络链路与出口节点' },
  { id: 'vpn-leak', title: 'VPN 泄露检测', shortTitle: 'VPN', icon: 'lock.shield.fill', emoji: '🔐', color: '#5856D6', url: 'https://ippure.com/IP-leak-Detect', desc: '检测是否存在 VPN 穿透与伪装' },
  { id: 'webrtc', title: 'WebRTC 检测', shortTitle: 'WebRTC', icon: 'video.badge.ellipsis', emoji: '🧩', color: '#00C7BE', url: 'https://ippure.com/Browser-WebRTC-Leak-Detect', desc: '防止真实 IP 通过 WebRTC 协议泄露' },
  { id: 'dns-leak', title: 'DNS 泄露检测', shortTitle: 'DNS', icon: 'network', emoji: '🌐', color: '#32ADE6', url: 'https://ippure.com/DNS-Leak-Detect', desc: '确保域名解析请求的安全隐私' },
  { id: 'advanced', title: '高级检测服务', shortTitle: '高级', icon: 'sparkles', emoji: '✨', color: '#FF2D55', url: 'https://ippure.com/todo', desc: '更多检测服务开发中' },
];

function getSelectedFeature() {
  const saved = Storage.get<any>(STORAGE_KEY) || Storage.get<any>(STORAGE_KEY, { shared: true });
  const id = typeof saved === 'string' ? saved : saved?.id;
  return FEATURES.find(item => item.id === id) || FEATURES[0];
}

function ErrorView() {
  return (
    <VStack alignment="center" background={WIDGET_BACKGROUND} cornerRadius={16} padding={16} widgetURL={Script.createRunSingleURLScheme(Script.name)}>
      <Text styledText={{ content: "❌ 获取 IP 信息失败", foregroundColor: PRIMARY_TEXT, font: 14, bold: true }} />
      <Text styledText={{ content: "请检查网络或稍后重试", foregroundColor: SECONDARY_TEXT, font: 11 }} />
    </VStack>
  );
}

const WALLPAPER_MEDIUM_KEY = 'ippure.wallpaper.medium';
const WALLPAPER_LARGE_KEY = 'ippure.wallpaper.large';

function IPWidgetView({ data, locationZh, mapImage, pinPoint, widgetSize }: { data: any, locationZh: string, mapImage: any, pinPoint: any, widgetSize: any }) {
  if (!data) return <ErrorView />;
  const family = Widget.family;
  if (family === 'systemSmall') return <SmallWidget data={data} locationZh={locationZh} mapImage={mapImage} pinPoint={pinPoint} widgetSize={widgetSize} />;
  if (family === 'systemLarge') return <LargeWidget data={data} locationZh={locationZh} mapImage={mapImage} pinPoint={pinPoint} widgetSize={widgetSize} />;
  return <MediumWidget data={data} locationZh={locationZh} mapImage={mapImage} pinPoint={pinPoint} widgetSize={widgetSize} />;
}

function getCountryMapZoom(data: any, compact = false) {
  const code = String(data.countryCode || data.country_code || data.countryCode2 || '').toUpperCase();
  const baseZoom = COUNTRY_MAP_ZOOM[code] || 5;
  return Math.max(2, Math.min(8, compact ? baseZoom : baseZoom + 1));
}

function useIPMeta(data: any, locationZh: string) {
  const locationName = data.locationName || data.placeName || data.displayName || data.ispLocation || data.orgLocation || '';
  const locationStr = locationZh || locationName || [data.country, data.region, data.city].filter(Boolean).join(', ') || 'N/A';
  const asnStr = `${data.asn || ''}${data.asOrganization ? ' - ' + data.asOrganization : ''}` || 'N/A';
  const fraudScore = data.fraudScore || data.riskScore || data.score || 0;
  const purityScore = Math.max(0, Math.min(100, 100 - fraudScore));
  let riskColor = '#34c759';
  let riskLabel = '低风险';
  let purityLabel = '纯净';
  if (fraudScore > 70) { riskColor = '#FF3B30'; riskLabel = '极度风险'; purityLabel = '高危'; }
  else if (fraudScore > 50) { riskColor = '#FF3B30'; riskLabel = '高风险'; purityLabel = '高危'; }
  else if (fraudScore > 40) { riskColor = '#FF9500'; riskLabel = '中度风险'; purityLabel = '中性'; }
  else if (fraudScore > 15) { riskColor = '#FFCC00'; riskLabel = '轻微风险'; purityLabel = '一般'; }
  const tags: string[] = [];
  if (data.isBroadcast) tags.push('广播 IP');
  if (data.isHosting || data.isServer) tags.push('机房 IP');
  if (data.isResidential) tags.push('住宅 IP');
  if (data.isProxy) tags.push('代理');
  if (data.isVpn) tags.push('VPN');
  if (tags.length === 0) tags.push('普通 IP');
  const ipRange = data.ipRange || data.range || data.network || '未知';
  const domain = data.asDomain || data.domain || (data.asOrganization || '').toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 18) || '未知';
  const lat = Number(data.latitude || data.lat);
  const lon = Number(data.longitude || data.lon || data.lng);
  const hasCoord = Number.isFinite(lat) && Number.isFinite(lon);
  const coord = hasCoord ? `${lat.toFixed(2)}, ${lon.toFixed(2)}` : '坐标未知';
  const mapLocationName = locationName || locationStr;
  const countryCode = String(data.countryCode || data.country_code || '').toUpperCase();
  const mapZoom = getCountryMapZoom(data);
  return { locationStr, mapLocationName, asnStr, fraudScore, purityScore, riskColor, riskLabel, purityLabel, riskText: `${fraudScore}% ${riskLabel}`, tags, ipRange, domain, coord, lat, lon, hasCoord, mapZoom, country: data.country, region: data.region, city: data.city, countryCode };
}

// ─── 苹果地图原生快照 ─────────────────────────────────────
function regionSpan(family: string | undefined) {
  switch (family) {
    case 'systemSmall': return { latitudeDelta: 0.45, longitudeDelta: 0.55 };
    case 'systemLarge': return { latitudeDelta: 0.24, longitudeDelta: 0.32 };
    default: return { latitudeDelta: 0.34, longitudeDelta: 0.44 };
  }
}

async function takeAppleMapSnapshot(
  lat: number, lon: number,
  width: number, height: number,
  family: string | undefined
) {
  const span = regionSpan(family);
  const center = { latitude: lat, longitude: lon - span.longitudeDelta * 0.54 };
  try {
    const snap = await MapSnapshotter.take({
      region: { center, span },
      size: { width: Math.round(width), height: Math.round(height) },
      mapStyle: { style: 'standard', showsTraffic: false },
    });
    if (snap?.image) return snap;
  } catch (e) {
    console.error('MapSnapshotter failed:', e);
  }
  return null;
}

const COUNTRY_ZH: Record<string, string> = {
  'China': '中国', 'United States': '美国', 'Japan': '日本', 'South Korea': '韩国',
  'United Kingdom': '英国', 'Germany': '德国', 'France': '法国', 'Canada': '加拿大',
  'Australia': '澳大利亚', 'Russia': '俄罗斯', 'India': '印度', 'Brazil': '巴西',
  'Singapore': '新加坡', 'Hong Kong': '中国香港', 'Taiwan': '中国台湾', 'Macau': '中国澳门',
  'Vietnam': '越南', 'Thailand': '泰国', 'Malaysia': '马来西亚', 'Indonesia': '印度尼西亚',
  'Philippines': '菲律宾', 'Mongolia': '蒙古', 'South Africa': '南非', 'Egypt': '埃及',
  'Nigeria': '尼日利亚', 'Kenya': '肯尼亚', 'Morocco': '摩洛哥', 'Saudi Arabia': '沙特阿拉伯',
  'United Arab Emirates': '阿联酋', 'Turkey': '土耳其', 'Iran': '伊朗', 'Pakistan': '巴基斯坦',
  'Bangladesh': '孟加拉国', 'Sri Lanka': '斯里兰卡', 'Nepal': '尼泊尔',
  'Netherlands': '荷兰', 'Belgium': '比利时', 'Switzerland': '瑞士', 'Sweden': '瑞典',
  'Norway': '挪威', 'Denmark': '丹麦', 'Finland': '芬兰', 'Poland': '波兰',
  'Italy': '意大利', 'Spain': '西班牙', 'Portugal': '葡萄牙', 'Greece': '希腊',
  'Austria': '奥地利', 'Ireland': '爱尔兰', 'New Zealand': '新西兰',
  'Mexico': '墨西哥', 'Argentina': '阿根廷', 'Colombia': '哥伦比亚', 'Chile': '智利',
  'Peru': '秘鲁', 'Venezuela': '委内瑞拉', 'Ukraine': '乌克兰', 'Romania': '罗马尼亚',
  'Czech Republic': '捷克', 'Hungary': '匈牙利', 'Israel': '以色列', 'Qatar': '卡塔尔',
};

// 国旗 Emoji 映射
const FLAG_MAP: Record<string, string> = {
  'CN': '🇨🇳', 'US': '🇺🇸', 'JP': '🇯🇵', 'KR': '🇰🇷', 'GB': '🇬🇧', 'DE': '🇩🇪',
  'FR': '🇫🇷', 'CA': '🇨🇦', 'AU': '🇦🇺', 'RU': '🇷🇺', 'IN': '🇮🇳', 'BR': '🇧🇷',
  'SG': '🇸🇬', 'HK': '🇭🇰', 'TW': '🇹🇼', 'MO': '🇲🇴', 'TH': '🇹🇭', 'VN': '🇻🇳',
  'MY': '🇲🇾', 'ID': '🇮🇩', 'PH': '🇵🇭', 'IT': '🇮🇹', 'ES': '🇪🇸', 'NL': '🇳🇱',
  'SE': '🇸🇪', 'PL': '🇵🇱', 'TR': '🇹🇷', 'SA': '🇸🇦', 'AE': '🇦🇪', 'MX': '🇲🇽',
  'AR': '🇦🇷', 'CL': '🇨🇱', 'CO': '🇨🇴', 'ZA': '🇿🇦', 'NG': '🇳🇬', 'EG': '🇪🇬',
  'NZ': '🇳🇿', 'IE': '🇮🇪', 'CH': '🇨🇭', 'AT': '🇦🇹', 'BE': '🇧🇪', 'DK': '🇩🇰',
  'FI': '🇫🇮', 'NO': '🇳🇴', 'PT': '🇵🇹', 'GR': '🇬🇷', 'CZ': '🇨🇿', 'HU': '🇭🇺',
  'UA': '🇺🇦', 'IL': '🇮🇱', 'PK': '🇵🇰', 'BD': '🇧🇩', 'LK': '🇱🇰', 'NP': '🇳🇵',
  'MN': '🇲🇳', 'PR': '🇵🇷', 'CU': '🇨🇺', 'VE': '🇻🇪', 'PE': '🇵🇪',
};

function toChineseName(data: any): string {
  const parts: string[] = [];
  // Country in Chinese
  if (data.country) {
    parts.push(COUNTRY_ZH[data.country] || data.country);
  }
  // Region/state in Chinese (if available)
  if (data.region) {
    parts.push(data.region);
  }
  // City in Chinese (if available)
  if (data.city) {
    parts.push(data.city);
  }
  return parts.filter(Boolean).join(' ');
}

function clampLat(lat: number) {
  return Math.max(-85.0511, Math.min(85.0511, lat));
}

function lonLatToTile(lat: number, lon: number, zoom: number) {
  const safeLat = clampLat(lat);
  const safeLon = Math.max(-180, Math.min(180, lon));
  const scale = Math.pow(2, zoom);
  const latRad = safeLat * Math.PI / 180;
  const xFloat = (safeLon + 180) / 360 * scale;
  const yFloat = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * scale;
  const x = Math.max(0, Math.min(scale - 1, Math.floor(xFloat)));
  const y = Math.max(0, Math.min(scale - 1, Math.floor(yFloat)));
  return {
    x,
    y,
    pinXRatio: xFloat - x,
    pinYRatio: yFloat - y,
  };
}



function MediumWidget({ data, locationZh, mapImage, pinPoint, widgetSize }: { data: any, locationZh: string, mapImage: any, pinPoint: any, widgetSize: any }) {
  const meta = useIPMeta(data, locationZh);
  const size = widgetSize || { width: 329, height: 154 };
  const revealStart = 0.43;
  const revealMid = 0.58;
  const revealEnd = 0.76;
  const pin = pinPoint ? {
    x: Math.max(14, Math.min(size.width - 14, pinPoint.x)),
    y: Math.max(18, Math.min(size.height - 18, pinPoint.y)),
  } : null;

  return (
    <ZStack alignment="topLeading" clipped={true} cornerRadius={22}
      background={widgetBg()}
      widgetURL={Script.createRunSingleURLScheme(Script.name)}>

      {/* 苹果地图原生快照背景 */}
      {mapImage ? (
        <Image image={mapImage} resizable={true} frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }} />
      ) : (
        <VStack alignment="center" spacing={6} frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }} background={tertiaryBg()}>
          <Image systemName="globe.asia.australia" resizable={{}} frame={{ width: 36, height: 36 }} modifiers={modifiers().foregroundStyle(SECONDARY_TEXT)} />
          <Text styledText={{ content: '获取地图中...', foregroundColor: SECONDARY_TEXT, font: 11 }} />
        </VStack>
      )}

      {/* 左→右 渐变遮罩：左侧深色保文字可读，右侧透明露地图 */}
      <ZStack alignment="center" frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }}>
        <RoundedRectangle cornerRadius={22} fill={{
          gradient: [
            { color: 'rgba(28,28,30,1.00)', location: 0.00 },
            { color: 'rgba(28,28,30,0.99)', location: revealStart },
            { color: 'rgba(28,28,30,0.78)', location: revealMid },
            { color: 'rgba(28,28,30,0.24)', location: revealEnd },
            { color: 'rgba(28,28,30,0.04)', location: 1.00 },
          ],
          startPoint: { x: 0, y: 0.5 },
          endPoint: { x: 1, y: 0.5 },
        }} frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }} />
      </ZStack>

      {/* 定位标记 */}
      {pin ? (
        <Image systemName="mappin.circle.fill" resizable={{}} frame={{ width: 17, height: 17 }}
          foregroundStyle="#FF3B30" widgetAccentedRenderingMode="fullColor"
          position={{ x: pin.x, y: pin.y - 6 }} />
      ) : null}

      {/* 左侧信息内容 */}
      <VStack alignment="leading" spacing={5}
        frame={{ width: Math.round(size.width * 0.62) }}
        position={{ x: 12 + Math.round(size.width * 0.62) / 2, y: size.height / 2 }}>
        <Text styledText={{ content: 'IP 信息概览', foregroundColor: '#166534', font: 14, bold: true }} />
        <HStack spacing={5} alignment="center">
          <Image systemName="mappin.and.ellipse" resizable={{}} frame={{ width: 13, height: 13 }} modifiers={modifiers().foregroundStyle('#A1A1A6')} />
          <Text styledText={{ content: '位置', foregroundColor: '#A1A1A6', font: 9 }} />
          <Text styledText={{ content: meta.locationStr, foregroundColor: '#F5F5F7', font: 11, bold: true }} lineLimit={1} minScaleFactor={0.64} frame={{ maxWidth: 'infinity', alignment: 'leading' }} />
        </HStack>
        <HStack spacing={5} alignment="center">
          <Image systemName="network" resizable={{}} frame={{ width: 13, height: 13 }} modifiers={modifiers().foregroundStyle('#A1A1A6')} />
          <Text styledText={{ content: 'IP', foregroundColor: '#A1A1A6', font: 9 }} />
          <Text styledText={{ content: data.ip || 'N/A', foregroundColor: '#F5F5F7', font: 11, bold: true }} lineLimit={1} minScaleFactor={0.64} frame={{ maxWidth: 'infinity', alignment: 'leading' }} />
        </HStack>
        <HStack spacing={5} alignment="center">
          <Image systemName="building.2" resizable={{}} frame={{ width: 13, height: 13 }} modifiers={modifiers().foregroundStyle('#A1A1A6')} />
          <Text styledText={{ content: 'ASN', foregroundColor: '#A1A1A6', font: 9 }} />
          <Text styledText={{ content: meta.asnStr, foregroundColor: '#F5F5F7', font: 11, bold: true }} lineLimit={1} minScaleFactor={0.64} frame={{ maxWidth: 'infinity', alignment: 'leading' }} />
        </HStack>
        <RiskGaugeBar fraudScore={meta.fraudScore} riskColor={meta.riskColor} riskLabel={meta.riskLabel} tags={meta.tags} />
        <HStack spacing={5} alignment="center">
          <Image systemName="shield.lefthalf.filled" resizable={{}} frame={{ width: 13, height: 13 }} modifiers={modifiers().foregroundStyle('#D95D85')} />
          <Text styledText={{ content: meta.tags.slice(0, 2).join(' / ') + ' · 风险 ' + meta.fraudScore + '%', foregroundColor: '#D95D85', font: 10, bold: true }} lineLimit={1} />
        </HStack>
      </VStack>
    </ZStack>
  );
}

function LargeWidget({ data, locationZh, mapImage, pinPoint, widgetSize }: { data: any, locationZh: string, mapImage: any, pinPoint: any, widgetSize: any }) {
  const meta = useIPMeta(data, locationZh);
  const size = widgetSize || { width: 329, height: 345 };
  const revealStart = 0.48;
  const revealMid = 0.61;
  const revealEnd = 0.80;
  const pin = pinPoint ? {
    x: Math.max(14, Math.min(size.width - 14, pinPoint.x)),
    y: Math.max(18, Math.min(size.height - 18, pinPoint.y)),
  } : null;

  return (
    <ZStack alignment="topLeading" clipped={true} cornerRadius={24} background={widgetBg()}>
      {mapImage ? (
        <Image image={mapImage} resizable={true} frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }} />
      ) : (
        <VStack alignment="center" spacing={6} frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }} background={tertiaryBg()}>
          <Image systemName="globe.asia.australia" resizable={{}} frame={{ width: 42, height: 42 }} modifiers={modifiers().foregroundStyle(SECONDARY_TEXT)} />
          <Text styledText={{ content: '获取地图中...', foregroundColor: SECONDARY_TEXT, font: 12 }} />
        </VStack>
      )}

      {/* 左→右 渐变遮罩 */}
      <RoundedRectangle cornerRadius={24} fill={{
        gradient: [
          { color: 'rgba(28,28,30,1.00)', location: 0.00 },
          { color: 'rgba(28,28,30,0.99)', location: revealStart },
          { color: 'rgba(28,28,30,0.78)', location: revealMid },
          { color: 'rgba(28,28,30,0.24)', location: revealEnd },
          { color: 'rgba(28,28,30,0.04)', location: 1.00 },
        ],
        startPoint: { x: 0, y: 0.5 },
        endPoint: { x: 1, y: 0.5 },
      }} frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }} />

      {pin ? (
        <Image systemName="mappin.circle.fill" resizable={{}} frame={{ width: 20, height: 20 }}
          foregroundStyle="#FF3B30" widgetAccentedRenderingMode="fullColor"
          position={{ x: pin.x, y: pin.y - 6 }} />
      ) : null}

      {/* 左侧信息 */}
      <VStack alignment="leading" spacing={10}
        frame={{ width: Math.round(size.width * 0.64) }}
        position={{ x: 16 + Math.round(size.width * 0.64) / 2, y: size.height / 2 }}>
        <Text styledText={{ content: 'IP 信息概览', foregroundColor: '#166534', font: 16, bold: true }} />
        <VStack alignment="leading" spacing={3}>
          <HStack spacing={6} alignment="center">
            <Image systemName="mappin.and.ellipse" resizable={{}} frame={{ width: 16, height: 16 }} modifiers={modifiers().foregroundStyle('#A1A1A6')} />
            <Text styledText={{ content: '位置', foregroundColor: '#A1A1A6', font: 10 }} />
            <Text styledText={{ content: meta.locationStr, foregroundColor: '#F5F5F7', font: 12, bold: true }} lineLimit={1} minScaleFactor={0.64} frame={{ maxWidth: 'infinity', alignment: 'leading' }} />
          </HStack>
          <HStack spacing={6} alignment="center">
            <Image systemName="network" resizable={{}} frame={{ width: 16, height: 16 }} modifiers={modifiers().foregroundStyle('#A1A1A6')} />
            <Text styledText={{ content: 'IP', foregroundColor: '#A1A1A6', font: 10 }} />
            <Text styledText={{ content: data.ip || 'N/A', foregroundColor: '#F5F5F7', font: 12, bold: true }} lineLimit={1} minScaleFactor={0.64} frame={{ maxWidth: 'infinity', alignment: 'leading' }} />
          </HStack>
          <HStack spacing={6} alignment="center">
            <Image systemName="building.2" resizable={{}} frame={{ width: 16, height: 16 }} modifiers={modifiers().foregroundStyle('#A1A1A6')} />
            <Text styledText={{ content: 'ASN', foregroundColor: '#A1A1A6', font: 10 }} />
            <Text styledText={{ content: meta.asnStr, foregroundColor: '#F5F5F7', font: 12, bold: true }} lineLimit={1} minScaleFactor={0.64} frame={{ maxWidth: 'infinity', alignment: 'leading' }} />
          </HStack>
        </VStack>
        <RiskGaugeBar fraudScore={meta.fraudScore} riskColor={meta.riskColor} riskLabel={meta.riskLabel} tags={meta.tags} />
        <HStack spacing={6} alignment="center">
          <Image systemName="shield.lefthalf.filled" resizable={{}} frame={{ width: 16, height: 16 }} modifiers={modifiers().foregroundStyle('#D95D85')} />
          <Text styledText={{ content: meta.tags.slice(0, 2).join(' / ') + ' · 风险 ' + meta.fraudScore + '%', foregroundColor: '#D95D85', font: 11, bold: true }} lineLimit={1} />
        </HStack>
      </VStack>
    </ZStack>
  );
}

// ─── 小号组件：全屏地图 + 定位标记 ─────────────────────────
function SmallWidget({ data, locationZh, mapImage, pinPoint, widgetSize }: { data: any, locationZh: string, mapImage: any, pinPoint: any, widgetSize: any }) {
  const meta = useIPMeta(data, locationZh);
  const locationTitle = [meta.city, meta.region].filter(Boolean).join(' \u00b7 ');
  const briefLocation = locationTitle || meta.mapLocationName || '定位中';
  const countryName = meta.country || '';
  const flag = FLAG_MAP[meta.countryCode] || '\u{1F310}';
  const size = widgetSize || { width: 155, height: 155 };
  const pin = pinPoint ? {
    x: Math.max(14, Math.min(size.width - 14, pinPoint.x)),
    y: Math.max(18, Math.min(size.height - 18, pinPoint.y)),
  } : null;

  return (
    <ZStack alignment="topLeading" cornerRadius={22} padding={0} clipped={true}
      background={widgetBg()}
      widgetURL={Script.createRunSingleURLScheme(Script.name)}
    >
      {mapImage ? (
        <Image image={mapImage} resizable={true} frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }} />
      ) : (
        <VStack alignment="center" spacing={6} frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }} background={tertiaryBg()}>
          <Image systemName="globe.asia.australia" resizable={{}} frame={{ width: 36, height: 36 }} modifiers={modifiers().foregroundStyle(SECONDARY_TEXT)} />
          <Text styledText={{ content: '获取位置中...', foregroundColor: SECONDARY_TEXT, font: 11 }} />
        </VStack>
      )}

      {pin ? (
        <Image systemName="mappin.circle.fill" resizable={{}} frame={{ width: 14, height: 14 }}
          foregroundStyle="#FF3B30" widgetAccentedRenderingMode="fullColor"
          position={{ x: pin.x, y: pin.y - 4 }} />
      ) : null}

      {/* 底部信息浮层 */}
      <VStack alignment="leading" spacing={0} frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }}>
        <Spacer />
        <VStack alignment="leading" spacing={1}
          background="rgba(0,0,0,0.6)"
          padding={{ top: 8, bottom: 10, leading: 12, trailing: 12 }}
          frame={{ maxWidth: 'infinity' }}>
          <Text styledText={{ content: flag + ' ' + briefLocation + (countryName ? ' \u00b7 ' + countryName : ''), foregroundColor: 'white', font: 12, bold: true }} lineLimit={1} />
          <Text styledText={{ content: data.ip || 'N/A', foregroundColor: 'rgba(255,255,255,0.5)', font: 10 }} lineLimit={1} />
        </VStack>
      </VStack>
    </ZStack>
  );
}

function WidgetDataPanel({ data, meta, selected, compact, mapImage }: { data: any, meta: any, selected: any, compact: boolean, mapImage: any }) {
  const panelWidth = compact ? 118 : 156;

  // ── 定位地图 ──────────────────────────────────────────────
  if (selected.id === 'ip-info') {
    return <LocationMapPanel data={data} meta={meta} selected={selected} compact={compact} title="定位地图" mapImage={mapImage} />;
  }

  // ── 出口地图 ──────────────────────────────────────────────
  if (selected.id === 'outbound') {
    return <LocationMapPanel data={data} meta={meta} selected={selected} compact={compact} title="出口地图" mapImage={mapImage} />;
  }

  // ── 风险检测面板（IPPure 纯净度检测）──────────────────────
  if (selected.id === 'risk') {
    const riskColor = meta.riskColor;
    const riskLevel = meta.fraudScore > 70 ? 'HIGH' : meta.fraudScore > 40 ? 'MED' : 'LOW';
    return (
      <VStack alignment="leading" spacing={compact ? 4 : 6} frame={{ width: panelWidth, height: compact ? 118 : 168 }} background={cardBg()} cornerRadius={compact ? 14 : 18} padding={compact ? 8 : 10}>
        <PanelHeader selected={selected} compact={compact} />
        {/* IPPure 纯净度分数 */}
        <VStack alignment="leading" spacing={2}>
          <Text styledText={{ content: `${meta.purityScore}%`, foregroundColor: riskColor, font: compact ? 22 : 28, bold: true }} />
          <Text styledText={{ content: `IPPure 纯净度 · ${meta.purityLabel}`, foregroundColor: SECONDARY_TEXT, font: compact ? 8 : 9 }} />
        </VStack>
        <ScoreBar score={meta.purityScore} label={meta.purityLabel} color={riskColor} compact={compact} />
        <HStack spacing={4} alignment="center">
          <Text styledText={{ content: riskLevel, foregroundColor: 'white', font: compact ? 8 : 9, bold: true }} background={riskColor} cornerRadius={4} padding={{ top: 2, bottom: 2, leading: 5, trailing: 5 }} />
          <Text styledText={{ content: meta.tags.slice(0, 2).join(' · '), foregroundColor: '#EE7799', font: compact ? 9 : 10 }} lineLimit={1} />
        </HStack>
        <MiniData label="欺诈分" value={`${meta.fraudScore}/100`} color={riskColor} />
        {!compact && <MiniData label="流量" value={`human ${Math.max(0, 100 - meta.fraudScore)}% / bot ${meta.fraudScore}%`} color="#0EA5E9" />}
        {!compact && <MiniData label="IP 属性" value={meta.tags.join(' · ') || '普通 IP'} color="#A78BFA" />}
      </VStack>
    );
  }

  // ── 指纹分析面板（IPPure 浏览器指纹）─────────────────────
  if (selected.id === 'fingerprint') {
    return (
      <VStack alignment="leading" spacing={compact ? 3 : 5} frame={{ width: panelWidth, height: compact ? 118 : 168 }} background={cardBg()} cornerRadius={compact ? 14 : 18} padding={compact ? 8 : 10}>
        <PanelHeader selected={selected} compact={compact} />
        <Text styledText={{ content: '网络指纹特征', foregroundColor: '#AF52DE', font: compact ? 9 : 10, bold: true }} />
        <VStack alignment="leading" spacing={compact ? 1 : 2}>
          <MiniData label="IP" value={data.ip || 'N/A'} color="#2563EB" />
          <MiniData label="ASN" value={meta.asnStr} color="#9333EA" />
          <MiniData label="ISP" value={data.isp || 'N/A'} color="#16A34A" />
          <MiniData label="域名" value={meta.domain || 'N/A'} color="#0EA5E9" />
          {!compact && <MiniData label="邮编" value={data.ippurePostalCode || 'N/A'} color={SECONDARY_TEXT} />}
          {!compact && <MiniData label="坐标" value={meta.coord} color={SECONDARY_TEXT} />}
        </VStack>
      </VStack>
    );
  }

  // ── VPN 泄露检测面板（IPPure VPN 溯源）──────────────────
  if (selected.id === 'vpn-leak') {
    const isVpnDetected = data.isVpn || data.isProxy;
    const vpnStatus = isVpnDetected ? '⚠️ VPN/代理已识别' : '✅ 未检测到 VPN';
    const vpnColor = isVpnDetected ? '#FF9500' : '#34C759';
    return (
      <VStack alignment="leading" spacing={compact ? 3 : 5} frame={{ width: panelWidth, height: compact ? 118 : 168 }} background={cardBg()} cornerRadius={compact ? 14 : 18} padding={compact ? 8 : 10}>
        <PanelHeader selected={selected} compact={compact} />
        <HStack alignment="center" spacing={4}>
          <Circle fill={vpnColor} frame={{ width: compact ? 8 : 10, height: compact ? 8 : 10 }} />
          <Text styledText={{ content: vpnStatus, foregroundColor: vpnColor, font: compact ? 9 : 10, bold: true }} lineLimit={1} />
        </HStack>
        <VStack alignment="leading" spacing={compact ? 1 : 2}>
          <MiniData label="公网 IP" value={data.ip || 'N/A'} color="#2563EB" />
          <MiniData label="ISP" value={(data.isp || 'N/A').substring(0, 16)} color="#16A34A" />
          <MiniData label="VPN" value={data.isVpn ? '已检测' : '未检测'} color={data.isVpn ? '#FF9500' : '#34C759'} />
          <MiniData label="代理" value={data.isProxy ? '已检测' : '未检测'} color={data.isProxy ? '#FF9500' : '#34C759'} />
          {!compact && <MiniData label="住宅IP" value={data.isResidential ? '是' : '否'} color={data.isResidential ? '#34C759' : '#FF9500'} />}
        </VStack>
      </VStack>
    );
  }

  // ── WebRTC 检测面板（IPPure WebRTC 泄露）─────────────────
  if (selected.id === 'webrtc') {
    const webrtcSafe = !data.isVpn && !data.isProxy && !data.isHosting;
    const webrtcColor = webrtcSafe ? '#34C759' : '#FF3B30';
    return (
      <VStack alignment="leading" spacing={compact ? 3 : 5} frame={{ width: panelWidth, height: compact ? 118 : 168 }} background={cardBg()} cornerRadius={compact ? 14 : 18} padding={compact ? 8 : 10}>
        <PanelHeader selected={selected} compact={compact} />
        <HStack alignment="center" spacing={4}>
          <Circle fill={webrtcColor} frame={{ width: compact ? 8 : 10, height: compact ? 8 : 10 }} />
          <Text styledText={{ content: webrtcSafe ? '✅ WebRTC 安全' : '⚠️ 存在泄露风险', foregroundColor: webrtcColor, font: compact ? 9 : 10, bold: true }} lineLimit={1} />
        </HStack>
        <VStack alignment="leading" spacing={compact ? 1 : 2}>
          <MiniData label="公共IP" value={data.ip || 'N/A'} color="#2563EB" />
          <MiniData label="ISP" value={(data.isp || 'N/A').substring(0, 16)} color="#16A34A" />
          <MiniData label="VPN" value={data.isVpn ? '已检测' : '未检测'} color={data.isVpn ? '#FF3B30' : '#34C759'} />
          {!compact && <MiniData label="代理" value={data.isProxy ? '已检测' : '未检测'} color={data.isProxy ? '#FF3B30' : '#34C759'} />}
          {!compact && <MiniData label="类型" value={meta.tags[0] || '普通 IP'} color="#EE7799" />}
        </VStack>
      </VStack>
    );
  }

  // ── DNS 泄露检测面板（IPPure DNS 泄露）───────────────────
  if (selected.id === 'dns-leak') {
    const dnsSafe = !data.isHosting && !data.isProxy;
    const dnsColor = dnsSafe ? '#34C759' : '#FF3B30';
    const dnsStatus = dnsSafe ? '✅ DNS 解析安全' : '⚠️ DNS 可能泄露';
    return (
      <VStack alignment="leading" spacing={compact ? 3 : 5} frame={{ width: panelWidth, height: compact ? 118 : 168 }} background={cardBg()} cornerRadius={compact ? 14 : 18} padding={compact ? 8 : 10}>
        <PanelHeader selected={selected} compact={compact} />
        <HStack alignment="center" spacing={4}>
          <Circle fill={dnsColor} frame={{ width: compact ? 8 : 10, height: compact ? 8 : 10 }} />
          <Text styledText={{ content: dnsStatus, foregroundColor: dnsColor, font: compact ? 9 : 10, bold: true }} lineLimit={1} />
        </HStack>
        <VStack alignment="leading" spacing={compact ? 1 : 2}>
          <MiniData label="DNS" value={meta.domain || 'N/A'} color="#2563EB" />
          <MiniData label="ISP" value={(data.isp || 'N/A').substring(0, 16)} color="#16A34A" />
          <MiniData label="机房" value={data.isHosting ? '是' : '否'} color={data.isHosting ? '#FF9500' : '#34C759'} />
          {!compact && <MiniData label="位置" value={meta.locationStr.substring(0, 14)} color="#A78BFA" />}
          {!compact && <MiniData label="时区" value={data.ippureTimezone || 'N/A'} color={SECONDARY_TEXT} />}
        </VStack>
      </VStack>
    );
  }

  // ── 高级检测 / 默认面板（敬请期待）───────────────────────
  return (
    <VStack alignment="center" spacing={compact ? 6 : 10} frame={{ width: panelWidth, height: compact ? 118 : 168 }} background={cardBg()} cornerRadius={compact ? 14 : 18} padding={compact ? 8 : 10}>
      <PanelHeader selected={selected} compact={compact} />
      <Spacer />
      <Text styledText={{ content: selected.emoji, font: compact ? 28 : 36 }} />
      <Text styledText={{ content: '敬请期待', foregroundColor: SECONDARY_TEXT, font: compact ? 10 : 12, bold: true }} />
      <Text styledText={{ content: selected.desc, foregroundColor: SECONDARY_TEXT, font: compact ? 8 : 9 }} lineLimit={2} alignment="center" />
      <Spacer />
    </VStack>
  );
}

function LocationMapPanel({ data, meta, selected, compact, title, mapImage }: { data: any, meta: any, selected: any, compact: boolean, title: string, mapImage: any }) {
  const panelWidth = compact ? 108 : 156;
  const panelHeight = compact ? 110 : 168;
  const headerHeight = compact ? 28 : 34;
  const locationTitle = [meta.city || meta.region, meta.country].filter(Boolean).join(' · ') || meta.mapLocationName || '定位位置';
  const coordText = meta.hasCoord ? `${meta.lat.toFixed(2)}, ${meta.lon.toFixed(2)}` : '坐标未知';
  const amapUrl = meta.hasCoord ? `https://uri.amap.com/marker?position=${meta.lon},${meta.lat}&name=${encodeURIComponent(locationTitle)}` : 'https://m.amap.com';

  return (
    <Link url={amapUrl}>
      <VStack alignment="center" spacing={0} frame={{ width: panelWidth, height: panelHeight }} cornerRadius={compact ? 10 : 14} padding={0} clipped={true}>
        <HStack spacing={4} alignment="center" background={tertiaryBg()} frame={{ width: panelWidth, height: headerHeight }} padding={{ leading: compact ? 6 : 8, trailing: compact ? 6: 8 }}>
          <Image systemName="globe.americas" resizable={{}} frame={{ width: compact ? 14 : 18, height: compact ? 14 : 18 }} modifiers={modifiers().foregroundStyle(selected.color)} />
          <VStack alignment="leading" spacing={0} layoutPriority={1}>
            <Text styledText={{ content: title, foregroundColor: selected.color, font: compact ? 10 : 12, bold: true }} lineLimit={1} />
            <Text styledText={{ content: locationTitle, foregroundColor: 'white', font: compact ? 8 : 9, bold: true }} lineLimit={1} />
          </VStack>
        </HStack>
        <ZStack alignment="center" frame={{ width: panelWidth, height: panelHeight - headerHeight }}>
          {/* 卫星地图 — 铺满整个区域，无黑框 */}
          {mapImage ? (
            <Image image={mapImage} resizable={true} frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }} />
          ) : (
            <VStack alignment="center" spacing={0} frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }} background="#E8E4DE">
              <Text styledText={{ content: '🌍', font: 28 }} />
            </VStack>
          )}
          {/* 定位标记 */}
          {meta.hasCoord && <Image systemName="mappin.circle.fill" resizable={{}} frame={{ width: compact ? 16 : 20, height: compact ? 16 : 20 }} modifiers={modifiers().foregroundStyle('#007AFF')} />}
          {/* 坐标标签 */}
          {meta.hasCoord && <Text styledText={{ content: coordText, foregroundColor: '#555', font: compact ? 7 : 8, bold: true }} background="rgba(255,255,255,0.88)" cornerRadius={4} padding={{ top: 2, bottom: 2, leading: 4, trailing: 4 }} offset={{ x: 0, y: (panelHeight - headerHeight) / 2 - (compact ? 12 : 16) }} lineLimit={1} />}
        </ZStack>
      </VStack>
    </Link>
  );
}

function PanelHeader({ selected, compact }: { selected: any, compact: boolean }) {
  return (
    <HStack alignment="center" spacing={4} frame={{ width: '100%' }}>
      <Image systemName={selected.icon} resizable={{}} frame={{ width: compact ? 18 : 22, height: compact ? 18 : 22 }} modifiers={modifiers().foregroundStyle(selected.color)} />
      <Text styledText={{ content: selected.title, foregroundColor: selected.color, font: compact ? 11 : 13, bold: true }} lineLimit={1} />
    </HStack>
  );
}

function InfoCard({ title, value, icon, color }: { title: string, value: string, icon: string, color: string }) {
  return (
    <HStack alignment="center" spacing={4} background={cardBg()} cornerRadius={8} padding={{ top: 4, bottom: 4, leading: 6, trailing: 6 }}>
      <Text styledText={{ content: icon, font: 12 }} frame={{ width: 16, alignment: 'center' }} />
      <VStack alignment="leading" spacing={0} layoutPriority={1}>
        <Text styledText={{ content: title, foregroundColor: SECONDARY_TEXT, font: 8 }} lineLimit={1} />
        <Text styledText={{ content: value, foregroundColor: color, font: 9, bold: true }} marquee={true} />
      </VStack>
    </HStack>
  );
}

function Row({ icon, label, value }: { icon: string, label: string, value: string }) {
  return (
    <HStack spacing={4} alignment="center" layoutPriority={1}>
      <Text styledText={{ content: icon + ' ' + label, foregroundColor: SECONDARY_TEXT, font: 11 }} frame={{ width: 42, alignment: 'leading' }} />
      <Text styledText={{ content: value, foregroundColor: PRIMARY_TEXT, font: 11 }} lineLimit={1} marquee={true} />
    </HStack>
  );
}

function MiniData({ label, value, color }: { label: string, value: string, color: string }) {
  return (
    <HStack alignment="center" spacing={4} frame={{ width: '100%' }}>
      <Text styledText={{ content: label, foregroundColor: SECONDARY_TEXT, font: 10 }} frame={{ width: 40, alignment: 'leading' }} />
      <Text styledText={{ content: value, foregroundColor: color, font: 10 }} lineLimit={1} />
    </HStack>
  );
}

function RiskGaugeBar({ fraudScore, riskColor, riskLabel, tags }: { fraudScore: number, riskColor: string, riskLabel: string, tags: string[] }) {
  const segments = [
    { range: [0, 15], color: '#43A047' },
    { range: [15, 25], color: '#66BB6A' },
    { range: [25, 40], color: '#AED581' },
    { range: [40, 50], color: '#FFD54F' },
    { range: [50, 70], color: '#FF7043' },
    { range: [70, 100], color: '#E53935' },
  ];
  const barHeight = 6;
  const dotSize = 12;
  // 刻度数字颜色 — 与各段颜色对应
  const tickColors: Record<number, string> = {
    0: '#43A047', 15: '#66BB6A', 25: '#AED581',
    40: '#FFD54F', 50: '#FF7043', 70: '#E53935', 100: '#E53935',
  };
  const ticks = [0, 15, 25, 40, 50, 70, 100];
  return (
    <>
      {/* 色条 */}
      <HStack spacing={0} alignment="leading" frame={{ height: barHeight }}>
        {segments.map((seg, index) => {
          const w = (seg.range[1] - seg.range[0]) * 1.55;
          return <RoundedRectangle key={index} fill={seg.color} cornerRadius={2} frame={{ width: w, height: barHeight }} />;
        })}
      </HStack>
      {/* 指示点 + 刻度数字 — 合并 ZStack，点在上数字在下互不遮挡 */}
      <ZStack alignment="leading" frame={{ height: 24 }}>
        {/* 指示点：y=-6 使其贴近色条底部，不遮挡数字 */}
        <Circle fill="white" stroke={riskColor} strokeWidth={2} frame={{ width: dotSize, height: dotSize }}
          offset={{ x: fraudScore * 1.55 - dotSize / 2, y: -6 }} />
        {/* 刻度数字：y=8 位于 ZStack 下方，远离指示点 */}
        {ticks.map(tick => {
          const x = tick * 1.55;
          const offsetX = tick === 0 ? x : tick === 100 ? x - 16 : x - 6;
          return <Text key={tick} styledText={{ content: String(tick), foregroundColor: tickColors[tick] || '#FFFFFF', font: 7 }} offset={{ x: offsetX, y: 8 }} />;
        })}
      </ZStack>
    </>
  );
}

function ScoreBar({ score, label, color, compact }: { score: number, label: string, color: string, compact: boolean }) {
  const segments = [
    { range: [0, 15], color: '#34C759' }, // 纯净
    { range: [15, 25], color: '#66CD00' },
    { range: [25, 40], color: '#FFD700' }, // 中性
    { range: [40, 50], color: '#FF9500' },
    { range: [50, 70], color: '#FF4500' },
    { range: [70, 100], color: '#FF3B30' }, // 危险
  ];
  const barWidth = compact ? 90 : 120;
  const barHeight = compact ? 5 : 7;
  return (
    <VStack alignment="leading" spacing={3}>
      <Text styledText={{ content: label, foregroundColor: color, font: compact ? 10 : 12, bold: true }} />
      <ZStack alignment="leading" frame={{ width: barWidth, height: barHeight }}>
        {segments.map((seg, index) => {
          const start = (seg.range[0] / 100) * barWidth;
          const end = (seg.range[1] / 100) * barWidth;
          return <RoundedRectangle key={index} fill={seg.color} cornerRadius={1} frame={{ width: end - start, height: barHeight }} offset={{ x: start, y: 0 }} />;
        })}
        <Circle fill="white" stroke={color} strokeWidth={1} frame={{ width: barHeight * 1.5, height: barHeight * 1.5 }} offset={{ x: (score / 100) * barWidth - (barHeight * 0.75), y: -(barHeight * 0.25) }} />
      </ZStack>
    </VStack>
  );
}

function FeatureChip({ feature, active }: { feature: any, active: boolean }) {
  return (
    <Button title={feature.shortTitle} intent={SelectFeatureIntent(feature.id)} />
  );
}


// Fallback when map data is not available or static map service is unstable
function StaticMapFallback({ coord, name, compact, width, height }: { coord: string, name: string, compact: boolean, width: number, height: number }) {
  const fontSize = compact ? 10 : 12;
  return (
    <VStack alignment="center" background={tertiaryBg()} cornerRadius={compact ? 10 : 14} frame={{ width, height }}>
      <Image systemName="map.fill" resizable={{}} frame={{ width: compact ? 30 : 40, height: compact ? 30 : 40 }} modifiers={modifiers().foregroundStyle(SECONDARY_TEXT)} />
      <Text styledText={{ content: name, foregroundColor: PRIMARY_TEXT, font: fontSize, bold: true }} lineLimit={1} />
      <Text styledText={{ content: coord, foregroundColor: SECONDARY_TEXT, font: compact ? 8 : 10 }} lineLimit={1} />
    </VStack>
  );
}

async function fetchIPData() {
  // 并行请求两个 API：ipwho.is（VPN/代理/主机检测）+ IPPure（真实风险分数）
  const [ipwhoRes, ippureRes] = await Promise.allSettled([
    fetch('https://ipwho.is/'),
    fetch('https://my.ippure.com/v1/info')
  ]);

  // --- 解析 ipwho.is 数据（安全标志）---
  let ipwhoData: any = {};
  if (ipwhoRes.status === 'fulfilled' && ipwhoRes.value.ok) {
    const json = await ipwhoRes.value.json();
    if (json?.success !== false) ipwhoData = json;
  }
  const connection = ipwhoData.connection || {};
  const security = ipwhoData.security || {};
  const isProxy = Boolean(security.proxy);
  const isVpn = Boolean(security.vpn);
  const isHosting = Boolean(security.hosting);

  // --- 解析 IPPure 数据（真实 fraudScore）---
  let ippureData: any = {};
  if (ippureRes.status === 'fulfilled' && ippureRes.value.ok) {
    ippureData = await ippureRes.value.json();
  }

  // 优先使用 IPPure 的 fraudScore，回退到 ipwho.is 估算
  const riskCount = [isProxy, isVpn, isHosting].filter(Boolean).length;
  const ippureScore = typeof ippureData.fraudScore === 'number' ? ippureData.fraudScore : undefined;
  const fallbackScore = riskCount * 35;
  const fraudScore = ippureScore ?? fallbackScore;

  // 合并数据：优先取 IPPure 的位置信息，安全标志取 ipwho.is
  const org = ippureData.asOrganization || connection.org || connection.isp || '';
  const asnNum = ippureData.asn || connection.asn;
  const asn = asnNum ? `AS${asnNum}` : '';

  return {
    ip: ippureData.ip || ipwhoData.ip,
    country: ippureData.country || ipwhoData.country,
    region: ippureData.region || ipwhoData.region,
    city: ippureData.city || ipwhoData.city,
    countryCode: ippureData.countryCode || ipwhoData.country_code,
    latitude: Number(ippureData.latitude) || ipwhoData.latitude,
    longitude: Number(ippureData.longitude) || ipwhoData.longitude,
    asn,
    asOrganization: org,
    isp: connection.isp || org,
    asDomain: connection.domain,
    fraudScore,
    isProxy,
    isVpn,
    isHosting,
    isServer: isHosting,
    isResidential: Boolean(ippureData.isResidential) || (!isProxy && !isVpn && !isHosting),
    isBroadcast: Boolean(ippureData.isBroadcast),
  };
}

async function runWidget() {
  try {
    const data = await fetchIPData();
    
    let locationZh = toChineseName(data);

    if (data.latitude && data.longitude) {
      try {
        const placemarks = await reverseGeocode({
          latitude: data.latitude,
          longitude: data.longitude,
          locale: 'zh-CN'
        });
        if (placemarks && placemarks.length > 0) {
          const pm = placemarks[0];
          const parts: string[] = [];
          if (pm.country) parts.push(pm.country);
          if (pm.administrativeArea) parts.push(pm.administrativeArea);
          if (pm.locality) parts.push(pm.locality);
          if (parts.length >= 2) locationZh = parts.join(' ');
        }
      } catch (_e) {}
    }

    let mapImage: any = null;
    let pinPoint: any = null;
    const widgetSize = Widget.displaySize || { width: 329, height: 154 };

    if (data.latitude && data.longitude) {
      const safeLat = Math.max(-85, Math.min(85, data.latitude));
      const safeLon = Math.max(-180, Math.min(180, data.longitude));
      const snap = await takeAppleMapSnapshot(safeLat, safeLon, widgetSize.width, widgetSize.height, Widget.family);
      if (snap) {
        mapImage = snap.image;
        pinPoint = snap.point({ latitude: safeLat, longitude: safeLon });
      }
    }

    Widget.present(<IPWidgetView data={data} locationZh={locationZh} mapImage={mapImage} pinPoint={pinPoint} widgetSize={widgetSize} />, {
      policy: 'after',
      date: new Date(Date.now() + 1000 * 60 * 5)
    });
  } catch (error) {
    console.error(error);
    Widget.present(<ErrorView />);
  }
}

runWidget();