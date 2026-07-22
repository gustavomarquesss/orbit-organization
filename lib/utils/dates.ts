export function formatRelative(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.round(diffMs / 60000);

  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `há ${diffMin}min`;

  const diffHours = Math.round(diffMin / 60);
  if (diffHours < 24) return `há ${diffHours}h`;

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 30) return `há ${diffDays}d`;

  return date.toLocaleDateString("pt-BR");
}
