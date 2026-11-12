import { useState } from 'react';
import { Moon, Sun, X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import type { AppRoute } from './Navbar';

interface FooterProps {
  onNavigate: (route: AppRoute) => void;
}

export function Footer({ onNavigate }: FooterProps) {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const [legalModal, setLegalModal] = useState<'privacy' | 'terms' | null>(null);

  return (
    <>
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1726] text-slate-600 dark:text-slate-400">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-slate-200 dark:border-slate-800">
            <div className="md:col-span-2 space-y-3">
              <div className="font-display text-lg font-bold text-[#1769AA] dark:text-white">
                DermaAI
              </div>
              <p className="text-sm leading-relaxed max-w-md">
                Educational skin health &amp; lesion risk assessment workflow. Built to support informed
                conversations with qualified dermatologists—never as a substitute for clinical care.
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
                Medical Safety Notice: DermaAI is not a certified medical diagnostic device and cannot
                confirm or rule out skin cancer.
              </p>
            </div>

            <div className="space-y-2.5 text-sm">
              <div className="font-semibold text-slate-900 dark:text-slate-100">Platform</div>
              <ul className="space-y-2">
                <li>
                  <button type="button" onClick={() => onNavigate('assess')} className="hover:text-[#1769AA] dark:hover:text-[#20B8A8]">
                    Assess a Skin Lesion
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => onNavigate('guide')} className="hover:text-[#1769AA] dark:hover:text-[#20B8A8]">
                    ABCDE Skin Health Guide
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => onNavigate('about')} className="hover:text-[#1769AA] dark:hover:text-[#20B8A8]">
                    Clinical Architecture
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => onNavigate('contact')} className="hover:text-[#1769AA] dark:hover:text-[#20B8A8]">
                    Contact &amp; Feedback
                  </button>
                </li>
                {user?.role === 'admin' && (
                  <li>
                    <button type="button" onClick={() => onNavigate('admin')} className="hover:text-[#1769AA] dark:hover:text-[#20B8A8]">
                      Admin Console
                    </button>
                  </li>
                )}
              </ul>
            </div>

            <div className="space-y-3 text-sm">
              <div className="font-semibold text-slate-900 dark:text-slate-100">Governance &amp; Display</div>
              <ul className="space-y-2">
                <li>
                  <button
                    type="button"
                    onClick={() => setLegalModal('privacy')}
                    className="hover:text-[#1769AA] dark:hover:text-[#20B8A8]"
                  >
                    Privacy &amp; Image Retention Policy
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setLegalModal('terms')}
                    className="hover:text-[#1769AA] dark:hover:text-[#20B8A8]"
                  >
                    Terms of Use &amp; Medical Disclaimer
                  </button>
                </li>
              </ul>
              <button
                type="button"
                onClick={toggleTheme}
                className="mt-2 inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-[#1769AA]" />}
                <span>{theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}</span>
              </button>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
            <span>© {new Date().getFullYear()} DermaAI Skin Health Platform. Informational use only.</span>
            <span>Images are never used for model training without explicit consent.</span>
          </div>
        </div>
      </footer>

      {legalModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="legal-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
        >
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2B] p-6 shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
              <h2 id="legal-modal-title" className="font-display text-xl font-bold text-slate-900 dark:text-white">
                {legalModal === 'privacy'
                  ? 'Privacy & Image Retention Policy'
                  : 'Terms of Use & Medical Disclaimer'}
              </h2>
              <button
                type="button"
                onClick={() => setLegalModal(null)}
                aria-label="Close modal"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {legalModal === 'privacy' ? (
              <div className="mt-4 space-y-4 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                <p>
                  <strong>Sensitive Health Data Protection:</strong> DermaAI treats uploaded lesion photographs
                  and symptom responses as sensitive personal health information. Explicit consent is required
                  prior to uploading or processing any image.
                </p>
                <p>
                  <strong>Retention &amp; Immediate Deletion:</strong> Users control their retention window
                  (0 to 365 days, default 30 days) in Profile Settings and may permanently delete individual
                  images or entire assessment records at any time from their Dashboard.
                </p>
                <p>
                  <strong>Third-Party AI Data Minimization:</strong> DermaAI never transmits your name, email,
                  account ID, or unnecessary personal identifiers to third-party AI services. Patient images
                  are never used for AI model training without separate, explicit informed consent.
                </p>
                <p>
                  <strong>Role-Based Isolation:</strong> Administrators have access only to aggregate counts,
                  model validation metrics, and system error logs. Identifiable patient images and lesion
                  clinical notes are excluded from administrative views.
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-4 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                <p>
                  <strong>Not a Medical Device:</strong> DermaAI is an informational and educational platform.
                  It is not cleared or certified by the FDA, EMA, or any medical regulatory authority as a
                  diagnostic device.
                </p>
                <p>
                  <strong>No Diagnosis or Exclusion of Cancer:</strong> An AI assessment cannot diagnose or
                  exclude melanoma, basal cell carcinoma, squamous cell carcinoma, or any other medical
                  condition. Never delay seeking professional medical care based on an automated output or
                  demonstration result.
                </p>
                <p>
                  <strong>Emergency &amp; Urgent Symptoms:</strong> If a skin lesion is rapidly growing,
                  bleeding spontaneously, painful, or forming a non-healing sore, schedule an in-person visit
                  with a licensed dermatologist or physician promptly.
                </p>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setLegalModal(null)}
                className="rounded-lg bg-[#1769AA] px-4 py-2 text-sm font-semibold text-white hover:bg-[#12548A]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
