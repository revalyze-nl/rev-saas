import Navbar from './components/Navbar'
import Hero from './components/Hero'
import ProductSection from './components/ProductSection'
import ChartsShowcase from './components/ChartsShowcase'
import SimulationShowcase from './components/SimulationShowcase'
import Comparison from './components/Comparison'
import HowItWorks from './components/HowItWorks'
import Testimonials from './components/Testimonials'
import ForFounders from './components/ForFounders'
import PricingSection from './components/PricingSection'
import FAQ from './components/FAQ'
import TrustSection from './components/TrustSection'
import Footer from './components/Footer'

function App() {
  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />
      <Hero />
      <ProductSection />
      <ChartsShowcase />
      <SimulationShowcase />
      <Comparison />
      <HowItWorks />
      <Testimonials />
      <ForFounders />
      <PricingSection />
      <FAQ />
      <TrustSection />
      <Footer />
    </div>
  )
}

export default App
