import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="relative py-16 mt-12">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <img 
              src="/revalyze-logo.png" 
              alt="Revalyze" 
              className="h-14 w-auto mb-3"
            />
            <p className="text-slate-400 max-w-sm leading-relaxed">
              AI-powered pricing intelligence for SaaS companies at every stage.
            </p>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-white mb-4">Legal</h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-slate-400 hover:text-blue-400 transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <Link to="/terms" className="text-slate-400 hover:text-blue-400 transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-white mb-4">Contact</h4>
            <a href="mailto:info@revalyze.co" className="text-slate-400 hover:text-blue-400 transition-colors">
              info@revalyze.co
            </a>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
            <p className="text-slate-400">
              &copy; {new Date().getFullYear()} Revalyze. All rights reserved.
            </p>
            <p className="text-slate-500">
              Built in the Netherlands, for global SaaS
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
