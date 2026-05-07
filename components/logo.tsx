export function Logo({ size = 36 }: { size?: number }) {
  const inner = Math.round(size * 0.6);
  return (
    <div style={{
      width: size, height: size, background: "#1F3D2B",
      borderRadius: Math.round(size * 0.3),
      display: "flex", alignItems: "center", justifyContent: "center"
    }}>
      <svg width={inner} height={inner} viewBox="0 0 24 24" fill="none">
        <path d="M12 3L3 10V21H9V15H15V21H21V10L12 3Z" fill="#E8C07D" />
        <circle cx="12" cy="13" r="1.4" fill="#1F3D2B" />
      </svg>
    </div>
  );
}
