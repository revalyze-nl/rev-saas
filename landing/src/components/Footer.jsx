import { Link } from 'react-router-dom';

const Footer = () => {
  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="bg-dark-950 border-t border-dark-800 py-16">
      <div className="max-w-5xl mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link to="/">
              <img 
                src="/revalyze-logo.png" 
                alt="Revalyze" 
                className="h-8 w-auto mb-4"
              />
            </Link>
            <p className="text-dark-500 max-w-sm leading-relaxed text-sm">
              Better decisions, remembered. A tool for teams who want to learn from every choice they make.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-medium text-dark-200 mb-4 text-sm">Product</h4>
            <ul className="space-y-3">
              <li>
                <button 
                  onClick={() => scrollToSection('how-it-works')}
                  className="text-sm text-dark-500 hover:text-dark-200 transition-colors"
                >
                  How it works
                </button>
              </li>
              <li>
                <button 
                  onClick={() => scrollToSection('pricing')}
                  className="text-sm text-dark-500 hover:text-dark-200 transition-colors"
                >
                  Pricing
                </button>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-medium text-dark-200 mb-4 text-sm">Company</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/privacy" className="text-sm text-dark-500 hover:text-dark-200 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-sm text-dark-500 hover:text-dark-200 transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/company" className="text-sm text-dark-500 hover:text-dark-200 transition-colors">
                  Company Info
                </Link>
              </li>
              <li>
                <a href="mailto:hello@revalyze.co" className="text-sm text-dark-500 hover:text-dark-200 transition-colors">
                  Contact
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-dark-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
            <p className="text-dark-600">
              © {new Date().getFullYear()} Revalyze B.V. All rights reserved.
            </p>
            <p className="text-dark-600">
              Amsterdam, Netherlands
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
