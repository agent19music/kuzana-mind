import Nav from "../components/Nav";
import Footer from "../components/Footer";

export const metadata = {
  title: "Terms of service — Athena",
  description: "The legal terms governing your use of Athena.",
};

const toc = [
  "Agreement to our legal terms",
  "Our services",
  "Intellectual property rights",
  "User representations",
  "Purchases and payment",
  "Prohibited activities",
  "User generated contributions",
  "Contribution licence",
  "Services management",
  "Privacy policy",
  "Confidentiality",
  "Term and termination",
  "Modifications and interruptions",
  "Governing law",
  "Dispute resolution",
  "Disclaimer",
  "Limitations of liability",
  "Indemnification",
  "User data",
  "Electronic communications, transactions, and signatures",
  "Miscellaneous",
  "Contact us",
];

export default function TermsPage() {
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
          <p style={{ fontSize: 13, color: "var(--foreground-subtle)", marginBottom: 16 }}>
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
            Terms of service
          </h1>
          <P>
            We are Uzski Corp ("Company," "we," "us," or "our"), a company registered in Kenya at
            Abc Place Nairobi, Waiyaki Way, Nairobi, Nairobi County 00100. We operate Athena —
            an AI-powered knowledge assistant — and related services ("Services").
          </P>
          <P>
            You can contact us at{" "}
            <a href="mailto:hello@uzskicorp.agency" style={linkStyle}>hello@uzskicorp.agency</a>{" "}
            or by mail to Abc Place Nairobi, Waiyaki Way, Nairobi, Nairobi County 00100, Kenya.
          </P>
          <P>
            By accessing the Services, you agree to be bound by these Legal Terms. If you do not
            agree, you must discontinue use immediately. The Services are intended for users who
            are at least 18 years old.
          </P>

          {/* TOC */}
          <Section title="Table of contents">
            <ol style={{ ...listStyle, listStyleType: "decimal", paddingLeft: 20 }}>
              {toc.map((item, i) => (
                <li key={i} style={{ ...liStyle, paddingLeft: 4, textTransform: "capitalize" }}>
                  {item}
                </li>
              ))}
            </ol>
          </Section>

          <Section title="1. Agreement to our legal terms">
            <P>These Legal Terms constitute a legally binding agreement between you and Uzski Corp concerning your access to and use of Athena. We will provide you with prior notice of any scheduled changes to the Services.</P>
          </Section>

          <Section title="2. Our services">
            <P>Athena is an AI-powered team knowledge assistant that connects to your organisation's documents — including Google Docs, Google Drive, and Notion — and enables your team to ask questions and get instant, cited answers.</P>
            <P>The information provided through Athena is not intended for distribution in any jurisdiction where such use would be contrary to law or regulation.</P>
          </Section>

          <Section title="3. Intellectual property rights">
            <SubHead>Our intellectual property</SubHead>
            <P>We own or licence all intellectual property rights in Athena, including all source code, databases, functionality, software, designs, and graphics. Our content and marks are protected by copyright and trademark laws worldwide.</P>
            <SubHead>Your use of our services</SubHead>
            <P>Subject to your compliance with these Legal Terms, we grant you a non-exclusive, non-transferable, revocable licence to access Athena solely for your internal business purposes. No part of the Services may be reproduced, copied, or exploited for commercial purposes without our express prior written permission.</P>
            <SubHead>Your submissions</SubHead>
            <P>By sending us any question, comment, suggestion, idea, or feedback ("Submissions"), you assign to us all intellectual property rights in that Submission. We may use Submissions for any lawful purpose without acknowledgment or compensation.</P>
          </Section>

          <Section title="4. User representations">
            <P>By using Athena, you represent and warrant that:</P>
            <ul style={listStyle}>
              <li style={liStyle}>You have the legal capacity to agree to these Legal Terms</li>
              <li style={liStyle}>You are not a minor in your jurisdiction</li>
              <li style={liStyle}>You will not access Athena through automated or non-human means</li>
              <li style={liStyle}>You will not use the Services for any illegal or unauthorised purpose</li>
              <li style={liStyle}>Your use of the Services will not violate any applicable law or regulation</li>
            </ul>
          </Section>

          <Section title="5. Purchases and payment">
            <P>We accept Visa and Mastercard. You agree to provide accurate, complete payment information. All payments are in US dollars. We reserve the right to change prices at any time and to refuse any order.</P>
            <SubHead>Subscription billing</SubHead>
            <P>Athena is offered on a subscription basis. Your subscription renews automatically at the end of each billing period unless cancelled. You may cancel at any time through your account settings.</P>
            <SubHead>Refund policy</SubHead>
            <P>All subscription payments are final unless otherwise required by applicable law. We do not offer refunds for partial subscription periods.</P>
          </Section>

          <Section title="6. Prohibited activities">
            <P>You may not use Athena for any purpose other than its intended use. You agree not to:</P>
            <ul style={listStyle}>
              {[
                "Systematically retrieve data to create a collection or database without our written permission",
                "Trick, defraud, or mislead us or other users",
                "Circumvent or interfere with any security-related features",
                "Upload or transmit viruses, Trojan horses, or other harmful material",
                "Use any automated system (scripts, bots, scrapers) to access the Services",
                "Attempt to impersonate another user or person",
                "Use the Services in violation of any applicable law or regulation",
                "Reverse engineer, decompile, or disassemble any part of the Services",
                "Use the Services to compete with us or for any revenue-generating purpose not authorised by us",
              ].map((item, i) => (
                <li key={i} style={liStyle}>{item}</li>
              ))}
            </ul>
          </Section>

          <Section title="7. User generated contributions">
            <P>If Athena allows you to submit content or contributions, you represent and warrant that your contributions are accurate, do not infringe any third-party rights, are not offensive or unlawful, and comply with these Legal Terms. Violation of these terms may result in termination of your access.</P>
          </Section>

          <Section title="8. Contribution licence">
            <P>By posting contributions to Athena, you grant us an irrevocable, perpetual, worldwide, royalty-free licence to host, use, reproduce, distribute, and display such contributions for any purpose. You retain ownership of your contributions and any intellectual property rights in them.</P>
          </Section>

          <Section title="9. Services management">
            <P>We reserve the right to monitor the Services for violations of these Legal Terms, take legal action against violators, remove excessive or burdensome content, and otherwise manage the Services to protect our rights and facilitate proper functioning.</P>
          </Section>

          <Section title="10. Privacy policy">
            <P>We care about data privacy and security. Please review our{" "}
              <a href="/privacy" style={linkStyle}>Privacy Notice</a>. By using Athena, you agree to be bound by our Privacy Notice, which is incorporated into these Legal Terms.
            </P>
          </Section>

          <Section title="11. Confidentiality">
            <P>We treat all project and organisational information you bring into Athena as confidential. We will not share your business strategies, proprietary data, or knowledge base content with third parties without your explicit consent, except where required by law or with subcontractors bound by equivalent confidentiality obligations.</P>
          </Section>

          <Section title="12. Term and termination">
            <P>These Legal Terms remain in effect while you use Athena. We may deny access, block IP addresses, or terminate accounts at our sole discretion for any violation of these Legal Terms or applicable law — without notice or liability.</P>
            <P>If your account is terminated, you are prohibited from re-registering under any name. We reserve the right to pursue appropriate legal action.</P>
          </Section>

          <Section title="13. Modifications and interruptions">
            <P>We reserve the right to change, modify, or remove any part of Athena at any time without notice. We are not liable for any modification, suspension, or discontinuance of the Services. We cannot guarantee uninterrupted availability and are not liable for any downtime.</P>
          </Section>

          <Section title="14. Governing law">
            <P>These Legal Terms are governed by the laws of Kenya. You irrevocably consent to the exclusive jurisdiction of the courts of Kenya to resolve any dispute arising in connection with these Legal Terms.</P>
          </Section>

          <Section title="15. Dispute resolution">
            <P>You agree to submit all disputes related to these Legal Terms to the jurisdiction of the Kenyan courts. We also retain the right to bring proceedings in the courts of the country where you reside or conduct your principal place of business.</P>
          </Section>

          <Section title="16. Disclaimer">
            <P style={{ fontSize: 14 }}>THE SERVICES ARE PROVIDED ON AN AS-IS AND AS-AVAILABLE BASIS. TO THE FULLEST EXTENT PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE MAKE NO WARRANTIES ABOUT THE ACCURACY OR COMPLETENESS OF THE SERVICES' CONTENT.</P>
          </Section>

          <Section title="17. Limitations of liability">
            <P style={{ fontSize: 14 }}>IN NO EVENT WILL WE OR OUR DIRECTORS, EMPLOYEES, OR AGENTS BE LIABLE TO YOU OR ANY THIRD PARTY FOR ANY DIRECT, INDIRECT, CONSEQUENTIAL, EXEMPLARY, INCIDENTAL, SPECIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE SERVICES. OUR LIABILITY TO YOU FOR ANY CAUSE WHATSOEVER WILL AT ALL TIMES BE LIMITED TO THE LESSER OF THE AMOUNT PAID BY YOU IN THE SIX (6) MONTHS PRIOR TO ANY CAUSE OF ACTION ARISING OR USD $50.00.</P>
          </Section>

          <Section title="18. Indemnification">
            <P>You agree to defend, indemnify, and hold us harmless — including our subsidiaries, affiliates, officers, agents, partners, and employees — from any loss, damage, liability, claim, or demand arising from your contributions, use of the Services, breach of these Legal Terms, or violation of any third-party rights.</P>
          </Section>

          <Section title="19. User data">
            <P>We will maintain certain data you transmit to Athena to manage the performance of the Services. Although we perform routine backups, you are solely responsible for the data you transmit. We shall have no liability to you for any loss or corruption of such data.</P>
          </Section>

          <Section title="20. Electronic communications, transactions, and signatures">
            <P>Visiting Athena, sending us emails, and completing online forms constitute electronic communications. You consent to receive electronic communications and agree that all agreements, notices, disclosures, and other communications provided electronically satisfy any legal requirement that such communication be in writing.</P>
          </Section>

          <Section title="21. Miscellaneous">
            <P>These Legal Terms and any policies posted by us on the Services constitute the entire agreement between you and us. Our failure to exercise any right or provision shall not operate as a waiver. These Legal Terms operate to the fullest extent permissible by law. If any provision is found to be unlawful or unenforceable, the remaining provisions continue in full force and effect.</P>
          </Section>

          <Section title="22. Contact us">
            <P>To resolve a complaint or receive further information:</P>
            <address style={{ fontStyle: "normal", lineHeight: 1.8, color: "var(--foreground-muted)", fontSize: 15 }}>
              Uzski Corp<br />
              Abc Place Nairobi, Waiyaki Way<br />
              Nairobi, Nairobi County 00100<br />
              Kenya<br />
              <a href="tel:+254745071299" style={linkStyle}>+254 745 071 299</a><br />
              <a href="mailto:hello@uzskicorp.agency" style={linkStyle}>hello@uzskicorp.agency</a>
            </address>
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

function P({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <p
      style={{
        fontSize: 15,
        lineHeight: 1.75,
        color: "var(--foreground-muted)",
        marginBottom: 16,
        ...style,
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

const linkStyle: React.CSSProperties = {
  color: "var(--foreground)",
  textDecoration: "underline",
  textDecorationColor: "var(--border-strong)",
};
