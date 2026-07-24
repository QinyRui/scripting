### Loon 脚本修改：自动抓取成就数据（uid/vehicle_type/wnumber）

需要修改两处：

#### 1. 添加存储键（在 KEY 相关常量区域）

```javascript
// 成就数据键（新增）
const KEY_ACHIEVEMENT_UID = "ninebot.achievementUid";
const KEY_ACHIEVEMENT_VTYPE = "ninebot.achievementVehicleType";
const KEY_ACHIEVEMENT_WNUMBER = "ninebot.achievementWnumber";
```

#### 2. 修改 CAPTURE_PATTERNS 和抓包逻辑

把原来的：
```javascript
const CAPTURE_PATTERNS = ["/portal/api/user-sign/v2/status", "/portal/api/user-sign/v2/sign", "/blind-box/receive"];
```

改成：
```javascript
const CAPTURE_PATTERNS = [
  "/portal/api/user-sign/v2/status",
  "/portal/api/user-sign/v2/sign",
  "/blind-box/receive",
  "/web/rank/my-achievement"   // 新增：成就排行榜API
];
```

#### 3. 修改抓包逻辑（在 `if (isCaptureRequest)` 块内）

把整个 `if (isCaptureRequest)` 块替换为：

```javascript
if (isCaptureRequest) {
    try {
        logInfo("进入抓包流程，开始提取鉴权信息");
        const h = $request.headers || {};
        const auth = h["Authorization"] || h["authorization"] || "";
        const dev = h["DeviceId"] || h["deviceid"] || h["device_id"] || "";
        const ua = h["User-Agent"] || h["user-agent"] || "";
        const url = $request.url || "";

        // === 新增：成就API抓包 ===
        if (url.includes("/web/rank/my-achievement")) {
            try {
                const body = JSON.parse($request.body || "{}");
                let changed = false;
                if (body.uid) {
                    writePS(String(body.uid), KEY_ACHIEVEMENT_UID);
                    logInfo("抓包成就数据 uid:", body.uid);
                    changed = true;
                }
                if (body.vehicle_type) {
                    writePS(String(body.vehicle_type), KEY_ACHIEVEMENT_VTYPE);
                    logInfo("抓包成就数据 vehicle_type:", body.vehicle_type);
                    changed = true;
                }
                if (body.wnumber) {
                    writePS(String(body.wnumber), KEY_ACHIEVEMENT_WNUMBER);
                    logInfo("抓包成就数据 wnumber:", body.wnumber);
                    changed = true;
                }
                if (changed) {
                    notify(cfg.titlePrefix, "成就数据已抓取 ✅", 
                        `uid: ${body.uid || "无"}\n车型: ${body.vehicle_type || "无"}\n车架号: ${body.wnumber || "无"}`);
                }
            } catch (e) {
                logErr("成就数据解析失败:", e);
            }
            $done({});
            return;
        }
        // === 成就API抓包结束 ===

        if (!auth || !dev) {
            logWarn("抓包未提取到有效信息：Authorization/DeviceId缺失");
            $done({});
            return;
        }
        let changed = false;
        if (auth && readPS(KEY_AUTH) !== auth) { writePS(auth, KEY_AUTH); changed = true; }
        if (dev && readPS(KEY_DEV) !== dev) { writePS(dev, KEY_DEV); changed = true; }
        if (ua && readPS(KEY_UA) !== ua) { writePS(ua, KEY_UA); changed = true; }
        if (changed) {
            const currentTime = formatDateTime();
            writePS(currentTime, KEY_LAST_CAPTURE);
            await writeToBoxJs(auth, dev, ua);
        } else {
            logInfo("抓包信息无变化，跳过写入");
        }
    } catch (e) {
        logErr("抓包流程异常：", e);
        notify("九号抓包", "失败 ⚠️", `错误：${String(e).slice(0, 50)}`);
    }
    $done({});
    return;
}
```

### 使用方法

1. 部署修改后的 Loon 脚本
2. 打开九号 APP → 进入**排行榜**页面（任意排行榜）
3. 等待页面加载完成，Loon 会自动拦截 `my-achievement` 请求
4. 通知会显示「成就数据已抓取 ✅」
5. Scripting 脚本的设置页会自动读取这些值

### Scripting 端配合修改

在 `api.ts` 的 `getMyAchievement` 函数开头，增加从 BoxJS/外部存储读取的逻辑：

```typescript
// 优先从 Loon/BoxJS 抓包获取的值
const loonUid = Storage.get("ninebot.achievementUid") || ""
const loonVtype = Storage.get("ninebot.achievementVehicleType") || ""
const loonWnumber = Storage.get("ninebot.achievementWnumber") || ""
// 如果本地 Storage 没有但 Loon 有，用 Loon 的值
if (lonnUid && !uid) uid = lonnUid
if (loonVtype && !vehicleType) vehicleType = loonVtype
if (loonWnumber && !wnumber) wnumber = lonnWnumber
```

这样用户只需要：
1. 在 Loon 里运行一次脚本
2. 打开九号 APP 排行榜页面
3. 三个值自动抓取并写入
4. Scripting 脚本自动读取使用
