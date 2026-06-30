// ImageToolsTab.tsx - 图片工具箱（高端美化版）
// picDone 内嵌 WebView + 精美工具网格

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
import { T } from '../theme'

// ============================================
// 工具定义
// ============================================
type ToolDef = {
  id: string
  icon: string
  name: string
  bg: string
  category: string
}

const TOOLS: ToolDef[] = [
  { id: 'compress', icon: '🗜️', name: '图片压缩', bg: 'rgba(96,165,250,0.35)', category: '处理' },
  { id: 'resize', icon: '📐', name: '调整尺寸', bg: 'rgba(74,222,128,0.35)', category: '处理' },
  { id: 'crop', icon: '✂️', name: '裁剪', bg: 'rgba(192,132,252,0.35)', category: '处理' },
  { id: 'convert', icon: '🔄', name: '格式转换', bg: 'rgba(251,146,60,0.35)', category: '处理' },
  { id: 'remove-bg', icon: '🪄', name: '智能去背', bg: 'rgba(244,114,182,0.35)', category: 'AI' },
  { id: 'id-photo', icon: '🪪', name: '证件照', bg: 'rgba(248,113,113,0.35)', category: 'AI' },
  { id: 'filter', icon: '🎨', name: '滤镜增强', bg: 'rgba(52,211,153,0.35)', category: '编辑' },
  { id: 'editor', icon: '✏️', name: '简易编辑', bg: 'rgba(251,191,36,0.35)', category: '编辑' },
  { id: 'social-size', icon: '📱', name: '社交尺寸', bg: 'rgba(56,189,248,0.35)', category: '处理' },
  { id: 'viewer', icon: '🔍', name: '图片查看', bg: 'rgba(148,163,184,0.35)', category: '工具' },
  { id: 'favicon', icon: '🌐', name: 'Favicon', bg: 'rgba(251,146,60,0.35)', category: '工具' },
  { id: 'exif', icon: '📋', name: 'EXIF 编辑', bg: 'rgba(167,139,250,0.35)', category: '工具' },
  { id: 'watermark', icon: '💧', name: '水印', bg: 'rgba(129,140,248,0.35)', category: '编辑' },
]

const CATEGORIES = ['全部', '处理', 'AI', '编辑', '工具']

const TOOL_URL = 'https://picdone.com/zh/tools/'

// ============================================
// 模块级 WebViewController 引用
// ============================================
let _activeVC: WebViewController | null = null

// ============================================
// 注入脚本：隐藏 picDone 头部/底部/内部导航
// ============================================
const INJECT_HIDE_UI = `
(function(){
  function hideUI(){
    // 隐藏 header / nav / footer 标签
    ['HEADER','NAV','FOOTER'].forEach(function(t){
      document.querySelectorAll(t).forEach(function(e){e.style.display='none';});
    });
    // 隐藏 class 含关键词的元素
    document.querySelectorAll('*').forEach(function(e){
      var c=String(e.className||'').toLowerCase();
      if(/header|navbar|nav-bar|topbar|top-bar|footer|bottom-bar|site-nav|site-header|site-footer/.test(c)){
        e.style.display='none';
      }
    });
    // 隐藏 fixed/sticky 定位的顶部/底部栏
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
    // 隐藏含 picDone 或 其他功能 的链接栏
    document.querySelectorAll('a').forEach(function(e){
      var t=e.textContent||'';
      if((t.indexOf('picDone')>=0||t.indexOf('其他功能')>=0||t.indexOf('👈')>=0)&&e.offsetHeight<120){
        var p=e.closest('nav,header,footer,[class*=nav],[class*=header],[class*=footer]');
        if(p)p.style.display='none';
        e.style.display='none';
      }
    });
    // 隐藏含 "其他功能" 文字的任何元素
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
  const selectedTool = useObservable<string | null>(null)
  const imageUrl = useObservable<string>('')
  const selectedCategory = useObservable<string>('全部')

  // 打开工具
  const openTool = async (toolId: string) => {
    if (_activeVC) {
      _activeVC.dispose()
      _activeVC = null
    }

    const vc = new WebViewController()

    vc.shouldAllowRequest = async (req) => {
      const url = req.url
      return (
        url.includes('picdone.com') ||
        url.includes('weboio.com') ||
        url.startsWith('data:') ||
        url.startsWith('blob:')
      )
    }

    const url = imageUrl.value.trim()
      ? `${TOOL_URL}${toolId}?pic=${encodeURIComponent(imageUrl.value.trim())}`
      : `${TOOL_URL}${toolId}`

    _activeVC = vc
    selectedTool.setValue(toolId)

    try {
      await vc.loadURL(url)
      await vc.evaluateJavaScript(INJECT_HIDE_UI)
    } catch (e) {
      console.error('WebView 加载失败:', String(e))
    }
  }

  // 返回
  const closeTool = () => {
    if (_activeVC) {
      _activeVC.dispose()
      _activeVC = null
    }
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
      <VStack
        // @ts-ignore
        background={T.bg}
      >
        <ScrollView>
          <VStack spacing={20}>

            {/* 优雅头部 */}
            <VStack
              alignment="center"
              spacing={6}
              padding={{ top: 24, bottom: 8, leading: 20, trailing: 20 }}
            >
              <Text
                // @ts-ignore
                foregroundColor={T.text}
                font="largeTitle"
                bold
              >
                🖼️ 图片工具箱
              </Text>
              <Text
                // @ts-ignore
                foregroundColor={T.text3}
                font="subheadline"
                multilineTextAlignment="center"
              >
                13+ 款免费工具 · 10 秒出图 · 无需注册
              </Text>
            </VStack>

            {/* URL 输入 */}
            <VStack
              margin={{ leading: 20, trailing: 20 }}
              padding={{ horizontal: 16, vertical: 12 }}
              // @ts-ignore
              background={T.surface}
              // @ts-ignore
              cornerRadius={16}
            >
              <HStack alignment="center" spacing={10}>
                <Text
                  font="callout"
                  // @ts-ignore
                  foregroundColor={T.blue2}
                >
                  🔗
                </Text>
                <VStack spacing={0}>
                  <TextField
                    title="图片链接"
                    value={imageUrl}
                    prompt="粘贴图片 URL（可选）"
                  />
                </VStack>
                {imageUrl.value ? (
                  <VStack
                    onTapGesture={() => imageUrl.setValue('')}
                    padding={6}
                    // @ts-ignore
                    background={T.surface2}
                    // @ts-ignore
                    cornerRadius={12}
                  >
                    <Text
                      font="caption"
                      // @ts-ignore
                      foregroundColor={T.text3}
                    >
                      ✕
                    </Text>
                  </VStack>
                ) : null}
              </HStack>
            </VStack>

            {/* 分类筛选 */}
            <ScrollView axes="horizontal">
              <HStack
                padding={{ leading: 20, trailing: 20, vertical: 4 }}
                spacing={10}
                alignment="center"
              >
                {CATEGORIES.map(cat => {
                  const active = cat === selectedCategory.value
                  return (
                    <VStack
                      key={cat}
                      onTapGesture={() => selectedCategory.setValue(cat)}
                      padding={{ horizontal: 18, vertical: 8 }}
                      // @ts-ignore
                      background={active ? T.blue : 'rgba(255,255,255,0.08)'}
                      // @ts-ignore
                      cornerRadius={20}
                    >
                      <Text
                        // @ts-ignore
                        foregroundColor={active ? '#fff' : T.text2}
                        font="footnote"
                        bold={active}
                      >
                        {cat}
                      </Text>
                    </VStack>
                  )
                })}
              </HStack>
            </ScrollView>

            {/* 工具网格（3 列圆形图标） */}
            <VStack spacing={20} padding={{ leading: 16, trailing: 16 }}>
              {rows.map((row, i) => (
                <HStack key={i} spacing={0} alignment="top">
                  {row.map(tool => (
                    <VStack
                      key={tool.id}
                      onTapGesture={() => openTool(tool.id)}
                      alignment="center"
                      spacing={8}
                      padding={{ vertical: 4 }}
                      frame={{ width: 100 }}
                    >
                      {/* 圆形彩色底图 */}
                      <VStack
                        frame={{ width: 60, height: 60 }}
                        alignment="center"
                        // @ts-ignore
                        background={tool.bg}
                        // @ts-ignore
                        cornerRadius={30}
                      >
                        <Text font="title2">{tool.icon}</Text>
                      </VStack>
                      <Text
                        // @ts-ignore
                        foregroundColor={T.text}
                        font="caption"
                        bold
                        multilineTextAlignment="center"
                      >
                        {tool.name}
                      </Text>
                    </VStack>
                  ))}
                </HStack>
              ))}
            </VStack>

            {/* 底部安全区 */}
            <VStack padding={{ bottom: 24 }} />
          </VStack>
        </ScrollView>
      </VStack>
    )
  }

  // ========== WebView 工具视图 ==========
  return (
    <VStack
      // @ts-ignore
      background={T.bg}
      style={{ flex: 1 }}
    >
      {/* 精简工具栏 */}
      <HStack
        alignment="center"
        spacing={10}
        padding={{ top: 10, bottom: 8, leading: 16, trailing: 16 }}
        // @ts-ignore
        background={T.bg}
      >
        <VStack
          onTapGesture={closeTool}
          padding={{ horizontal: 12, vertical: 6 }}
          // @ts-ignore
          background={T.surface}
          // @ts-ignore
          cornerRadius={20}
        >
          <Text
            // @ts-ignore
            foregroundColor={T.blue2}
            font="footnote"
            bold
          >
            ← 返回
          </Text>
        </VStack>

        <Text font="title3">{currentTool?.icon || '🔧'}</Text>

        <Text
          // @ts-ignore
          foregroundColor={T.text}
          font="footnote"
          bold
        >
          {currentTool?.name || '工具'}
        </Text>

        <Spacer />
      </HStack>

      {/* 内嵌 WebView */}
      {_activeVC ? (
        <WebView controller={_activeVC} />
      ) : (
        <VStack alignment="center" spacing={8} padding={{ top: 60 }}>
          <Text font="title">⏳</Text>
          <Text
            // @ts-ignore
            foregroundColor={T.text2}
            font="callout"
          >
            加载中...
          </Text>
        </VStack>
      )}
    </VStack>
  )
}
