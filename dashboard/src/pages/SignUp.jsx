import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthCard from '../components/AuthCard';

const SignUp = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [showCheckInbox, setShowCheckInbox] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    companyName: '',
    companyWebsite: '',
    role: '',
    mrrRange: '',
    heardFrom: '',
    acceptedTerms: false
  });

  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // Clear error when user interacts
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    if (apiError) {
      setApiError('');
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Required fields
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.companyName.trim()) {
      newErrors.companyName = 'Company name is required';
    }

    if (!formData.companyWebsite.trim()) {
      newErrors.companyWebsite = 'Company website is required';
    }

    if (!formData.acceptedTerms) {
      newErrors.acceptedTerms = 'You must accept the Terms of Service and Privacy Policy to continue.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await signup(formData);
      
      if (result.success) {
        // Show check inbox screen instead of redirecting
        setRegisteredEmail(formData.email);
        setShowCheckInbox(true);
      } else {
        setApiError(result.error);
      }
    } catch (err) {
      setApiError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignInClick = () => {
    navigate('/login');
  };

  // Check Inbox Screen
  if (showCheckInbox) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          {/* Card */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 shadow-xl text-center">
            {/* Email Icon */}
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>

            <h2 className="text-2xl font-bold text-white mb-3">Check your inbox</h2>
            
            <p className="text-slate-400 mb-6">
              We've sent a verification link to<br />
              <span className="text-white font-medium">{registeredEmail}</span>
            </p>

            <div className="bg-slate-700/30 rounded-xl p-4 mb-6">
              <p className="text-sm text-slate-400">
                Click the link in the email to verify your account and complete your signup.
              </p>
            </div>

            <div className="space-y-3">
              <Link 
                to="/login" 
                className="block w-full px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-colors text-center"
              >
                Go to Login
              </Link>
              <p className="text-sm text-slate-500">
                Didn't receive the email? Check your spam folder or{' '}
                <button 
                  onClick={() => {
                    setShowCheckInbox(false);
                  }}
                  className="text-blue-400 hover:text-blue-300"
                >
                  try again
                </button>
              </p>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-slate-500 text-sm mt-6">
            © 2025 Revalyze. All rights reserved.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center px-4 py-12">
      {/* Logo at top */}
      <div className="w-full max-w-2xl animate-fadeIn">
        <div className="flex justify-center mb-8">
          <img 
            src="/revalyze-logo.png" 
            alt="Revalyze" 
            className="h-14 w-auto"
          />
        </div>

        <AuthCard 
          title="Create your Revalyze account"
          subtitle="Start using AI to design your SaaS pricing"
        >
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* API Error Message */}
              {apiError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                  <p className="text-sm text-red-400">{apiError}</p>
                </div>
              )}

              {/* Full Name */}
              <div>
                <label 
                  htmlFor="fullName" 
                  className="block text-sm font-semibold text-slate-300 mb-2"
                >
                  Full Name
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  value={formData.fullName}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  className={`w-full px-4 py-3 rounded-xl bg-slate-900/50 border ${
                    errors.fullName ? 'border-red-500' : 'border-slate-700'
                  } text-white placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all disabled:opacity-50`}
                  placeholder="John Doe"
                />
                {errors.fullName && (
                  <p className="mt-1 text-sm text-red-400">{errors.fullName}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label 
                  htmlFor="email" 
                  className="block text-sm font-semibold text-slate-300 mb-2"
                >
                  Work Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  className={`w-full px-4 py-3 rounded-xl bg-slate-900/50 border ${
                    errors.email ? 'border-red-500' : 'border-slate-700'
                  } text-white placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all disabled:opacity-50`}
                  placeholder="you@company.com"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-400">{errors.email}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label 
                  htmlFor="password" 
                  className="block text-sm font-semibold text-slate-300 mb-2"
                >
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  className={`w-full px-4 py-3 rounded-xl bg-slate-900/50 border ${
                    errors.password ? 'border-red-500' : 'border-slate-700'
                  } text-white placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all disabled:opacity-50`}
                  placeholder="Minimum 6 characters"
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-400">{errors.password}</p>
                )}
              </div>

              {/* Two columns for company info */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Company Name */}
                <div>
                  <label 
                    htmlFor="companyName" 
                    className="block text-sm font-semibold text-slate-300 mb-2"
                  >
                    Company Name
                  </label>
                  <input
                    id="companyName"
                    name="companyName"
                    type="text"
                    value={formData.companyName}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    className={`w-full px-4 py-3 rounded-xl bg-slate-900/50 border ${
                      errors.companyName ? 'border-red-500' : 'border-slate-700'
                    } text-white placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all disabled:opacity-50`}
                    placeholder="Acme Inc."
                  />
                  {errors.companyName && (
                    <p className="mt-1 text-sm text-red-400">{errors.companyName}</p>
                  )}
                </div>

                {/* Company Website */}
                <div>
                  <label 
                    htmlFor="companyWebsite" 
                    className="block text-sm font-semibold text-slate-300 mb-2"
                  >
                    Company Website
                  </label>
                  <input
                    id="companyWebsite"
                    name="companyWebsite"
                    type="url"
                    value={formData.companyWebsite}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    className={`w-full px-4 py-3 rounded-xl bg-slate-900/50 border ${
                      errors.companyWebsite ? 'border-red-500' : 'border-slate-700'
                    } text-white placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all disabled:opacity-50`}
                    placeholder="acme.com"
                  />
                  {errors.companyWebsite && (
                    <p className="mt-1 text-sm text-red-400">{errors.companyWebsite}</p>
                  )}
                </div>
              </div>

              {/* Optional fields section */}
              <div className="pt-4 border-t border-slate-700">
                <p className="text-sm text-slate-400 mb-6">
                  Optional information (helps us personalize your experience)
                </p>

                <div className="space-y-6">
                  {/* Role */}
                  <div>
                    <label 
                      htmlFor="role" 
                      className="block text-sm font-semibold text-slate-300 mb-2"
                    >
                      Your Role <span className="text-slate-500 font-normal">(optional)</span>
                    </label>
                    <select
                      id="role"
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                      disabled={isSubmitting}
                      className="w-full px-4 py-3 pr-10 rounded-xl bg-slate-900/50 border border-slate-700 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27rgb(148 163 184)%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')] bg-[length:1.25rem_1.25rem] bg-[position:right_0.75rem_center] bg-no-repeat disabled:opacity-50"
                    >
                      <option value="">Select your role</option>
                      <option value="founder">Founder</option>
                      <option value="cofounder">Co-founder</option>
                      <option value="product">Product</option>
                      <option value="growth">Growth</option>
                      <option value="revenue">Revenue</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  {/* Two columns for remaining optional */}
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* MRR Range */}
                    <div>
                      <label 
                        htmlFor="mrrRange" 
                        className="block text-sm font-semibold text-slate-300 mb-2"
                      >
                        Current MRR <span className="text-slate-500 font-normal">(optional)</span>
                      </label>
                      <select
                        id="mrrRange"
                        name="mrrRange"
                        value={formData.mrrRange}
                        onChange={handleChange}
                        disabled={isSubmitting}
                        className="w-full px-4 py-3 pr-10 rounded-xl bg-slate-900/50 border border-slate-700 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27rgb(148 163 184)%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')] bg-[length:1.25rem_1.25rem] bg-[position:right_0.75rem_center] bg-no-repeat disabled:opacity-50"
                      >
                        <option value="">Select range</option>
                        <option value="<1k">&lt;$1k</option>
                        <option value="1k-10k">$1k–$10k</option>
                        <option value="10k-50k">$10k–$50k</option>
                        <option value="50k-100k">$50k–$100k</option>
                        <option value="100k+">$100k+</option>
                      </select>
                    </div>

                    {/* How did you hear */}
                    <div>
                      <label 
                        htmlFor="heardFrom" 
                        className="block text-sm font-semibold text-slate-300 mb-2"
                      >
                        How did you hear about us? <span className="text-slate-500 font-normal">(optional)</span>
                      </label>
                      <select
                        id="heardFrom"
                        name="heardFrom"
                        value={formData.heardFrom}
                        onChange={handleChange}
                        disabled={isSubmitting}
                        className="w-full px-4 py-3 pr-10 rounded-xl bg-slate-900/50 border border-slate-700 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27rgb(148 163 184)%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')] bg-[length:1.25rem_1.25rem] bg-[position:right_0.75rem_center] bg-no-repeat disabled:opacity-50"
                      >
                        <option value="">Select source</option>
                        <option value="linkedin">LinkedIn</option>
                        <option value="twitter">X (Twitter)</option>
                        <option value="friend">Friend</option>
                        <option value="search">Search</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Terms Acceptance Checkbox */}
              <div className="pt-4 border-t border-slate-700">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative flex-shrink-0 mt-0.5">
                    <input
                      type="checkbox"
                      name="acceptedTerms"
                      checked={formData.acceptedTerms}
                      onChange={handleChange}
                      disabled={isSubmitting}
                      className="peer sr-only"
                    />
                    <div className={`w-5 h-5 rounded-md border-2 transition-all ${
                      errors.acceptedTerms 
                        ? 'border-red-500 bg-red-500/10' 
                        : formData.acceptedTerms 
                        ? 'border-blue-500 bg-blue-500' 
                        : 'border-slate-600 bg-slate-800 group-hover:border-slate-500'
                    }`}>
                      {formData.acceptedTerms && (
                        <svg className="w-full h-full text-white p-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="text-sm text-slate-300">
                    I agree to the{' '}
                    <Link to="/terms" className="text-blue-400 hover:text-blue-300 underline">
                      Terms of Service
                    </Link>
                    {' '}and{' '}
                    <Link to="/privacy" className="text-blue-400 hover:text-blue-300 underline">
                      Privacy Policy
                    </Link>
                  </span>
                </label>
                {errors.acceptedTerms && (
                  <p className="mt-2 text-sm text-red-400">{errors.acceptedTerms}</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold py-3.5 rounded-xl hover:from-blue-600 hover:to-indigo-700 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Creating account...
                  </span>
                ) : (
                  'Create Account'
                )}
              </button>

              {/* Sign In Link */}
              <div className="text-center pt-4">
                <p className="text-sm text-slate-400">
                  Already have an account?{' '}
                  <button 
                    type="button"
                    onClick={handleSignInClick}
                    disabled={isSubmitting}
                    className="font-semibold text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50"
                  >
                    Sign in
                  </button>
                </p>
              </div>
          </form>
        </AuthCard>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center">
        <p className="text-slate-400 text-sm">
          © {new Date().getFullYear()} Revalyze B.V.
        </p>
      </div>
    </div>
  );
};

export default SignUp;
