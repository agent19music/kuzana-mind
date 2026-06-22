import CallToAction from "./components/CallToAction";
import FeaturesSection from "./components/FeaturesSection";
import Hero from "./components/Hero";
import HowItWorks from "./components/HowItWorks";
import Nav from "./components/Nav";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <FeaturesSection />
        <HowItWorks />
        <CallToAction />
      </main>
    </>
  );
}
