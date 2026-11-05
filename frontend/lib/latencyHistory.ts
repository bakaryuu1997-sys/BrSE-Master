/**
 * Client-side rolling ping latency recorder and anomaly detector.
 * Stores up to 60 historical samples per service in localStorage.
 */

export interface PingRecord {
  timestamp: number;
  serviceId: string;
  latency: number;
  status: "ok" | "warn" | "error" | "checking";
  detail?: string;
}

const STORAGE_KEY = "brse.pingHistory.v1";
const MAX_SAMPLES_PER_SERVICE = 60;

function readAll(): Record<string, PingRecord[]> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeAll(data: Record<string, PingRecord[]>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore quota errors
  }
}

export function recordServicePing(
  serviceId: string,
  latency: number,
  status: "ok" | "warn" | "error" | "checking",
  detail?: string
): void {
  const all = readAll();
  const current = all[serviceId] || [];
  const entry: PingRecord = {
    timestamp: Date.now(),
    serviceId,
    latency: Math.max(0, Math.round(latency)),
    status,
    detail,
  };
  all[serviceId] = [...current.slice(-(MAX_SAMPLES_PER_SERVICE - 1)), entry];
  writeAll(all);
}

export function getServicePingHistory(serviceId: string): PingRecord[] {
  const all = readAll();
  return all[serviceId] || [];
}

export interface PingStats {
  samplesCount: number;
  avgLatency: number;
  minLatency: number;
  maxLatency: number;
  failureRate: number; // 0 - 100%
  isDegraded: boolean;
  anomalyReason?: string;
}

export function getServicePingStats(serviceId: string): PingStats {
  const history = getServicePingHistory(serviceId);
  if (!history.length) {
    return {
      samplesCount: 0,
      avgLatency: 0,
      minLatency: 0,
      maxLatency: 0,
      failureRate: 0,
      isDegraded: false,
    };
  }

  const validPings = history.filter((h) => h.status !== "error" && typeof h.latency === "number");
  const failureCount = history.filter((h) => h.status === "error").length;
  const failureRate = Math.round((failureCount / history.length) * 100);

  const latencies = validPings.map((h) => h.latency);
  const minLatency = latencies.length ? Math.min(...latencies) : 0;
  const maxLatency = latencies.length ? Math.max(...latencies) : 0;
  const sum = latencies.reduce((acc, v) => acc + v, 0);
  const avgLatency = latencies.length ? Math.round(sum / latencies.length) : 0;

  // Anomaly detection rules
  let isDegraded = false;
  let anomalyReason: string | undefined;

  if (failureRate >= 20) {
    isDegraded = true;
    anomalyReason = `Tỉ lệ lỗi mạng cao (${failureRate}% trong các lần ping gần đây)`;
  } else if (serviceId === "ai" && avgLatency > 1200) {
    isDegraded = true;
    anomalyReason = `9Router AI phản hồi chậm cục bộ (${avgLatency}ms > ngưỡng khuyến nghị 800ms)`;
  } else if (avgLatency > 500 && serviceId !== "ai") {
    isDegraded = true;
    anomalyReason = `Độ trễ trung bình ${avgLatency}ms cao bất thường`;
  }

  return {
    samplesCount: history.length,
    avgLatency,
    minLatency,
    maxLatency,
    failureRate,
    isDegraded,
    anomalyReason,
  };
}

export function clearPingHistory(): void {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}
