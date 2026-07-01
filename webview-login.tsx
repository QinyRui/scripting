/**
 * 米游社自动助手 - 登录入口（独立脚本）
 *
 * 运行此脚本打开登录页面，支持：
 * 1. WebView 获取 Cookie
 * 2. 手动输入 Stoken
 * 3. 验证并保存
 */

import { NavigationStack, Navigation } from 'scripting'
import { LoginPage } from './src/login-page'

async function main() {
  Navigation.present(
    <NavigationStack>
      <LoginPage />
    </NavigationStack>
  )
}

main()
