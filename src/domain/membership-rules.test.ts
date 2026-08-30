import { describe, expect, it } from "vitest";
import {
  currentPeriod,
  debitIdempotencyKey,
  expireIdempotencyKey,
  grantIdempotencyKey,
} from "./membership-rules";

describe("currentPeriod (weekly)", () => {
  const startedAt = new Date("2026-06-01T00:00:00.000Z");

  it("returns the first window on the adhesion date", () => {
    const period = currentPeriod(startedAt, "weekly", startedAt);
    expect(period.start.toISOString()).toBe("2026-06-01T00:00:00.000Z");
    expect(period.end.toISOString()).toBe("2026-06-08T00:00:00.000Z");
  });

  it("stays in the first window until it closes", () => {
    const period = currentPeriod(startedAt, "weekly", new Date("2026-06-07T23:59:00.000Z"));
    expect(period.start.toISOString()).toBe("2026-06-01T00:00:00.000Z");
  });

  it("advances to the window covering now", () => {
    const period = currentPeriod(startedAt, "weekly", new Date("2026-06-20T12:00:00.000Z"));
    expect(period.start.toISOString()).toBe("2026-06-15T00:00:00.000Z");
    expect(period.end.toISOString()).toBe("2026-06-22T00:00:00.000Z");
  });

  it("clamps to the first window when now precedes the start", () => {
    const period = currentPeriod(startedAt, "weekly", new Date("2026-05-01T00:00:00.000Z"));
    expect(period.start.toISOString()).toBe("2026-06-01T00:00:00.000Z");
  });
});

describe("currentPeriod (monthly)", () => {
  it("advances month by month preserving the adhesion day", () => {
    const startedAt = new Date("2026-01-15T00:00:00.000Z");
    const period = currentPeriod(startedAt, "monthly", new Date("2026-03-20T00:00:00.000Z"));
    expect(period.start.toISOString()).toBe("2026-03-15T00:00:00.000Z");
    expect(period.end.toISOString()).toBe("2026-04-15T00:00:00.000Z");
  });

  it("clamps the period boundary to shorter months", () => {
    const startedAt = new Date("2026-01-31T00:00:00.000Z");
    const period = currentPeriod(startedAt, "monthly", new Date("2026-02-15T00:00:00.000Z"));
    expect(period.start.toISOString()).toBe("2026-01-31T00:00:00.000Z");
    expect(period.end.toISOString()).toBe("2026-02-28T00:00:00.000Z");
  });
});

describe("idempotency keys", () => {
  it("keys a grant by membership and period start day", () => {
    expect(grantIdempotencyKey("m_1", new Date("2026-06-15T00:00:00.000Z"))).toBe("grant:m_1:2026-06-15");
    expect(expireIdempotencyKey("m_1", new Date("2026-06-15T00:00:00.000Z"))).toBe("expire:m_1:2026-06-15");
  });

  it("keys reservation-driven movements by reservation id", () => {
    expect(debitIdempotencyKey("r_1")).toBe("debit:r_1");
  });
});
