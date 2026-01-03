import { Link } from 'react-router-dom';

const Footer = () => {
  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="bg-surface-900 border-t border-white/5 py-16">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link to="/">
              <img 
                src="/revalyze-logo.png" 
                alt="Revalyze" 
                className="h-12 w-auto mb-4"
              />
            </Link>
            <p className="text-content-secondary max-w-sm leading-relaxed mb-6">
              AI-powered pricing intelligence for SaaS companies. Make data-driven pricing decisions with confidence.
            </p>
            <div className="flex items-center gap-4">
              <a 
                href="https://twitter.com/revalyze" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 bg-surface-600 hover:bg-surface-500 rounded-lg flex items-center justify-center text-content-tertiary hover:text-white transition-all"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a 
                href="https://linkedin.com/company/revalyze" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 bg-surface-600 hover:bg-surface-500 rounded-lg flex items-center justify-center text-content-tertiary hover:text-white transition-all"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-semibold text-white mb-4">Product</h4>
            <ul className="space-y-3">
              <li>
                <button 
                  onClick={() => scrollToSection('features')}
                  className="text-content-secondary hover:text-brand-400 transition-colors"
                >
                  Features
                </button>
              </li>
              <li>
                <button 
                  onClick={() => scrollToSection('pricing')}
                  className="text-content-secondary hover:text-brand-400 transition-colors"
                >
                  Pricing
                </button>
              </li>
              <li>
                <button 
                  onClick={() => scrollToSection('how-it-works')}
                  className="text-content-secondary hover:text-brand-400 transition-colors"
                >
                  How it Works
                </button>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-white mb-4">Legal</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/privacy" className="text-content-secondary hover:text-brand-400 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-content-secondary hover:text-brand-400 transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/company" className="text-content-secondary hover:text-brand-400 transition-colors">
                  Company Info
                </Link>
              </li>
              <li>
                <a href="mailto:hello@revalyze.co" className="text-content-secondary hover:text-brand-400 transition-colors">
                  Contact
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
            <p className="text-content-tertiary">
              © {new Date().getFullYear()} Revalyze B.V. All rights reserved.
            </p>
            <p className="text-content-muted">
              Built in the Netherlands 🇳🇱 for global SaaS
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
