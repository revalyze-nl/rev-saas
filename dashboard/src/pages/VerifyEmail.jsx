import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [errorMessage, setErrorMessage] = useState('');
  const hasVerified = useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('Verification token is missing. Please check your email link.');
      return;
    }

    if (hasVerified.current) {
      return;
    }

    hasVerified.current = true;

    const verifyEmail = async () => {
      try {
        // The backend redirects on success, so we just need to call the endpoint
        // If we reach here without redirect, something went wrong
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/auth/verify-email?token=${token}`, {
          method: 'GET',
          redirect: 'manual', // Don't follow redirects automatically
        });

        if (response.type === 'opaqueredirect' || response.status === 302) {
          // Backend redirected, verification successful
          setStatus('success');
          setTimeout(() => {
            navigate('/login?verified=1');
          }, 2000);
        } else if (response.ok) {
          setStatus('success');
          setTimeout(() => {
            navigate('/login?verified=1');
          }, 2000);
        } else {
          const data = await response.json().catch(() => ({}));
          setStatus('error');
          setErrorMessage(data.error || 'Failed to verify email. The link may have expired.');
        }
      } catch (err) {
        // Network error or redirect happened
        // Check if we're being redirected by looking at the URL
        if (window.location.pathname.includes('login')) {
          return; // Already redirected
        }
        setStatus('success');
        setTimeout(() => {
          navigate('/login?verified=1');
        }, 2000);
      }
    };

    verifyEmail();
  }, [token, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Card */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 shadow-xl">
          
          {status === 'verifying' && (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-emerald-400 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Verifying your email...</h2>
              <p className="text-slate-400">Please wait while we verify your email address.</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Email Verified! 🎉</h2>
              <p className="text-slate-400 mb-6">Your email has been verified successfully. Redirecting to login...</p>
              <Link 
                to="/login?verified=1" 
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-colors"
              >
                Go to Login
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Verification Failed</h2>
              <p className="text-slate-400 mb-6">{errorMessage}</p>
              <div className="space-y-3">
                <Link 
                  to="/login" 
                  className="block w-full px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl transition-colors text-center"
                >
                  Go to Login
                </Link>
                <p className="text-sm text-slate-500">
                  Need a new verification link? <Link to="/login" className="text-emerald-400 hover:text-emerald-300">Sign in</Link> and request a new one.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <p className="text-center text-slate-500 text-sm mt-6">
          © 2025 Revalyze. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default VerifyEmail;
