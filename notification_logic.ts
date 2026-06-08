import { Notification, Script } from "scripting";

declare const Storage: any;

const scriptName = Script.name;

// 存储 Key 与主应用保持一致
const CACHE_KEY = "CurrentWeather";

// ────────────────────────────────────────────
// 通知发送函数（仅在 handleNotifications 内部调用）
// ────────────────────────────────────────────

async function rainNotification(title: string, subtitle: string, content: string) {
    await Notification.schedule({
        title: title + "：" + subtitle,
        body: content,
        threadIdentifier: scriptName,
    });
}

async function alertNotification(content: string, location: string) {
    await Notification.schedule({
        title: location + "：" + "极端天气",
        body: content,
        threadIdentifier: scriptName,
    });
}

/**
 * 清除所有已投递和待投递的通知（防止旧版本遗留通知继续弹出）
 */
export async function clearAllNotifications() {
    try {
        await Notification.removeAllDeliveredsOfCurrentScript();
        await Notification.removeAllPendingsOfCurrentScript();
    } catch {}
}

/**
 * 处理通知逻辑
 * @param result 彩云 API 返回的完整原始数据
 * @param isCurrentLocation 是否是当前定位
 * @param notificationSettings 用户配置的通知设置
 */
export async function handleNotifications(
    result: any,
    isCurrentLocation: boolean,
    notificationSettings: any
) {
    if (!result || !notificationSettings) return;

    const {
        NotificationInterval = 0,
        isLocalNotify = true,
        isSurroundNotify = false,
        isUselessNotify = false,
        ExtremeWeather = true,
        Precipitation = true,
    } = notificationSettings;

    // ① 用户关闭了通知总开关 → 直接返回，不发送任何通知
    if (!Precipitation) return;

    const stored = (Storage.get(CACHE_KEY) as any) || {};
    stored.rain = stored.rain || {};
    stored.alert = stored.alert || {};

    const adcodes = result.alert?.adcodes || [];
    const location = isCurrentLocation
        ? "当前位置"
        : adcodes[adcodes.length - 1]?.name || "指定位置";

    const rainContent = result.minutely?.description || "";
    const storedRainContent = stored.rain.content || "";

    // ② 修复：用 stored.rain.time 检查降水通知间隔（之前错误使用了 stored.alert.time）
    const storedRainTime = stored.rain.time || 0;
    const storedAlertTime = stored.alert.time || 0;
    const now = Date.now();

    // 检查时间间隔（分钟转毫秒）
    const intervalMs = Number(NotificationInterval) * 60 * 1000;

    // ③ 修复：intervalMs === 0 表示"自动"，此时使用最小间隔 5 分钟
    const effectiveInterval = intervalMs === 0 ? 5 * 60 * 1000 : intervalMs;

    // ── 降水通知 ──
    const rainIntervalPassed = now - storedRainTime >= effectiveInterval;
    if (rainIntervalPassed && rainContent && storedRainContent !== rainContent) {
        if (/\d/.test(rainContent)) {
            // 判断是否为当地通知（包含"后"字通常指分钟级预报）
            const isLocal = rainContent.includes("后");
            if (isLocal && !onlyNumberChanged(storedRainContent, rainContent)) {
                if (isLocalNotify) {
                    await rainNotification(location, "降水状况", rainContent);
                    stored.rain.time = now;
                }
            } else if (!isLocal) {
                if (isSurroundNotify) {
                    await rainNotification(location, "周边天气", rainContent);
                    stored.rain.time = now;
                }
            }
        } else if (isUselessNotify) {
            // 提示通知（如"深夜了"）
            await rainNotification(location, "天气提示", rainContent);
            stored.rain.time = now;
        }
    }

    // ── 极端天气预警 ──
    const alertIntervalPassed = now - storedAlertTime >= effectiveInterval;
    const alertContent = result.alert?.content || [];
    const newTitles = alertContent.map((item: any) => item.title);
    const storedTitles = stored.alert.content || [];

    if (ExtremeWeather && isCurrentLocation && alertIntervalPassed) {
        const unseenTitles = newTitles.filter(
            (title: string) => !storedTitles.includes(title)
        );
        if (unseenTitles.length > 0) {
            const content = unseenTitles.join("\n");
            await alertNotification(content, location);
            stored.alert.time = now;
        }
    }

    // 更新存储
    stored.rain.content = rainContent;
    stored.alert.content = newTitles;
    Storage.set(CACHE_KEY, stored);
}

/**
 * 判断两条降水描述是否仅数字不同
 */
function onlyNumberChanged(a: string, b: string) {
    if (!a || !b) return false;
    const normalize = (str: string) => str.replace(/\d+/g, "{num}");
    return normalize(a) === normalize(b);
}
