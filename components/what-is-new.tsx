/**
 * 🆕 更新内容弹窗 
 *
 * · 读取 release-notes.md 文件内容
 * · 用内容哈希检测变更，仅在版本更新后首次打开时弹出
 * · Sheet 半屏展示，Markdown 渲染
 */

import {
  NavigationStack,
  ScrollView,
  Markdown,
  Path,
  Script,
  useState,
  useEffect,
} from "scripting"

declare const Storage: any
declare const FileManager: any

const RELEASE_NOTES_FILE = "release-notes.md"
const STORAGE_KEY = "caiyun:release-notes:last-seen-hash"

function normalizeMarkdown(content: string): string {
  return content.replace(/\r\n/g, "\n").trim()
}

function hashString(value: string): string {
  let hash = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16)
}

/**
 * 更新内容 Sheet Hook
 * 返回 sheet 配置，挂到 NavigationStack 的 sheet prop 上即可
 */
export function useReleaseNotesSheet() {
  const [content, setContent] = useState("")
  const [contentHash, setContentHash] = useState("")
  const [isPresented, setIsPresented] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const filePath = Path.join(Script.directory, RELEASE_NOTES_FILE)
        const exists = await FileManager.exists(filePath)
        if (!exists) return
        const raw = await FileManager.readAsString(filePath)
        const text = normalizeMarkdown(raw)
        if (!text) return
        const h = hashString(text)
        const lastSeen = Storage.get(STORAGE_KEY)
        if (lastSeen === h) return
        setContent(text)
        setContentHash(h)
        setIsPresented(true)
      } catch (e) {
        console.log("更新日志加载失败:", e)
      }
    }
    load()
  }, [])

  function onChanged(presented: boolean) {
    if (!presented && contentHash) {
      Storage.set(STORAGE_KEY, contentHash)
    }
    setIsPresented(presented)
  }

  return {
    isPresented,
    onChanged,
    sheet: {
      isPresented,
      onChanged,
      content: (
        <NavigationStack presentationBackground="clear">
          <ScrollView
            background="clear"
            scrollContentBackground="hidden"
            navigationTitle="更新内容"
            navigationBarTitleDisplayMode="inline"
            toolbarBackgroundVisibility="hidden"
            presentationDragIndicator="visible"
            presentationDetents={["medium", "large"]}
            presentationBackground="clear"
            padding={{ top: 24, leading: 18, bottom: 18, trailing: 18 }}
          >
            <Markdown
              content={content}
              theme="basic"
              useDefaultHighlighterTheme
              scrollable={false}
              background="clear"
            />
          </ScrollView>
        </NavigationStack>
      ),
    },
  }
}
