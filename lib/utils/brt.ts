const TZ = "America/Sao_Paulo";

// Data de hoje (YYYY-MM-DD) no fuso de Brasília — é a "virada do dia" dos checklists diários.
export function todayBRT(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    now,
  );
}

// Soma (ou subtrai) dias a uma data YYYY-MM-DD, sem depender de fuso.
export function addDaysToDate(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + days));
  return utc.toISOString().slice(0, 10);
}
