// @ts-nocheck
import { Widget, VStack, HStack, ZStack, Text, Spacer, Divider, Image, Link, Script, RoundedRectangle, Circle, modifiers, fetch, Button } from 'scripting';
import { SelectFeatureIntent } from './app_intents';

const BASE_URL = 'https://ippure.com';
const STORAGE_KEY = 'ippure.selectedFeature';
const WIDGET_BACKGROUND = 'systemBackground';
const CARD_BACKGROUND = 'secondarySystemBackground';
const TERTIARY_CARD_BACKGROUND = 'tertiarySystemBackground';
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

function IPWidgetView({ data, locationZh, mapImage }: { data: any, locationZh: string, mapImage: any }) {
  if (!data) return <ErrorView />;
  const family = Widget.family;
  const selected = getSelectedFeature();

  const wallpaperKey = family === 'systemLarge' ? WALLPAPER_LARGE_KEY : WALLPAPER_MEDIUM_KEY;
  const wallpaperData = Storage.getData(wallpaperKey);
  const wallpaperImage = wallpaperData ? UIImage.fromData(wallpaperData) : null;

  const isPreview = Widget.family === undefined;

  const widgetView = family === 'systemLarge' ? (
    <LargeWidget data={data} locationZh={locationZh} selected={selected} mapImage={mapImage} hasWallpaper={!!wallpaperImage} />
  ) : (
    <MediumWidget data={data} locationZh={locationZh} selected={selected} mapImage={mapImage} hasWallpaper={!!wallpaperImage} />
  );

  if (wallpaperImage) {
    return (
      <ZStack alignment="center" frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }}>
        <Image image={wallpaperImage} resizable={true} frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }} />
        {widgetView}
      </ZStack>
    );
  }

  return widgetView;
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
  if (fraudScore > 70) { riskColor = '#FF3B30'; riskLabel = '高风险'; purityLabel = '高危'; }
  else if (fraudScore > 40) { riskColor = '#FF9500'; riskLabel = '中度风险'; purityLabel = '中性'; }
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

function buildStaticMapUrl(lat: number, lon: number, width: number, height: number, zoom = 8): string {
  const safeLat = Math.max(-85, Math.min(85, lat));
  const safeLon = Math.max(-180, Math.min(180, lon));
  const safeZoom = Math.max(2, Math.min(17, zoom));
  return `https://static-maps.yandex.ru/1.x/?lang=en-US&ll=${safeLon},${safeLat}&z=${safeZoom}&l=map&size=${width},${height}&dummy=.png`;
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

function buildOSMTileUrlForTile(zoom: number, x: number, y: number) {
  const scale = Math.pow(2, zoom);
  const wrappedX = ((x % scale) + scale) % scale;
  const clampedY = Math.max(0, Math.min(scale - 1, y));
  return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${zoom}/${clampedY}/${wrappedX}`;
}

function getCenteredMapTiles(lat: number, lon: number, zoom: number, width: number, height: number) {
  const safeLat = clampLat(lat);
  const safeLon = Math.max(-180, Math.min(180, lon));
  const scale = Math.pow(2, zoom);
  const tileSize = 256;
  const latRad = safeLat * Math.PI / 180;
  const centerX = (safeLon + 180) / 360 * scale * tileSize;
  const centerY = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * scale * tileSize;
  const originX = centerX - width / 2;
  const originY = centerY - height / 2;
  const startX = Math.floor(originX / tileSize);
  const startY = Math.floor(originY / tileSize);
  const endX = Math.floor((originX + width) / tileSize);
  const endY = Math.floor((originY + height) / tileSize);
  const tiles: any[] = [];

  for (let y = startY - 1; y <= endY + 1; y++) {
    for (let x = startX - 1; x <= endX + 1; x++) {
      tiles.push({
        key: `${zoom}-${x}-${y}`,
        url: buildOSMTileUrlForTile(zoom, x, y),
        offsetX: x * tileSize - originX,
        offsetY: y * tileSize - originY,
      });
    }
  }

  return tiles;
}

function buildOSMTileUrl(lat: number, lon: number, zoom: number) {
  const tile = lonLatToTile(lat, lon, zoom);
  return `https://tile.openstreetmap.org/${zoom}/${tile.x}/${tile.y}.png`;
}

function getTilePinOffset(lat: number, lon: number, zoom: number, width: number, height: number) {
  const tile = lonLatToTile(lat, lon, zoom);
  return {
    x: tile.pinXRatio * width,
    y: tile.pinYRatio * height,
  };
}

function MediumWidget({ data, locationZh, selected, mapImage, hasWallpaper }: { data: any, locationZh: string, selected: any, mapImage: any, hasWallpaper?: boolean }) {
  const meta = useIPMeta(data, locationZh);
  return (
    <VStack
      cornerRadius={22}
      padding={{ top: 14, bottom: 12, leading: 14, trailing: 14 }}
      spacing={6}
      alignment="leading"
      background={hasWallpaper ? undefined : WIDGET_BACKGROUND}
      widgetURL={Script.createRunSingleURLScheme(Script.name)}
    >
      <HStack alignment="center" spacing={6}>
        <Text styledText={{ content: '🍃 IPPure', foregroundColor: '#1F7A3A', font: { name: 'System', size: 14 }, bold: true }} />
        <Text styledText={{ content: 'IP 地址实时监控', foregroundColor: SECONDARY_TEXT, font: 10 }} />
        <Spacer />
        <Text styledText={{ content: selected.shortTitle, foregroundColor: selected.color, font: 10, bold: true }} background="rgba(255,255,255,0.08)" cornerRadius={8} padding={{ top: 3, bottom: 3, leading: 7, trailing: 7 }} modifiers={modifiers().overlay(<RoundedRectangle cornerRadius={8} stroke={selected.color} strokeWidth={1} frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }} />)} />
      </HStack>

      <HStack alignment="center" spacing={8}>
        <VStack alignment="leading" spacing={4} layoutPriority={1}>
          <Row icon="📍" label="位置" value={meta.locationStr} />
          <Row icon="💻" label="IP" value={data.ip || 'N/A'} />
          <Row icon="🏢" label="ASN" value={meta.asnStr} />
          <HStack spacing={4} alignment="center">
            <Text styledText={{ content: '🔰 风险', foregroundColor: SECONDARY_TEXT, font: 11 }} frame={{ width: 50, alignment: 'leading' }} />
            <Text styledText={{ content: meta.riskText, foregroundColor: meta.riskColor, font: 11, bold: true }} background="rgba(255,255,255,0.08)" cornerRadius={6} padding={{ top: 2, bottom: 2, leading: 6, trailing: 6 }} modifiers={modifiers().overlay(<RoundedRectangle cornerRadius={6} stroke={meta.riskColor} strokeWidth={1} frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }} />)} />
            <Text styledText={{ content: meta.tags.slice(0, 2).join(' · '), foregroundColor: '#EE7799', font: 11, bold: true }} lineLimit={1} />
          </HStack>
        </VStack>
        <WidgetDataPanel data={data} meta={meta} selected={selected} compact={true} mapImage={mapImage} />
      </HStack>
    </VStack>
  );
}

function LargeWidget({ data, locationZh, selected, mapImage, hasWallpaper }: { data: any, locationZh: string, selected: any, mapImage: any, hasWallpaper?: boolean }) {
  const meta = useIPMeta(data, locationZh);
  return (
    <VStack
      cornerRadius={24}
      padding={{ top: 16, bottom: 14, leading: 16, trailing: 16 }}
      spacing={10}
      alignment="leading"
      background={hasWallpaper ? undefined : WIDGET_BACKGROUND}
      widgetURL={Script.createRunSingleURLScheme(Script.name)}
    >
      <HStack alignment="center">
        <VStack alignment="leading" spacing={2}>
          <Text styledText={{ content: '🍃 IPPure 控制台', foregroundColor: '#166534', font: 18, bold: true }} />
          <Text styledText={{ content: '来自 纯净度与隐私检测入口', foregroundColor: SECONDARY_TEXT, font: 11 }} />
        </VStack>
        <Spacer />
        <Text styledText={{ content: '当前：' + selected.shortTitle, foregroundColor: selected.color, font: 11, bold: true }} background="rgba(255,255,255,0.08)" cornerRadius={10} padding={{ top: 5, bottom: 5, leading: 9, trailing: 9 }} modifiers={modifiers().overlay(<RoundedRectangle cornerRadius={10} stroke={selected.color} strokeWidth={1} frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }} />)} />
      </HStack>

      <HStack alignment="center" spacing={10}>
        <VStack alignment="leading" spacing={4} layoutPriority={1} frame={{ maxWidth: 160 }}>
          <InfoCard title="当前 IP" value={data.ip || 'N/A'} icon="💻" color="#2563EB" />
          <InfoCard title="位置" value={meta.locationStr} icon="📍" color="#16A34A" />
          <InfoCard title="ASN / 组织" value={meta.asnStr} icon="🏢" color="#9333EA" />
        </VStack>
        <WidgetDataPanel data={data} meta={meta} selected={selected} compact={false} mapImage={mapImage} />
      </HStack>

      <HStack spacing={6} alignment="center">
        <Text styledText={{ content: '🔰 ' + meta.riskText, foregroundColor: meta.riskColor, font: 11, bold: true }} background="rgba(255,255,255,0.08)" cornerRadius={8} padding={{ top: 4, bottom: 4, leading: 7, trailing: 7 }} modifiers={modifiers().overlay(<RoundedRectangle cornerRadius={8} stroke={meta.riskColor} strokeWidth={1} frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }} />)} />
        {meta.tags.slice(0, 2).map(tag => <Text styledText={{ content: tag, foregroundColor: '#EE7799', font: 10, bold: true }} background="rgba(255,255,255,0.08)" cornerRadius={8} padding={{ top: 3, bottom: 3, leading: 6, trailing: 6 }} modifiers={modifiers().overlay(<RoundedRectangle cornerRadius={8} stroke="#EE7799" strokeWidth={1} frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }} />)} />)}
        <Spacer />
      </HStack>

      <Divider />
      <VStack alignment="leading" spacing={6}>
        <Text styledText={{ content: '快捷检测入口', foregroundColor: PRIMARY_TEXT, font: 11, bold: true }} />
        <HStack spacing={5}>{FEATURES.slice(0, 4).map(item => <FeatureChip feature={item} active={item.id === selected.id} />)}</HStack>
        <HStack spacing={5}>{FEATURES.slice(4, 8).map(item => <FeatureChip feature={item} active={item.id === selected.id} />)}</HStack>
      </VStack>
    </VStack>
  );
}

function WidgetDataPanel({ data, meta, selected, compact, mapImage }: { data: any, meta: any, selected: any, compact: boolean, mapImage: any }) {
  const mapTitle = selected.id === 'outbound' ? '出口地图' : '定位地图';
  return <LocationMapPanel data={data} meta={meta} selected={selected} compact={compact} title={mapTitle} mapImage={mapImage} />;
  const panelWidth = selected.id === 'outbound' ? (compact ? 118 : 156) : (compact ? 104 : 136);
  if (selected.id === 'ip-info') {
    return <LocationMapPanel data={data} meta={meta} selected={selected} compact={compact} title="定位地图" />;
  }
  if (selected.id === 'risk') {
    return <VStack alignment="leading" spacing={compact ? 4 : 6} frame={{ width: panelWidth }} background={CARD_BACKGROUND} cornerRadius={compact ? 14 : 18} padding={compact ? 7 : 10}>
      <PanelHeader selected={selected} compact={compact} />
      <ScoreBar score={meta.purityScore} label={meta.purityLabel} color={meta.riskColor} compact={compact} />
      <MiniData label="风险" value={meta.riskText} color={meta.riskColor} />
      <MiniData label="属性" value={meta.tags.slice(0, 2).join(' · ')} color="#EE7799" />
      {!compact && <MiniData label="流量" value={`human ${Math.max(0, 100 - meta.fraudScore)}% / bot ${meta.fraudScore}%`} color="#0EA5E9" />}
    </VStack>;
  }
  if (selected.id === 'outbound') {
    return <LocationMapPanel data={data} meta={meta} selected={selected} compact={compact} title="出口地图" />;
  }
  if (selected.id === 'vpn-leak') {
    return <VStack alignment="leading" spacing={compact ? 3 : 5} frame={{ width: panelWidth }} background={CARD_BACKGROUND} cornerRadius={compact ? 14 : 18} padding={compact ? 7 : 10}>
      <PanelHeader selected={selected} compact={compact} />
      <MiniData label="IP" value={data.ip || 'N/A'} color="#2563EB" />
      <MiniData label="ISP" value={data.isp || 'N/A'} color="#16A34A" />
      <MiniData label="状态" value={data.vpnStatus || '未知'} color={data.vpnStatus === '安全' ? '#34C759' : '#FF3B30'} />
      {!compact && <MiniData label="类型" value={data.vpnType || 'N/A'} color={SECONDARY_TEXT} />}
    </VStack>;
  }
  if (selected.id === 'webrtc') {
    return <VStack alignment="leading" spacing={compact ? 3 : 5} frame={{ width: panelWidth }} background={CARD_BACKGROUND} cornerRadius={compact ? 14 : 18} padding={compact ? 7 : 10}>
      <PanelHeader selected={selected} compact={compact} />
      <MiniData label="本地IP" value={data.webrtcLocalIp || 'N/A'} color="#2563EB" />
      <MiniData label="公共IP" value={data.webrtcPublicIp || 'N/A'} color="#16A34A" />
      <MiniData label="状态" value={data.webrtcStatus || '未知'} color={data.webrtcStatus === '安全' ? '#34C759' : '#FF3B30'} />
      {!compact && <MiniData label="泄露" value={data.webrtcLeakDetected ? '是' : '否'} color={data.webrtcLeakDetected ? '#FF3B30' : '#34C759'} />}
    </VStack>;
  }
  if (selected.id === 'dns-leak') {
    return <VStack alignment="leading" spacing={compact ? 3 : 5} frame={{ width: panelWidth }} background={CARD_BACKGROUND} cornerRadius={compact ? 14 : 18} padding={compact ? 7 : 10}>
      <PanelHeader selected={selected} compact={compact} />
      <MiniData label="DNS" value={data.dnsServer || 'N/A'} color="#2563EB" />
      <MiniData label="ISP" value={data.dnsIsp || 'N/A'} color="#16A34A" />
      <MiniData label="状态" value={data.dnsStatus || '未知'} color={data.dnsStatus === '安全' ? '#34C759' : '#FF3B30'} />
      {!compact && <MiniData label="泄露" value={data.dnsLeakDetected ? '是' : '否'} color={data.dnsLeakDetected ? '#FF3B30' : '#34C759'} />}
    </VStack>;
  }
  return <VStack alignment="leading" spacing={compact ? 3 : 5} frame={{ width: panelWidth }} background={CARD_BACKGROUND} cornerRadius={compact ? 14 : 18} padding={compact ? 7 : 10}>
    <PanelHeader selected={selected} compact={compact} />
    <Text styledText={{ content: "敬请期待", foregroundColor: SECONDARY_TEXT, font: compact ? 10 : 12 }} />
  </VStack>;
}

function LocationMapPanel({ data, meta, selected, compact, title, mapImage }: { data: any, meta: any, selected: any, compact: boolean, title: string, mapImage: any }) {
  const mapWidth = compact ? 118 : 156;
  const mapHeight = compact ? 88 : 132;
  const panelHeight = compact ? 118 : 168;
  const locationTitle = [meta.city || meta.region, meta.country].filter(Boolean).join(' · ') || meta.mapLocationName || '定位位置';
  const coordText = meta.hasCoord ? `${meta.lat.toFixed(2)}, ${meta.lon.toFixed(2)}` : '坐标未知';
  const amapUrl = meta.hasCoord ? `https://uri.amap.com/marker?position=${meta.lon},${meta.lat}&name=${encodeURIComponent(locationTitle)}` : 'https://m.amap.com';

  return (
    <Link url={amapUrl}>
      <VStack alignment="leading" spacing={0} frame={{ width: mapWidth, height: panelHeight }} background="#1F2937" cornerRadius={compact ? 10 : 14} padding={0} clipped={true}>
        <HStack spacing={4} alignment="center" background="#1F2937" frame={{ width: mapWidth, height: compact ? 30 : 36 }} padding={{ leading: compact ? 6 : 8, trailing: compact ? 6 : 8 }}>
          <Image systemName="mappin.and.ellipse" resizable={{}} frame={{ width: compact ? 16 : 20, height: compact ? 16 : 20 }} modifiers={modifiers().foregroundStyle(selected.color)} />
          <VStack alignment="leading" spacing={0} layoutPriority={1}>
            <Text styledText={{ content: title, foregroundColor: selected.color, font: compact ? 10 : 12, bold: true }} lineLimit={1} />
            <Text styledText={{ content: locationTitle, foregroundColor: 'white', font: compact ? 8 : 9, bold: true }} lineLimit={1} />
          </VStack>
        </HStack>
        <ZStack alignment="center" frame={{ width: mapWidth, height: mapHeight }} background="#A8D7E1" clipped={true}>
          {mapImage ? (
            <Image
              image={mapImage}
              resizable={true}
              frame={{ width: mapWidth, height: mapHeight }}
            />
          ) : (
            <StaticMapFallback coord={coordText} name={locationTitle} compact={compact} width={mapWidth} height={mapHeight} />
          )}
          {meta.hasCoord && <Circle fill="rgba(255,59,48,0.22)" stroke="#FFFFFF" strokeWidth={1} frame={{ width: compact ? 26 : 32, height: compact ? 26 : 32 }} />}
          {meta.hasCoord && <Image systemName="mappin.circle.fill" resizable={{}} frame={{ width: compact ? 20 : 24, height: compact ? 20 : 24 }} modifiers={modifiers().foregroundStyle('#FF3B30')} />}
          {meta.hasCoord && <Text styledText={{ content: coordText, foregroundColor: 'white', font: compact ? 7 : 9, bold: true }} background="rgba(0,0,0,0.45)" cornerRadius={5} padding={{ top: 2, bottom: 2, leading: 4, trailing: 4 }} offset={{ x: 5, y: mapHeight - (compact ? 18 : 22) }} lineLimit={1} />}
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
    <HStack alignment="center" spacing={4} background={CARD_BACKGROUND} cornerRadius={8} padding={{ top: 4, bottom: 4, leading: 6, trailing: 6 }}>
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
    <HStack spacing={4} alignment="center">
      <Text styledText={{ content: icon + ' ' + label, foregroundColor: SECONDARY_TEXT, font: 11 }} frame={{ width: 50, alignment: 'leading' }} />
      <Text styledText={{ content: value, foregroundColor: PRIMARY_TEXT, font: 11 }} lineLimit={1} />
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
          return <RoundedRectangle key={index} fill={seg.color} frame={{ width: end - start, height: barHeight }} offset={{ x: start, y: 0 }} />;
        })}
        <Circle fill="white" stroke={color} strokeWidth={1} frame={{ width: barHeight * 1.5, height: barHeight * 1.5 }} offset={{ x: (score / 100) * barWidth - (barHeight * 0.75), y: -(barHeight * 0.25) }} />
      </ZStack>
    </VStack>
  );
}

function FeatureChip({ feature, active }: { feature: any, active: boolean }) {
  return (
    <Button intent={SelectFeatureIntent(feature.id)}>
      <HStack alignment="center" spacing={3} background={active ? `rgba(255,255,255,0.08)` : 'rgba(255,255,255,0.03)'} cornerRadius={12} padding={{ top: 5, bottom: 5, leading: 10, trailing: 10 }} modifiers={active ? modifiers().overlay(<RoundedRectangle cornerRadius={12} stroke={feature.color} strokeWidth={1.5} frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }} />) : modifiers().overlay(<RoundedRectangle cornerRadius={12} stroke="rgba(255,255,255,0.1)" strokeWidth={1} frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }} />)}>
        <Text styledText={{ content: feature.emoji, font: 11 }} />
        <Text styledText={{ content: feature.shortTitle, foregroundColor: active ? feature.color : 'rgba(255,255,255,0.7)', font: 11, bold: true }} lineLimit={1} />
      </HStack>
    </Button>
  );
}

// Fallback when map data is not available or static map service is unstable
function StaticMapFallback({ coord, name, compact, width, height }: { coord: string, name: string, compact: boolean, width: number, height: number }) {
  const fontSize = compact ? 10 : 12;
  return (
    <VStack alignment="center" background={TERTIARY_CARD_BACKGROUND} cornerRadius={compact ? 10 : 14} frame={{ width, height }}>
      <Image systemName="map.fill" resizable={{}} frame={{ width: compact ? 30 : 40, height: compact ? 30 : 40 }} modifiers={modifiers().foregroundStyle(SECONDARY_TEXT)} />
      <Text styledText={{ content: name, foregroundColor: PRIMARY_TEXT, font: fontSize, bold: true }} lineLimit={1} />
      <Text styledText={{ content: coord, foregroundColor: SECONDARY_TEXT, font: compact ? 8 : 10 }} lineLimit={1} />
    </VStack>
  );
}

async function fetchIPData() {
  const response = await fetch('https://ipwho.is/');
  if (!response.ok) {
    throw new Error(`IP 数据请求失败：${response.status}`);
  }

  const json = await response.json();
  if (json?.success === false) {
    throw new Error(json?.message || 'IP 数据返回失败');
  }

  const connection = json.connection || {};
  const security = json.security || {};
  const asn = connection.asn ? `AS${connection.asn}` : '';
  const org = connection.org || connection.isp || '';
  const isProxy = Boolean(security.proxy);
  const isVpn = Boolean(security.vpn);
  const isHosting = Boolean(security.hosting);
  const riskCount = [isProxy, isVpn, isHosting].filter(Boolean).length;

  return {
    ip: json.ip,
    country: json.country,
    region: json.region,
    city: json.city,
    countryCode: json.country_code,
    latitude: json.latitude,
    longitude: json.longitude,
    asn,
    asOrganization: org,
    isp: connection.isp || org,
    asDomain: connection.domain,
    fraudScore: riskCount * 35,
    isProxy,
    isVpn,
    isHosting,
    isServer: isHosting,
    isResidential: !isProxy && !isVpn && !isHosting,
  };
}

async function runWidget() {
  try {
    const data = await fetchIPData();
    
    // 1) Use country-name mapping as quick baseline
    let locationZh = toChineseName(data);

    // 2) Try reverseGeocode with zh-CN locale for accurate Chinese place names
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
          if (parts.length >= 2) {
            locationZh = parts.join(' ');
          }
        }
      } catch (_e) {
        // reverseGeocode failed, fall back to mapped name
      }
    }

    let mapImage = null;
    if (data.latitude && data.longitude) {
      const zoom = getCountryMapZoom(data, false);
      const safeLat = Math.max(-85, Math.min(85, data.latitude));
      const safeLon = Math.max(-180, Math.min(180, data.longitude));
      const safeZoom = Math.max(2, Math.min(17, zoom));
      // Pre-fetch a map size that fits the widget
      const url = `https://static-maps.yandex.ru/1.x/?lang=en-US&ll=${safeLon},${safeLat}&z=${safeZoom}&l=map&size=312,264`;
      try {
        mapImage = await UIImage.fromURL(url);
      } catch (e) {
        console.error("Failed to load map image:", e);
      }
    }

    Widget.present(<IPWidgetView data={data} locationZh={locationZh} mapImage={mapImage} />);
  } catch (error) {
    console.error(error);
    Widget.present(<ErrorView />);
  }
}

runWidget();