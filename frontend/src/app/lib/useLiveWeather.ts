import { useEffect, useState } from "react";

/** 首页封面用的实时日期 + 天气。 */
export type LiveInfo = {
  /** 英文短日期，形如 "Fri, Aug 1" */
  dateLatin: string;
  city: string;
  /** 气温，形如 "24°"；拉取中/失败时用兜底 */
  temp: string;
  /** 天气短语，形如 "多云转晴" */
  cond: string;
};

// 固定城市：上海（经纬度）。将来换城市改这里即可。
const CITY = { name: "上海", lat: 31.2304, lon: 121.4737 };

// Open-Meteo weather_code → 中文短语
const WMO: Record<number, string> = {
  0: "晴",
  1: "晴间多云", 2: "多云", 3: "阴",
  45: "有雾", 48: "雾凇",
  51: "小毛雨", 53: "毛毛雨", 55: "大毛雨",
  56: "冻毛雨", 57: "冻毛雨",
  61: "小雨", 63: "中雨", 65: "大雨",
  66: "冻雨", 67: "冻雨",
  71: "小雪", 73: "中雪", 75: "大雪", 77: "米雪",
  80: "阵雨", 81: "阵雨", 82: "强阵雨",
  85: "阵雪", 86: "强阵雪",
  95: "雷阵雨", 96: "雷阵雨伴冰雹", 99: "雷阵雨伴冰雹",
};

function formatLatin(d: Date): string {
  // "Fri, Aug 1"
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

/** 拉取实时日期 + 上海天气。天气每 30 分钟刷新；日期每分钟校正一次（跨天）。 */
export function useLiveWeather(): LiveInfo {
  const [info, setInfo] = useState<LiveInfo>({
    dateLatin: formatLatin(new Date()),
    city: CITY.name,
    temp: "—°",
    cond: "获取中",
  });

  useEffect(() => {
    let alive = true;

    const fetchWeather = async () => {
      try {
        const url =
          `https://api.open-meteo.com/v1/forecast?latitude=${CITY.lat}&longitude=${CITY.lon}` +
          `&current=temperature_2m,weather_code&timezone=Asia%2FShanghai`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        const cur = data.current || {};
        const temp = Math.round(cur.temperature_2m ?? 0);
        const cond = WMO[cur.weather_code] ?? "多云";
        if (alive) {
          setInfo((prev) => ({ ...prev, temp: `${temp}°`, cond }));
        }
      } catch {
        // 拉取失败：保留城市与日期，天气回退到占位
        if (alive) setInfo((prev) => ({ ...prev, temp: "24°", cond: "多云转晴" }));
      }
    };

    const tickDate = () => {
      if (alive) setInfo((prev) => ({ ...prev, dateLatin: formatLatin(new Date()) }));
    };

    fetchWeather();
    const wTimer = setInterval(fetchWeather, 30 * 60 * 1000); // 天气 30 分钟
    const dTimer = setInterval(tickDate, 60 * 1000); // 日期 每分钟校正（跨天）

    return () => {
      alive = false;
      clearInterval(wTimer);
      clearInterval(dTimer);
    };
  }, []);

  return info;
}
