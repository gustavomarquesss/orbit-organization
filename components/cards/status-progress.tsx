type StatusLite = { id: string; key: string; label: string; color: string };

function computeProgress(status: StatusLite, allStatuses: StatusLite[]): number {
  if (status.key === "arquivado") return 0;
  if (status.key === "concluido") return 1;

  const workflow = allStatuses.filter((s) => s.key !== "arquivado" && s.key !== "concluido");
  const index = workflow.findIndex((s) => s.id === status.id);
  if (index === -1) return 0.5;
  return (index + 1) / (workflow.length + 1);
}

export function StatusProgress({
  status,
  allStatuses,
}: {
  status: StatusLite;
  allStatuses: StatusLite[];
}) {
  const progress = computeProgress(status, allStatuses);

  const size = 15;
  const stroke = 2.25;
  const center = size / 2;
  const radius = center - stroke / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap"
      style={{ borderColor: `${status.color}40`, color: status.color, backgroundColor: `${status.color}1a` }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        <circle cx={center} cy={center} r={radius} fill="none" stroke={status.color} strokeOpacity={0.25} strokeWidth={stroke} />
        {progress > 0 ? (
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={status.color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${center} ${center})`}
          />
        ) : null}
      </svg>
      {status.label}
    </span>
  );
}
