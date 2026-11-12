import { useEffect, useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar, type AppRoute } from './components/Navbar';
import { Footer } from './components/Footer';
import { SkinHealthChatDrawer } from './components/SkinHealthChatDrawer';
import { HomePage } from './pages/HomePage';
import { AssessmentPage } from './pages/AssessmentPage';
import { GuidePage } from './pages/GuidePage';
import { AboutPage } from './pages/AboutPage';
import { ContactPage } from './pages/ContactPage';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { AdminPage } from './pages/AdminPage';
import type { AssessmentRecord } from './shared/types';

function AppShell() {
  const [route, setRoute] = useState<AppRoute>('home');
  const [selectedAssessment, setSelectedAssessment] = useState<AssessmentRecord | null>(null);

  const navigate = (next: AppRoute) => {
    if (next !== 'assess') {
      setSelectedAssessment(null);
    }
    setRoute(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (route === 'how-it-works') {
      setTimeout(() => {
        document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
      }, 60);
    }
  }, [route]);

  const handleViewAssessment = (record: AssessmentRecord) => {
    setSelectedAssessment(record);
    setRoute('assess');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FBFE] dark:bg-[#0B131E] text-slate-900 dark:text-slate-100">
      <Navbar currentRoute={route} onNavigate={navigate} />

      <main className="flex-1">
        {(route === 'home' || route === 'how-it-works') && (
          <HomePage onNavigate={navigate} focusHowItWorks={route === 'how-it-works'} />
        )}
        {route === 'assess' && (
          <AssessmentPage onNavigate={navigate} initialAssessment={selectedAssessment} />
        )}
        {route === 'guide' && <GuidePage onNavigate={navigate} />}
        {route === 'about' && <AboutPage onNavigate={navigate} />}
        {route === 'contact' && <ContactPage />}
        {route === 'auth' && <AuthPage onNavigate={navigate} />}
        {route === 'dashboard' && (
          <DashboardPage onNavigate={navigate} onViewAssessment={handleViewAssessment} />
        )}
        {route === 'admin' && <AdminPage />}
      </main>

      <Footer onNavigate={navigate} />
      <SkinHealthChatDrawer />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </ThemeProvider>
  );
}
