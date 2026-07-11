import {
  Script,
  Navigation,
  NavigationStack,
  List,
  Button,
  Text,
  Section,
  useState,
  TextField,
  HStack,
  VStack,
  Spacer,
  Image,
  fetch,
  GeometryReader,
  RoundedRectangle,
  ZStack,
  Circle,
  ProgressView,
  useColorScheme,
  gradient,
  ScrollView,
  Rectangle,
  TabView,
  Label,
  useObservable,
} from "scripting"

// 自定义提示函数
const showAlert = async (title: string, message: string) => {
  console.log(`[提示] ${title}: ${message}`)
  // Scripting 中 Dialog 是全局对象，不需要导入
  // @ts-ignore
  await Dialog.alert({
    title,
    message,
    buttonLabel: "确定"
  })
}
declare function openurl(url: string): void
declare const DocumentPicker: any
declare const FileManager: any
declare const Shell: any
declare const Storage: any

// GitHub 配置
interface GitHubConfig {
  repoUrl: string
  token: string
  branch: string
  author: {
    name: string
    email: string
  }
}

// 设置页面组件（Sheet 形式，实时自动保存）
function SettingsView(props: {
  repoUrl: string
  token: string
  branch: string
  authorName: string
  authorEmail: string
  commitMessage: string
  onRepoUrlChange: (value: string) => void
  onTokenChange: (value: string) => void
  onBranchChange: (value: string) => void
  onAuthorNameChange: (value: string) => void
  onAuthorEmailChange: (value: string) => void
  onCommitMessageChange: (value: string) => void
}) {
  const dismiss = Navigation.useDismiss()

  // 每个输入框维护独立本地 state，防止键盘收起时被父组件重绘覆盖
  const [localToken, setLocalToken] = useState(props.token)
  const [localRepoUrl, setLocalRepoUrl] = useState(props.repoUrl)
  const [localAuthorName, setLocalAuthorName] = useState(props.authorName)
  const [localBranch, setLocalBranch] = useState(props.branch)
  const [localAuthorEmail, setLocalAuthorEmail] = useState(props.authorEmail)
  const [localCommitMessage, setLocalCommitMessage] = useState(props.commitMessage)

  // 创建文件夹相关状态
  const [folderPath, setFolderPath] = useState("")
  const [folderTargetBranch, setFolderTargetBranch] = useState("")
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)

  // 创建分支相关状态
  const [newBranchName, setNewBranchName] = useState("")
  const [sourceBranchName, setSourceBranchName] = useState("")
  const [isCreatingBranch, setIsCreatingBranch] = useState(false)

  // 删除分支相关状态
  const [deleteBranchName, setDeleteBranchName] = useState("")
  const [isDeletingBranch, setIsDeletingBranch] = useState(false)

  // 包装函数：同时更新本地 state + 通知父组件持久化
  const updateToken = (v: string) => { setLocalToken(v); props.onTokenChange(v) }
  const updateRepoUrl = (v: string) => { setLocalRepoUrl(v); props.onRepoUrlChange(v) }
  const updateAuthorName = (v: string) => { setLocalAuthorName(v); props.onAuthorNameChange(v) }
  const updateBranch = (v: string) => { setLocalBranch(v); props.onBranchChange(v) }
  const updateAuthorEmail = (v: string) => { setLocalAuthorEmail(v); props.onAuthorEmailChange(v) }
  const updateCommitMessage = (v: string) => { setLocalCommitMessage(v); props.onCommitMessageChange(v) }

  // 解析 owner/repo 辅助函数
  function parseOwnerRepo() {
    let ownerStr = props.authorName
    let repoStr = "scripting"
    const cleanedUrl = props.repoUrl.replace(/\s+/g, "").replace(".git", "")
    if (cleanedUrl.includes("github.com/")) {
      const parts = cleanedUrl.split("github.com/")[1].split("/")
      if (parts.length >= 2) {
        ownerStr = parts[0]
        repoStr = parts[1]
      }
    }
    return { owner: ownerStr, repo: repoStr }
  }

  const headers = () => ({
    "Authorization": `Bearer ${props.token}`,
    "Accept": "application/vnd.github.v3+json",
    "User-Agent": "Scripting-App",
  })

  // 在 GitHub 上创建文件夹（通过创建 .gitkeep 占位文件）
  const handleCreateFolder = async () => {
    if (!props.repoUrl || !props.token || !props.authorName) {
      await showAlert("配置不完整", "请先填写仓库 URL、Token 和仓库所有者")
      return
    }
    const path = folderPath.trim().replace(/^\/+|\/+$/g, "")
    if (!path) {
      await showAlert("路径为空", "请输入要创建的文件夹路径")
      return
    }

    const targetBranch = folderTargetBranch.trim() || props.branch || "main"
    const actualBranch = targetBranch.includes("/") ? targetBranch.split("/")[0] : targetBranch
    const { owner, repo } = parseOwnerRepo()
    const targetPath = `${path}/.gitkeep`
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${targetPath}`

    setIsCreatingFolder(true)
    try {
      let existingSha: string | null = null
      try {
        const checkRes = await fetch(url + `?ref=${actualBranch}`, { headers: headers() })
        if (checkRes.ok) {
          const data = await checkRes.json()
          existingSha = data.sha
        }
      } catch {}

      const body: any = {
        message: `Create folder: ${path}`,
        content: "",
        branch: actualBranch
      }
      if (existingSha) {
        body.sha = existingSha
        body.message = `Update folder placeholder: ${path}`
      }

      const putRes = await fetch(url, {
        method: "PUT",
        headers: { ...headers(), "Content-Type": "application/json" },
        body: JSON.stringify(body)
      })

      if (!putRes.ok) {
        const errText = await putRes.text()
        throw new Error(`API 错误: ${putRes.status} ${errText}`)
      }

      await showAlert("创建成功", `已在 ${actualBranch} 分支创建文件夹：\n${path}/`)
      setFolderPath("")
    } catch (error) {
      await showAlert("创建失败", String(error))
    } finally {
      setIsCreatingFolder(false)
    }
  }

  // 在 GitHub 上创建新分支
  const handleCreateBranch = async () => {
    if (!props.repoUrl || !props.token || !props.authorName) {
      await showAlert("配置不完整", "请先填写仓库 URL、Token 和仓库所有者")
      return
    }
    const branchName = newBranchName.trim()
    if (!branchName) {
      await showAlert("分支名为空", "请输入新分支的名称")
      return
    }
    // 分支名不能包含空格等非法字符
    if (/[\s~^:?*\[\\]|\.\.|\.lock$|^-|^\//.test(branchName) || branchName.endsWith("/")) {
      await showAlert("分支名无效", "分支名不能包含空格、~、^、:、?、*、[、\\，不能以 . 开头，不能以 .lock 结尾，不能以 / 结尾")
      return
    }

    const source = (sourceBranchName.trim() || props.branch || "main")
    const { owner, repo } = parseOwnerRepo()

    setIsCreatingBranch(true)
    try {
      // 1. 获取源分支最新 commit SHA
      const refUrl = `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${source}`
      const refRes = await fetch(refUrl, { headers: headers() })
      if (!refRes.ok) {
        const errText = await refRes.text()
        throw new Error(`获取源分支 "${source}" 失败: ${refRes.status} ${errText}`)
      }
      const refData = await refRes.json()
      const commitSha = refData.object?.sha
      if (!commitSha) {
        throw new Error("无法获取源分支的 commit SHA")
      }

      // 2. 创建新分支引用
      const createUrl = `https://api.github.com/repos/${owner}/${repo}/git/refs`
      const createRes = await fetch(createUrl, {
        method: "POST",
        headers: { ...headers(), "Content-Type": "application/json" },
        body: JSON.stringify({
          ref: `refs/heads/${branchName}`,
          sha: commitSha
        })
      })

      if (!createRes.ok) {
        const errText = await createRes.text()
        throw new Error(`创建分支失败: ${createRes.status} ${errText}`)
      }

      await showAlert("创建成功", `已从 "${source}" 创建新分支：\n${branchName}`)
      setNewBranchName("")
    } catch (error) {
      await showAlert("创建失败", String(error))
    } finally {
      setIsCreatingBranch(false)
    }
  }

  // 删除仓库中的分支
  const handleDeleteBranch = async () => {
    if (!props.repoUrl || !props.token || !props.authorName) {
      await showAlert("配置不完整", "请先填写仓库 URL、Token 和仓库所有者")
      return
    }
    const branchToDelete = deleteBranchName.trim()
    if (!branchToDelete) {
      await showAlert("分支名为空", "请输入要删除的分支名称")
      return
    }

    // 安全检查：不能删除主分支（main/master）
    const protectedBranches = ["main", "master", "develop"]
    if (protectedBranches.includes(branchToDelete.toLowerCase())) {
      await showAlert("操作被阻止", `\"${branchToDelete}\" 是受保护的主分支，不能删除！\n\n只能删除功能分支或临时分支。`)
      return
    }

    const { owner, repo } = parseOwnerRepo()
    const url = `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branchToDelete}`

    setIsDeletingBranch(true)
    try {
      // 步骤 1：验证分支是否存在
      console.log(`[删除分支] 尝试删除分支: ${branchToDelete}`)
      const checkRes = await fetch(url, { headers: headers() })
      if (!checkRes.ok) {
        const errText = await checkRes.text()
        let errorMsg = `分支不存在或获取失败: ${checkRes.status}`
        if (checkRes.status === 404) {
          errorMsg += "\n\n可能的原因："
          errorMsg += "\n1. 分支名称拼写错误（区分大小写）"
          errorMsg += "\n2. 分支已被删除"
          errorMsg += "\n3. 仓库中没有这个分支"
          errorMsg += `\n\n尝试的分支: ${branchToDelete}`
        }
        throw new Error(errorMsg + "\n\nAPI 原始错误: " + errText)
      }

      // 步骤 2：确认删除（显示警告）
      const confirmMessage = `⚠️ 警告：此操作不可逆！\n\n确定要删除分支 \"${branchToDelete}\" 吗？\n\n删除后将无法恢复。`
      // @ts-ignore
      const confirmResult = await Dialog.confirm({
        title: "确认删除分支",
        message: confirmMessage,
        confirmLabel: "确认删除",
        cancelLabel: "取消"
      })

      if (!confirmResult) {
        setIsDeletingBranch(false)
        return
      }

      // 步骤 3：执行删除
      const deleteRes = await fetch(url, {
        method: "DELETE",
        headers: headers()
      })

      if (!deleteRes.ok) {
        const errText = await deleteRes.text()
        throw new Error(`删除失败: ${deleteRes.status} ${errText}`)
      }

      await showAlert("删除成功", `已成功删除分支：\n${branchToDelete}`)
      setDeleteBranchName("")
    } catch (error) {
      await showAlert("删除失败", String(error))
    } finally {
      setIsDeletingBranch(false)
    }
  }

  return (
    <NavigationStack>
      <List
        navigationTitle="设置"
        navigationBarTitleDisplayMode="inline"
        toolbar={{
          topBarLeading: [
            <Button title="完成" systemImage="checkmark" action={dismiss} />
          ],
        }}
      >
        {/* 凭证配置 */}
        <Section
          header={<SectionHeader title="凭证配置" />}
          footer={
            <Text
              attributedString={`[生成 GitHub Classic Token →](https://github.com/settings/tokens/new)`}
              foregroundStyle="tertiaryLabel"
              font="caption"
            />
          }
        >
          <TextField
            title="访问令牌 Token"
            value={localToken}
            onChanged={updateToken}
          />
          <TextField
            title="仓库所有者"
            value={localAuthorName}
            onChanged={updateAuthorName}
          />
          <TextField
            title="仓库 URL"
            value={localRepoUrl}
            onChanged={updateRepoUrl}
          />
          <TextField
            title="默认分支 / 目录路径"
            value={localBranch}
            onChanged={updateBranch}
          />
          <TextField
            title="提交邮箱"
            value={localAuthorEmail}
            onChanged={updateAuthorEmail}
          />
        </Section>

        {/* 提交信息 */}
        <Section
          header={<SectionHeader title="提交信息" />}
          footer={
            <Text font="caption" foregroundStyle="tertiaryLabel">
              自定义 Git 提交说明，留空则使用默认格式。
            </Text>
          }
        >
          <TextField
            title="提交说明文字"
            value={localCommitMessage}
            prompt="提交说明文字"
            onChanged={updateCommitMessage}
          />
        </Section>

        {/* ═══════ 仓库操作 ═══════ */}
        <Section
          header={<SectionHeader title="在 GitHub 创建文件夹" />}
          footer={
            <Text font="caption" foregroundStyle="tertiaryLabel">
              在指定分支中创建文件夹（自动生成 .gitkeep 占位文件）。
            </Text>
          }
        >
          <TextField
            title="文件夹路径"
            value={folderPath}
            prompt="例如 images/wallpapers"
            onChanged={setFolderPath}
          />
          <TextField
            title="目标分支（留空用默认）"
            value={folderTargetBranch}
            prompt={props.branch || "main"}
            onChanged={setFolderTargetBranch}
          />
          <Button
            title={isCreatingFolder ? "创建中…" : "创建文件夹"}
            systemImage="folder.badge.plus"
            disabled={!folderPath.trim() || isCreatingFolder}
            action={handleCreateFolder}
          />
        </Section>

        <Section
          header={<SectionHeader title="在 GitHub 创建分支" />}
          footer={
            <Text font="caption" foregroundStyle="tertiaryLabel">
              基于源分支创建新分支，新分支将包含源分支的最新代码。
            </Text>
          }
        >
          <TextField
            title="新分支名称"
            value={newBranchName}
            prompt="例如 feature/login"
            onChanged={setNewBranchName}
          />
          <TextField
            title="源分支（留空用默认）"
            value={sourceBranchName}
            prompt={props.branch || "main"}
            onChanged={setSourceBranchName}
          />
          <Button
            title={isCreatingBranch ? "创建中…" : "创建分支"}
            systemImage="arrow.triangle.branch"
            disabled={!newBranchName.trim() || isCreatingBranch}
            action={handleCreateBranch}
          />
        </Section>

        {/* 删除分支 */}
        <Section
          header={<SectionHeader title="删除分支" />}
          footer={
            <Text font="caption" foregroundStyle="tertiaryLabel">
              ⚠️ 此操作不可逆，分支将被永久删除。主分支（main/master/develop）受保护无法删除。
            </Text>
          }
        >
          <TextField
            title="分支名称"
            value={deleteBranchName}
            prompt="例如 photos, feature/xxx"
            onChanged={setDeleteBranchName}
          />
          <Button
            title={isDeletingBranch ? "删除中…" : "删除分支"}
            systemImage="trash"
            tint="systemRed"
            disabled={!deleteBranchName.trim() || isDeletingBranch}
            action={handleDeleteBranch}
          />
        </Section>
      </List>
    </NavigationStack>
  )
}

// 上传历史记录
interface UploadRecord {
  filename: string
  timestamp: string
}

interface SelectedEntry {
  fullPath: string
  relativePath: string
  /** 可选：每文件独立的目标分支/目录路径覆盖（格式: "branch" 或 "branch/path"），为空则使用全局默认 */
  targetBranch?: string
}

function getLastPathComponent(path: string) {
  return path.split("/").filter(Boolean).pop() || ""
}

function getParentDirectory(path: string) {
  const parts = path.split("/").filter(Boolean)
  if (parts.length <= 1) return ""
  return "/" + parts.slice(0, -1).join("/")
}

function getCommonDirectory(paths: string[]) {
  if (paths.length === 0) return ""

  const splitDirs = paths.map((path) => getParentDirectory(path).split("/").filter(Boolean))
  const minLength = Math.min(...splitDirs.map((parts) => parts.length))
  const commonParts: string[] = []

  for (let index = 0; index < minLength; index++) {
    const current = splitDirs[0][index]
    if (splitDirs.every((parts) => parts[index] === current)) {
      commonParts.push(current)
    } else {
      break
    }
  }

  return commonParts.length > 0 ? "/" + commonParts.join("/") : ""
}

function buildRelativeUploadPath(filePath: string, commonDirectory: string) {
  const normalizedCommon = commonDirectory.endsWith("/") ? commonDirectory : `${commonDirectory}/`
  if (commonDirectory && filePath.startsWith(normalizedCommon)) {
    return filePath.slice(normalizedCommon.length)
  }
  return filePath.split("/").pop() || "unknown"
}

async function listDirectoryEntries(directoryPath: string): Promise<string[]> {
  // 根据文档，使用 FileManager.readDirectory
  if (typeof FileManager?.readDirectory === "function") {
    try {
      const result = await FileManager.readDirectory(directoryPath)
      return Array.isArray(result) ? result : []
    } catch (e) {
      console.log(`[listDirectoryEntries] readDirectory 失败: ${e}`)
    }
  }

  // 兼容旧版本
  if (typeof FileManager?.listContents === "function") {
    try {
      const result = await FileManager.listContents(directoryPath)
      return Array.isArray(result) ? result : []
    } catch (e) {
      console.log(`[listDirectoryEntries] listContents 失败: ${e}`)
    }
  }

  if (typeof FileManager?.contentsOfDirectory === "function") {
    try {
      const result = await FileManager.contentsOfDirectory(directoryPath)
      return Array.isArray(result) ? result : []
    } catch (e) {
      console.log(`[listDirectoryEntries] contentsOfDirectory 失败: ${e}`)
    }
  }

  return []
}

async function pathExists(path: string) {
  if (typeof FileManager?.exists === "function") {
    return await FileManager.exists(path)
  }
  if (typeof FileManager?.fileExists === "function") {
    return await FileManager.fileExists(path)
  }
  return true
}

async function isDirectory(path: string) {
  if (typeof FileManager?.isDirectory === "function") {
    return await FileManager.isDirectory(path)
  }

  // 兼容方案：尝试读取目录内容
  try {
    const entries = await listDirectoryEntries(path)
    return entries.length >= 0
  } catch {
    return false
  }
}

async function scanFolderRecursively(
  rootPath: string,
  currentPath = rootPath,
  options?: { keepTopLevelFolderName?: boolean }
): Promise<SelectedEntry[]> {
  const entries = await listDirectoryEntries(currentPath)
  const files: SelectedEntry[] = []
  const rootFolderName = getLastPathComponent(rootPath)

  for (const entryName of entries) {
    const nextPath = currentPath.endsWith("/") ? `${currentPath}${entryName}` : `${currentPath}/${entryName}`
    
    if (!(await pathExists(nextPath))) {
      continue
    }

    if (await isDirectory(nextPath)) {
      const nestedFiles = await scanFolderRecursively(rootPath, nextPath, options)
      files.push(...nestedFiles)
      continue
    }

    const rawRelativePath = nextPath.startsWith(`${rootPath}/`)
      ? nextPath.slice(rootPath.length + 1)
      : nextPath.split("/").pop() || entryName

    const relativePath = options?.keepTopLevelFolderName && rootFolderName
      ? `${rootFolderName}/${rawRelativePath}`
      : rawRelativePath

    files.push({
      fullPath: nextPath,
      relativePath,
    })
  }

  return files
}

// --- pip翻译 风格：极简 Section u6807u9898 ---

function SectionHeader({ title }: { title: string }) {
  return (
    <HStack frame={{ maxWidth: "infinity" }} alignment="center">
      <Spacer />
      <Text font="subheadline" fontWeight="semibold" foregroundStyle="systemTeal">
        {title}
      </Text>
      <Spacer />
    </HStack>
  )
}

// --- Rime-Wanxiang 风格：网格按钮 ---

function GridButton(props: {
  title: string;
  icon: string;
  disabled?: boolean;
  color?: string;
  onPress: () => void;
}) {
  const colorScheme = useColorScheme();
  const haptic = () => {
    try {
      (globalThis as any).HapticFeedback?.mediumImpact?.();
    } catch {}
  };
  const tintColor: any = props.disabled
    ? "secondaryLabel"
    : (props.color ?? "systemBlue");
  const darkCardFill: any = props.disabled
    ? "rgba(58,58,60,0.72)"
    : (props.color === "#32ADE6"
      ? "rgba(50,173,230,0.18)"
      : "rgba(58,58,60,0.96)");
  return (
    <Button
      action={() => {
        haptic();
        props.onPress();
      }}
      disabled={props.disabled}
      buttonStyle="plain"
      tint={tintColor}
      frame={{ maxWidth: "infinity", minHeight: 72 }}
    >
      {colorScheme === "dark" ? (
        <ZStack
          frame={{ maxWidth: "infinity", minHeight: 72, maxHeight: "infinity" }}
          background={"rgba(0,0,0,0.001)"}
        >
          <RoundedRectangle
            cornerRadius={16}
            fill={darkCardFill}
            frame={{
              maxWidth: "infinity",
              minHeight: 72,
              maxHeight: "infinity",
            }}
          />
          <VStack
            spacing={3}
            frame={{
              maxWidth: "infinity",
              minHeight: 72,
              maxHeight: "infinity",
            }}
            padding={{ top: 6, bottom: 6, leading: 6, trailing: 6 }}
          >
            <Spacer />
            <Image
              systemName={props.icon}
              font="title2"
              frame={{ height: 22 }}
              foregroundStyle={tintColor}
            />
            <Text
              font="footnote"
              frame={{
                maxWidth: "infinity",
                minHeight: 16,
                alignment: "center" as any,
              }}
              lineLimit={2}
              multilineTextAlignment="center"
              foregroundStyle={tintColor}
            >
              {props.title}
            </Text>
            <Spacer />
          </VStack>
        </ZStack>
      ) : (
        <VStack
          spacing={0}
          frame={{ maxWidth: "infinity", minHeight: 72, maxHeight: "infinity" }}
          background={{
            style: "secondarySystemBackground",
            shape: { type: "rect", cornerRadius: 16 },
          }}
        >
          <VStack
            spacing={3}
            frame={{
              maxWidth: "infinity",
              minHeight: 72,
              maxHeight: "infinity",
            }}
            padding={{ top: 6, bottom: 6, leading: 6, trailing: 6 }}
            background={"rgba(0,0,0,0.001)"}
          >
            <Spacer />
            <Image
              systemName={props.icon}
              font="title2"
              frame={{ height: 22 }}
              foregroundStyle={tintColor}
            />
            <Text
              font="footnote"
              frame={{
                maxWidth: "infinity",
                minHeight: 16,
                alignment: "center" as any,
              }}
              lineLimit={2}
              multilineTextAlignment="center"
              foregroundStyle={tintColor}
            >
              {props.title}
            </Text>
            <Spacer />
          </VStack>
        </VStack>
      )}
    </Button>
  );
}

// --- 文件条目组件 ---

type FileEntryStatus = "pending" | "uploading" | "success" | "error";

function FileEntryRow(props: {
  entry: SelectedEntry;
  previewPath: string;
  status: FileEntryStatus;
  progress?: number;
  index: number;
  onTargetChange: (index: number, value: string) => void;
  onRemove: (index: number) => void;
}) {
  const { entry, previewPath, status, progress, index, onTargetChange, onRemove } = props;
  const hasCustom = Boolean(entry.targetBranch?.trim());
  // 仅在 pending 状态下允许删除，避免上传中、成功或失败后误删
  const canRemove = status === "pending";

  const handleRemove = () => {
    // 给用户一个触觉反馈，遵循 HIG 的破坏性操作反馈
    try {
      (globalThis as any).HapticFeedback?.mediumImpact?.();
    } catch {}
    onRemove(index);
  };
  
  const statusIcon = () => {
    switch (status) {
      case "uploading": return "arrow.triangle.2.circlepath";
      case "success": return "checkmark.circle.fill";
      case "error": return "xmark.circle.fill";
      default: return hasCustom ? "arrow.triangle.branch" : "doc.text.fill";
    }
  };
  
  const statusColor = () => {
    switch (status) {
      case "uploading": return "systemBlue";
      case "success": return "systemGreen";
      case "error": return "systemRed";
      default: return hasCustom ? "systemTeal" : "secondaryLabel";
    }
  };
  
  const levelColor = () => {
    if (status === "success") return "systemGreen";
    if (status === "error") return "systemRed";
    if (status === "uploading") return "systemBlue";
    return "systemBlue";
  };
  
  return (
    <VStack
      spacing={4}
      padding={{ top: 4, bottom: 4, leading: 0, trailing: 0 }}
      frame={{ maxWidth: "infinity" }}
    >
      {/* 第一行：时间戳、状态标签 */}
      <HStack spacing={8}>
        <Text font="footnote" foregroundStyle="secondaryLabel">
          {new Date().toLocaleTimeString("zh-CN", { hour12: false })}
        </Text>
        <Text font="footnote" foregroundStyle={levelColor()}>
          [{status.toUpperCase()}]
        </Text>
        <Spacer />
      </HStack>
      
      {/* 第二行：图标、文件名、删除按钮 */}
      <HStack spacing={8} alignment="center">
        <Image
          systemName={statusIcon()}
          font="body"
          foregroundStyle={statusColor()}
        />
        <VStack spacing={1} frame={{ maxWidth: "infinity" }}>
          <Text
            font="body"
            frame={{ maxWidth: "infinity" }}
            multilineTextAlignment="leading"
            selectionDisabled={false}
          >
            {entry.relativePath}
          </Text>
          <Text
            font="caption2"
            foregroundStyle="tertiaryLabel"
            frame={{ maxWidth: "infinity" }}
            multilineTextAlignment="leading"
          >
            → {previewPath}
          </Text>
        </VStack>
        {canRemove ? (
          <Button
            buttonStyle="plain"
            tint="systemRed"
            frame={{ width: 32, height: 32 }}
            action={handleRemove}
          >
            <Image
              systemName="xmark.circle.fill"
              font="title3"
              foregroundStyle="systemRed"
            />
          </Button>
        ) : null}
      </HStack>
      
      {/* 目标输入框 */}
      <TextField
        title={hasCustom ? "✦ 已覆盖默认目标" : "目标（留空用默认）"}
        value={entry.targetBranch || ""}
        onChanged={(val: string) => onTargetChange(index, val)}
      />
      
      {/* 进度条 */}
      {status === "uploading" && (
        <VStack spacing={4}>
          <HStack alignment="center" spacing={8}>
            <Text frame={{ alignment: "leading" }}>上传中</Text>
            {typeof progress === "number" ? (
              <ProgressView
                value={progress}
                total={1}
                progressViewStyle="linear"
                frame={{ maxWidth: "infinity" }}
              />
            ) : (
              <ProgressView
                progressViewStyle="linear"
                frame={{ maxWidth: "infinity" }}
              />
            )}
            <Text>{progress != null ? `${(progress * 100).toFixed(1)}%` : ""}</Text>
          </HStack>
        </VStack>
      )}
    </VStack>
  );
}

// --- 板块渐变过渡背景色配置 ---

const SECTION_GRADIENTS: [string, string][] = [
  ["rgba(13,148,136,0.08)", "rgba(13,140,160,0.04)"],       // 设置：青→青蓝
  ["rgba(13,140,160,0.08)", "rgba(13,110,180,0.04)"],       // 文件队列：青蓝→蓝
  ["rgba(50,173,230,0.10)", "rgba(50,173,230,0.04)"],
  ["rgba(50,80,200,0.06)", "rgba(90,60,200,0.04)"],         // 上传历史：靛蓝→紫蓝
];

function SectionGradientBg({
  index,
  children,
}: {
  index: number;
  children: any;
}) {
  const colors = SECTION_GRADIENTS[index] || SECTION_GRADIENTS[0];
  return (
    <VStack
      spacing={0}
      frame={{ maxWidth: "infinity" }}
      padding={{ top: 8, bottom: 8, leading: 12, trailing: 12 }}
      // @ts-ignore
      background={gradient("linear", {
        colors: colors,
        startPoint: "top",
        endPoint: "bottom",
      }) as any}
      // @ts-ignore
      mask={<RoundedRectangle cornerRadius={12} fill="black" />}
    >
      {children}
    </VStack>
  );
}

// --- pip翻译 风格：渐变 Hero 卡片 ---

function HeroCard({
  repoName,
  branch,
  configReady,
  selectedCountText,
  githubIconPath,
}: {
  repoName: string
  branch: string
  configReady: boolean
  selectedCountText: string
  githubIconPath: string
}) {
  return (
    <VStack
      padding={16}
      spacing={14}
      // @ts-ignore
      background={gradient("linear", {
        colors: ["rgba(13,148,136,0.35)", "rgba(50,173,230,0.2)", "rgba(88,86,214,0.12)"],
        startPoint: "topLeading",
        endPoint: "bottomTrailing",
      }) as any}
      // @ts-ignore
      mask={<RoundedRectangle cornerRadius={16} fill="black" />}
    >
      {/* 彩色 GitHub Logo + 仓库名 */}
      <VStack spacing={10} alignment="center">
        <ZStack alignment="center">
          {/* 外层彩色光晕环 */}
          <Circle fill="rgba(13,148,136,0.35)" frame={{ width: 84, height: 84 }} />
          {/* 中层半透明底 */}
          <Circle fill="rgba(255,255,255,0.12)" frame={{ width: 70, height: 70 }} />
          {/* GitHub Logo（从 GitHub 加载）*/}
          <Image imageUrl="https://raw.githubusercontent.com/QinyRui/scripting/Github%E5%B7%A5%E5%85%B7%E7%AE%B1/L.PNG" resizable={true} frame={{ width: 60, height: 60 }} />
        </ZStack>
        <Text font="title3" fontWeight="bold" foregroundStyle="white">{repoName || "未配置仓库"}</Text>
      </VStack>

      {/* 分隔线 */}
      <VStack frame={{ maxWidth: "infinity", height: 1 }} background="rgba(255,255,255,0.1)" />

      {/* 信息网格 2×2 */}
      <HStack spacing={10}>
        <HStack spacing={4} alignment="center" frame={{ maxWidth: "infinity" }}
          padding={{ vertical: 6, horizontal: 8 }}
          // @ts-ignore
          background="rgba(255,255,255,0.08)"
          // @ts-ignore
          mask={<RoundedRectangle cornerRadius={10} fill="black" />}
        >
          <Image systemName="arrow.triangle.branch" font="caption" foregroundStyle="rgba(255,200,100,1)" />
          <VStack spacing={0} frame={{ maxWidth: "infinity" }}>
            <Text font="caption2" foregroundStyle="rgba(255,255,255,0.45)">分支</Text>
            <Text font="footnote" foregroundStyle="white" lineLimit={1}>{branch || "main"}</Text>
          </VStack>
        </HStack>
        <HStack spacing={4} alignment="center" frame={{ maxWidth: "infinity" }}
          padding={{ vertical: 6, horizontal: 8 }}
          // @ts-ignore
          background="rgba(255,255,255,0.08)"
          // @ts-ignore
          mask={<RoundedRectangle cornerRadius={10} fill="black" />}
        >
          <Circle fill={configReady ? "systemGreen" : "systemOrange"} frame={{ width: 8, height: 8 }} />
          <VStack spacing={0} frame={{ maxWidth: "infinity" }}>
            <Text font="caption2" foregroundStyle="rgba(255,255,255,0.45)">状态</Text>
            <Text font="footnote" foregroundStyle="white">{configReady ? "就绪" : "待配置"}</Text>
          </VStack>
        </HStack>
      </HStack>

      <HStack spacing={10}>
        <HStack spacing={4} alignment="center" frame={{ maxWidth: "infinity" }}
          padding={{ vertical: 6, horizontal: 8 }}
          // @ts-ignore
          background="rgba(255,255,255,0.08)"
          // @ts-ignore
          mask={<RoundedRectangle cornerRadius={10} fill="black" />}
        >
          <Image systemName="doc.text.fill" font="caption" foregroundStyle="rgba(100,180,255,1)" />
          <VStack spacing={0} frame={{ maxWidth: "infinity" }}>
            <Text font="caption2" foregroundStyle="rgba(255,255,255,0.45)">文件</Text>
            <Text font="footnote" foregroundStyle="white" lineLimit={1}>{selectedCountText}</Text>
          </VStack>
        </HStack>
        <HStack spacing={4} alignment="center" frame={{ maxWidth: "infinity" }}
          padding={{ vertical: 6, horizontal: 8 }}
          // @ts-ignore
          background="rgba(255,255,255,0.08)"
          // @ts-ignore
          mask={<RoundedRectangle cornerRadius={10} fill="black" />}
        >
          <Image systemName="folder.fill" font="caption" foregroundStyle="rgba(180,120,255,1)" />
          <VStack spacing={0} frame={{ maxWidth: "infinity" }}>
            <Text font="caption2" foregroundStyle="rgba(255,255,255,0.45)">路径</Text>
            <Text font="footnote" foregroundStyle="white" lineLimit={1}>{repoName}</Text>
          </VStack>
        </HStack>
      </HStack>
    </VStack>
  )
}

// ═══════ 凭证配置图形化图标按钮 ═══════

function CredentialIcon(props: {
  icon: string
  label: string
  value: string
  color: string
  isPresented: boolean
  onShow: () => void
  onHide: () => void
  popoverTitle: string
  placeholder: string
  onChanged: (v: string) => void
}) {
  const hasValue = Boolean(props.value.trim())
  const displayValue = props.label === "Token"
    ? (hasValue ? props.value.slice(0, 6) + "••••" : "")
    : (props.value.length > 10 ? props.value.slice(0, 10) + "…" : props.value)

  return (
    <Button
      buttonStyle="plain"
      action={props.onShow}
      frame={{ maxWidth: "infinity" }}
      popover={{
        isPresented: props.isPresented,
        onChanged: (v: boolean) => { if (!v) props.onHide() },
        presentationCompactAdaptation: 'popover',
        arrowEdge: 'top' as any,
        content: (
          <VStack
            spacing={10}
            padding={16}
            frame={{ width: 280 }}
            // @ts-ignore
            background="rgba(35,35,35,0.95)"
            // @ts-ignore
            mask={<RoundedRectangle cornerRadius={16} fill="black" />}
          >
            <HStack spacing={8} alignment="center">
              <ZStack alignment="center">
                <Circle fill={`${props.color}33` as any} frame={{ width: 32, height: 32 }} />
                <Image systemName={props.icon} font="body" foregroundStyle={props.color as any} />
              </ZStack>
              <Text font="headline" foregroundStyle="white">{props.popoverTitle}</Text>
            </HStack>
            <TextField title={props.popoverTitle} value={props.value} prompt={props.placeholder} onChanged={props.onChanged} />
            <Text font="caption" foregroundStyle="tertiaryLabel">
              {hasValue ? `当前: ${props.value.length > 30 ? props.value.slice(0, 30) + "…" : props.value}` : "尚未配置"}
            </Text>
          </VStack>
        )
      }}
    >
      <VStack
        spacing={6}
        alignment="center"
        padding={{ vertical: 12, horizontal: 4 }}
        frame={{ maxWidth: "infinity" }}
      >
        <ZStack alignment="center">
          <Circle fill={`${props.color}20` as any} frame={{ width: 44, height: 44 }} />
          <Image systemName={props.icon} font="title3" foregroundStyle={props.color as any} />
        </ZStack>
        <Text font="caption" foregroundStyle="label" lineLimit={1}>{props.label}</Text>
        <HStack spacing={3} alignment="center">
          <Circle fill={hasValue ? "systemGreen" : "systemRed"} frame={{ width: 5, height: 5 }} />
          <Text font="caption2" foregroundStyle="secondaryLabel" lineLimit={1}>
            {hasValue ? (props.label === "Token" ? "已配置" : displayValue || "已配置") : "未配置"}
          </Text>
        </HStack>
      </VStack>
    </Button>
  )
}

function View() {
  const dismiss = Navigation.useDismiss()
  
  // 状态管理
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [selectedEntries, setSelectedEntries] = useState<SelectedEntry[]>([])
  const [uploadHistory, setUploadHistory] = useState<UploadRecord[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [keepTopLevelFolderName, setKeepTopLevelFolderName] = useState(true)
  const [githubIconPath, setGithubIconPath] = useState("")

  // 上传弹窗相关状态
  const [showUploadPopup, setShowUploadPopup] = useState(false)
  const [uploadLogs, setUploadLogs] = useState<string[]>([])
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "success" | "error">("idle")

  // Tab 页切换
  const mainTabIndex = useObservable<number>(0)

  // 创建文件夹相关状态
  const [folderPath, setFolderPath] = useState("")
  const [folderTargetBranch, setFolderTargetBranch] = useState("")
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)

  // 创建分支相关状态
  const [newBranchName, setNewBranchName] = useState("")
  const [sourceBranchName, setSourceBranchName] = useState("")
  const [isCreatingBranch, setIsCreatingBranch] = useState(false)

  // 删除分支相关状态
  const [deleteBranchName, setDeleteBranchName] = useState("")
  const [isDeletingBranch, setIsDeletingBranch] = useState(false)

  // 凭证弹窗状态
  const [editingField, setEditingField] = useState<string | null>(null)

  // 添加上传日志的辅助函数
  const addUploadLog = (log: string) => {
    const timestamp = new Date().toLocaleTimeString("zh-CN", { hour12: false })
    setUploadLogs(prev => [...prev, `${timestamp} ${log}`])
  }
  
  // 初始化：下载 GitHub 图标到本地缓存
  useState(() => {
    const iconPath = FileManager.temporaryDirectory + "/github-icon.png";
    (async () => {
      try {
        // 如果已缓存则跳过
        const exists = typeof FileManager?.exists === "function" ? await FileManager.exists(iconPath) : false;
        if (exists) {
          setGithubIconPath(iconPath);
          return;
        }
        const res = await fetch("https://github.githubassets.com/images/modules/logos_page/GitHub-Mark-Light.png");
        if (res.ok) {
          // @ts-ignore
          const data = await res.data();
          if (data && typeof FileManager?.write === "function") {
            await FileManager.write(iconPath, data);
            setGithubIconPath(iconPath);
          }
        }
      } catch (e) {
        console.log("[GitHub Icon] 下载失败:", e);
      }
    })();
  });
  
  // GitHub 配置状态，初始化时从 Storage 中读取持久化数据
  const savedConfig = typeof Storage !== "undefined" ? Storage.get("github_uploader_config") || {} : {};
  const [repoUrl, setRepoUrlRaw] = useState(savedConfig.repoUrl || "")
  const [token, setTokenRaw] = useState(savedConfig.token || "")
  const [branch, setBranchRaw] = useState(savedConfig.branch || "main")
  const [authorName, setAuthorNameRaw] = useState(savedConfig.authorName || "")
  const [authorEmail, setAuthorEmailRaw] = useState(savedConfig.authorEmail || "")
  const [commitMessage, setCommitMessageRaw] = useState(savedConfig.commitMessage || "")


  // 自动保存辅助：更新 state 同时立即写入 Storage
  function persistConfig(patch: Record<string, any>) {
    const merged = {
      repoUrl, token, branch, authorName, authorEmail, commitMessage,
      ...patch,
    }
    if (typeof Storage !== "undefined") {
      Storage.set("github_uploader_config", merged)
    }
  }
  const setRepoUrl = (v: string) => { setRepoUrlRaw(v); persistConfig({ repoUrl: v }) }
  const setToken = (v: string) => { setTokenRaw(v); persistConfig({ token: v }) }
  const setBranch = (v: string) => { setBranchRaw(v); persistConfig({ branch: v }) }
  const setAuthorName = (v: string) => { setAuthorNameRaw(v); persistConfig({ authorName: v }) }
  const setAuthorEmail = (v: string) => { setAuthorEmailRaw(v); persistConfig({ authorEmail: v }) }
  const setCommitMessage = (v: string) => { setCommitMessageRaw(v); persistConfig({ commitMessage: v }) }

  const repoName = repoUrl
    ? repoUrl.replace(/\s+/g, "").replace(".git", "").split("github.com/")[1]?.split("/").slice(0, 2).join("/") || "未识别仓库"
    : "未配置仓库"
  const selectedCountText = selectedEntries.length === 0 ? "未选择文件" : `已选 ${selectedEntries.length} 个文件`
  const configReady = Boolean(repoUrl && token && authorName && authorEmail)
  const commonDirectory = selectedFiles.length > 1 ? getCommonDirectory(selectedFiles) : getParentDirectory(selectedFiles[0] || "")

  /** 解析分支字符串，返回 { actualBranch, uploadPrefix } */
  function parseBranchTarget(branchStr: string) {
    const actualBranch = branchStr.includes("/") ? branchStr.split("/")[0] : branchStr
    const uploadPrefix = branchStr.includes("/") ? branchStr.split("/").slice(1).join("/").replace(/^\/|\/$/g, "") : ""
    return { actualBranch, uploadPrefix }
  }

  /** 获取文件的有效目标分支/目录路径（优先使用 per-file 覆盖，否则用全局默认） */
  function getEffectiveBranch(entry: SelectedEntry): string {
    return entry.targetBranch?.trim() || branch
  }

  // 预计算上传目标路径参数（复用上传逻辑）
  const { actualBranch: previewActualBranch, uploadPrefix: previewUploadPrefix } = parseBranchTarget(branch)
  const previewOwner = (() => {
    const cleaned = repoUrl.replace(/\s+/g, "").replace(".git", "")
    if (cleaned.includes("github.com/")) {
      return cleaned.split("github.com/")[1]?.split("/")[0] || authorName
    }
    return authorName
  })()
  const previewRepo = (() => {
    const cleaned = repoUrl.replace(/\s+/g, "").replace(".git", "")
    if (cleaned.includes("github.com/")) {
      return cleaned.split("github.com/")[1]?.split("/")[1] || "scripting"
    }
    return "scripting"
  })()

  function buildPreviewPath(entry: SelectedEntry): string {
    const effective = getEffectiveBranch(entry)
    const { actualBranch: entryBranch, uploadPrefix: entryPrefix } = parseBranchTarget(effective)
    const base = entryPrefix ? `${entryPrefix}/${entry.relativePath}` : entry.relativePath
    return `${previewOwner}/${previewRepo}@${entryBranch}/${base}`
  }

  // 选择文件
  const handlePickFiles = async () => {
    try {
      const files = await DocumentPicker.pickFiles({
        allowsMultipleSelection: true,
      })
      if (files && files.length > 0) {
        const normalizedEntries = files.map((filePath: string) => ({
          fullPath: filePath,
          relativePath: buildRelativeUploadPath(filePath, files.length > 1 ? getCommonDirectory(files) : getParentDirectory(filePath)),
        }))
        setSelectedFiles(files)
        setSelectedEntries(normalizedEntries)
      }
    } catch (error) {
      await showAlert("选择文件失败", String(error))
    }
  }

  const handlePickFolder = async () => {
    try {
      const folderPath = await DocumentPicker.pickDirectory()

      if (!folderPath) {
        return
      }

      // 验证选择的路径是否为目录
      const isDir = await isDirectory(folderPath)
      
      if (!isDir) {
        await showAlert("选择错误", "请选择一个文件夹，而不是文件")
        return
      }

      const folderFiles = await scanFolderRecursively(folderPath, folderPath, {
        keepTopLevelFolderName,
      })
      
      if (folderFiles.length === 0) {
        await showAlert("文件夹为空", "选中的文件夹中没有可上传的文件")
        return
      }

      setSelectedFiles(folderFiles.map((entry) => entry.fullPath))
      setSelectedEntries(folderFiles)
      await showAlert("选择成功", `已选择 ${folderFiles.length} 个文件`)
    } catch (error) {
      await showAlert("选择文件夹失败", String(error))
    }
  }

  // 从相册选择照片
  const handlePickPhotos = async () => {
    try {
      const results = await Photos.pick({
        limit: 20,
        filter: PHPickerFilter.images(),
      })

      if (!results || results.length === 0) return

      const filePaths: string[] = []
      for (const result of results) {
        const path = await result.imagePath()
        if (path) filePaths.push(path)
      }

      if (filePaths.length === 0) {
        await showAlert("无有效照片", "未能获取所选照片的文件路径")
        return
      }

      const normalizedEntries = filePaths.map((filePath: string) => {
        const fileName = filePath.split("/").pop() || "photo.jpg"
        return {
          fullPath: filePath,
          relativePath: `photos/${fileName}`,
        }
      })

      setSelectedFiles(filePaths)
      setSelectedEntries(normalizedEntries)
      await showAlert("选择成功", `已从相册选择 ${filePaths.length} 张照片`)
    } catch (error) {
      await showAlert("选择照片失败", String(error))
    }
  }

  // 上传到 GitHub
  const handleUpload = async () => {
    // 验证配置
    if (!repoUrl || !token || !authorName || !authorEmail) {
      await showAlert("配置不完整", "请先填写 GitHub 仓库配置信息")
      return
    }

    if (selectedFiles.length === 0) {
      await showAlert("未选择文件", "请先选择要上传的文件")
      return
    }

    // 显示上传弹窗
    setShowUploadPopup(true)
    setUploadLogs([])
    setUploadStatus("uploading")
    addUploadLog("===== 开始执行任务 =====")
    addUploadLog(`准备上传 ${selectedEntries.length} 个文件到 GitHub`)

    setIsUploading(true)
    setUploadProgress(0)

    try {
      // 创建临时工作目录
      const workDir = FileManager.temporaryDirectory + "/github-upload-" + Date.now()
      await FileManager.createDirectory(workDir, true)

      // 使用 REST API 上传文件
      addUploadLog("正在连接 GitHub API...")

      let uploadCount = 0;

      // 提取 owner 和 repo
      let ownerStr = authorName;
      let repoStr = "scripting";

      const cleanedUrl = repoUrl.replace(/\s+/g, "").replace(".git", "");
      if (cleanedUrl.includes("github.com/")) {
        const parts = cleanedUrl.split("github.com/")[1].split("/");
        if (parts.length >= 2) {
          ownerStr = parts[0];
          repoStr = parts[1];
        }
      }

      addUploadLog(`目标仓库: ${ownerStr}/${repoStr}`)
      addUploadLog("")

      const uploadedFiles: UploadRecord[] = []

      for (const entry of selectedEntries) {
        const filePath = entry.fullPath
        const relativePath = entry.relativePath
        const filename = relativePath.split("/").pop() || "unknown"
        
        // 获取该文件的有效目标分支/目录路径
        const effectiveBranchStr = getEffectiveBranch(entry)
        let actualBranch = effectiveBranchStr;
        let uploadPath = "";

        if (effectiveBranchStr.includes("/")) {
          const branchParts = effectiveBranchStr.split("/");
          actualBranch = branchParts[0];
          uploadPath = branchParts.slice(1).join("/");
        }
        const normalizedUploadPath = uploadPath.replace(/^\/+|\/+$/g, "")
        
        addUploadLog(`上传文件: ${relativePath}`)
        addUploadLog(`  → 分支: ${actualBranch}, 目录: ${normalizedUploadPath || '(根)'}`)

        const fileData = await FileManager.readAsData(filePath)
        
        if (!fileData) {
           addUploadLog(`  ✗ 无法读取文件: ${filename}`)
           continue;
        }
        
        if (!token) {
           throw new Error("使用 API 上传时必须提供 Token。");
        }

        try {
          addUploadLog("  → 正在转换文件内容...")
          
          // @ts-ignore
          const base64Content = typeof fileData.toBase64String === "function" 
             // @ts-ignore
             ? fileData.toBase64String() 
             // @ts-ignore
             : (typeof fileData.toBase64 === "function" ? fileData.toBase64() : null); 
             
          if (!base64Content) {
            throw new Error("无法将文件数据转换为 base64 格式，API不支持");
          } 
          
          const targetPath = normalizedUploadPath
            ? `${normalizedUploadPath}/${relativePath}`
            : relativePath
          const url = `https://api.github.com/repos/${ownerStr}/${repoStr}/contents/${targetPath}`;
          
          // 尝试获取现有文件的 sha (如果已存在)
          let currentSha = null;
          try {
            addUploadLog("  → 检查文件是否存在...")
            const getRes = await fetch(url + `?ref=${actualBranch}`, {
              headers: {
                "Authorization": `Bearer ${token}`,
                "Accept": "application/vnd.github.v3+json",
                "User-Agent": "Scripting-App"
              }
            });
            if (getRes.ok) {
              const getData = await getRes.json();
              currentSha = getData.sha;
              addUploadLog("  → 文件已存在，将进行更新")
            }
          } catch (e) {
            addUploadLog("  → 文件不存在，将创建新文件")
          }

          const commitMsg = commitMessage.trim()
            ? commitMessage.trim()
            : `Upload ${filename} via iOS Scripting`;
          const body = {
            message: commitMsg,
            content: base64Content,
            branch: actualBranch,
            ...(currentSha ? { sha: currentSha } : {})
          };

          addUploadLog("  → 正在上传到 GitHub...")
          const putRes = await fetch(url, {
            method: "PUT",
            headers: {
              "Authorization": `Bearer ${token}`,
              "Accept": "application/vnd.github.v3+json",
              "User-Agent": "Scripting-App",
              "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
          });

          if (!putRes.ok) {
            const errBody = await putRes.text();
            throw new Error(`API 报错: ${putRes.status} ${errBody}`);
          }
          
          uploadCount++;
          setUploadProgress(uploadCount / selectedEntries.length);
          addUploadLog(`  ✓ 上传成功 [${uploadCount}/${selectedEntries.length}]`)
          addUploadLog("")
        } catch (apiError) {
           addUploadLog(`  ✗ 上传失败: ${apiError}`)
           throw new Error(`无法更新文件 ${filename}: ${apiError}`);
        }

        uploadedFiles.push({
          filename: relativePath,
          timestamp: new Date().toLocaleString("zh-CN"),
        })
      }

      // 更新上传历史
      setUploadHistory([...uploadedFiles, ...uploadHistory])
      
      // 清空选中的文件
      setSelectedFiles([])
      setSelectedEntries([])

      // 清理临时目录
      await FileManager.remove(workDir)

      // 统计使用了多少个不同的分支
      const branchSet = new Set(selectedEntries.map(e => getEffectiveBranch(e)))
      const branchCount = branchSet.size
      const branchInfo = branchCount > 1 
        ? `，分布在 ${branchCount} 个不同分支/路径` 
        : ""

      addUploadLog("===== 任务完成 =====")
      addUploadLog(`成功上传 ${uploadCount} 个文件${branchInfo}`)
      setUploadStatus("success")
    } catch (error) {
      console.error("上传流程崩溃:", error);
      addUploadLog("===== 任务失败 =====")
      addUploadLog(`错误: ${error}`)
      setUploadStatus("error")
    } finally {
      setIsUploading(false)
    }
  }

  /** 更新指定索引文件的目标分支/目录路径 */
  const updateEntryTargetBranch = (index: number, newTarget: string) => {
    setSelectedEntries(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], targetBranch: newTarget }
      return updated
    })
  }

  /** 从队列中删除指定索引的文件（仅 pending 状态调用） */
  const handleRemoveEntry = (index: number) => {
    setSelectedEntries(prev => prev.filter((_, i) => i !== index))
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  // 清空历史
  const handleClearHistory = () => {
    setUploadHistory([])
  }

  // ═══════ 设置页辅助函数 ═══════
  function parseOwnerRepo() {
    let ownerStr = authorName
    let repoStr = "scripting"
    const cleanedUrl = repoUrl.replace(/\s+/g, "").replace(".git", "")
    if (cleanedUrl.includes("github.com/")) {
      const parts = cleanedUrl.split("github.com/")[1].split("/")
      if (parts.length >= 2) {
        ownerStr = parts[0]
        repoStr = parts[1]
      }
    }
    return { owner: ownerStr, repo: repoStr }
  }

  const apiHeaders = () => ({
    "Authorization": `Bearer ${token}`,
    "Accept": "application/vnd.github.v3+json",
    "User-Agent": "Scripting-App",
  })

  // 创建文件夹
  const handleCreateFolder = async () => {
    if (!repoUrl || !token || !authorName) { await showAlert("配置不完整", "请先填写仓库 URL、Token 和仓库所有者"); return }
    const path = folderPath.trim().replace(/^\/+|\/+$/g, "")
    if (!path) { await showAlert("路径为空", "请输入要创建的文件夹路径"); return }
    const targetBranch = folderTargetBranch.trim() || branch || "main"
    const actualBranch = targetBranch.includes("/") ? targetBranch.split("/")[0] : targetBranch
    const { owner, repo } = parseOwnerRepo()
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}/.gitkeep`
    setIsCreatingFolder(true)
    try {
      let existingSha: string | null = null
      try {
        const checkRes = await fetch(url + `?ref=${actualBranch}`, { headers: apiHeaders() })
        if (checkRes.ok) { const data = await checkRes.json(); existingSha = data.sha }
      } catch {}
      const body: any = { message: `Create folder: ${path}`, content: "", branch: actualBranch }
      if (existingSha) { body.sha = existingSha; body.message = `Update folder placeholder: ${path}` }
      const putRes = await fetch(url, { method: "PUT", headers: { ...apiHeaders(), "Content-Type": "application/json" }, body: JSON.stringify(body) })
      if (!putRes.ok) { const errText = await putRes.text(); throw new Error(`API 错误: ${putRes.status} ${errText}`) }
      await showAlert("创建成功", `已在 ${actualBranch} 分支创建文件夹：\n${path}/`)
      setFolderPath("")
    } catch (error) { await showAlert("创建失败", String(error)) } finally { setIsCreatingFolder(false) }
  }

  // 创建分支
  const handleCreateBranch = async () => {
    if (!repoUrl || !token || !authorName) { await showAlert("配置不完整", "请先填写仓库 URL、Token 和仓库所有者"); return }
    const branchNam = newBranchName.trim()
    if (!branchNam) { await showAlert("分支名为空", "请输入新分支的名称"); return }
    if (/[\s~^:?*\[\\]|\.\.|\.lock$|^-|^\//.test(branchNam) || branchNam.endsWith("/")) { await showAlert("分支名无效", "分支名不能包含特殊字符"); return }
    const source = (sourceBranchName.trim() || branch || "main")
    const { owner, repo } = parseOwnerRepo()
    setIsCreatingBranch(true)
    try {
      const refRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${source}`, { headers: apiHeaders() })
      if (!refRes.ok) { const errText = await refRes.text(); throw new Error(`获取源分支 "${source}" 失败: ${refRes.status} ${errText}`) }
      const refData = await refRes.json()
      const commitSha = refData.object?.sha
      if (!commitSha) { throw new Error("无法获取源分支的 commit SHA") }
      const createRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs`, { method: "POST", headers: { ...apiHeaders(), "Content-Type": "application/json" }, body: JSON.stringify({ ref: `refs/heads/${branchNam}`, sha: commitSha }) })
      if (!createRes.ok) { const errText = await createRes.text(); throw new Error(`创建分支失败: ${createRes.status} ${errText}`) }
      await showAlert("创建成功", `已从 "${source}" 创建新分支：\n${branchNam}`)
      setNewBranchName("")
    } catch (error) { await showAlert("创建失败", String(error)) } finally { setIsCreatingBranch(false) }
  }

  // 删除分支
  const handleDeleteBranch = async () => {
    if (!repoUrl || !token || !authorName) { await showAlert("配置不完整", "请先填写仓库 URL、Token 和仓库所有者"); return }
    const branchToDelete = deleteBranchName.trim()
    if (!branchToDelete) { await showAlert("分支名为空", "请输入要删除的分支名称"); return }
    const { owner, repo } = parseOwnerRepo()
    const url = `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branchToDelete}`
    setIsDeletingBranch(true)
    try {
      const checkRes = await fetch(url, { headers: apiHeaders() })
      if (!checkRes.ok) { const errText = await checkRes.text(); throw new Error(`分支不存在或获取失败: ${checkRes.status}` + (checkRes.status === 404 ? `\n\n尝试的分支: ${branchToDelete}` : "") + "\n\nAPI 原始错误: " + errText) }
      // @ts-ignore
      const confirmResult = await Dialog.confirm({ title: "确认删除分支", message: `⚠️ 警告：此操作不可逆！\n\n确定要删除分支 "${branchToDelete}" 吗？`, confirmLabel: "确认删除", cancelLabel: "取消" })
      if (!confirmResult) { setIsDeletingBranch(false); return }
      const deleteRes = await fetch(url, { method: "DELETE", headers: apiHeaders() })
      if (!deleteRes.ok) { const errText = await deleteRes.text(); throw new Error(`删除失败: ${deleteRes.status} ${errText}`) }
      await showAlert("删除成功", `已成功删除分支：\n${branchToDelete}`)
      setDeleteBranchName("")
    } catch (error) { await showAlert("删除失败", String(error)) } finally { setIsDeletingBranch(false) }
  }


  return (
    <NavigationStack>
      <TabView selection={mainTabIndex}>
        {/* ═══════ Tab 0：主页 ═══════ */}
        <VStack tag={0} tabItem={<Label title="主页" systemImage="house.fill" />}>
          <ZStack frame={{ maxWidth: "infinity", maxHeight: "infinity" }}>
            <List
              navigationTitle="GitHub 上传"
              navigationBarTitleDisplayMode="inline"
              toolbar={{
                topBarLeading: [<Button title="关闭" systemImage="xmark" action={dismiss} />],
                topBarTrailing: [
                  <Image
                    filePath="github-mark-light.png"
                    resizable={true}
                    frame={{ width: 24, height: 24 }}
                  />
                ],
              }}
            >
        {/* ═══════ 头部仪表盘 ═══════ */}
        <Section>
          <HeroCard
            repoName={repoName}
            branch={branch}
            configReady={configReady}
            selectedCountText={selectedCountText}
            githubIconPath={githubIconPath}
          />
        </Section>

        {/* ═══════ 文件队列 ═══════ */}
        <Section
          header={<SectionHeader title="文件队列" />}
        >
          <SectionGradientBg index={1}>
            {/* 操作网格 - 2x2 布局 */}
            <VStack spacing={10} padding={{ top: 1, bottom: 1 }}>
              <HStack spacing={10} alignment="center">
                <VStack frame={{ maxWidth: "infinity" }}>
                  <GridButton
                    icon="doc.badge.plus"
                    title="从文件中选择"
                    color="systemBlue"
                    onPress={handlePickFiles}
                  />
                </VStack>
                <VStack frame={{ maxWidth: "infinity" }}>
                  <GridButton
                    icon="folder.badge.plus"
                    title="从文件夹中选择"
                    color="systemBlue"
                    onPress={handlePickFolder}
                  />
                </VStack>
              </HStack>
              <HStack spacing={10} alignment="center">
                <VStack frame={{ maxWidth: "infinity" }}>
                  <GridButton
                    icon="photo.on.rectangle"
                    title="从相册中选择"
                    color="systemPurple"
                    onPress={handlePickPhotos}
                  />
                </VStack>
                <VStack frame={{ maxWidth: "infinity" }}>
                  <GridButton
                    icon={keepTopLevelFolderName ? "folder.fill.badge.plus" : "folder.badge.minus"}
                    title={keepTopLevelFolderName ? "保留根目录名：开" : "保留根目录名：关"}
                    color={keepTopLevelFolderName ? "systemGreen" : "systemOrange"}
                    onPress={() => setKeepTopLevelFolderName(!keepTopLevelFolderName)}
                  />
                </VStack>
              </HStack>
            </VStack>
            <Text font="caption" foregroundStyle="tertiaryLabel">
              文件夹递归上传时，保留根目录名作为 GitHub 路径前缀。
            </Text>

            {/* 文件列表 */}
            {selectedEntries.length === 0 ? (
              <VStack alignment="leading" spacing={2}>
                <Text foregroundStyle="tertiaryLabel" font="subheadline">暂无文件</Text>
                <Text foregroundStyle="tertiaryLabel" font="caption">选择文件或文件夹后，将显示在此处</Text>
              </VStack>
            ) : (
              <VStack spacing={2}>
                {selectedEntries.map((entry, index) => {
                  const previewPath = buildPreviewPath(entry)
                  return (
                    <FileEntryRow
                      key={index}
                      entry={entry}
                      previewPath={previewPath}
                      status="pending"
                      index={index}
                      onTargetChange={updateEntryTargetBranch}
                      onRemove={handleRemoveEntry}
                    />
                  )
                })}
              </VStack>
            )}
          </SectionGradientBg>
        </Section>

      </List>

            {/* ═══════ 悬浮上传按钮 ═══════ */}
            <VStack frame={{ maxWidth: "infinity", maxHeight: "infinity" }} padding={{ bottom: 100 }}>
              <Spacer />
              <HStack frame={{ maxWidth: "infinity" }} alignment="center">
                <Spacer />
                <Button
                  action={() => handleUpload()}
                  disabled={selectedEntries.length === 0}
                  buttonStyle="plain"
                  clipShape="circle"
                  popover={{
                  isPresented: showUploadPopup,
                  onChanged: (v: boolean) => {
                    setShowUploadPopup(v)
                    if (!v) {
                      setUploadLogs([])
                      setUploadStatus("idle")
                    }
                  },
                  presentationCompactAdaptation: 'popover',
                  arrowEdge: 'top' as any,
                  content: (
                    <VStack
                      // @ts-ignore
                      background="rgba(35,35,35,0.95)"
                      // @ts-ignore
                      mask={<RoundedRectangle cornerRadius={20} fill="black" />}
                      // @ts-ignore
                      padding={{ vertical: 16, horizontal: 14 }}
                      spacing={8}
                      frame={{ width: 280 }}
                    >
                      <HStack spacing={10} alignment="center" frame={{ maxWidth: "infinity" }}>
                        <Image
                          systemName={uploadStatus === "uploading" ? "hourglass" : uploadStatus === "success" ? "checkmark.circle.fill" : uploadStatus === "error" ? "xmark.circle.fill" : "hourglass"}
                          font="title3"
                          foregroundStyle={uploadStatus === "success" ? "systemGreen" : uploadStatus === "error" ? "systemRed" : "systemBlue"}
                        />
                        <Text font="headline" foregroundStyle="white">
                          {uploadStatus === "uploading" ? "执行中..." : uploadStatus === "success" ? "任务完成" : uploadStatus === "error" ? "任务失败" : "准备中..."}
                        </Text>
                      </HStack>
                      {uploadStatus === "uploading" ? (
                        <VStack spacing={6} frame={{ maxWidth: "infinity" }}>
                          <ProgressView
                            value={uploadProgress}
                            total={1}
                            progressViewStyle="linear"
                            frame={{ maxWidth: "infinity" }}
                          />
                          <Text font="caption" foregroundStyle="secondaryLabel" frame={{ maxWidth: "infinity" }}>
                            {Math.round(uploadProgress * 100)}% 完成
                          </Text>
                        </VStack>
                      ) : null}
                      <ScrollView frame={{ height: 200 }}>
                        <VStack
                          spacing={4}
                          frame={{ maxWidth: "infinity" }}
                          padding={{ top: 8, bottom: 8, leading: 12, trailing: 12 }}
                          background="rgba(0,0,0,0.4)"
                          // @ts-ignore
                          mask={<RoundedRectangle cornerRadius={8} fill="black" />}
                        >
                          {uploadLogs.length === 0 ? (
                            <Text font="caption" foregroundStyle="tertiaryLabel">等待开始...</Text>
                          ) : (
                            [...uploadLogs].reverse().map((log: string, index: number) => (
                              <Text key={index} font="caption" foregroundStyle="white" selectionDisabled={false}>
                                {log}
                              </Text>
                            ))
                          )}
                        </VStack>
                      </ScrollView>
                      <Text font="caption" foregroundStyle="secondaryLabel" frame={{ maxWidth: "infinity" }}>
                        {uploadStatus === "uploading"
                          ? `上传中... ${Math.round(uploadProgress * 100)}%`
                          : uploadStatus === "success"
                            ? `✓ 成功上传 ${uploadHistory.length} 个文件`
                            : uploadStatus === "error"
                              ? "✗ 上传失败，请查看日志"
                              : ""
                        }
                      </Text>
                      {uploadStatus !== "uploading" ? (
                        <Button action={() => setShowUploadPopup(false)}>
                          <Text fontWeight="bold" foregroundStyle="systemGreen">确定</Text>
                        </Button>
                      ) : null}
                    </VStack>
                  )
                }}
                >
                  <ZStack alignment="center" frame={{ width: 56, height: 56 }}>
                    <Circle fill="rgba(13,148,136,0.85)" frame={{ width: 56, height: 56 }} />
                    <VStack spacing={0} alignment="center">
                      <Image systemName="arrow.up" font="headline" foregroundStyle="white" />
                      <Text font="caption2" foregroundStyle="white">上传</Text>
                    </VStack>
                  </ZStack>
                </Button>
                <Spacer />
              </HStack>
            </VStack>
          </ZStack>
        </VStack>

        {/* ═══════ Tab 1：设置 ═══════ */}
        <VStack tag={1} tabItem={<Label title="设置" systemImage="gearshape.fill" />}>
          <List
            navigationTitle="设置"
            navigationBarTitleDisplayMode="inline"
            toolbar={{ topBarLeading: [] }}
          >
            {/* ═══════ 凭证配置（图形化图标按钮）═══════ */}
            <Section header={<SectionHeader title="凭证配置" />} footer={<Text attributedString={`[生成 GitHub Classic Token →](https://github.com/settings/tokens/new)`} foregroundStyle="tertiaryLabel" font="caption" />}>
              <VStack spacing={10}>
                <HStack spacing={10}>
                  <CredentialIcon icon="key.fill" label="Token" value={token} color="rgba(255,149,0,1)" isPresented={editingField === "token"} onShow={() => setEditingField("token")} onHide={() => setEditingField(null)} popoverTitle="访问令牌" placeholder="ghp_xxxx" onChanged={setToken} />
                  <CredentialIcon icon="person.fill" label="所有者" value={authorName} color="rgba(0,122,255,1)" isPresented={editingField === "owner"} onShow={() => setEditingField("owner")} onHide={() => setEditingField(null)} popoverTitle="仓库所有者" placeholder="QinyRui" onChanged={setAuthorName} />
                </HStack>
                <HStack spacing={10}>
                  <CredentialIcon icon="link" label="仓库 URL" value={repoUrl} color="rgba(175,82,222,1)" isPresented={editingField === "url"} onShow={() => setEditingField("url")} onHide={() => setEditingField(null)} popoverTitle="仓库 URL" placeholder="https://github.com/..." onChanged={setRepoUrl} />
                  <CredentialIcon icon="envelope.fill" label="邮箱" value={authorEmail} color="rgba(52,199,89,1)" isPresented={editingField === "email"} onShow={() => setEditingField("email")} onHide={() => setEditingField(null)} popoverTitle="提交邮箱" placeholder="your@email.com" onChanged={setAuthorEmail} />
                </HStack>
                <HStack spacing={10}>
                  <CredentialIcon icon="arrow.triangle.branch" label="分支" value={branch} color="rgba(13,148,136,1)" isPresented={editingField === "branch"} onShow={() => setEditingField("branch")} onHide={() => setEditingField(null)} popoverTitle="默认分支" placeholder="main" onChanged={setBranch} />
                </HStack>
              </VStack>
            </Section>
            {/* ═══════ 仓库操作（图形化图标弹窗）═══════ */}
            <Section header={<SectionHeader title="仓库操作" />} footer={<Text font="caption" foregroundStyle="tertiaryLabel">点击图标按钮打开操作面板，在弹窗中填写信息并执行。</Text>}>
              <HStack spacing={10}>
                {/* 创建文件夹 */}
                <Button
                  buttonStyle="plain"
                  action={() => setEditingField(editingField === "opFolder" ? null : "opFolder")}
                  frame={{ maxWidth: "infinity" }}
                  popover={{
                    isPresented: editingField === "opFolder",
                    onChanged: (v: boolean) => { if (!v) setEditingField(null) },
                    presentationCompactAdaptation: 'popover',
                    arrowEdge: 'top' as any,
                    content: (
                      <VStack spacing={10} padding={16} frame={{ width: 280 }}
                        // @ts-ignore
                        background="rgba(35,35,35,0.95)"
                        // @ts-ignore
                        mask={<RoundedRectangle cornerRadius={16} fill="black" />}
                      >
                        <HStack spacing={8} alignment="center">
                          <ZStack alignment="center"><Circle fill="rgba(52,199,89,0.2)" frame={{ width: 32, height: 32 }} /><Image systemName="folder.badge.plus" font="body" foregroundStyle="rgba(52,199,89,1)" /></ZStack>
                          <Text font="headline" foregroundStyle="white">创建文件夹</Text>
                        </HStack>
                        <TextField title="文件夹路径" value={folderPath} prompt="例如 images/wallpapers" onChanged={setFolderPath} />
                        <TextField title="目标分支" value={folderTargetBranch} prompt={branch || "main"} onChanged={setFolderTargetBranch} />
                        <Button title={isCreatingFolder ? "创建中…" : "创建文件夹"} systemImage="folder.badge.plus" disabled={!folderPath.trim() || isCreatingFolder} action={handleCreateFolder} />
                        <Text font="caption" foregroundStyle="tertiaryLabel">自动生成 .gitkeep 占位文件</Text>
                      </VStack>
                    )
                  }}
                >
                  <VStack spacing={6} alignment="center" padding={{ vertical: 12, horizontal: 4 }} frame={{ maxWidth: "infinity" }}>
                    <ZStack alignment="center"><Circle fill="rgba(52,199,89,0.2)" frame={{ width: 44, height: 44 }} /><Image systemName="folder.badge.plus" font="title3" foregroundStyle="rgba(52,199,89,1)" /></ZStack>
                    <Text font="caption" foregroundStyle="label" lineLimit={1}>创建文件夹</Text>
                    <Text font="caption2" foregroundStyle="secondaryLabel">点击配置</Text>
                  </VStack>
                </Button>

                {/* 创建分支 */}
                <Button
                  buttonStyle="plain"
                  action={() => setEditingField(editingField === "opBranch" ? null : "opBranch")}
                  frame={{ maxWidth: "infinity" }}
                  popover={{
                    isPresented: editingField === "opBranch",
                    onChanged: (v: boolean) => { if (!v) setEditingField(null) },
                    presentationCompactAdaptation: 'popover',
                    arrowEdge: 'top' as any,
                    content: (
                      <VStack spacing={10} padding={16} frame={{ width: 280 }}
                        // @ts-ignore
                        background="rgba(35,35,35,0.95)"
                        // @ts-ignore
                        mask={<RoundedRectangle cornerRadius={16} fill="black" />}
                      >
                        <HStack spacing={8} alignment="center">
                          <ZStack alignment="center"><Circle fill="rgba(175,82,222,0.2)" frame={{ width: 32, height: 32 }} /><Image systemName="arrow.triangle.branch" font="body" foregroundStyle="rgba(175,82,222,1)" /></ZStack>
                          <Text font="headline" foregroundStyle="white">创建分支</Text>
                        </HStack>
                        <TextField title="新分支名称" value={newBranchName} prompt="例如 feature/login" onChanged={setNewBranchName} />
                        <TextField title="源分支" value={sourceBranchName} prompt={branch || "main"} onChanged={setSourceBranchName} />
                        <Button title={isCreatingBranch ? "创建中…" : "创建分支"} systemImage="arrow.triangle.branch" disabled={!newBranchName.trim() || isCreatingBranch} action={handleCreateBranch} />
                        <Text font="caption" foregroundStyle="tertiaryLabel">基于源分支创建新分支</Text>
                      </VStack>
                    )
                  }}
                >
                  <VStack spacing={6} alignment="center" padding={{ vertical: 12, horizontal: 4 }} frame={{ maxWidth: "infinity" }}>
                    <ZStack alignment="center"><Circle fill="rgba(175,82,222,0.2)" frame={{ width: 44, height: 44 }} /><Image systemName="arrow.triangle.branch" font="title3" foregroundStyle="rgba(175,82,222,1)" /></ZStack>
                    <Text font="caption" foregroundStyle="label" lineLimit={1}>创建分支</Text>
                    <Text font="caption2" foregroundStyle="secondaryLabel">点击配置</Text>
                  </VStack>
                </Button>

                {/* 删除分支 */}
                <Button
                  buttonStyle="plain"
                  action={() => setEditingField(editingField === "opDelete" ? null : "opDelete")}
                  frame={{ maxWidth: "infinity" }}
                  popover={{
                    isPresented: editingField === "opDelete",
                    onChanged: (v: boolean) => { if (!v) setEditingField(null) },
                    presentationCompactAdaptation: 'popover',
                    arrowEdge: 'top' as any,
                    content: (
                      <VStack spacing={10} padding={16} frame={{ width: 280 }}
                        // @ts-ignore
                        background="rgba(35,35,35,0.95)"
                        // @ts-ignore
                        mask={<RoundedRectangle cornerRadius={16} fill="black" />}
                      >
                        <HStack spacing={8} alignment="center">
                          <ZStack alignment="center"><Circle fill="rgba(255,59,48,0.2)" frame={{ width: 32, height: 32 }} /><Image systemName="trash.fill" font="body" foregroundStyle="rgba(255,59,48,1)" /></ZStack>
                          <Text font="headline" foregroundStyle="white">删除分支</Text>
                        </HStack>
                        <Text font="caption" foregroundStyle="rgba(255,59,48,0.8)">⚠️ 此操作不可逆</Text>
                        <TextField title="分支名称" value={deleteBranchName} prompt="例如 photos, feature/xxx" onChanged={setDeleteBranchName} />
                        <Button title={isDeletingBranch ? "删除中…" : "删除分支"} systemImage="trash" tint="systemRed" disabled={!deleteBranchName.trim() || isDeletingBranch} action={handleDeleteBranch} />
                      </VStack>
                    )
                  }}
                >
                  <VStack spacing={6} alignment="center" padding={{ vertical: 12, horizontal: 4 }} frame={{ maxWidth: "infinity" }}>
                    <ZStack alignment="center"><Circle fill="rgba(255,59,48,0.2)" frame={{ width: 44, height: 44 }} /><Image systemName="trash.fill" font="title3" foregroundStyle="rgba(255,59,48,1)" /></ZStack>
                    <Text font="caption" foregroundStyle="label" lineLimit={1}>删除分支</Text>
                    <Text font="caption2" foregroundStyle="rgba(255,59,48,0.7)">⚠️ 危险</Text>
                  </VStack>
                </Button>
              </HStack>
            </Section>
          </List>
        </VStack>

      </TabView>
    </NavigationStack>
  )
}

async function run() {
  await Navigation.present(<View />)
  Script.exit()
}

run()
