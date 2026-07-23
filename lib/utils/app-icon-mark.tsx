// Marca do Orbit (mesmo desenho de app/icon.svg) reaproveitada pelos ícones
// gerados via next/og (apple-icon, ícones do manifest) em diferentes tamanhos.
export function AppIconMark({ size }: { size: number }) {
  const iconSize = Math.round(size * 0.62);
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#18181b",
      }}
    >
      <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
        <g stroke="#fafafa" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <ellipse cx="12" cy="12" rx="7.5" ry="3.4" transform="rotate(-30 12 12)" />
        </g>
        <circle cx="12" cy="12" r="1.5" fill="#fafafa" />
        <circle cx="18.3" cy="8.6" r="1.5" fill="#fafafa" />
      </svg>
    </div>
  );
}
