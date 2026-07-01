/**
 * 米游社自动助手 v3.0.0
 * 功能：自动米游币任务、原神签到
 */

import { NavigationStack, Navigation, Script, Notification, Widget } from 'scripting'
import { MainPage } from './ui/main-page'
import { executeMiCoinTasks } from './src/micoin'
import { executeSignTasks } from './src/sign'
import { getConfig, addLog, sendNotification } from './src/utils'
import { isLoggedIn } from './src/utils'

/**
 * 主函数 - 程序入口
 */
async function main() {
  // 检查是否由通知触发（定时自动执行）
  if (Notification.current) {
    await autoExecuteTasks()
    Script.exit()
    return
  }

  // 正常模式：显示主界面
  await Navigation.present(
    <NavigationStack>
      <MainPage />
    </NavigationStack>
  )
  // 用户关闭 UI 后释放资源，避免后台脚本堆积
  Script.exit()
}

/**
 * 通知触发时自动执行任务
 */
async function autoExecuteTasks() {
  addLog('info', '===== 定时自动执行 =====')

  if (!isLoggedIn()) {
    sendNotification('米游社自动助手', '自动执行失败：未登录')
    return
  }

  const config = getConfig()
  const results: string[] = []

  try {
    // 有启用的子任务就执行
    if (config.micoin.actions.length > 0) {
      const r = await executeMiCoinTasks()
      results.push(r.message)
    }
    if (config.signGames.length > 0) {
      const r = await executeSignTasks()
      results.push(r.message)
    }

    const summary = results.join('\n') || '没有执行的任务'
    sendNotification('米游社自动助手', `自动执行完成\n${summary}`)
  } catch (e: any) {
    sendNotification('米游社自动助手', `自动执行失败: ${e.message}`)
  }
}

// 执行主函数
main()
