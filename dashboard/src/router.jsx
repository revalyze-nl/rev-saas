import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CompetitorsProvider } from './context/CompetitorsContext';
import { PlansProvider } from './context/PlansContext';
import { AnalysisProvider } from './context/AnalysisV2Context';
import { SettingsProvider } from './context/SettingsContext';
import { BusinessMetricsProvider } from './context/BusinessMetricsContext';
import { AiCreditsProvider } from './context/AiCreditsContext';
import { OnboardingProvider } from './context/OnboardingContext';
import { DemoProvider } from './context/DemoContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import DashboardLayout from './layouts/DashboardLayout';
import Verdict from './pages/dashboard/Verdict';
import Scenarios from './pages/dashboard/Scenarios';
import History from './pages/dashboard/History';
import Settings from './pages/dashboard/Settings';
import Billing from './pages/dashboard/Billing';
import VerifyEmail from './pages/VerifyEmail';

// Wrapper component to provide all contexts for dashboard
const DashboardWithProviders = () => (
  <AiCreditsProvider>
    <CompetitorsProvider>
      <PlansProvider>
        <AnalysisProvider>
          <SettingsProvider>
            <BusinessMetricsProvider>
              <DemoProvider>
                <OnboardingProvider>
                  <DashboardLayout />
                </OnboardingProvider>
              </DemoProvider>
            </BusinessMetricsProvider>
          </SettingsProvider>
        </AnalysisProvider>
      </PlansProvider>
    </CompetitorsProvider>
  </AiCreditsProvider>
);

// Protected dashboard wrapper
const ProtectedDashboard = () => (
  <ProtectedRoute>
    <DashboardWithProviders />
  </ProtectedRoute>
);

// Root layout with AuthProvider
const RootLayout = ({ children }) => (
  <AuthProvider>
    {children}
  </AuthProvider>
);

// Create routes with auth wrapper
export const router = createBrowserRouter([
  {
    path: '/login',
    element: <RootLayout><Login /></RootLayout>
  },
  {
    path: '/signup',
    element: <RootLayout><SignUp /></RootLayout>
  },
  {
    path: '/auth/verify-email',
    element: <RootLayout><VerifyEmail /></RootLayout>
  },
  {
    path: '/',
    element: <RootLayout><ProtectedDashboard /></RootLayout>,
    children: [
      {
        index: true,
        element: <Navigate to="/verdict" replace />
      },
      {
        path: 'verdict',
        element: <Verdict />
      },
      {
        path: 'scenarios',
        element: <Scenarios />
      },
      {
        path: 'history',
        element: <History />
      },
      {
        path: 'settings',
        element: <Settings />
      },
      {
        path: 'settings/billing',
        element: <Billing />
      },
      {
        path: 'billing',
        element: <Billing />
      }
    ]
  }
]);
