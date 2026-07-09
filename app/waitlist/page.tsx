"use client";

import { useState } from "react";
import Nav from "../components/Nav";
import Footer from "../components/Footer";

export default function Waitlist() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "duplicate" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !company || !role) return;

    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, company, role }),
      });
      const data = await res.json();
      
      if (res.ok) {
        if (data.status === "duplicate") {
          setStatus("duplicate");
        } else {
          setStatus("success");
          setName("");
          setEmail("");
          setCompany("");
          setRole("");
        }
        setMessage(data.message || "Thanks for joining!");
      } else {
        setStatus("error");
        setMessage(data.error || "Failed to join waitlist. Please try again.");
      }
    } catch (err) {
      setStatus("error");
      setMessage("An unexpected error occurred.");
    }
  };

  return (
    <>
      <Nav />
      <main
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100svh",
          background: "#0f0f0f",
          padding: "var(--space-6)",
          color: "#ffffff",
          textAlign: "center"
        }}
      >
        <div style={{ maxWidth: 440, width: "100%", marginTop: 72 }}>
          <h1
            style={{
              fontSize: "clamp(40px, 6vw, 56px)",
              fontWeight: 400,
              letterSpacing: "-0.03em",
              lineHeight: 1.0,
              marginBottom: "var(--space-4)",
            }}
          >
            Join the waitlist
          </h1>
          <p
            style={{
              fontSize: 18,
              color: "rgba(255,255,255,0.6)",
              lineHeight: 1.6,
              marginBottom: "var(--space-8)",
            }}
          >
            Get early access to Athena and empower your team with an instant second brain.
          </p>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <input
              type="text"
              placeholder="Your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={status === "loading" || status === "success"}
              required
              style={{
                width: "100%",
                height: 52,
                padding: "0 20px",
                borderRadius: 12,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#ffffff",
                fontSize: 16,
                outline: "none",
                transition: "border-color 200ms ease",
              }}
              onFocus={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.4)")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
            />

            <input
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={status === "loading" || status === "success"}
              required
              style={{
                width: "100%",
                height: 52,
                padding: "0 20px",
                borderRadius: 12,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#ffffff",
                fontSize: 16,
                outline: "none",
                transition: "border-color 200ms ease",
              }}
              onFocus={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.4)")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
            />

            <div style={{ display: "flex", gap: "var(--space-4)" }}>
              <input
                type="text"
                placeholder="Company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                disabled={status === "loading" || status === "success"}
                required
                style={{
                  width: "100%",
                  height: 52,
                  padding: "0 20px",
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#ffffff",
                  fontSize: 16,
                  outline: "none",
                  transition: "border-color 200ms ease",
                }}
                onFocus={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.4)")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
              />

              <input
                type="text"
                placeholder="Role (e.g. Founder)"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                disabled={status === "loading" || status === "success"}
                required
                style={{
                  width: "100%",
                  height: 52,
                  padding: "0 20px",
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#ffffff",
                  fontSize: 16,
                  outline: "none",
                  transition: "border-color 200ms ease",
                }}
                onFocus={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.4)")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
              />
            </div>

            <button
              type="submit"
              disabled={status === "loading" || status === "success"}
              style={{
                height: 52,
                borderRadius: 12,
                background: status === "success" ? "#34A853" : "#ffffff",
                color: status === "success" ? "#ffffff" : "#171717",
                fontSize: 16,
                fontWeight: 500,
                border: "none",
                cursor: status === "loading" || status === "success" ? "not-allowed" : "pointer",
                transition: "all 200ms ease",
              }}
            >
              {status === "loading" ? "Joining..." : status === "success" ? "Joined!" : "Join waitlist"}
            </button>
          </form>

          {message && (
            <p
              style={{
                marginTop: "var(--space-4)",
                fontSize: 14,
                color: status === "error" ? "#EA4335" : status === "duplicate" ? "#FBBC05" : "rgba(255,255,255,0.7)",
              }}
            >
              {message}
            </p>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
