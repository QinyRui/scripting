// ImageToolsTab.tsx - 图片工具箱（玻璃胶囊风格 + 双主题）
// 所有 UI 元素采用 clipShape 强制裁剪为胶囊形状

import {
  VStack,
  HStack,
  Text,
  ScrollView,
  TextField,
  Spacer,
  WebView,
  useObservable,
} from 'scripting'
import { useThemeColors, toggleTheme, getThemeMode } from '../theme'

// ============================================
// 工具定义
// ============================================
type ToolDef = {
  id: string
  icon: string
  name: string
  category: string
}

const TOOLS: ToolDef[] = [
  { id: 'compress', icon: '🗜️', name: '图片压缩', category: '处理' },
  { id: 'resize', icon: '📐', name: '调整尺寸', category: '处理' },
  { id: 'crop', icon: '✂️', name: '裁剪', category: '处理' },
  { id: 'convert', icon: '🔄', name: '格式转换', category: '处理' },
  { id: 'remove-bg', icon: '🪄', name: '智能去背', category: 'AI' },
  { id: 'id-photo', icon: '🪪', name: '证件照', category: 'AI' },
  { id: 'filter', icon: '🎨', name: '滤镜增强', category: '编辑' },
  { id: 'editor', icon: '✏️', name: '简易编辑', category: '编辑' },
  { id: 'social-size', icon: '📱', name: '社交尺寸', category: '处理' },
  { id: 'viewer', icon: '🔍', name: '图片查看', category: '工具' },
  { id: 'favicon', icon: '🌐', name: 'Favicon', category: '工具' },
  { id: 'exif', icon: '📋', name: 'EXIF 编辑', category: '工具' },
  { id: 'watermark', icon: '💧', name: '水印', category: '编辑' },
]

const CATEGORIES = ['全部', '处理', 'AI', '编辑', '工具']

// 圆形图标背景色
const ICON_BG_DARK: Record<string, string> = {
  compress: 'rgba(96,165,250,0.35)', resize: 'rgba(74,222,128,0.35)',
  crop: 'rgba(192,132,252,0.35)', convert: 'rgba(251,146,60,0.35)',
  'remove-bg': 'rgba(244,114,182,0.35)', 'id-photo': 'rgba(248,113,113,0.35)',
  filter: 'rgba(52,211,153,0.35)', editor: 'rgba(251,191,36,0.35)',
  'social-size': 'rgba(56,189,248,0.35)', viewer: 'rgba(148,163,184,0.35)',
  favicon: 'rgba(251,146,60,0.35)', exif: 'rgba(167,139,250,0.35)',
  watermark: 'rgba(129,140,248,0.35)',
}
const ICON_BG_LIGHT: Record<string, string> = {
  compress: 'rgba(59,130,246,0.15)', resize: 'rgba(34,197,94,0.15)',
  crop: 'rgba(168,85,247,0.15)', convert: 'rgba(245,158,11,0.15)',
  'remove-bg': 'rgba(236,72,153,0.15)', 'id-photo': 'rgba(239,68,68,0.15)',
  filter: 'rgba(16,185,129,0.15)', editor: 'rgba(245,158,11,0.15)',
  'social-size': 'rgba(14,165,233,0.15)', viewer: 'rgba(100,116,139,0.15)',
  favicon: 'rgba(245,158,11,0.15)', exif: 'rgba(139,92,246,0.15)',
  watermark: 'rgba(99,102,241,0.15)',
}

const TOOL_URL = 'https://picdone.com/zh/tools/'
let _activeVC: WebViewController | null = null

// 注入脚本
const INJECT_HIDE_UI = `
(function(){
  function hideUI(){
    ['HEADER','NAV','FOOTER'].forEach(function(t){
      document.querySelectorAll(t).forEach(function(e){e.style.display='none';});
    });
    document.querySelectorAll('*').forEach(function(e){
      var c=String(e.className||'').toLowerCase();
      if(/header|navbar|nav-bar|topbar|top-bar|footer|bottom-bar|site-nav|site-header|site-footer/.test(c)){
        e.style.display='none';
      }
    });
    document.querySelectorAll('*').forEach(function(e){
      try{
        var s=window.getComputedStyle(e);
        if(s.position==='fixed'||s.position==='sticky'){
          var r=e.getBoundingClientRect();
          if((r.top<=10&&r.height<200)||(r.bottom>=window.innerHeight-10&&r.height<200)){
            e.style.display='none';
          }
        }
      }catch(ex){}
    });
    document.querySelectorAll('a').forEach(function(e){
      var t=e.textContent||'';
      if((t.indexOf('picDone')>=0||t.indexOf('其他功能')>=0||t.indexOf('👈')>=0)&&e.offsetHeight<120){
        var p=e.closest('nav,header,footer,[class*=nav],[class*=header],[class*=footer]');
        if(p)p.style.display='none';
        e.style.display='none';
      }
    });
    document.querySelectorAll('*').forEach(function(e){
      if(e.children.length===0&&(e.textContent||'').indexOf('其他功能')>=0){
        e.style.display='none';
      }
    });
  }
  hideUI();
  new MutationObserver(hideUI).observe(document.body||document.documentElement,{childList:true,subtree:true});
})()
`

// ============================================
// 主组件
// ============================================
export function ImageToolsTab() {
  const C = useThemeColors()
  const selectedTool = useObservable<string | null>(null)
  const imageUrl = useObservable<string>('')
  const selectedCategory = useObservable<string>('全部')
  const themeObs = useObservable<string>(getThemeMode())
  const isDark = themeObs.value === 'dark'
  const iconBg = isDark ? ICON_BG_DARK : ICON_BG_LIGHT

  const handleToggleTheme = () => {
    toggleTheme()
    themeObs.setValue(getThemeMode())
  }

  const openTool = async (toolId: string) => {
    if (_activeVC) { _activeVC.dispose(); _activeVC = null }
    const vc = new WebViewController()
    vc.shouldAllowRequest = async (req) => {
      const url = req.url
      return url.includes('picdone.com') || url.includes('weboio.com') || url.startsWith('data:') || url.startsWith('blob:')
    }
    const url = imageUrl.value.trim()
      ? `${TOOL_URL}${toolId}?pic=${encodeURIComponent(imageUrl.value.trim())}`
      : `${TOOL_URL}${toolId}`
    _activeVC = vc
    selectedTool.setValue(toolId)
    try {
      await vc.loadURL(url)
      await vc.evaluateJavaScript(INJECT_HIDE_UI)
    } catch (e) { console.error('WebView 加载失败:', String(e)) }
  }

  const closeTool = () => {
    if (_activeVC) { _activeVC.dispose(); _activeVC = null }
    selectedTool.setValue(null)
  }

  const currentTool = TOOLS.find(t => t.id === selectedTool.value)

  // ========== 工具列表视图 ==========
  if (!selectedTool.value) {
    const filteredTools = selectedCategory.value === '全部'
      ? TOOLS
      : TOOLS.filter(t => t.category === selectedCategory.value)
    const rows: ToolDef[][] = []
    for (let i = 0; i < filteredTools.length; i += 3) {
      rows.push(filteredTools.slice(i, i + 3))
    }

    return (
      <VStack>
        <ScrollView>
          <VStack
            spacing={14}
            padding={{ top: 20, bottom: 24, leading: 16, trailing: 16 }}
          >

            {/* 头部 */}
            <HStack alignment="center" padding={{ top: 24, leading: 20, trailing: 20 }}>
              <VStack spacing={2}>
                {/* @ts-ignore */}
                <Text foregroundColor={C.text} font="largeTitle" bold
                >🖼️ 图片工具箱</Text>
                {/* @ts-ignore */}
                <Text foregroundColor={C.text3} font="subheadline"
                >13+ 款免费工具 · 无需注册</Text>
              </VStack>
              <Spacer />
              <VStack
                onTapGesture={handleToggleTheme}
                frame={{ width: 44, height: 44 }}
                alignment="center"
                background={C.glass}
                cornerRadius={22}
                clipShape="capsule"
              >
                <Text font="title3">{isDark ? '☀️' : '🌙'}</Text>
              </VStack>
            </HStack>

            {/* URL 输入 — 玻璃胶囊 */}
            <VStack
              margin={{ leading: 20, trailing: 20 }}
              padding={{ horizontal: 16, vertical: 10 }}
              background={C.glass}
              cornerRadius={22}
              clipShape="capsule"
              stroke={C.glassBorder}
              strokeWidth={0.5}
            >
              <HStack alignment="center" spacing={10}>
                {/* @ts-ignore */}
                <Text font="callout" foregroundColor={C.blue2}>🔗</Text>
                <VStack spacing={0}>
                  <TextField title="图片链接" value={imageUrl} prompt="粘贴图片 URL（可选）" />
                </VStack>
                {imageUrl.value ? (
                  <VStack
                    onTapGesture={() => imageUrl.setValue('')}
                    padding={6}
                    background={C.glassActive}
                    cornerRadius={14}
                    clipShape="circle"
                  >
                    {/* @ts-ignore */}
                    <Text font="caption" foregroundColor={C.text3}>✕</Text>
                  </VStack>
                ) : null}
              </HStack>
            </VStack>

            {/* 分类筛选 — 与导航栏同款玻璃胶囊 */}
            <ScrollView axes="horizontal">
              <HStack padding={{ leading: 20, trailing: 20, vertical: 4 }} spacing={10} alignment="center">
                {CATEGORIES.map(cat => {
                  const active = cat === selectedCategory.value
                  return (
                    <VStack
                      key={cat}
                      onTapGesture={() => selectedCategory.setValue(cat)}
                      padding={{ horizontal: 20, vertical: 10 }}
                      background={active ? C.glassActive : C.glass}
                      cornerRadius={22}
                      clipShape="capsule"
                      stroke={active ? C.blue : C.glassBorder}
                      strokeWidth={active ? 1.5 : 0.5}
                    >
                      {/* @ts-ignore */}
                      <Text foregroundColor={active ? C.blue2 : C.text2}
                        font="footnote" bold={active}
                      >{cat}</Text>
                    </VStack>
                  )
                })}
              </HStack>
            </ScrollView>

            {/* 工具网格 — 每个工具都是玻璃胶囊卡片 */}
            <VStack spacing={12} padding={{ leading: 20, trailing: 20 }}>
              {rows.map((row, i) => (
                <HStack key={i} spacing={12} alignment="top">
                  {row.map(tool => (
                    <VStack
                      key={tool.id}
                      onTapGesture={() => openTool(tool.id)}
                      alignment="center"
                      spacing={8}
                      padding={{ vertical: 8 }}
                    >
                      <VStack
                        frame={{ width: 56, height: 56 }}
                        alignment="center"
                        background={iconBg[tool.id] || C.glassActive}
                        cornerRadius={28}
                        clipShape="circle"
                      >
                        <Text font="title2">{tool.icon}</Text>
                      </VStack>
                      {/* @ts-ignore */}
                      <Text foregroundColor={C.text}
                        font="caption" bold
                        multilineTextAlignment="center"
                      >{tool.name}</Text>
                    </VStack>
                  ))}
                </HStack>
              ))}
            </VStack>

            <VStack padding={{ bottom: 8 }} />
          </VStack>
        </ScrollView>
      </VStack>
    )
  }

  // ========== WebView 视图 ==========
  return (
    <VStack background={C.bg}>
      <HStack
        alignment="center"
        spacing={10}
        padding={{ top: 10, bottom: 8, leading: 16, trailing: 16 }}
        background={C.glass}
        clipShape="capsule"
        stroke={C.glassBorder}
        strokeWidth={0.5}
      >
        <VStack
          onTapGesture={closeTool}
          padding={{ horizontal: 14, vertical: 8 }}
          background={C.glassActive}
          cornerRadius={22}
          clipShape="capsule"
        >
          {/* @ts-ignore */}
          <Text foregroundColor={C.blue2} font="footnote" bold>← 返回</Text>
        </VStack>
        <Text font="title3">{currentTool?.icon || '🔧'}</Text>
        {/* @ts-ignore */}
        <Text foregroundColor={C.text} font="footnote" bold
        >{currentTool?.name || '工具'}</Text>
        <Spacer />
      </HStack>

      {_activeVC ? (
        <WebView controller={_activeVC} />
      ) : (
        <VStack alignment="center" spacing={8} padding={{ top: 60 }}>
          <Text font="title">⏳</Text>
          {/* @ts-ignore */}
          <Text foregroundColor={C.text2} font="callout">加载中...</Text>
        </VStack>
      )}
    </VStack>
  )
}
