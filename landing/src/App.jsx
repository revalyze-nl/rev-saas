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
    <div className="min-h-screen bg-slate-950 relative">
      {/* Global smooth background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900" />
        
        {/* Floating orbs for depth */}
        <div className="absolute top-[10%] left-[10%] w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute top-[30%] right-[5%] w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
        <div className="absolute top-[50%] left-[20%] w-[400px] h-[400px] bg-violet-500/8 rounded-full blur-[80px] animate-pulse" style={{ animationDuration: '12s', animationDelay: '4s' }} />
        <div className="absolute top-[70%] right-[15%] w-[550px] h-[550px] bg-blue-500/8 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '9s', animationDelay: '1s' }} />
        <div className="absolute top-[90%] left-[5%] w-[450px] h-[450px] bg-indigo-500/10 rounded-full blur-[90px] animate-pulse" style={{ animationDuration: '11s', animationDelay: '3s' }} />
        
        {/* Subtle grid overlay */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '100px 100px'
          }}
        />
      </div>
      
      {/* Content */}
      <div className="relative z-10">
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
    </div>
  )
}

export default App
