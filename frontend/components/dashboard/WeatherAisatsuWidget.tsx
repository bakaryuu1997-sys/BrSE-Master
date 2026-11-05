"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Cloud,
  CloudRain,
  CloudSun,
  Compass,
  Copy,
  Droplets,
  MapPin,
  RefreshCw,
  Sparkles,
  Sun,
  Snowflake,
  Wind,
  X,
  Check,
} from "lucide-react";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { useNotify } from "@/components/ToastProvider";

interface WeatherData {
  temp: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  cityName: string;
  cityNameJa: string;
  isGps: boolean;
  updatedAt: number;
}

const KNOWN_CITIES = [
  { name: "Hà Nội", nameJa: "ハノイ", lat: 21.0285, lon: 105.8542 },
  { name: "TP. Hồ Chí Minh", nameJa: "ホーチミン", lat: 10.8231, lon: 106.6297 },
  { name: "Đà Nẵng", nameJa: "ダナン", lat: 16.0544, lon: 108.2022 },
  { name: "Hải Phòng", nameJa: "ハイフォン", lat: 20.8449, lon: 106.6881 },
  { name: "Cần Thơ", nameJa: "カントー", lat: 10.0452, lon: 105.7469 },
  { name: "Huế", nameJa: "フエ", lat: 16.4637, lon: 107.5909 },
  { name: "Tokyo", nameJa: "東京", lat: 35.6762, lon: 139.6503 },
  { name: "Osaka", nameJa: "大阪", lat: 34.6937, lon: 135.5023 },
  { name: "Nagoya", nameJa: "名古屋", lat: 35.1815, lon: 136.9066 },
  { name: "Fukuoka", nameJa: "福岡", lat: 33.5904, lon: 130.4017 },
  { name: "Sapporo", nameJa: "札幌", lat: 43.0618, lon: 141.3545 },
  // Greater Tokyo — kept as separate entries so a GPS fix is not collapsed into "Tokyo".
  { name: "Saitama", nameJa: "さいたま", lat: 35.8617, lon: 139.6455 },
  { name: "Kawaguchi", nameJa: "川口", lat: 35.8077, lon: 139.7241 },
  { name: "Kawagoe", nameJa: "川越", lat: 35.9251, lon: 139.4858 },
  { name: "Yokohama", nameJa: "横浜", lat: 35.4437, lon: 139.638 },
  { name: "Kawasaki", nameJa: "川崎", lat: 35.5309, lon: 139.7029 },
  { name: "Chiba", nameJa: "千葉", lat: 35.6073, lon: 140.1063 },
  { name: "Utsunomiya", nameJa: "宇都宮", lat: 36.5551, lon: 139.8828 },
  { name: "Mito", nameJa: "水戸", lat: 36.3418, lon: 140.4468 },
  { name: "Maebashi", nameJa: "前橋", lat: 36.3911, lon: 139.0608 },
  { name: "Shizuoka", nameJa: "静岡", lat: 34.9769, lon: 138.3831 },
  { name: "Niigata", nameJa: "新潟", lat: 37.9026, lon: 139.0232 },
  { name: "Kanazawa", nameJa: "金沢", lat: 36.5613, lon: 136.6562 },
  { name: "Kyoto", nameJa: "京都", lat: 35.0116, lon: 135.7681 },
  { name: "Kobe", nameJa: "神戸", lat: 34.6901, lon: 135.1955 },
  { name: "Hiroshima", nameJa: "広島", lat: 34.3853, lon: 132.4553 },
  { name: "Sendai", nameJa: "仙台", lat: 38.2682, lon: 140.8694 },
  { name: "Naha", nameJa: "那覇", lat: 26.2124, lon: 127.6809 },
  // Vietnam
  { name: "Bắc Ninh", nameJa: "バクニン", lat: 21.1861, lon: 106.0763 },
  { name: "Hải Dương", nameJa: "ハイズオン", lat: 20.9373, lon: 106.3146 },
  { name: "Vinh", nameJa: "ヴィン", lat: 18.6796, lon: 105.6813 },
  { name: "Nha Trang", nameJa: "ニャチャン", lat: 12.2388, lon: 109.1967 },
  { name: "Đà Lạt", nameJa: "ダラット", lat: 11.9404, lon: 108.4583 },
  { name: "Biên Hòa", nameJa: "ビエンホア", lat: 10.9574, lon: 106.8426 },
  { name: "Vũng Tàu", nameJa: "ブンタウ", lat: 10.346, lon: 107.0843 },
];

function findNearestCity(lat: number, lon: number): { name: string; nameJa: string } {
  let nearest = KNOWN_CITIES[0];
  let minDistance = Infinity;

  for (const city of KNOWN_CITIES) {
    const d = Math.hypot(city.lat - lat, city.lon - lon);
    if (d < minDistance) {
      minDistance = d;
      nearest = city;
    }
  }

  // Only name a city when the fix is genuinely close (~0.2° ≈ 20km); otherwise show
  // coordinates. The weather itself is always fetched from the real GPS coordinates.
  if (minDistance < 0.2) {
    return { name: nearest.name, nameJa: nearest.nameJa };
  }
  const label = `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
  return { name: `GPS ${label}`, nameJa: `現在地 (${label})` };
}

async function isGeolocationGranted(): Promise<boolean> {
  try {
    const status = await navigator.permissions?.query({ name: "geolocation" as PermissionName });
    return status?.state === "granted";
  } catch {
    return false;
  }
}

function getWeatherInfo(code: number) {
  if (code === 0) {
    return { label: "Nắng đẹp", labelJa: "快晴", icon: Sun, color: "text-amber-400" };
  }
  if ([1, 2, 3].includes(code)) {
    return { label: "Có mây", labelJa: "晴れ・曇り", icon: CloudSun, color: "text-cyan" };
  }
  if ([45, 48].includes(code)) {
    return { label: "Sương mù", labelJa: "濃霧", icon: Cloud, color: "text-slate-300" };
  }
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) {
    return { label: "Mưa rải rác", labelJa: "雨模様", icon: CloudRain, color: "text-blue-400" };
  }
  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return { label: "Có tuyết", labelJa: "降雪", icon: Snowflake, color: "text-sky-200" };
  }
  if (code >= 95) {
    return { label: "Dông bão", labelJa: "雷雨", icon: CloudRain, color: "text-vermilion" };
  }
  return { label: "Trời quang", labelJa: "平穏", icon: CloudSun, color: "text-cyan" };
}

export function WeatherAisatsuWidget() {
  const { notify } = useNotify();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [localWeather, setLocalWeather] = useState<WeatherData | null>(null);
  const [tokyoWeather, setTokyoWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    setMounted(true);
    loadWeather();
    // Mount-only fetch: loadWeather reads no props/state and refresh is manual.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchMeteo(lat: number, lon: number): Promise<{ temp: number; humidity: number; windSpeed: number; weatherCode: number }> {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`
    );
    if (!res.ok) throw new Error("Weather fetch failed");
    const data = await res.json();
    return {
      temp: Math.round(data.current?.temperature_2m ?? 24),
      humidity: Math.round(data.current?.relative_humidity_2m ?? 65),
      windSpeed: Math.round(data.current?.wind_speed_10m ?? 8),
      weatherCode: data.current?.weather_code ?? 1,
    };
  }

  async function loadWeather(forceRefresh = false) {
    if (typeof window === "undefined") return;

    const cachedLocal = localStorage.getItem("brse_weather_local_v2");
    const cachedTokyo = localStorage.getItem("brse_weather_tokyo");
    const now = Date.now();

    if (!forceRefresh && cachedLocal && cachedTokyo) {
      try {
        const lData: WeatherData = JSON.parse(cachedLocal);
        const tData: WeatherData = JSON.parse(cachedTokyo);
        if (now - lData.updatedAt < 30 * 60 * 1000) {
          setLocalWeather(lData);
          setTokyoWeather(tData);
          return;
        }
      } catch {
        // Fallback to fetch
      }
    }

    setIsLoading(true);

    // 1. Tokyo Fetch (lat: 35.6762, lon: 139.6503)
    try {
      const tInfo = await fetchMeteo(35.6762, 139.6503);
      const tokyoData: WeatherData = {
        ...tInfo,
        cityName: "Tokyo",
        cityNameJa: "東京",
        isGps: false,
        updatedAt: now,
      };
      setTokyoWeather(tokyoData);
      localStorage.setItem("brse_weather_tokyo", JSON.stringify(tokyoData));
    } catch {
      // Default Tokyo fallback
      setTokyoWeather({
        temp: 16,
        humidity: 60,
        windSpeed: 10,
        weatherCode: 1,
        cityName: "Tokyo",
        cityNameJa: "東京",
        isGps: false,
        updatedAt: now,
      });
    }

    // 2. Local Fetch (GPS with Hanoi default). Only prompt for location on an explicit refresh
    // click; on page load use GPS only when permission was already granted (no surprise prompt).
    const canUseGps = forceRefresh || (await isGeolocationGranted());
    if (navigator.geolocation && canUseGps) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const { latitude, longitude } = pos.coords;
            const nearest = findNearestCity(latitude, longitude);
            const lInfo = await fetchMeteo(latitude, longitude);
            const localData: WeatherData = {
              ...lInfo,
              cityName: nearest.name,
              cityNameJa: nearest.nameJa,
              isGps: true,
              updatedAt: now,
            };
            setLocalWeather(localData);
            localStorage.setItem("brse_weather_local_v2", JSON.stringify(localData));
          } catch {
            fetchDefaultHanoi(now);
          } finally {
            setIsLoading(false);
          }
        },
        () => {
          fetchDefaultHanoi(now);
          setIsLoading(false);
        },
        { timeout: 7000 }
      );
    } else {
      fetchDefaultHanoi(now);
      setIsLoading(false);
    }
  }

  async function fetchDefaultHanoi(now: number) {
    try {
      const lInfo = await fetchMeteo(21.0285, 105.8542);
      const hanoiData: WeatherData = {
        ...lInfo,
        cityName: "Hà Nội",
        cityNameJa: "ハノイ",
        isGps: false,
        updatedAt: now,
      };
      setLocalWeather(hanoiData);
      localStorage.setItem("brse_weather_local_v2", JSON.stringify(hanoiData));
    } catch {
      setLocalWeather({
        temp: 26,
        humidity: 75,
        windSpeed: 8,
        weatherCode: 2,
        cityName: "Hà Nội",
        cityNameJa: "ハノイ",
        isGps: false,
        updatedAt: now,
      });
    }
  }

  function handleCopy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    notify("Đã sao chép câu chào Keigo vào Clipboard!", "success");
    setTimeout(() => setCopiedKey(null), 2500);
  }

  // Aisatsu Co-Pilot Generator based on Tokyo weather and Month
  const aisatsuTemplates = useMemo(() => {
    const month = new Date().getMonth() + 1; // 1 - 12
    const tokyoTemp = tokyoWeather?.temp ?? 16;
    const tokyoCode = tokyoWeather?.weatherCode ?? 1;
    const isRain = [51, 53, 55, 61, 63, 65, 80, 81, 82, 95].includes(tokyoCode);

    // Seasonal Japanese Greetings (時候の挨拶)
    let seasonalOpening = "深秋の候、貴社におかれましてはますますご清栄のこととお慶び申し上げます。";
    if (month >= 3 && month <= 5) {
      seasonalOpening = "陽春の候、貴社ますますご隆盛のこととお慶び申し上げます。平素は格別のご高配を賜り、厚く御礼申し上げます。";
    } else if (month >= 6 && month <= 8) {
      seasonalOpening = "盛夏の候、貴社ますますご清栄のこととお慶び申し上げます。連日の猛暑が続いておりますが、いかがお過ごしでしょうか。";
    } else if (month >= 9 && month <= 11) {
      seasonalOpening = "秋冷の候、貴社におかれましてはますますご清栄のこととお慶び申し上げます。平素は格別のパートナーシップを賜り、厚く御礼申し上げます。";
    } else {
      seasonalOpening = "初冬の候、貴社におかれましてはますますご清祥のこととお慶び申し上げます。寒気厳しき折、皆様いかがお過ごしでしょうか。";
    }

    // Weather-adapted Opening
    let weatherOpening = "爽やかな秋晴れが続く今日この頃、皆様におかれましてはますますご健勝のこととお慶び申し上げます。";
    if (isRain) {
      weatherOpening = "平素は格別のご愛顧を賜り、心より感謝申し上げます。東京はあいにくのお天気と伺っておりますが、足元にお気をつけてお過ごしくださいませ。";
    } else if (tokyoTemp <= 12) {
      weatherOpening = "平素は大変お世話になっております。東京は一段と冷え込みが厳しくなってまいりましたが、体調など崩されていませんでしょうか。";
    }

    // Meeting Icebreaker (1-click for Zoom / Teams / Google Meet)
    const meetingIcebreaker = isRain
      ? "「本日はお忙しい中、お打ち合わせのお時間をいただき誠にありがとうございます。東京はあいにくの雨模様と伺いましたが、皆様いかがお過ごしでしょうか。早速ですが本日のアジェンダに入らせていただきます。」"
      : tokyoTemp <= 12
      ? "「本日はお忙しい中、お時間をいただき誠にありがとうございます。東京は本日冷え込みが強まっているとお聞きしましたが、どうぞ暖かくしてお過ごしください。それでは本日の進捗報告に入らせていただきます。」"
      : "「本日はお時間をいただき誠にありがとうございます。本日は大変過ごしやすい気候ですね。それでは早速ですが、本日のアジェンダに沿って進めさせていただきます。」";

    // Closing Keigo (結びの挨拶)
    const closingKeigo = tokyoTemp <= 15
      ? "朝夕はめっきり冷え込む季節となりましたので、どうぞご自愛専一にてお過ごしくださいませ。引き続き何卒よろしくお願い申し上げます。"
      : "季節の変わり目でございますので、皆様体調を崩されませぬようご自愛ください。引き続き何卒よろしくお願い申し上げます。";

    return [
      {
        id: "seasonal",
        label: "📧 Lời mở đầu Email theo mùa (時候の挨拶)",
        description: `Lời chào chuẩn mực cho tháng ${month} theo nghi thức thư từ thương mại Nhật`,
        text: `${seasonalOpening}\nベトナム開発チームのBrSEでございます。`,
      },
      {
        id: "weather",
        label: "⛅ Lời mở đầu Email theo thời tiết Tokyo (天気の挨拶)",
        description: `Thích ứng trực tiếp theo điều kiện ${tokyoWeather?.temp ?? 16}°C · ${isRain ? "Mưa" : "Quang mây"} tại Tokyo`,
        text: `${weatherOpening}\nベトナム開発チームのBrSEでございます。`,
      },
      {
        id: "meeting",
        label: "🎙️ Câu mở đầu họp online / Ice-breaking (定例MTGアイスブレイク)",
        description: "Tạo thiện cảm tự nhiên trong 30 giây đầu tiên khi mở mic trong cuộc họp với khách Nhật",
        text: meetingIcebreaker,
      },
      {
        id: "closing",
        label: "✉️ Lời kết thư quan tâm sức khỏe (結びの挨拶)",
        description: "Lời chúc sức khỏe cuối email thể hiện sự chu đáo và tinh tế",
        text: closingKeigo,
      },
    ];
  }, [tokyoWeather]);

  if (!mounted) return null;

  const localInfo = getWeatherInfo(localWeather?.weatherCode ?? 1);
  const tokyoInfo = getWeatherInfo(tokyoWeather?.weatherCode ?? 1);
  const LocalIcon = localInfo.icon;
  const TokyoIcon = tokyoInfo.icon;

  return (
    <>
      {/* Dual Weather Pill on Header */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        style={{ WebkitTextFillColor: "initial" }}
        className="group relative flex items-center gap-2.5 rounded-2xl border border-white/[0.12] bg-slate-900/80 px-3.5 py-1.5 text-xs font-black normal-case tracking-normal text-slate-100 backdrop-blur-lg shadow-[0_0_15px_rgba(255,255,255,0.03)] hover:border-cyan/40 hover:bg-slate-900 transition-all select-none [&_*]:[-webkit-text-fill-color:currentColor]"
        title="Xem thời tiết GPS & Aisatsu Co-Pilot (Lời chào chuẩn Nhật)"
      >
        {/* Local pill */}
        <div className="flex items-center gap-1.5">
          <LocalIcon className={`h-3.5 w-3.5 ${localInfo.color}`} />
          <span className="font-mono text-xs font-black text-cyan">
            {localWeather ? `${localWeather.temp}°C` : "--°C"}
          </span>
          <span className="text-[11px] text-slate-300 font-semibold">
            {localWeather?.cityName || "VN"}
          </span>
          {localWeather?.isGps && (
            <span title="GPS kích hoạt">
              <MapPin className="h-2.5 w-2.5 text-matcha" />
            </span>
          )}
        </div>

        <span className="h-3 w-px bg-white/20" />

        {/* Tokyo pill */}
        <div className="flex items-center gap-1.5">
          <TokyoIcon className={`h-3.5 w-3.5 ${tokyoInfo.color}`} />
          <span className="font-mono text-xs font-black text-amber-400">
            {tokyoWeather ? `${tokyoWeather.temp}°C` : "--°C"}
          </span>
          <span className="text-[11px] text-slate-300 font-semibold">Tokyo</span>
        </div>

        <span className="h-3 w-px bg-white/15" />

        {/* Aisatsu Indicator */}
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-fuchsia-400 group-hover:text-fuchsia-300 transition">
          <Sparkles className="h-3 w-3" />
          <span>Aisatsu</span>
        </span>
      </button>

      {/* Interactive Modal Portal (guaranteed dead-center on viewport) */}
      <ModalPortal isOpen={isOpen}>
        <div
          className="fixed inset-0 z-[350] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative my-auto flex w-full max-w-2xl flex-col max-h-[90vh] rounded-2xl border border-[var(--brse-panel-border)] bg-[linear-gradient(180deg,rgba(22,23,28,0.98),rgba(14,15,18,0.99))] p-5 sm:p-6 shadow-2xl backdrop-blur-2xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-[var(--brse-panel-border)] pb-3.5 mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan/20 to-fuchsia/20 text-cyan border border-cyan/30">
                  <Compass className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-textPrimary flex items-center gap-2">
                    <span>Thời tiết GPS & Aisatsu Co-Pilot</span>
                    <span className="rounded-full bg-cyan/15 px-2 py-0.5 text-[10px] font-bold text-cyan border border-cyan/30">
                      天気の挨拶
                    </span>
                  </h2>
                  <p className="text-xs text-textMuted mt-0.5">
                    Đồng bộ thời tiết thời gian thực giữa bạn và khách hàng Nhật · Tự động gợi ý câu chào giao tiếp
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => loadWeather(true)}
                  disabled={isLoading}
                  className="rounded-lg border border-[var(--brse-hairline-border)] bg-surface/60 p-2 text-textMuted hover:text-ink hover:bg-surface transition disabled:opacity-50"
                  title="Cập nhật lại GPS và thời tiết"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin text-cyan" : ""}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-2 text-textMuted hover:bg-surface hover:text-ink transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Dual Weather Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-5">
              {/* Local Card */}
              <div className="rounded-2xl border border-cyan/20 bg-gradient-to-br from-cyan/10 to-transparent p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-cyan">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{localWeather?.cityName || "Vị trí của bạn"}</span>
                    {localWeather?.isGps && (
                      <span className="rounded bg-matcha/20 px-1.5 py-0.2 text-[9px] font-bold text-matcha">
                        GPS Active
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-textMuted">{localWeather?.cityNameJa}</span>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div>
                    <span className="text-3xl font-black text-ink">
                      {localWeather ? `${localWeather.temp}°C` : "--"}
                    </span>
                    <p className="text-xs font-semibold text-textMuted mt-0.5">
                      {localInfo.label} ({localInfo.labelJa})
                    </p>
                  </div>
                  <LocalIcon className={`h-12 w-12 ${localInfo.color} opacity-90`} />
                </div>

                <div className="mt-3.5 grid grid-cols-2 gap-2 border-t border-cyan/15 pt-2.5 text-[11px] text-textMuted">
                  <div className="flex items-center gap-1.5">
                    <Droplets className="h-3.5 w-3.5 text-cyan" />
                    <span>Độ ẩm: {localWeather?.humidity}%</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Wind className="h-3.5 w-3.5 text-cyan" />
                    <span>Gió: {localWeather?.windSpeed} km/h</span>
                  </div>
                </div>
              </div>

              {/* Tokyo Card */}
              <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-transparent p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>Tokyo (Khách hàng Nhật)</span>
                  </div>
                  <span className="text-[10px] text-textMuted">日本・東京</span>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div>
                    <span className="text-3xl font-black text-ink">
                      {tokyoWeather ? `${tokyoWeather.temp}°C` : "--"}
                    </span>
                    <p className="text-xs font-semibold text-textMuted mt-0.5">
                      {tokyoInfo.label} ({tokyoInfo.labelJa})
                    </p>
                  </div>
                  <TokyoIcon className={`h-12 w-12 ${tokyoInfo.color} opacity-90`} />
                </div>

                <div className="mt-3.5 grid grid-cols-2 gap-2 border-t border-amber-500/15 pt-2.5 text-[11px] text-textMuted">
                  <div className="flex items-center gap-1.5">
                    <Droplets className="h-3.5 w-3.5 text-amber-400" />
                    <span>Độ ẩm: {tokyoWeather?.humidity}%</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Wind className="h-3.5 w-3.5 text-amber-400" />
                    <span>Gió: {tokyoWeather?.windSpeed} km/h</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Aisatsu Co-Pilot Section */}
            <div className="rounded-2xl border border-[var(--brse-hairline-border)] bg-surface/30 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-fuchsia-400" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-ink">
                    Aisatsu Co-Pilot · Câu chào Keigo ứng dụng ngay
                  </h3>
                </div>
                <span className="text-[11px] text-textMuted">Click sao chép 1 chạm</span>
              </div>

              <div className="space-y-3">
                {aisatsuTemplates.map((item) => (
                  <div
                    key={item.id}
                    className="group relative rounded-xl border border-[var(--brse-hairline-border)] bg-slate-950/40 p-3 hover:border-fuchsia-500/30 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-textPrimary">{item.label}</span>
                        </div>
                        <p className="text-[10px] text-textMuted mt-0.5">{item.description}</p>
                        <p className="mt-2 text-xs font-mono leading-relaxed text-slate-200 whitespace-pre-wrap bg-black/40 rounded-lg p-2.5 border border-white/5 selection:bg-fuchsia-500/30">
                          {item.text}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(item.text, item.id)}
                        className={`shrink-0 inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                          copiedKey === item.id
                            ? "bg-matcha/20 text-matcha border border-matcha/40"
                            : "bg-surface hover:bg-surface/80 text-textMuted hover:text-ink border border-[var(--brse-hairline-border)]"
                        }`}
                      >
                        {copiedKey === item.id ? (
                          <>
                            <Check className="h-3 w-3" />
                            <span>Đã chép</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>Sao chép</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="mt-4 flex items-center justify-between border-t border-[var(--brse-panel-border)] pt-3 text-xs text-textMuted">
              <span>Nguồn: Open-Meteo Weather API · Không lưu vị trí cá nhân</span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg bg-surface px-4 py-1.5 font-semibold text-ink hover:bg-surface/80 transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
    </>
  );
}
