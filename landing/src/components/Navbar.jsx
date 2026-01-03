import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (sectionId) => {
    if (!isHomePage) {
      window.location.href = `/#${sectionId}`;
      return;
    }
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-surface-800/90 backdrop-blur-xl border-b border-white/5'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex-shrink-0">
            <img 
              src="/revalyze-logo.png" 
              alt="Revalyze" 
              className="h-10 w-auto"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            <button
              onClick={() => scrollToSection('features')}
              className="px-4 py-2 text-sm font-medium text-content-secondary hover:text-white hover:bg-surface-600/50 rounded-lg transition-all"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="px-4 py-2 text-sm font-medium text-content-secondary hover:text-white hover:bg-surface-600/50 rounded-lg transition-all"
            >
              How it Works
            </button>
            <button
              onClick={() => scrollToSection('pricing')}
              className="px-4 py-2 text-sm font-medium text-content-secondary hover:text-white hover:bg-surface-600/50 rounded-lg transition-all"
            >
              Pricing
            </button>
            
            <div className="flex items-center gap-3 ml-6">
              <a
                href="https://app.revalyze.co"
                className="px-4 py-2 text-sm font-medium text-content-secondary hover:text-white transition-colors"
              >
                Login
              </a>
              <a
                href="https://app.revalyze.co/signup"
                className="px-5 py-2 text-sm font-semibold bg-gradient-to-r from-brand-500 to-accent-blue text-white rounded-lg hover:shadow-lg hover:shadow-brand-500/25 transition-all hover:scale-105"
              >
                Start Free
              </a>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-3">
            <a
              href="https://app.revalyze.co/signup"
              className="px-4 py-2 text-sm font-semibold bg-gradient-to-r from-brand-500 to-accent-blue text-white rounded-lg"
            >
              Start Free
            </a>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-content-secondary hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden py-4 border-t border-white/5"
          >
            <div className="flex flex-col gap-2">
              <button
                onClick={() => scrollToSection('features')}
                className="px-4 py-3 text-left text-sm font-medium text-content-secondary hover:text-white hover:bg-surface-600/50 rounded-lg"
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection('how-it-works')}
                className="px-4 py-3 text-left text-sm font-medium text-content-secondary hover:text-white hover:bg-surface-600/50 rounded-lg"
              >
                How it Works
              </button>
              <button
                onClick={() => scrollToSection('pricing')}
                className="px-4 py-3 text-left text-sm font-medium text-content-secondary hover:text-white hover:bg-surface-600/50 rounded-lg"
              >
                Pricing
              </button>
              <a
                href="https://app.revalyze.co"
                className="px-4 py-3 text-left text-sm font-medium text-content-secondary hover:text-white hover:bg-surface-600/50 rounded-lg"
              >
                Login
              </a>
            </div>
          </motion.div>
        )}
      </div>
    </motion.nav>
  );
};

export default Navbar;
