export const CARD_RECORRENCIA_OPTIONS = [
  { value: "semanal", label: "Semanal" },
  { value: "quinzenal", label: "Quinzenal" },
  { value: "mensal", label: "Mensal" },
] as const;

export function cardRecorrenciaLabel(value: string | null | undefined): string | null {
  return CARD_RECORRENCIA_OPTIONS.find((o) => o.value === value)?.label ?? null;
}
