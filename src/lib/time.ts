/** Local calendar day key, e.g. "2026-11-12". Used to scope tasks to today only. */
export function dayKey(at: number = Date.now()): string {
  const d = new Date(at);
  const month = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

/** "24:13" — always mm:ss, minutes not padded past 99. */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${`${seconds}`.padStart(2, "0")}`;
}

export const MINUTE = 60_000;
