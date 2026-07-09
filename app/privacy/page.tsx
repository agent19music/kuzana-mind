import Nav from "../components/Nav";
import Footer from "../components/Footer";

export const metadata = {
  title: "Privacy notice — Athena",
  description: "How Athena collects, uses, and protects your personal information.",
};

const sections = [
  "What information do we collect?",
  "How do we process your information?",
  "What legal bases do we rely on?",
  "When and with whom do we share your information?",
  "Do we use cookies and tracking technologies?",
  "Do we offer AI-based products?",
  "How long do we keep your information?",
  "How do we keep your information safe?",
  "Do we collect information from minors?",
  "What are your privacy rights?",
  "Controls for do-not-track features",
  "Do other regions have specific privacy rights?",
  "Do we make updates to this notice?",
  "How can you contact us?",
  "How can you review, update, or delete your data?",
];

export default function PrivacyPage() {
  return (
    <>
      <Nav />
      <main
        style={{
          paddingTop: 120,
          paddingBottom: 128,
          minHeight: "100vh",
          background: "var(--background)",
        }}
      >
        <div
          style={{
            maxWidth: 720,
            margin: "0 auto",
            padding: "0 24px",
          }}
        >
          {/* Header */}
          <p
            style={{
              fontSize: 13,
              color: "var(--foreground-subtle)",
              marginBottom: 16,
            }}
          >
            Last updated: April 17, 2026
          </p>
          <h1
            style={{
              fontSize: "clamp(32px, 5vw, 48px)",
              fontWeight: 400,
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              color: "var(--foreground)",
              marginBottom: 24,
            }}
          >
            Privacy notice
          </h1>
          <p
            style={{
              fontSize: 17,
              lineHeight: 1.7,
              color: "var(--foreground-muted)",
              marginBottom: 64,
              maxWidth: 580,
            }}
          >
            This Privacy Notice for Uzski Corp ("we," "us," or "our") describes
            how and why we might access, collect, store, use, and share your
            personal information when you use Athena or visit our website.
            Questions? Contact us at{" "}
            <a
              href="mailto:privacy@uzskicorp.agency"
              style={{ color: "var(--foreground)", textDecoration: "underline", textDecorationColor: "var(--border-strong)" }}
            >
              privacy@uzskicorp.agency
            </a>
            .
          </p>

          {/* Summary */}
          <Section title="Summary of key points">
            <ul style={listStyle}>
              <li style={liStyle}><strong style={strongStyle}>What personal information do we process?</strong> We may process personal information depending on how you interact with Athena, the choices you make, and the features you use.</li>
              <li style={liStyle}><strong style={strongStyle}>Do we process sensitive personal information?</strong> No.</li>
              <li style={liStyle}><strong style={strongStyle}>Do we collect information from third parties?</strong> No.</li>
              <li style={liStyle}><strong style={strongStyle}>How do we process your information?</strong> To provide, improve, and administer the Services, communicate with you, and for security and fraud prevention.</li>
              <li style={liStyle}><strong style={strongStyle}>When do we share information?</strong> In specific situations with specific categories of third parties.</li>
              <li style={liStyle}><strong style={strongStyle}>How do we keep your information safe?</strong> Through organisational and technical safeguards, though no system is 100% secure.</li>
              <li style={liStyle}><strong style={strongStyle}>How do you exercise your rights?</strong> Email us at <a href="mailto:privacy@uzskicorp.agency" style={linkStyle}>privacy@uzskicorp.agency</a>.</li>
            </ul>
          </Section>

          {/* TOC */}
          <Section title="Table of contents">
            <ol style={{ ...listStyle, listStyleType: "decimal", paddingLeft: 20 }}>
              {sections.map((s, i) => (
                <li key={i} style={{ ...liStyle, paddingLeft: 4 }}>{s}</li>
              ))}
            </ol>
          </Section>

          <Section title="1. What information do we collect?">
            <SubHead>Personal information you disclose to us</SubHead>
            <P>We collect personal information that you voluntarily provide when you express an interest in Athena, participate in activities on the Services, or contact us. This may include your name and email address.</P>
            <P>All personal information you provide must be true, complete, and accurate.</P>
            <SubHead>Information automatically collected</SubHead>
            <P>We automatically collect certain information when you visit or use Athena, including your IP address, browser and device characteristics, operating system, language preferences, referring URLs, and information about how and when you use the Services.</P>
            <P>We also collect information through cookies and similar technologies — see Section 5 for details.</P>
            <ul style={listStyle}>
              <li style={liStyle}><strong style={strongStyle}>Device data.</strong> Information about your computer, phone, tablet, or other device used to access Athena.</li>
              <li style={liStyle}><strong style={strongStyle}>Location data.</strong> Approximate location information based on your IP address or device settings.</li>
            </ul>
            <SubHead>Google API</SubHead>
            <P>Our use of information received from Google APIs adheres to the Google API Services User Data Policy, including the Limited Use requirements.</P>
          </Section>

          <Section title="2. How do we process your information?">
            <P>We process your personal information to:</P>
            <ul style={listStyle}>
              <li style={liStyle}>Provide, maintain, and improve Athena</li>
              <li style={liStyle}>Respond to user inquiries and offer support</li>
              <li style={liStyle}>Enable user-to-user communications where applicable</li>
              <li style={liStyle}>Prevent fraud and maintain security</li>
              <li style={liStyle}>Comply with applicable laws</li>
            </ul>
          </Section>

          <Section title="3. What legal bases do we rely on?">
            <P>Under the GDPR and UK GDPR, we may rely on:</P>
            <ul style={listStyle}>
              <li style={liStyle}><strong style={strongStyle}>Consent.</strong> You can withdraw your consent at any time.</li>
              <li style={liStyle}><strong style={strongStyle}>Performance of a contract.</strong> Processing necessary to fulfil our obligations to you.</li>
              <li style={liStyle}><strong style={strongStyle}>Legal obligations.</strong> Processing required to comply with law.</li>
              <li style={liStyle}><strong style={strongStyle}>Vital interests.</strong> Processing necessary to protect vital interests.</li>
            </ul>
          </Section>

          <Section title="4. When and with whom do we share your information?">
            <P>We may share your data with third-party vendors who perform services on our behalf and require access to such information. We have contracts in place to safeguard your personal information. Categories include data analytics services.</P>
            <P><strong style={strongStyle}>Business transfers.</strong> We may share or transfer your information in connection with a merger, sale of assets, financing, or acquisition.</P>
          </Section>

          <Section title="5. Do we use cookies and tracking technologies?">
            <P>We may use cookies and similar tracking technologies (web beacons, pixels) to gather information when you interact with Athena. These help us maintain security, fix bugs, save preferences, and support core functions.</P>
            <P><strong style={strongStyle}>Google Analytics.</strong> We may share your information with Google Analytics to track and analyse use of the Services. To opt out, visit <a href="https://tools.google.com/dlpage/gaoptout" style={linkStyle} target="_blank" rel="noopener noreferrer">tools.google.com/dlpage/gaoptout</a>.</P>
          </Section>

          <Section title="6. Do we offer AI-based products?">
            <P>Yes. Athena is an AI-powered knowledge assistant. As part of our Services, we provide AI features designed to help teams find information from their connected knowledge bases. We may use third-party AI service providers including Google Cloud AI to power these features. Your input, queries, and related information may be processed by these providers as described in this notice.</P>
          </Section>

          <Section title="7. How long do we keep your information?">
            <P>We keep your personal information only as long as necessary for the purposes outlined in this notice, unless a longer retention period is required by law. When we have no ongoing legitimate need to process your information, we will delete or anonymise it.</P>
          </Section>

          <Section title="8. How do we keep your information safe?">
            <P>We have implemented appropriate technical and organisational security measures to protect your personal information. However, no electronic transmission over the internet or information storage technology can be guaranteed 100% secure. Use Athena at your own risk.</P>
          </Section>

          <Section title="9. Do we collect information from minors?">
            <P>We do not knowingly collect data from or market to children under 18. If we learn that personal information from anyone under 18 has been collected, we will take reasonable measures to promptly delete it. Please contact us at <a href="mailto:privacy@uzskicorp.agency" style={linkStyle}>privacy@uzskicorp.agency</a> if you become aware of this.</P>
          </Section>

          <Section title="10. What are your privacy rights?">
            <P>Depending on applicable law, you may have the right to request access to, correction of, or erasure of your personal information, restrict or object to our processing, request data portability, and the right not to be subject to automated decision-making.</P>
            <P>To exercise these rights, email us at <a href="mailto:privacy@uzskicorp.agency" style={linkStyle}>privacy@uzskicorp.agency</a>.</P>
            <P><strong style={strongStyle}>Withdrawing consent.</strong> You may withdraw consent at any time by contacting us.</P>
            <P><strong style={strongStyle}>Opting out of marketing.</strong> You can unsubscribe at any time via the unsubscribe link in any email we send.</P>
          </Section>

          <Section title="11. Controls for do-not-track features">
            <P>Most browsers include a Do-Not-Track ("DNT") setting. Because no uniform standard for recognising DNT signals has been finalised, we do not currently respond to DNT browser signals.</P>
          </Section>

          <Section title="12. Do other regions have specific privacy rights?">
            <SubHead>Republic of South Africa</SubHead>
            <P>You have the right to request access to or correction of your personal information. If unsatisfied with how we address a complaint, you can contact the Information Regulator (South Africa) at <a href="https://inforegulator.org.za" style={linkStyle} target="_blank" rel="noopener noreferrer">inforegulator.org.za</a>.</P>
            <ul style={listStyle}>
              <li style={liStyle}>General enquiries: <a href="mailto:enquiries@inforegulator.org.za" style={linkStyle}>enquiries@inforegulator.org.za</a></li>
              <li style={liStyle}>POPIA/PAIA complaints: <a href="mailto:POPIAComplaints@inforegulator.org.za" style={linkStyle}>POPIAComplaints@inforegulator.org.za</a></li>
            </ul>
          </Section>

          <Section title="13. Do we make updates to this notice?">
            <P>Yes. We may update this Privacy Notice from time to time to stay compliant with relevant laws. The updated version will be indicated by a revised date at the top of this page.</P>
          </Section>

          <Section title="14. How can you contact us?">
            <P>If you have questions or comments about this notice:</P>
            <address style={{ fontStyle: "normal", lineHeight: 1.8, color: "var(--foreground-muted)", fontSize: 15 }}>
              Uzski Corp<br />
              Abc Place Nairobi, Waiyaki Way<br />
              Nairobi, Nairobi County 00100<br />
              Kenya<br />
              <a href="tel:+254745071299" style={linkStyle}>+254 745 071 299</a><br />
              <a href="mailto:privacy@uzskicorp.agency" style={linkStyle}>privacy@uzskicorp.agency</a>
            </address>
          </Section>

          <Section title="15. How can you review, update, or delete your data?">
            <P>Based on applicable laws, you may have the right to request access to, correction of, or deletion of personal information we hold about you. Email us at <a href="mailto:privacy@uzskicorp.agency" style={linkStyle}>privacy@uzskicorp.agency</a> to submit a request.</P>
          </Section>
        </div>
      </main>
      <Footer />
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 64 }}>
      <h2
        style={{
          fontSize: 22,
          fontWeight: 400,
          letterSpacing: "-0.01em",
          color: "var(--foreground)",
          marginBottom: 20,
          lineHeight: 1.3,
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function SubHead({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: 15,
        fontWeight: 400,
        color: "var(--foreground)",
        marginBottom: 10,
        marginTop: 24,
      }}
    >
      {children}
    </p>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: 15,
        lineHeight: 1.75,
        color: "var(--foreground-muted)",
        marginBottom: 16,
      }}
    >
      {children}
    </p>
  );
}

const listStyle: React.CSSProperties = {
  listStyle: "disc",
  paddingLeft: 20,
  margin: "0 0 16px 0",
};

const liStyle: React.CSSProperties = {
  fontSize: 15,
  lineHeight: 1.75,
  color: "var(--foreground-muted)",
  marginBottom: 8,
};

const strongStyle: React.CSSProperties = {
  fontWeight: 400,
  color: "var(--foreground)",
};

const linkStyle: React.CSSProperties = {
  color: "var(--foreground)",
  textDecoration: "underline",
  textDecorationColor: "var(--border-strong)",
};
