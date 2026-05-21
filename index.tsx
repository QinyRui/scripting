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
  Spacer,
} from "scripting"

// 自定义提示函数，防止全局 alert 不存在导致崩溃
const showAlert = async (title: string, message: string) => {
  console.log(`[提示] ${title}: ${message}`)
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

// 上传历史记录
interface UploadRecord {
  filename: string
  timestamp: string
}

function View() {
  const dismiss = Navigation.useDismiss()
  
  // 状态管理
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [uploadHistory, setUploadHistory] = useState<UploadRecord[]>([])
  const [isUploading, setIsUploading] = useState(false)
  
  // GitHub 配置状态，初始化时从 Storage 中读取持久化数据
  const savedConfig = typeof Storage !== "undefined" ? Storage.get("github_uploader_config") || {} : {};
  const [repoUrl, setRepoUrl] = useState(savedConfig.repoUrl || "")
  const [token, setToken] = useState(savedConfig.token || "")
  const [branch, setBranch] = useState(savedConfig.branch || "main")
  const [authorName, setAuthorName] = useState(savedConfig.authorName || "")
  const [authorEmail, setAuthorEmail] = useState(savedConfig.authorEmail || "")

  // 选择文件
  const handlePickFiles = async () => {
    try {
      const files = await DocumentPicker.pickFiles({
        allowsMultipleSelection: true,
      })
      if (files && files.length > 0) {
        setSelectedFiles(files)
      }
    } catch (error) {
      await showAlert("选择文件失败", String(error))
    }
  }

  // 上传到 GitHub
  const handleUpload = async () => {
    console.log("点击了上传按钮");
      // 验证配置
    console.log("正在验证配置...");
    console.log("Token: ", token ? "已填写" : "为空");
    console.log("Repo URL: ", repoUrl);
    console.log("Author Name: ", authorName);
    console.log("Author Email: ", authorEmail);
    console.log("Branch: ", branch);
    if (!repoUrl || !token || !authorName || !authorEmail) {
      await showAlert("配置不完整", "请先填写 GitHub 仓库配置信息")
      return
    }

    if (selectedFiles.length === 0) {
      await showAlert("未选择文件", "请先选择要上传的文件")
      return
    }

    setIsUploading(true)

    try {
      // 创建临时工作目录
      const workDir = FileManager.temporaryDirectory + "/github-upload-" + Date.now()
      await FileManager.createDirectory(workDir, true)

      // 使用简单的 HTTP fetch 通过 GitHub REST API 直接上传文件，完全抛弃缓慢和不可靠的 git skill！
      console.log("使用原生 Fetch 开始向 GitHub API 上传...");

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

      console.log(`解析到的目标仓库: ${ownerStr}/${repoStr}，分支: ${branch}`);

      const uploadedFiles: UploadRecord[] = []

      for (const filePath of selectedFiles) {
        const filename = filePath.split("/").pop() || "unknown"
        const fileData = await FileManager.readAsData(filePath)
        
        if (!fileData) {
           console.log(`无法读取文件: ${filename}`);
           continue;
        }

        // 把 Data 转为 base64
        // Scripting 里的 Data 对象，可以直接转成 base64 字符串。这里假设有 toBase64() 方法。
        // 如果没有，直接尝试使用 REST API，我们可以先把文件读取为字符串（如果是文本文件），
        // 或者依赖 Scripting 内置的 GitHub 模块。为了保险，我们使用原生 GitHub 模块。
        
        console.log(`开始上传: ${filename}`);
        
        // 必须配置 Token，REST API 也需要
        if (!token) {
           throw new Error("使用 API 上传时必须提供 Token。");
        }

        try {
          // 由于系统可能没有注入全局的 GitHub 对象，我们直接使用原生的 fetch 调用 GitHub REST API
          console.log(`正在请求 REST API...`);
          
          // 1. 将 Data 转为 base64 字符串
          // Data 对象目前可能没有直接的 toBase64，这里是一个比较 tricky 的地方
          // 这里我们将 fallback 到用 fetch 上传。既然刚才用户代码里有 FileManager，我们借用它
          
          // @ts-ignore
          const base64Content = typeof fileData.toBase64String === "function" 
             // @ts-ignore
             ? fileData.toBase64String() 
             // @ts-ignore
             : (typeof fileData.toBase64 === "function" ? fileData.toBase64() : null); 
             
          if (!base64Content) {
            throw new Error("无法将文件数据转换为 base64 格式，API不支持");
          } 
          
          const url = `https://api.github.com/repos/${ownerStr}/${repoStr}/contents/${filename}`;
          
          // 尝试获取现有文件的 sha (如果已存在)
          let currentSha = null;
          try {
            const getRes = await fetch(url + `?ref=${branch}`, {
              headers: {
                "Authorization": `Bearer ${token}`,
                "Accept": "application/vnd.github.v3+json",
                "User-Agent": "Scripting-App"
              }
            });
            if (getRes.ok) {
              const getData = await getRes.json();
              currentSha = getData.sha;
            }
          } catch (e) {
            console.log("未找到现有文件，视为新建");
          }

          const body = {
            message: `Upload ${filename} via iOS Scripting`,
            content: base64Content,
            branch: branch,
            ...(currentSha ? { sha: currentSha } : {})
          };

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
          console.log(`文件 ${filename} 上传/更新成功`);
        } catch (apiError) {
           console.error(`更新文件 ${filename} 失败: `, apiError);
           throw new Error(`无法更新文件 ${filename}: ${apiError}`);
        }

        uploadedFiles.push({
          filename,
          timestamp: new Date().toLocaleString("zh-CN"),
        })
      }

      // 更新上传历史
      setUploadHistory([...uploadedFiles, ...uploadHistory])
      
      // 清空选中的文件
      setSelectedFiles([])

      // 清理临时目录
      await FileManager.remove(workDir)

      await showAlert("上传成功", `成功调用 REST API 上传 ${uploadCount} 个文件到 GitHub`)
    } catch (error) {
      console.error("上传流程崩溃:", error);
      await showAlert("上传失败", String(error))
    } finally {
      setIsUploading(false)
    }
  }

  // 清空历史
  const handleClearHistory = () => {
    setUploadHistory([])
  }

  return (
    <NavigationStack>
      <List
        navigationTitle="GitHub 上传"
        navigationBarTitleDisplayMode="inline"
        toolbar={{
          cancellationAction: <Button title="关闭" action={dismiss} />,
        }}
      >
        {/* GitHub 配置部分 */}
        <Section title="GitHub 配置">
          <TextField
            title="Token"
            value={token}
            onChanged={setToken}
          />
          <TextField
            title="所有者"
            value={authorName}
            onChanged={setAuthorName}
          />
          <TextField
            title="仓库URL"
            value={repoUrl}
            onChanged={setRepoUrl}
          />
          <TextField
            title="分支 (默认main)"
            value={branch}
            onChanged={setBranch}
          />
          <TextField
            title="邮箱"
            value={authorEmail}
            onChanged={setAuthorEmail}
          />
          <Button 
            title="保存配置" 
            action={async () => {
              console.log("点击了保存配置按钮");
              if (typeof Storage !== "undefined") {
                Storage.set("github_uploader_config", {
                  repoUrl, token, branch, authorName, authorEmail
                });
                await showAlert("提示", "配置已成功保存！");
              } else {
                await showAlert("提示", "当前环境不支持 Storage 持久化保存");
              }
            }} 
          />
          <Text
            attributedString={`[生成 Classic Token](https://github.com/settings/tokens/new) 并勾选 Repo 权限`}
          />
        </Section>

        {/* 选择文件部分 */}
        <Section title="选择文件">
          <Button
            title="📁 从文件选择"
            action={handlePickFiles}
          />
          <Text>
            点击上方按钮从 iPhone「文件」App 中选择要上传的文件，可多选
          </Text>
          
          {selectedFiles.length === 0 ? (
            <Text>尚未选择文件</Text>
          ) : (
            selectedFiles.map((file, index) => {
              const filename = file.split("/").pop() || "unknown"
              return <Text key={index}>✅ {filename}</Text>
            })
          )}
        </Section>

        {/* 上传部分 */}
        <Section title="上传">
          <Text>
            确认以上配置无误后，点击下方按钮开始上传到 GitHub
          </Text>
          <Button
            title={isUploading ? "上传中..." : "🚀 上传到 GitHub"}
            action={handleUpload}
          />
        </Section>

        {/* 上传历史 */}
        <Section
          header={
            <HStack>
              <Text>📦 上传历史</Text>
              <Spacer />
              {uploadHistory.length > 0 && (
                <Button title="清空" action={handleClearHistory} />
              )}
            </HStack>
          }
        >
          {uploadHistory.length === 0 ? (
            <Text>暂无上传记录</Text>
          ) : (
            uploadHistory.map((record, index) => (
              <HStack key={index}>
                <Text>✅ {record.filename}</Text>
                <Spacer />
                <Text>{record.timestamp}</Text>
              </HStack>
            ))
          )}
        </Section>
      </List>
    </NavigationStack>
  )
}

async function run() {
  await Navigation.present(<View />)
  Script.exit()
}

run()
