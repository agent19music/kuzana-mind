export default function Footer() {
  return (
    <footer
      style={{
        background: "var(--surface)",
        borderTop: "1px solid var(--border)",
        padding: "var(--space-8) 0",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0 var(--space-16)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "var(--foreground)",
            letterSpacing: "-0.01em",
          }}
        >
          Kuzana Brain
        </span>
        <span
          style={{
            fontSize: 13,
            color: "var(--foreground-subtle)",
          }}
        >
          Internal · {new Date().getFullYear()}
        </span>
      </div>
    </footer>
  );
}
