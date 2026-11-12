import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type AppRoute =
  | 'home'
  | 'how-it-works'
  | 'guide'
  | 'about'
  | 'contact'
  | 'assess'
  | 'auth'
  | 'dashboard'
  | 'admin';

interface NavbarProps {
  currentRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
}

export function Navbar({ currentRoute, onNavigate }: NavbarProps) {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems: Array<{ label: string; route: AppRoute }> = [
    { label: 'Home', route: 'home' },
    { label: 'How It Works', route: 'how-it-works' },
    { label: 'Skin Health Guide', route: 'guide' },
    { label: 'About', route: 'about' },
    { label: 'Contact', route: 'contact' },
  ];

  const handleNav = (route: AppRoute) => {
    setMobileOpen(false);
    onNavigate(route);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-[#0B131E]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8 h-16">
        {/* Zone 1: Single clean text wordmark */}
        <button
          type="button"
          onClick={() => handleNav('home')}
          className="font-display text-xl font-bold tracking-tight text-[#1769AA] dark:text-white whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA] rounded-md px-1"
        >
          DermaAI
        </button>

        {/* Zone 2: 5 concise single-line text navigation links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-600 dark:text-slate-300"
        >
          {navItems.map((item) => {
            const active = currentRoute === item.route;
            return (
              <button
                key={item.route}
                type="button"
                onClick={() => handleNav(item.route)}
                className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA] ${
                  active
                    ? 'border-[#1769AA] text-[#1769AA] dark:border-[#20B8A8] dark:text-[#20B8A8]'
                    : 'border-transparent hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single primary action button */}
        <div className="flex items-center gap-3 shrink-0">
          {user ? (
            <button
              type="button"
              onClick={() => handleNav('dashboard')}
              className="hidden sm:inline-flex items-center justify-center rounded-lg bg-[#1769AA] px-4 py-2 text-sm font-semibold text-white hover:bg-[#12548A] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA] focus-visible:ring-offset-2"
            >
              Dashboard
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleNav('auth')}
              className="hidden sm:inline-flex items-center justify-center rounded-lg bg-[#1769AA] px-4 py-2 text-sm font-semibold text-white hover:bg-[#12548A] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA] focus-visible:ring-offset-2"
            >
              Login / Sign Up
            </button>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
            className="lg:hidden inline-flex items-center justify-center rounded-lg p-2.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA]"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B131E] px-4 py-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.route}
              type="button"
              onClick={() => handleNav(item.route)}
              className={`block w-full text-left rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                currentRoute === item.route
                  ? 'bg-[#1769AA]/10 text-[#1769AA] dark:bg-[#20B8A8]/15 dark:text-[#20B8A8]'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {item.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => handleNav('assess')}
            className="block w-full text-left rounded-lg px-3 py-2.5 text-sm font-semibold text-[#1769AA] dark:text-[#20B8A8] hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Assess a Skin Lesion
          </button>
          {user ? (
            <>
              <button
                type="button"
                onClick={() => handleNav('dashboard')}
                className="block w-full text-center rounded-lg bg-[#1769AA] px-4 py-2.5 text-sm font-semibold text-white"
              >
                Dashboard
              </button>
              {user.role === 'admin' && (
                <button
                  type="button"
                  onClick={() => handleNav('admin')}
                  className="block w-full text-left rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Admin Console
                </button>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={() => handleNav('auth')}
              className="block w-full text-center rounded-lg bg-[#1769AA] px-4 py-2.5 text-sm font-semibold text-white"
            >
              Login / Sign Up
            </button>
          )}
        </div>
      )}
    </header>
  );
}
