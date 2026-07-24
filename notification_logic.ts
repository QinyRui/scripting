import { Notification, Script, fetch } from "scripting";

declare const Storage: any;

const scriptName = Script.name;

// ─── 存储 Key ───
const CACHE_KEY = "CurrentWeather";

// ─── 通知发送函数 ───
async function sendNotification(title: string, body: string) {
    await Notification.schedule({
        title: title,
        body: body,
        threadIdentifier: scriptName,
    });
}

/**
 * 清除所有已投递和待投递的通知
 */
export async function clearAllNotifications() {
    try {
        await Notification.removeAllDeliveredsOfCurrentScript();
        await Notification.removeAllPendingsOfCurrentScript();
    } catch {}
}

/**
 * 处理通知逻辑
 * @param result 彩云 API 返回的完整原始数据（data.result）
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
        TemperatureChange = true,
        AirPollution = true,
        StrongWind = true,
        TyphoonAlert = true,
        EarthquakeAlert = true,
    } = notificationSettings;

    const stored = (Storage.get(CACHE_KEY) as any) || {};
    stored.rain = stored.rain || {};
    stored.alert = stored.alert || {};
    stored.tempChange = stored.tempChange || {};
    stored.airPollution = stored.airPollution || {};
    stored.strongWind = stored.strongWind || {};
    stored.typhoon = stored.typhoon || {};
    stored.earthquake = stored.earthquake || {};

    const adcodes = result.alert?.adcodes || [];
    const location = isCurrentLocation
        ? "当前位置"
        : adcodes[adcodes.length - 1]?.name || "指定位置";

    // 通知间隔（降水用用户设置，新增通知统一最少30分钟）
    const intervalMs = Number(NotificationInterval) * 60 * 1000;
    const rainInterval = intervalMs === 0 ? 5 * 60 * 1000 : intervalMs;
    const alertInterval = 30 * 60 * 1000;
    const now = Date.now();

    // ━━━ 1. 降水通知 ━━━
    const rainContent = result.minutely?.description || "";
    const storedRainContent = stored.rain.content || "";
    const storedRainTime = stored.rain.time || 0;

    if (now - storedRainTime >= rainInterval && rainContent && storedRainContent !== rainContent) {
        if (/\d/.test(rainContent)) {
            const isLocal = rainContent.includes("后");
            if (isLocal && !onlyNumberChanged(storedRainContent, rainContent)) {
                if (isLocalNotify) {
                    stored.rain.time = now;
                    Storage.set(CACHE_KEY, stored);
                    await sendNotification(location + "：降水状况", rainContent);
                }
            } else if (!isLocal) {
                if (isSurroundNotify) {
                    stored.rain.time = now;
                    Storage.set(CACHE_KEY, stored);
                    await sendNotification(location + "：周边天气", rainContent);
                }
            }
        } else if (isUselessNotify) {
            stored.rain.time = now;
            Storage.set(CACHE_KEY, stored);
            await sendNotification(location + "：天气提示", rainContent);
        }
    }

    // ━━━ 2. 极端天气预警 ━━━
    const storedAlertTime = stored.alert.time || 0;
    const alertContent = result.alert?.content || [];
    const newTitles = alertContent.map((item: any) => item.title);
    const storedTitles = stored.alert.content || [];

    if (ExtremeWeather && isCurrentLocation && now - storedAlertTime >= alertInterval) {
        const unseenTitles = newTitles.filter(
            (title: string) => !storedTitles.includes(title)
        );
        if (unseenTitles.length > 0) {
            stored.alert.time = now;
            stored.alert.content = newTitles;
            Storage.set(CACHE_KEY, stored);
            await sendNotification(location + "：极端天气", unseenTitles.join("\n"));
        }
    }

    // ━━━ 3. 变温提醒 ━━━
    if (TemperatureChange) {
        const hourly = result.hourly;
        const temps: number[] = [];
        if (hourly?.temperature) {
            for (const item of hourly.temperature.slice(0, 24)) {
                if (item.value !== undefined && item.value !== null) {
                    temps.push(item.value);
                }
            }
        }
        if (temps.length >= 4) {
            const maxTemp = Math.max(...temps);
            const minTemp = Math.min(...temps);
            const diff = Math.round(maxTemp - minTemp);
            const storedTempDiff = stored.tempChange.diff || 0;
            const storedTempTime = stored.tempChange.time || 0;

            if (now - storedTempTime >= alertInterval && diff >= 8 && diff !== storedTempDiff) {
                stored.tempChange.diff = diff;
                stored.tempChange.time = now;
                Storage.set(CACHE_KEY, stored);
                await sendNotification(
                    location + "：变温提醒",
                    "未来24小时温差较大，最高" + Math.round(maxTemp) + "°C，最低" + Math.round(minTemp) + "°C，温差" + diff + "°C，请注意增减衣物"
                );
            }
        }
    }

    // ━━━ 4. 空气污染提醒 ━━━
    if (AirPollution) {
        const hourly = result.hourly;
        let pollutedHours = 0;
        let maxAqi = 0;
        const aqiData = hourly?.air_quality?.aqi || [];
        for (const item of aqiData.slice(0, 24)) {
            const aqiVal = item.value || 0;
            if (aqiVal > 150) pollutedHours++;
            if (aqiVal > maxAqi) maxAqi = aqiVal;
        }
        const storedPollution = stored.airPollution.aqi || 0;
        const storedPollutionTime = stored.airPollution.time || 0;

        if (now - storedPollutionTime >= alertInterval && pollutedHours >= 3 && maxAqi !== storedPollution) {
            stored.airPollution.aqi = maxAqi;
            stored.airPollution.time = now;
            Storage.set(CACHE_KEY, stored);
            await sendNotification(
                location + "：空气污染提醒",
                "未来24小时内有" + pollutedHours + "小时空气质量较差（最高AQI " + maxAqi + "），建议减少户外活动"
            );
        }
    }

    // ━━━ 5. 大风提醒 ━━━
    if (StrongWind) {
        const hourly = result.hourly;
        let maxWindSpeed = 0;
        let windHour = "";
        const windData = hourly?.wind || [];
        for (const item of windData.slice(0, 24)) {
            const speed = item.speed || 0;
            if (speed > maxWindSpeed) {
                maxWindSpeed = speed;
                windHour = item.datetime ? String(item.datetime).slice(11, 16) : "";
            }
        }
        const storedWindSpeed = stored.strongWind.speed || 0;
        const storedWindTime = stored.strongWind.time || 0;

        if (now - storedWindTime >= alertInterval && maxWindSpeed >= 17.2 && maxWindSpeed !== storedWindSpeed) {
            const windLevel = getWindLevelBySpeed(maxWindSpeed);
            stored.strongWind.speed = maxWindSpeed;
            stored.strongWind.time = now;
            Storage.set(CACHE_KEY, stored);
            await sendNotification(
                location + "：大风提醒（预报）",
                "预计最大风速" + maxWindSpeed.toFixed(1) + "m/s（" + windLevel + "），" + (windHour ? windHour + "前后" : "") + "请注意防范"
            );
        }
    }

    // ━━━ 6. 台风信息速递 ━━━
    if (TyphoonAlert) {
        const storedTyphoonTime = stored.typhoon.time || 0;
        if (now - storedTyphoonTime >= alertInterval) {
            try {
                const resp = await fetch("https://tf02.istrongcloud.com/member/v1.2/home");
                const html = await resp.text();
                const match = html.match(/typhoons_data = ([\s\S]*?)[;|<]/);
                if (match) {
                    const arr = JSON.parse(match[1]);
                    if (arr && arr.length > 0) {
                        const tf = arr[0];
                        const lastPoint = tf.points[tf.points.length - 1];
                        if (lastPoint) {
                            const storedTfName = stored.typhoon.name || "";
                            if (tf.name !== storedTfName) {
                                const level = getTyphoonLevel(lastPoint.speed);
                                stored.typhoon.name = tf.name;
                                stored.typhoon.time = now;
                                Storage.set(CACHE_KEY, stored);
                                await sendNotification(
                                    "台风信息速递",
                                    tf.tfbh + "号台风「" + tf.name + "」（" + level + "），中心位置" + lastPoint.lat + "°N, " + lastPoint.lon + "°E，最大风速" + lastPoint.speed + "m/s"
                                );
                            }
                        }
                    } else {
                        if (stored.typhoon.name) {
                            stored.typhoon.name = "";
                            stored.typhoon.time = now;
                            Storage.set(CACHE_KEY, stored);
                        }
                    }
                }
            } catch {}
        }
    }

    // ━━━ 7. 地震速报 ━━━
    if (EarthquakeAlert) {
        const storedEqTime = stored.earthquake.time || 0;
        if (now - storedEqTime >= alertInterval) {
            try {
                const eqResp = await fetch("https://api.wolfx.cn/cenc/new.json");
                const eqData = await eqResp.json();
                const events = eqData?.CENC || [];
                const storedEqId = stored.earthquake.id || "";

                const userLat = result.realtime?.location?.latitude || 0;
                const userLon = result.realtime?.location?.longitude || 0;

                for (const eq of events.slice(0, 5)) {
                    const mag = parseFloat(eq.M || "0");
                    const epiLat = parseFloat(eq.EPI_LAT || "0");
                    const epiLon = parseFloat(eq.EPI_LON || "0");
                    const eqId = eq.ID || eq.O_TIME || "";

                    if (mag >= 3.0 && eqId !== storedEqId) {
                        const distance = haversineDistance(userLat, userLon, epiLat, epiLon);
                        const shouldNotify = (mag >= 4.0 && distance < 500) || (mag >= 3.0 && distance < 200);
                        if (shouldNotify && userLat !== 0) {
                            stored.earthquake.id = eqId;
                            stored.earthquake.time = now;
                            Storage.set(CACHE_KEY, stored);
                            await sendNotification(
                                "地震速报",
                                eq.O_TIME + " " + eq.EPI_PLACE + " 发生" + mag + "级地震，距您约" + Math.round(distance) + "km"
                            );
                            break;
                        }
                    }
                }
            } catch {}
        }
    }

    // 最终存储更新
    stored.rain.content = rainContent;
    stored.alert.content = newTitles;
    Storage.set(CACHE_KEY, stored);
}

// ─── 工具函数 ───

function onlyNumberChanged(a: string, b: string) {
    if (!a || !b) return false;
    const normalize = (str: string) => str.replace(/\d+/g, "{num}");
    return normalize(a) === normalize(b);
}

function getWindLevelBySpeed(speed: number): string {
    if (speed >= 10.8 && speed < 13.9) return "6级";
    if (speed >= 13.9 && speed < 17.2) return "7级";
    if (speed >= 17.2 && speed < 20.8) return "8级";
    if (speed >= 20.8 && speed < 24.5) return "9级";
    if (speed >= 24.5 && speed < 28.5) return "10级";
    if (speed >= 28.5 && speed < 32.7) return "11级";
    if (speed >= 32.7) return "12级以上";
    return "6级以下";
}

function getTyphoonLevel(speed: number): string {
    if (speed >= 51) return "超强台风";
    if (speed >= 42) return "强台风";
    if (speed >= 33) return "台风";
    if (speed >= 25) return "强热带风暴";
    if (speed >= 17) return "热带风暴";
    return "热带低压";
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
