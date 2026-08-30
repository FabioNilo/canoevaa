import type { QuotaPeriod } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

export type MembershipPeriod = {
  start: Date;
  end: Date;
};

function addMonths(date: Date, months: number): Date {
  const anchorDay = date.getUTCDate();
  const result = new Date(date.getTime());
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const daysInTargetMonth = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate();
  result.setUTCDate(Math.min(anchorDay, daysInTargetMonth));
  return result;
}

/**
 * Janela de cotas vigente para a data `now`, ancorada em `startedAt`.
 * Períodos semanais avançam de 7 em 7 dias; mensais avançam mês a mês
 * preservando o dia de adesão.
 */
export function currentPeriod(startedAt: Date, period: QuotaPeriod, now: Date): MembershipPeriod {
  if (period === "weekly") {
    const elapsedPeriods = Math.max(0, Math.floor((now.getTime() - startedAt.getTime()) / (7 * DAY_MS)));
    const start = new Date(startedAt.getTime() + elapsedPeriods * 7 * DAY_MS);
    return { start, end: new Date(start.getTime() + 7 * DAY_MS) };
  }

  let start = new Date(startedAt.getTime());
  let end = addMonths(start, 1);

  for (let guard = 0; guard < 1200 && now.getTime() >= end.getTime(); guard += 1) {
    start = end;
    end = addMonths(start, 1);
  }

  return { start, end };
}

export function grantIdempotencyKey(membershipId: string, periodStart: Date): string {
  return `grant:${membershipId}:${periodStart.toISOString().slice(0, 10)}`;
}

export function expireIdempotencyKey(membershipId: string, periodStart: Date): string {
  return `expire:${membershipId}:${periodStart.toISOString().slice(0, 10)}`;
}

export function debitIdempotencyKey(reservationId: string): string {
  return `debit:${reservationId}`;
}

export function refundIdempotencyKey(reservationId: string): string {
  return `refund:${reservationId}`;
}
