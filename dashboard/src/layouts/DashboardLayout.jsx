import { Outlet } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Topbar from '../components/layout/Topbar';
import OnboardingOrchestratorModal from '../components/onboarding/OnboardingOrchestratorModal';
import DemoBanner from '../components/demo/DemoBanner';

const DashboardLayout = () => {
  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Topbar />
        {/* Demo Mode Banner */}
        <DemoBanner />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
      {/* Onboarding Orchestrator Modal */}
      <OnboardingOrchestratorModal />
    </div>
  );
};

export default DashboardLayout;











