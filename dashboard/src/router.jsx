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
import { UsageProvider } from './context/UsageContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import DashboardLayout from './layouts/DashboardLayout';
import Verdict from './pages/dashboard/Verdict';
import Scenarios from './pages/dashboard/Scenarios';
import HistoryV2 from './pages/dashboard/HistoryV2';
import DecisionDetailV2 from './pages/dashboard/DecisionDetailV2';
import DecisionCompare from './pages/dashboard/DecisionCompare';
import ArchiveDetail from './pages/dashboard/ArchiveDetail';
import Settings from './pages/dashboard/Settings';
import Billing from './pages/dashboard/Billing';
import VerifyEmail from './pages/VerifyEmail';

// Wrapper component to provide all contexts for dashboard
const DashboardWithProviders = () => (
  <UsageProvider>
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
  </UsageProvider>
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
        element: <HistoryV2 />
      },
      {
        path: 'decisions/compare',
        element: <DecisionCompare />
      },
      {
        path: 'decisions/:id',
        element: <DecisionDetailV2 />
      },
      {
        path: 'archive/:id',
        element: <ArchiveDetail />
      },
      {
        path: 'dashboard/decisions/compare',
        element: <DecisionCompare />
      },
      {
        path: 'dashboard/decisions/:id',
        element: <DecisionDetailV2 />
      },
      {
        path: 'dashboard/history',
        element: <HistoryV2 />
      },
      {
        path: 'dashboard/verdict',
        element: <Verdict />
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
