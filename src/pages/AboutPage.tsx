import { Cpu, Database, Lock, ShieldCheck } from 'lucide-react';
import type { AppRoute } from '../components/Navbar';

interface AboutPageProps {
  onNavigate: (route: AppRoute) => void;
}

export function AboutPage({ onNavigate }: AboutPageProps) {
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      <div className="space-y-3 max-w-3xl">
        <div className="text-xs font-medium text-[#1769AA] dark:text-[#20B8A8]">
          Healthcare Technology Architecture &amp; Clinical Governance
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
          About DermaAI
        </h1>
        <p className="text-base leading-relaxed text-slate-600 dark:text-slate-300">
          DermaAI was architected around a non-negotiable patient-safety principle: never treat a
          general-purpose language model as a skin cancer classifier, and never present unvalidated
          predictions as clinical reassurance.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2B] p-6 space-y-3">
          <div className="flex items-center gap-2 text-[#1769AA] dark:text-[#20B8A8] font-display font-bold">
            <Cpu className="h-5 w-5" />
            <span>A. Replaceable Dermatology Classification Layer</span>
          </div>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Skin lesion image classification is isolated behind a typed server-side provider interface
            (<code className="text-xs">DermatologyClassificationProvider</code>). This allows a
            clinically validated model supporting Melanoma, Basal Cell Carcinoma, Squamous Cell
            Carcinoma, Benign Nevus, Seborrheic Keratosis, and Other / Uncertain to be integrated
            without changing frontend code.
          </p>
          <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Includes out-of-distribution/uncertainty rejection gates, model version tracking, and
            fairness evaluation across Fitzpatrick skin types I–VI.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2B] p-6 space-y-3">
          <div className="flex items-center gap-2 text-[#20B8A8] font-display font-bold">
            <ShieldCheck className="h-5 w-5" />
            <span>B. Gemini Educational &amp; Communication Layer</span>
          </div>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Google Gemini runs strictly on the server to translate dermatological concepts into plain
            language, explain assessment limitations, suggest questions to bring to a dermatologist,
            and power the educational Q&amp;A assistant.
          </p>
          <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Gemini never receives personally identifiable user details and is explicitly prevented from
            issuing cancer diagnoses.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2B] p-6 space-y-3">
          <div className="flex items-center gap-2 text-[#1769AA] dark:text-[#20B8A8] font-display font-bold">
            <Lock className="h-5 w-5" />
            <span>Security &amp; File Integrity Controls</span>
          </div>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Every uploaded image undergoes magic-byte signature verification, JPEG/PNG header
            dimension parsing, polyglot/script scanning, salted scrypt password hashing, HMAC-signed
            HttpOnly sessions, and strict rate limiting.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2B] p-6 space-y-3">
          <div className="flex items-center gap-2 text-[#20B8A8] font-display font-bold">
            <Database className="h-5 w-5" />
            <span>Privacy &amp; Role Isolation</span>
          </div>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Patient assessment images and records are strictly scoped to the owning account. Admin
            dashboards surface aggregate counts, model performance cards, and system error logs
            without exposing patient lesion images or medical notes.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => onNavigate('assess')}
          className="rounded-lg bg-[#1769AA] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#12548A]"
        >
          Try Guided Assessment
        </button>
        <button
          type="button"
          onClick={() => onNavigate('contact')}
          className="rounded-lg border border-slate-300 dark:border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          Contact Team
        </button>
      </div>
    </div>
  );
}
