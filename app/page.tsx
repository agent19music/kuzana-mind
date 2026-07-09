import CallToAction from "./components/CallToAction";
import FeaturesSection from "./components/FeaturesSection";
import Footer from "./components/Footer";
import Hero from "./components/Hero";
import HowItWorks from "./components/HowItWorks";
import Integrations from "./components/Integrations";
import Nav from "./components/Nav";
import PricingSection from "./components/PricingSection";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <FeaturesSection />
        <Integrations />
        <HowItWorks />
        <PricingSection />
        <CallToAction />
      </main>
      <Footer />
    </>
  );
}
