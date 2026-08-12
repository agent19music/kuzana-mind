"use client";

import { useClerk, useOrganization } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import PageFadeIn from "@/components/PageFadeIn";

const inputStyle = (focused: boolean): React.CSSProperties => ({
  width: "100%",
  height: 48,
  borderRadius: "var(--radius-md)",
  border: `1px solid ${focused ? "var(--foreground)" : "var(--border-strong)"}`,
  background: "var(--background)",
  color: "var(--foreground)",
  fontSize: 15,
  fontWeight: 400,
  padding: "0 var(--space-4)",
  outline: "none",
  fontFamily: "var(--font-sans)",
  transition: "border-color 150ms ease-out",
  boxSizing: "border-box",
});

const textareaStyle = (focused: boolean): React.CSSProperties => ({
  width: "100%",
  borderRadius: "var(--radius-md)",
  border: `1px solid ${focused ? "var(--foreground)" : "var(--border-strong)"}`,
  background: "var(--background)",
  color: "var(--foreground)",
  fontSize: 14,
  fontWeight: 400,
  padding: "var(--space-3) var(--space-4)",
  outline: "none",
  fontFamily: "var(--font-sans)",
  transition: "border-color 150ms ease-out",
  resize: "vertical",
  minHeight: 96,
  lineHeight: 1.6,
  boxSizing: "border-box",
});

function Field({
  label,
  hint,
  optional,
  children,
}: {
  label: string;
  hint?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-2)" }}>
        <label style={{ fontSize: 13, color: "var(--foreground-muted)", fontFamily: "var(--font-sans)" }}>
          {label}
        </label>
        {optional && (
          <span style={{ fontSize: 12, color: "var(--foreground-subtle)", fontFamily: "var(--font-sans)" }}>
            optional
          </span>
        )}
      </div>
      {children}
      {hint && (
        <p style={{ fontSize: 12, color: "var(--foreground-subtle)", fontFamily: "var(--font-sans)", margin: 0 }}>
          {hint}
        </p>
      )}
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const { setActive } = useClerk();
  const { organization, isLoaded } = useOrganization();

  // If this org is already fully onboarded, skip straight to dashboard.
  // We only redirect once Clerk has loaded — prevents the flash.
  useEffect(() => {
    if (!isLoaded) return;
    if (organization?.publicMetadata?.onboarded === true) {
      router.replace("/dashboard");
    }
  }, [isLoaded, organization, router]);

  // Pre-fill org name if Clerk's sign-up UI already created the org
  const [orgName, setOrgName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [notionApiKey, setNotionApiKey] = useState("");
  const [notionRootPageId, setNotionRootPageId] = useState("");
  const [publicDocUrls, setPublicDocUrls] = useState("");
  const [tallyApiKey, setTallyApiKey] = useState("");
  const [tallyFormIds, setTallyFormIds] = useState("");

  // Sync org name from Clerk when it loads
  useEffect(() => {
    if (isLoaded && organization?.name && !orgName) {
      setOrgName(organization.name);
    }
  }, [isLoaded, organization, orgName]);

  const [focused, setFocused] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Don't render anything until Clerk has loaded — prevents the flash
  if (!isLoaded) return null;

  // If org is onboarded, useEffect will redirect — render nothing in the meantime
  if (organization?.publicMetadata?.onboarded === true) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const publicDocIds = publicDocUrls
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const tallyFormIdList = tallyFormIds
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const res = await fetch("/api/orgs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgName: orgName.trim(),
          logoUrl: logoUrl || null,
          notionApiKey: notionApiKey || null,
          notionRootPageId: notionRootPageId || null,
          publicDocIds,
          tallyApiKey: tallyApiKey || null,
          tallyFormIds: tallyFormIdList,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      // If we just created a new org, activate it in the session before navigating.
      // Without this the dashboard sees no orgId and redirects back here.
      if (data.isNew) {
        await setActive({ organization: data.org_id });
      }

      router.push("/dashboard");
    } catch {
      setError("Could not connect. Check your internet and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const hasExistingOrg = !!organization;

  // Whether the user has filled in at least one knowledge source. Drives the
  // existing-org CTA: nothing filled → "Skip" (go straight to the dashboard,
  // connect sources later); at least one → "Connect sources".
  const hasAnySource = !!(
    notionApiKey.trim() ||
    notionRootPageId.trim() ||
    publicDocUrls.trim() ||
    tallyApiKey.trim() ||
    tallyFormIds.trim()
  );

  return (
    <div
      style={{
        minHeight: "100svh",
        background: "var(--background)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-8) var(--space-6)",
      }}
    >
      <PageFadeIn
        style={{
          width: "100%",
          maxWidth: 480,
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-8)",
        }}
      >
        {/* Logo */}
        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
          <Image src="/athena-mind-logo.png" alt="Athena" width={36} height={36} />
          <span style={{ fontSize: 15, letterSpacing: "-0.01em", color: "var(--foreground)" }}>
            Athena
          </span>
        </Link>

        {/* Card */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border-strong)",
            borderRadius: "var(--radius-lg)",
            padding: "var(--space-8)",
          }}
        >
          <h1
            style={{
              fontSize: 22,
              letterSpacing: "-0.01em",
              color: "var(--foreground)",
              marginBottom: "var(--space-2)",
              fontFamily: "var(--font-sans)",
            }}
          >
            {hasExistingOrg ? "Connect your knowledge sources" : "Set up your organisation"}
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "var(--foreground-muted)",
              lineHeight: 1.6,
              marginBottom: "var(--space-8)",
              fontFamily: "var(--font-sans)",
            }}
          >
            {hasExistingOrg
              ? `${organization.name} is ready. Add your Notion, Google Docs, or Tally forms to start answering questions.`
              : "Connect your knowledge sources. You can update these anytime from settings."}
          </p>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
            {/* Org name — only if no existing org */}
            {!hasExistingOrg && (
              <Field label="Organisation name">
                <input
                  type="text"
                  required
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  onFocus={() => setFocused("orgName")}
                  onBlur={() => setFocused(null)}
                  placeholder="Acme Corp"
                  style={inputStyle(focused === "orgName")}
                />
              </Field>
            )}

            {/* Logo — only if no existing org */}
            {!hasExistingOrg && (
              <Field label="Logo URL" optional hint="Paste a public image URL. PNG or SVG works best.">
                <input
                  type="url"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  onFocus={() => setFocused("logo")}
                  onBlur={() => setFocused(null)}
                  placeholder="https://acme.com/logo.png"
                  style={inputStyle(focused === "logo")}
                />
              </Field>
            )}

            {/* Knowledge sources */}
            <div
              style={{
                borderTop: hasExistingOrg ? "none" : "1px solid var(--border)",
                paddingTop: hasExistingOrg ? 0 : "var(--space-6)",
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-6)",
              }}
            >
              {!hasExistingOrg && (
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--foreground-subtle)",
                    fontFamily: "var(--font-sans)",
                    marginTop: "calc(-1 * var(--space-6))",
                    marginBottom: 0,
                  }}
                >
                  Knowledge sources
                </p>
              )}

              <Field
                label="Notion API key"
                optional
                hint="Create an internal integration at notion.so/my-integrations and share your root page with it."
              >
                <input
                  type="password"
                  value={notionApiKey}
                  onChange={(e) => setNotionApiKey(e.target.value)}
                  onFocus={() => setFocused("notionKey")}
                  onBlur={() => setFocused(null)}
                  placeholder="ntn_..."
                  style={inputStyle(focused === "notionKey")}
                  autoComplete="off"
                />
              </Field>

              <Field
                label="Notion root page ID"
                optional
                hint="The 32-character ID from the page URL — the part after the last dash."
              >
                <input
                  type="text"
                  value={notionRootPageId}
                  onChange={(e) => setNotionRootPageId(e.target.value)}
                  onFocus={() => setFocused("notionRoot")}
                  onBlur={() => setFocused(null)}
                  placeholder="a1b2c3d4e5f6..."
                  style={inputStyle(focused === "notionRoot")}
                />
              </Field>

              <Field
                label="Public Google Doc URLs"
                optional
                hint="One URL or doc ID per line. Docs must be shared as 'Anyone with the link can view'."
              >
                <textarea
                  value={publicDocUrls}
                  onChange={(e) => setPublicDocUrls(e.target.value)}
                  onFocus={() => setFocused("docs")}
                  onBlur={() => setFocused(null)}
                  placeholder={"https://docs.google.com/document/d/...\nhttps://docs.google.com/document/d/..."}
                  style={textareaStyle(focused === "docs")}
                />
              </Field>

              <Field
                label="Tally API key"
                optional
                hint="Create a personal access token at tally.so/settings/api to pull form feedback."
              >
                <input
                  type="password"
                  value={tallyApiKey}
                  onChange={(e) => setTallyApiKey(e.target.value)}
                  onFocus={() => setFocused("tallyKey")}
                  onBlur={() => setFocused(null)}
                  placeholder="tly-..."
                  style={inputStyle(focused === "tallyKey")}
                  autoComplete="off"
                />
              </Field>

              <Field
                label="Tally form IDs"
                optional
                hint="One form ID per line — staff can then ask about feedback and responses from these forms."
              >
                <textarea
                  value={tallyFormIds}
                  onChange={(e) => setTallyFormIds(e.target.value)}
                  onFocus={() => setFocused("tallyForms")}
                  onBlur={() => setFocused(null)}
                  placeholder={"wQpQ8j\nmexJoq"}
                  style={textareaStyle(focused === "tallyForms")}
                />
              </Field>
            </div>

            {error && (
              <p style={{ fontSize: 13, color: "#dc2626", fontFamily: "var(--font-sans)", margin: 0 }}>
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={submitting || (!hasExistingOrg && !orgName.trim())}
              variant="primary-dark"
              size="lg"
              full
            >
              {submitting
                ? hasExistingOrg
                  ? hasAnySource ? "Connecting…" : "Skipping…"
                  : "Creating organisation…"
                : hasExistingOrg
                  ? hasAnySource ? "Connect sources" : "Skip"
                  : "Create organisation"}
            </Button>
          </form>
        </div>
      </PageFadeIn>
    </div>
  );
}
