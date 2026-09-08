import { headers } from "next/headers";
import { currentUser } from "@clerk/nextjs/server";
import CallToAction from "../components/CallToAction";
import FeaturesSection from "../components/FeaturesSection";
import Footer from "../components/Footer";
import Hero from "../components/Hero";
import HowItWorks from "../components/HowItWorks";
import Integrations from "../components/Integrations";
import Nav from "../components/Nav";
import PricingSection from "../components/PricingSection";

/** Accept only a real ISO country code — never pass OTHERS/XX to Paddle. */
function countryFromHeaders(h: Headers): string | undefined {
  const raw =
    h.get("x-vercel-ip-country") ||
    h.get("cf-ipcountry") ||
    h.get("x-country-code");
  if (!raw) return undefined;
  const code = raw.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return undefined;
  if (code === "XX" || code === "T1") return undefined;
  return code;
}

export default async function Home() {
  const h = await headers();
  const countryCode = countryFromHeaders(h);

  let customerEmail: string | null = null;
  try {
    const user = await currentUser();
    customerEmail =
      user?.primaryEmailAddress?.emailAddress ??
      user?.emailAddresses?.[0]?.emailAddress ??
      null;
  } catch {
    customerEmail = null;
  }

  return (
    <>
      <Nav />
      <main>
        <Hero />
        <FeaturesSection />
        <Integrations />
        <HowItWorks />
        <PricingSection
          countryCode={countryCode}
          customerEmail={customerEmail}
        />
        <CallToAction />
      </main>
      <Footer />
    </>
  );
}
