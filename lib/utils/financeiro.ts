const RECORRENCIA_MONTHS: Record<string, number> = {
  mensal: 1,
  trimestral: 3,
  semestral: 6,
  anual: 12,
};

// Próxima renovação a partir de hoje, avançando a data de início pelo
// intervalo da recorrência. Pagamentos "único" não renovam.
export function nextRenewalDate(dataInicio: string, recorrencia: string): Date | null {
  const months = RECORRENCIA_MONTHS[recorrencia];
  if (!months) return null;

  const start = new Date(`${dataInicio}T00:00:00`);
  if (Number.isNaN(start.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const next = new Date(start);
  while (next < today) {
    next.setMonth(next.getMonth() + months);
  }
  return next;
}

export function formatCurrencyBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
