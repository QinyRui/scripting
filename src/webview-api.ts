/**
 * 米游社自动助手 - WebView API 调用模块
 *
 * 核心问题：
 * evaluateJavaScript 不自动 unwrap async Promise，导致异步 IIFE 返回 null。
 *
 * 解决方案：
 * 使用同步 XMLHttpRequest (XHR) 代替 async fetch。
 * 同步 XHR 在 WKWebView 中会阻塞 JS 线程直到请求完成，
 * evaluateJavaScript 能直接获取同步返回值。
 *
 * 流程：
 * 1. 创建 WebView 并导航到 miyoushe.com
 * 2. 展示 WebView（激活 JS 上下文）
 * 3. 在 WebView 中执行同步 XHR 调用 API
 * 4. 解析 JSON 结果并返回
 * 5. 任务完成后关闭 WebView
 */

/** WebView 实例缓存 */
let cachedWebView: WebViewController | null = null

/** WebView 是否已展示 */
let isPresented = false

/**
 * 获取或创建 WebView 实例
 * 创建后会自动展示，以激活 JS 上下文
 */
async function getWebView(): Promise<WebViewController> {
  if (cachedWebView) {
    return cachedWebView
  }

  const vc = new WebViewController()
  console.log('[WebView API] 创建 WebView，正在加载米游社页面...')

  const loaded = await vc.loadURL('https://miyoushe.com/ys/')
  if (!loaded) {
    vc.dispose()
    throw new Error('WebView 加载米游社页面失败')
  }

  // 等待页面加载完成
  await vc.waitForLoad()
  console.log('[WebView API] 页面加载完成，正在激活...')

  // 展示 WebView 以激活 JS 上下文（不 await，让它在后台展示）
  vc.present({ navigationTitle: '米游社任务执行中...' })
  isPresented = true

  // 等待展示完成 + JS 上下文激活
  await new Promise<void>(r => setTimeout(r, 1500))

  // 验证 JS 上下文是否可用
  try {
    const testResult = await vc.evaluateJavaScript<string>("return 'ok'")
    console.log(`[WebView API] JS 上下文测试: ${testResult}`)
  } catch (e) {
    console.log(`[WebView API] JS 上下文测试失败: ${e}`)
  }

  console.log('[WebView API] WebView 已激活')
  cachedWebView = vc
  return vc
}

/**
 * 通过 WebView 执行同步 GET 请求
 * 使用同步 XHR 确保 evaluateJavaScript 能获取返回值
 * @param url 完整的 API URL
 * @returns 解析后的 JSON 数据
 */
export async function webViewGet<T = any>(url: string): Promise<T> {
  console.log(`[WebView GET] ${url}`)

  const vc = await getWebView()

  // 使用同步 XHR，evaluateJavaScript 可以直接获取返回值
  const result = await vc.evaluateJavaScript<{
    ok: boolean
    status: number
    data: any
    error?: string
  }>(`
    (function() {
      try {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', '${url}', false);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.withCredentials = true;
        xhr.timeout = 15000;
        xhr.send();
        if (xhr.status >= 200 && xhr.status < 300) {
          var json = JSON.parse(xhr.responseText);
          return { ok: true, status: xhr.status, data: json };
        } else {
          return { ok: false, status: xhr.status, data: null, error: 'HTTP ' + xhr.status + ': ' + xhr.responseText.substring(0, 200) };
        }
      } catch (e) {
        return { ok: false, status: 0, data: null, error: e.message || String(e) };
      }
    })()
  `)

  if (!result || !result.ok) {
    const errMsg = result?.error || 'evaluateJavaScript 返回空结果'
    console.log(`[WebView GET] 错误: ${errMsg}`)
    throw new Error(errMsg)
  }

  const data = result.data
  console.log(`[WebView GET] retcode: ${data?.retcode}, message: ${data?.message}`)

  if (data?.retcode !== 0) {
    const error = new Error(data?.message || `API 请求失败: ${data?.retcode}`)
    ;(error as any).retcode = data?.retcode
    throw error
  }

  return data?.data
}

/**
 * 通过 WebView 执行同步 POST 请求
 * 使用同步 XHR 确保 evaluateJavaScript 能获取返回值
 * @param url 完整的 API URL
 * @param body 请求体对象
 * @returns 解析后的 JSON 数据
 */
export async function webViewPost<T = any>(url: string, body?: any): Promise<T> {
  console.log(`[WebView POST] ${url}`)
  if (body) console.log(`[Body] ${JSON.stringify(body)}`)

  const vc = await getWebView()

  // 将 body 嵌入为 JS 对象字面量
  const bodyLiteral = body ? JSON.stringify(body) : 'null'

  // 使用同步 XHR 发送 POST 请求
  const result = await vc.evaluateJavaScript<{
    ok: boolean
    status: number
    data: any
    error?: string
  }>(`
    (function() {
      try {
        var reqBody = ${bodyLiteral};
        var bodyStr = reqBody ? JSON.stringify(reqBody) : '';
        var xhr = new XMLHttpRequest();
        xhr.open('POST', '${url}', false);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.withCredentials = true;
        xhr.timeout = 15000;
        xhr.send(bodyStr);
        if (xhr.status >= 200 && xhr.status < 300) {
          var json = JSON.parse(xhr.responseText);
          return { ok: true, status: xhr.status, data: json };
        } else {
          return { ok: false, status: xhr.status, data: null, error: 'HTTP ' + xhr.status + ': ' + xhr.responseText.substring(0, 200) };
        }
      } catch (e) {
        return { ok: false, status: 0, data: null, error: e.message || String(e) };
      }
    })()
  `)

  if (!result || !result.ok) {
    const errMsg = result?.error || 'evaluateJavaScript 返回空结果'
    console.log(`[WebView POST] 错误: ${errMsg}`)
    throw new Error(errMsg)
  }

  const data = result.data
  console.log(`[WebView POST] retcode: ${data?.retcode}, message: ${data?.message}`)

  if (data?.retcode !== 0) {
    const error = new Error(data?.message || `API 请求失败: ${data?.retcode}`)
    ;(error as any).retcode = data?.retcode
    throw error
  }

  return data?.data
}

/**
 * 通过 WebView 执行 POST 请求（带重试）
 */
export async function webViewPostWithRetry<T = any>(
  url: string,
  body?: any,
  retries: number = 2
): Promise<T> {
  try {
    return await webViewPost<T>(url, body)
  } catch (error: any) {
    if (retries > 0 && (error.retcode === -500001 || error.retcode === -101)) {
      console.log(`[WebView POST] 重试中... (${retries} 次剩余)`)
      await new Promise<void>(r => setTimeout(r, 2000))
      return await webViewPostWithRetry<T>(url, body, retries - 1)
    }
    throw error
  }
}

/**
 * 通过 WebView 执行 GET 请求（带重试）
 */
export async function webViewGetWithRetry<T = any>(
  url: string,
  retries: number = 2
): Promise<T> {
  try {
    return await webViewGet<T>(url)
  } catch (error: any) {
    if (retries > 0 && (error.retcode === -500001 || error.retcode === -101)) {
      console.log(`[WebView GET] 重试中... (${retries} 次剩余)`)
      await new Promise<void>(r => setTimeout(r, 2000))
      return await webViewGetWithRetry<T>(url, retries - 1)
    }
    throw error
  }
}

/**
 * 释放 WebView 资源
 * 任务完成后调用：先关闭展示，再销毁实例
 */
export function disposeWebView(): void {
  if (cachedWebView) {
    try {
      if (isPresented) {
        cachedWebView.dismiss()
        isPresented = false
      }
      cachedWebView.dispose()
    } catch (e) {
      console.log(`[WebView API] 释放时出错: ${e}`)
    }
    cachedWebView = null
    console.log('[WebView API] WebView 已释放')
  }
}
