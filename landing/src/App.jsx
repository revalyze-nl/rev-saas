import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import FeaturesSection from './components/FeaturesSection'
import AnalysisShowcase from './components/AnalysisShowcase'
import SimulationShowcase from './components/SimulationShowcase'
import CompetitorShowcase from './components/CompetitorShowcase'
import HowItWorks from './components/HowItWorks'
import PricingSection from './components/PricingSection'
import FAQ from './components/FAQ'
import CTASection from './components/CTASection'
import Footer from './components/Footer'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import Company from './pages/Company'
import Demo from './pages/Demo'
import LaunchPromo from './pages/LaunchPromo'

// Home page with all sections
function HomePage() {
  return (
    <>
      <Hero />
      <FeaturesSection />
      <AnalysisShowcase />
      <SimulationShowcase />
      <CompetitorShowcase />
      <HowItWorks />
      <PricingSection />
      <FAQ />
      <CTASection />
    </>
  )
}

function App() {
  return (
    <Routes>
      {/* Demo page - standalone without Navbar/Footer */}
      <Route path="/demo" element={<Demo />} />
      
      {/* Launch promo page for LinkedIn screenshot */}
      <Route path="/launch-promo" element={<LaunchPromo />} />
      
      {/* Main site with Navbar/Footer */}
      <Route path="*" element={
        <div className="min-h-screen bg-surface-800">
          <Navbar />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/pricing" element={<HomePage />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/company" element={<Company />} />
          </Routes>
          <Footer />
        </div>
      } />
    </Routes>
  )
}

export default App
