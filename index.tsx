import { Script, WebView } from "scripting"

/**
 * 主函数 - 全屏地图 WebView
 */
async function run() {
  // 创建 WebViewController（全局类，无需导入）
  const controller = new WebViewController()
  
  // 加载地图页面
  await controller.loadURL("https://loc567.com/map")
  
  // 全屏展示 WebView
  await controller.present({ 
    fullscreen: true,
    navigationTitle: '虚拟位置定位'
  })
  
  // 释放资源
  controller.dispose()
  Script.exit()
}

run()
