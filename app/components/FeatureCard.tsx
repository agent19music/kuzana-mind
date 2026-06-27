interface FeatureCardProps {
  number: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

export default function FeatureCard({ number, title, description, icon }: FeatureCardProps) {
  return (
    <article
      style={{
        background: "#ffffff",
        border: "1px solid #e5e5e5",
        borderRadius: 8,
        padding: "32px 28px",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
      }}
      className="group hover:-translate-y-0.5 hover:shadow-[0_4px_24px_rgba(0,0,0,0.07)]"
    >
      <div className="flex items-start justify-between mb-6">
        <div
          style={{
            width: 44,
            height: 44,
            background: "#f5f5f5",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#1a1a1a",
          }}
        >
          {icon}
        </div>
        <span
          style={{
            color: "#a3a3a3",
            fontSize: 13,
            fontWeight: 400,
            letterSpacing: "0.04em",
          }}
        >
          {number}
        </span>
      </div>

      <h3
        style={{
          fontSize: 18,
          fontWeight: 400,
          color: "#1a1a1a",
          letterSpacing: "-0.01em",
          marginBottom: 10,
          lineHeight: 1.3,
        }}
      >
        {title}
      </h3>
      <p style={{ fontSize: 15, color: "#6b6b6b", lineHeight: 1.65 }}>{description}</p>
    </article>
  );
}
