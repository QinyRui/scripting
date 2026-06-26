// data.ts - 静态数据（国家、限免应用、预设搜索等）

// 商店切换：155 个国家/地区（精选常用 + 部分字母排序）
export const COUNTRIES: { code: string; name: string; flag: string }[] = [
  { code: 'AE', name: '阿联酋', flag: '🇦🇪' },
  { code: 'AG', name: '安提瓜和巴布达', flag: '🇦🇬' },
  { code: 'AI', name: '安圭拉', flag: '🇦🇮' },
  { code: 'AL', name: '阿尔巴尼亚', flag: '🇦🇱' },
  { code: 'AM', name: '亚美尼亚', flag: '🇦🇲' },
  { code: 'AO', name: '安哥拉', flag: '🇦🇴' },
  { code: 'AR', name: '阿根廷', flag: '🇦🇷' },
  { code: 'AT', name: '奥地利', flag: '🇦🇹' },
  { code: 'AU', name: '澳大利亚', flag: '🇦🇺' },
  { code: 'AZ', name: '阿塞拜疆', flag: '🇦🇿' },
  { code: 'BB', name: '巴巴多斯', flag: '🇧🇧' },
  { code: 'BE', name: '比利时', flag: '🇧🇪' },
  { code: 'BF', name: '布基纳法索', flag: '🇧🇫' },
  { code: 'BG', name: '保加利亚', flag: '🇧🇬' },
  { code: 'BH', name: '巴林', flag: '🇧🇭' },
  { code: 'BJ', name: '贝宁', flag: '🇧🇯' },
  { code: 'BM', name: '百慕大', flag: '🇧🇲' },
  { code: 'BN', name: '文莱', flag: '🇧🇳' },
  { code: 'BO', name: '玻利维亚', flag: '🇧🇴' },
  { code: 'BR', name: '巴西', flag: '🇧🇷' },
  { code: 'BS', name: '巴哈马', flag: '🇧🇸' },
  { code: 'BT', name: '不丹', flag: '🇧🇹' },
  { code: 'BW', name: '博茨瓦纳', flag: '🇧🇼' },
  { code: 'BY', name: '白俄罗斯', flag: '🇧🇾' },
  { code: 'CA', name: '加拿大', flag: '🇨🇦' },
  { code: 'CH', name: '瑞士', flag: '🇨🇭' },
  { code: 'CL', name: '智利', flag: '🇨🇱' },
  { code: 'CN', name: '中国', flag: '🇨🇳' },
  { code: 'CO', name: '哥伦比亚', flag: '🇨🇴' },
  { code: 'CR', name: '哥斯达黎加', flag: '🇨🇷' },
  { code: 'CY', name: '塞浦路斯', flag: '🇨🇾' },
  { code: 'CZ', name: '捷克', flag: '🇨🇿' },
  { code: 'DE', name: '德国', flag: '🇩🇪' },
  { code: 'DK', name: '丹麦', flag: '🇩🇰' },
  { code: 'DO', name: '多米尼加', flag: '🇩🇴' },
  { code: 'DZ', name: '阿尔及利亚', flag: '🇩🇿' },
  { code: 'EC', name: '厄瓜多尔', flag: '🇪🇨' },
  { code: 'EE', name: '爱沙尼亚', flag: '🇪🇪' },
  { code: 'EG', name: '埃及', flag: '🇪🇬' },
  { code: 'ES', name: '西班牙', flag: '🇪🇸' },
  { code: 'FI', name: '芬兰', flag: '🇫🇮' },
  { code: 'FR', name: '法国', flag: '🇫🇷' },
  { code: 'GB', name: '英国', flag: '🇬🇧' },
  { code: 'GD', name: '格林纳达', flag: '🇬🇩' },
  { code: 'GE', name: '格鲁吉亚', flag: '🇬🇪' },
  { code: 'GH', name: '加纳', flag: '🇬🇭' },
  { code: 'GR', name: '希腊', flag: '🇬🇷' },
  { code: 'GT', name: '危地马拉', flag: '🇬🇹' },
  { code: 'GY', name: '圭亚那', flag: '🇬🇾' },
  { code: 'HK', name: '香港', flag: '🇭🇰' },
  { code: 'HN', name: '洪都拉斯', flag: '🇭🇳' },
  { code: 'HR', name: '克罗地亚', flag: '🇭🇷' },
  { code: 'HU', name: '匈牙利', flag: '🇭🇺' },
  { code: 'ID', name: '印度尼西亚', flag: '🇮🇩' },
  { code: 'IE', name: '爱尔兰', flag: '🇮🇪' },
  { code: 'IL', name: '以色列', flag: '🇮🇱' },
  { code: 'IN', name: '印度', flag: '🇮🇳' },
  { code: 'IS', name: '冰岛', flag: '🇮🇸' },
  { code: 'IT', name: '意大利', flag: '🇮🇹' },
  { code: 'JM', name: '牙买加', flag: '🇯🇲' },
  { code: 'JO', name: '约旦', flag: '🇯🇴' },
  { code: 'JP', name: '日本', flag: '🇯🇵' },
  { code: 'KE', name: '肯尼亚', flag: '🇰🇪' },
  { code: 'KG', name: '吉尔吉斯斯坦', flag: '🇰🇬' },
  { code: 'KH', name: '柬埔寨', flag: '🇰🇭' },
  { code: 'KR', name: '韩国', flag: '🇰🇷' },
  { code: 'KW', name: '科威特', flag: '🇰🇼' },
  { code: 'KZ', name: '哈萨克斯坦', flag: '🇰🇿' },
  { code: 'LA', name: '老挝', flag: '🇱🇦' },
  { code: 'LB', name: '黎巴嫩', flag: '🇱🇧' },
  { code: 'LK', name: '斯里兰卡', flag: '🇱🇰' },
  { code: 'LT', name: '立陶宛', flag: '🇱🇹' },
  { code: 'LU', name: '卢森堡', flag: '🇱🇺' },
  { code: 'LV', name: '拉脱维亚', flag: '🇱🇻' },
  { code: 'MA', name: '摩洛哥', flag: '🇲🇦' },
  { code: 'MD', name: '摩尔多瓦', flag: '🇲🇩' },
  { code: 'MG', name: '马达加斯加', flag: '🇲🇬' },
  { code: 'MK', name: '北马其顿', flag: '🇲🇰' },
  { code: 'ML', name: '马里', flag: '🇲🇱' },
  { code: 'MM', name: '缅甸', flag: '🇲🇲' },
  { code: 'MN', name: '蒙古', flag: '🇲🇳' },
  { code: 'MO', name: '澳门', flag: '🇲🇴' },
  { code: 'MT', name: '马耳他', flag: '🇲🇹' },
  { code: 'MU', name: '毛里求斯', flag: '🇲🇺' },
  { code: 'MV', name: '马尔代夫', flag: '🇲🇻' },
  { code: 'MX', name: '墨西哥', flag: '🇲🇽' },
  { code: 'MY', name: '马来西亚', flag: '🇲🇾' },
  { code: 'MZ', name: '莫桑比克', flag: '🇲🇿' },
  { code: 'NA', name: '纳米比亚', flag: '🇳🇦' },
  { code: 'NE', name: '尼日尔', flag: '🇳🇪' },
  { code: 'NG', name: '尼日利亚', flag: '🇳🇬' },
  { code: 'NI', name: '尼加拉瓜', flag: '🇳🇮' },
  { code: 'NL', name: '荷兰', flag: '🇳🇱' },
  { code: 'NO', name: '挪威', flag: '🇳🇴' },
  { code: 'NP', name: '尼泊尔', flag: '🇳🇵' },
  { code: 'NZ', name: '新西兰', flag: '🇳🇿' },
  { code: 'OM', name: '阿曼', flag: '🇴🇲' },
  { code: 'PA', name: '巴拿马', flag: '🇵🇦' },
  { code: 'PE', name: '秘鲁', flag: '🇵🇪' },
  { code: 'PH', name: '菲律宾', flag: '🇵🇭' },
  { code: 'PK', name: '巴基斯坦', flag: '🇵🇰' },
  { code: 'PL', name: '波兰', flag: '🇵🇱' },
  { code: 'PT', name: '葡萄牙', flag: '🇵🇹' },
  { code: 'PY', name: '巴拉圭', flag: '🇵🇾' },
  { code: 'QA', name: '卡塔尔', flag: '🇶🇦' },
  { code: 'RO', name: '罗马尼亚', flag: '🇷🇴' },
  { code: 'RS', name: '塞尔维亚', flag: '🇷🇸' },
  { code: 'RU', name: '俄罗斯', flag: '🇷🇺' },
  { code: 'SA', name: '沙特阿拉伯', flag: '🇸🇦' },
  { code: 'SE', name: '瑞典', flag: '🇸🇪' },
  { code: 'SG', name: '新加坡', flag: '🇸🇬' },
  { code: 'SI', name: '斯洛文尼亚', flag: '🇸🇮' },
  { code: 'SK', name: '斯洛伐克', flag: '🇸🇰' },
  { code: 'SN', name: '塞内加尔', flag: '🇸🇳' },
  { code: 'SV', name: '萨尔瓦多', flag: '🇸🇻' },
  { code: 'TH', name: '泰国', flag: '🇹🇭' },
  { code: 'TN', name: '突尼斯', flag: '🇹🇳' },
  { code: 'TR', name: '土耳其', flag: '🇹🇷' },
  { code: 'TT', name: '特立尼达和多巴哥', flag: '🇹🇹' },
  { code: 'TW', name: '台湾', flag: '🇹🇼' },
  { code: 'TZ', name: '坦桑尼亚', flag: '🇹🇿' },
  { code: 'UA', name: '乌克兰', flag: '🇺🇦' },
  { code: 'UG', name: '乌干达', flag: '🇺🇬' },
  { code: 'US', name: '美国', flag: '🇺🇸' },
  { code: 'UY', name: '乌拉圭', flag: '🇺🇾' },
  { code: 'UZ', name: '乌兹别克斯坦', flag: '🇺🇿' },
  { code: 'VE', name: '委内瑞拉', flag: '🇻🇪' },
  { code: 'VN', name: '越南', flag: '🇻🇳' },
  { code: 'YE', name: '也门', flag: '🇾🇪' },
  { code: 'ZA', name: '南非', flag: '🇿🇦' },
  { code: 'ZW', name: '津巴布韦', flag: '🇿🇼' },
]

// 应用比价：常用预设应用（与网站一致）
export const PRICE_PRESETS = [
  'ChatGPT',
  'Claude',
  'Spotify',
  'Netflix',
  'YouTube',
  'Notion',
  'Telegram',
  'X',
  'Pokemon',
]

// 应用比价：可选地区
export const PRICE_REGIONS = [
  '美国', '中国', '台湾', '香港', '日本',
  '韩国', '菲律宾', '土耳其', '尼日利亚', '印度',
]

// 应用限免：内购限免
export const FREE_IAP_APPS = [
  'MiiraSound',
  'WebDAV Lite - LAN File Server',
  'Pranayama Yoga: Yogi Breath',
  'MeCode',
  'FlowClock - Standby Clock',
  '身份验证器Authenticator',
  'My Accounts and Expenses',
  'WolfQuest',
  'dB Meter: Decibel, SPL, Noise',
]

// 应用限免：本体限免
export const FREE_MAIN_APPS = [
  'Sticker Maker Keyboard',
  'Habit Huski',
  'Taskscope',
  'ZeroExif - Photo Privacy',
  'Markden - Markdown Editor',
  'Video Stabilizer.',
  'AssetMinder Finance Tracker',
  'Resume Maker: CV Maker',
  'Vocab Listening - notaps',
  'Cytus II',
]

// 应用限免筛选
export const FREE_FILTERS = ['全部', '内购限免', '本体限免']

// 内购查询：常用预设应用（与网站一致）
export const IAP_PRESETS = [
  'ChatGPT',
  'Spotify',
  'Netflix',
  'YouTube',
  'Notion',
  'Telegram',
  'Claude',
]

// 内购查询：搜索类型
export const IAP_SEARCH_TYPES = ['应用名称', 'Bundle ID', 'Track ID', 'App Store 链接']

// 内购查询：可选地区
export const IAP_REGIONS = [
  '美国', '中国', '香港', '台湾', '日本',
  '英国', '韩国', '德国', '法国', '加拿大',
]

// 图标查询：可选地区
export const ICON_REGIONS = [
  '中国', '美国', '日本', '韩国', '台湾',
  '香港', '新加坡', '英国', '法国', '德国',
]

// 图标查询：平台
export const ICON_PLATFORMS = ['iOS', 'iPadOS', 'macOS']

// 图标查询：数量
export const ICON_COUNTS = ['6 条', '18 条', '30 条', '48 条']
