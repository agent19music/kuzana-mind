interface StaffCardProps {
  answer: string;
  staffName?: string;
  staffEmail?: string;
  staffDomain?: string;
  staffTitle?: string;
  staffDepartment?: string;
}

export default function StaffCard({
  answer,
  staffName,
  staffEmail,
  staffDomain,
  staffTitle,
  staffDepartment,
}: StaffCardProps) {
  const initials = staffName
    ? staffName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "?";

  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-6)",
        boxShadow: "var(--shadow-xs)",
      }}
    >
      {/* No exact doc label */}
      <p
        style={{
          fontSize: 13,
          fontWeight: 400,
          color: "var(--foreground-subtle)",
          marginBottom: "var(--space-4)",
          letterSpacing: "0.01em",
        }}
      >
        No exact documentation found
      </p>

      {/* Answer text */}
      <p
        style={{
          fontSize: 15,
          color: "var(--foreground)",
          lineHeight: 1.7,
          marginBottom: "var(--space-6)",
        }}
      >
        {answer}
      </p>

      {/* Staff contact row */}
      {staffName && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "var(--space-4)",
            background: "var(--inset-surface)",
            borderRadius: "var(--radius-md)",
            padding: "var(--space-4) var(--space-4)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            {/* Avatar */}
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "var(--brand-olive)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--brand-cream)",
                fontSize: 13,
                fontWeight: 400,
                flexShrink: 0,
              }}
            >
              {initials}
            </div>
            <div>
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 400,
                  color: "var(--foreground)",
                  lineHeight: 1.3,
                }}
              >
                {staffName}
              </p>
              {(staffTitle || staffDepartment || staffDomain) && (
                <p
                  style={{
                    fontSize: 12,
                    color: "var(--foreground-muted)",
                    marginTop: 2,
                  }}
                >
                  {staffTitle
                    ? `${staffTitle}${staffDepartment ? ` · ${staffDepartment}` : ""}`
                    : staffDomain}
                </p>
              )}
            </div>
          </div>

          {staffEmail && (
            <a
              href={`mailto:${staffEmail}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                height: 36,
                borderRadius: 9999,
                background: "var(--foreground)",
                color: "var(--background)",
                fontSize: 13,
                fontWeight: 400,
                padding: "0 16px",
                textDecoration: "none",
                flexShrink: 0,
                transition: "opacity 200ms ease-out",
              }}
            >
              Email
            </a>
          )}
        </div>
      )}
    </div>
  );
}
