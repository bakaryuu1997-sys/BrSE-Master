import { describe, expect, it, beforeEach } from "vitest";
import {
  recordServicePing,
  getServicePingHistory,
  getServicePingStats,
  clearPingHistory,
} from "@/lib/latencyHistory";

describe("latencyHistory", () => {
  beforeEach(() => {
    clearPingHistory();
  });

  it("records ping entries and retrieves history", () => {
    recordServicePing("backend", 45, "ok");
    recordServicePing("backend", 55, "ok");

    const history = getServicePingHistory("backend");
    expect(history.length).toBe(2);
    expect(history[0].latency).toBe(45);
    expect(history[1].latency).toBe(55);
  });

  it("calculates avg, min, max correctly", () => {
    recordServicePing("db", 10, "ok");
    recordServicePing("db", 20, "ok");
    recordServicePing("db", 30, "ok");

    const stats = getServicePingStats("db");
    expect(stats.samplesCount).toBe(3);
    expect(stats.minLatency).toBe(10);
    expect(stats.maxLatency).toBe(30);
    expect(stats.avgLatency).toBe(20);
    expect(stats.failureRate).toBe(0);
    expect(stats.isDegraded).toBe(false);
  });

  it("flags degraded when failure rate exceeds threshold", () => {
    recordServicePing("ai", 100, "error");
    recordServicePing("ai", 120, "error");
    recordServicePing("ai", 110, "ok");

    const stats = getServicePingStats("ai");
    expect(stats.failureRate).toBe(67);
    expect(stats.isDegraded).toBe(true);
    expect(stats.anomalyReason).toContain("Tỉ lệ lỗi mạng cao");
  });

  it("flags degraded when AI latency exceeds 1200ms", () => {
    recordServicePing("ai", 1300, "ok");
    recordServicePing("ai", 1400, "ok");

    const stats = getServicePingStats("ai");
    expect(stats.isDegraded).toBe(true);
    expect(stats.anomalyReason).toContain("9Router AI phản hồi chậm");
  });
});
