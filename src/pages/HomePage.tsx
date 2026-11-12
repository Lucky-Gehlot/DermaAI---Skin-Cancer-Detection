import { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  FileText,
  Lock,
  ShieldAlert,
  Stethoscope,
} from 'lucide-react';
import { ClinicalImage } from '../components/ClinicalImage';
import type { AppRoute } from '../components/Navbar';

interface HomePageProps {
  onNavigate: (route: AppRoute) => void;
  focusHowItWorks?: boolean;
}

const FAQS = [
  {
    q: 'Can DermaAI diagnose skin cancer or confirm a mole is harmless?',
    a: 'No. DermaAI is an informational and educational skin health tool, not a certified medical diagnostic device. Only a qualified dermatologist or clinician using dermoscopy and, when indicated, a biopsy can diagnose or exclude skin cancer.',
  },
  {
    q: 'Why does the image assessment show Demonstration Mode?',
    a: 'DermaAI enforces strict medical safety governance: general-purpose AI models are never allowed to guess skin cancer diagnoses. Until a clinically validated dermatology image classifier is connected and verified for your image modality, the platform explicitly states that it is in demonstration mode rather than generating fake predictions.',
  },
  {
    q: 'What happens to my uploaded skin photographs?',
    a: 'Images require explicit privacy consent prior to upload, are scanned for file integrity, and are stored privately under your account only for the retention period you choose (0 to 365 days). You can permanently delete any image or assessment record at any time, and images are never used for AI model training without separate explicit consent.',
  },
  {
    q: 'When should I see a dermatologist right away?',
    a: 'Schedule an in-person evaluation promptly if a spot is changing in size, shape, or color, looks different from your other moles, bleeds spontaneously, hurts, itches persistently, or forms a sore that does not heal within 3 to 4 weeks.',
  },
];

export function HomePage({ onNavigate, focusHowItWorks }: HomePageProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="space-y-20 pb-20">
      {/* Hero Section */}
      <section className="border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0E1726]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
              <div className="flex items-center gap-2 text-xs font-medium text-[#1769AA] dark:text-[#20B8A8]">
                <span>Clinical Pre-Screening Support</span>
                <span aria-hidden="true">·</span>
                <span>ABCDE Educational Framework</span>
              </div>

              <h1
                className="font-display font-bold tracking-tight text-slate-900 dark:text-white leading-[1.12]"
                style={{ fontSize: 'clamp(2.15rem, 3.8vw, 3.35rem)', textWrap: 'balance' }}
              >
                Understand Your Skin. Take Control of Your Skin Health.
              </h1>

              <p className="text-base sm:text-lg leading-relaxed text-slate-600 dark:text-slate-300 max-w-xl">
                AI-assisted skin lesion assessment designed to help you understand potential risks
                and make informed decisions about seeking professional care.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => onNavigate('assess')}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#1769AA] px-5 py-3 text-sm font-semibold text-white hover:bg-[#12548A] transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA] focus-visible:ring-offset-2"
                >
                  <span>Assess a Skin Lesion</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('guide')}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-5 py-3 text-sm font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA]"
                >
                  <span>Learn About Skin Health</span>
                </button>
              </div>

              <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400 max-w-lg pt-1">
                Not a certified medical diagnostic device. Never delay seeing a dermatologist based on
                any automated output.
              </p>
            </div>

            <div className="lg:col-span-6 flex">
              <div className="w-full overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900">
                <ClinicalImage
                  src="/src/assets/images/hero_dermatology_clinic_1794511591915.jpg"
                  alt="Modern dermatology consultation suite with optical dermatoscope and digital skin review monitor"
                  fallbackTitle="Clinical Dermatology Consultation Suite"
                  className="w-full h-72 sm:h-96 lg:h-full object-cover"
                />
              </div>
            </div>
          </div>

          {/* 4-column Architectural Guarantees Strip */}
          <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <div className="text-xs font-mono text-[#1769AA] dark:text-[#20B8A8]">01 / SAFETY</div>
              <div className="mt-1 font-display text-sm font-semibold text-slate-900 dark:text-white">
                Zero Fabricated Predictions
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                Displays clear demonstration status unless a clinically validated model is connected.
              </p>
            </div>
            <div>
              <div className="text-xs font-mono text-[#1769AA] dark:text-[#20B8A8]">02 / PRIVACY</div>
              <div className="mt-1 font-display text-sm font-semibold text-slate-900 dark:text-white">
                User-Controlled Retention
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                Consent-gated uploads with one-click permanent deletion and configurable expiry.
              </p>
            </div>
            <div>
              <div className="text-xs font-mono text-[#1769AA] dark:text-[#20B8A8]">03 / ARCHITECTURE</div>
              <div className="mt-1 font-display text-sm font-semibold text-slate-900 dark:text-white">
                Swappable Classification Layer
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                Separates validated vision inference from Gemini plain-language patient education.
              </p>
            </div>
            <div>
              <div className="text-xs font-mono text-[#1769AA] dark:text-[#20B8A8]">04 / CARE PATH</div>
              <div className="mt-1 font-display text-sm font-semibold text-slate-900 dark:text-white">
                Visit-Ready PDF Summaries
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                Export lesion timelines, warning signs, and questions for your dermatologist.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section
        id="how-it-works"
        className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 ${focusHowItWorks ? 'pt-4' : ''}`}
      >
        <div className="max-w-2xl">
          <div className="text-xs font-medium text-[#1769AA] dark:text-[#20B8A8]">
            Structured Three-Step Workflow
          </div>
          <h2 className="mt-2 font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            How DermaAI Supports Informed Skin Checks
          </h2>
          <p className="mt-3 text-base text-slate-600 dark:text-slate-300 leading-relaxed">
            From guided photography to symptom documentation and plain-language education, each step
            is designed around clinical caution and patient clarity.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2B] p-6 space-y-3">
            <div className="font-mono text-sm font-semibold text-[#1769AA] dark:text-[#20B8A8]">
              01. Upload &amp; Capture
            </div>
            <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
              Guided Skin Image Intake
            </h3>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Capture a focused photograph in natural lighting or upload a JPG/PNG. Every upload is
              checked for format integrity, resolution, and privacy consent before processing.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2B] p-6 space-y-3">
            <div className="font-mono text-sm font-semibold text-[#1769AA] dark:text-[#20B8A8]">
              02. Clinical Context
            </div>
            <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
              Timeline &amp; Symptom Triage
            </h3>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Document lesion location, duration, and changes in size, shape, or color, plus warning
              symptoms like bleeding or non-healing sores—with the option to skip non-essential items.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2B] p-6 space-y-3">
            <div className="font-mono text-sm font-semibold text-[#1769AA] dark:text-[#20B8A8]">
              03. Explainable Guidance
            </div>
            <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
              Transparent Output &amp; Care Next Steps
            </h3>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Review model scope and limitations, plain-language terminology explanations, recommended
              next steps, a downloadable PDF report, and direct dermatologist directory links.
            </p>
          </div>
        </div>
      </section>

      {/* Asymmetric Features & Benefits Bento */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2B] overflow-hidden grid grid-cols-1 md:grid-cols-2">
            <div className="p-6 sm:p-8 flex flex-col justify-between space-y-5">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-medium text-[#20B8A8]">
                  <Stethoscope className="h-4 w-4" />
                  <span>ABCDE Clinical Education</span>
                </div>
                <h3 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                  Learn What Dermatologists Look For
                </h3>
                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  Explore medically reviewed visual breakdowns for Asymmetry, Border irregularity,
                  Color variation, Diameter, and Evolution, along with guidance on melanoma, basal
                  cell carcinoma, squamous cell carcinoma, and benign spots.
                </p>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => onNavigate('guide')}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#1769AA] dark:text-[#20B8A8] hover:underline"
                >
                  <span>Explore Skin Health Guide</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="h-64 md:h-auto bg-slate-50 dark:bg-slate-900">
              <ClinicalImage
                src="/src/assets/images/abcde_dermoscopy_guide_1794511592380.jpg"
                alt="Medical cross-section illustration showing an optical dermatoscope inspecting skin pigment layers"
                fallbackTitle="Optical Dermoscopy Illustration"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2B] p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-medium text-[#1769AA] dark:text-[#20B8A8]">
                <Lock className="h-4 w-4" />
                <span>Security &amp; Data Sovereignty</span>
              </div>
              <h3 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                Built for Sensitive Health Records
              </h3>
              <ul className="space-y-2.5 text-sm text-slate-600 dark:text-slate-300">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#20B8A8] shrink-0 mt-0.5" />
                  <span>Magic-byte &amp; polyglot file verification on every image</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#20B8A8] shrink-0 mt-0.5" />
                  <span>No PII sent to third-party educational AI endpoints</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#20B8A8] shrink-0 mt-0.5" />
                  <span>Instant one-click image and history deletion</span>
                </li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('about')}
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#1769AA] dark:text-[#20B8A8] hover:underline"
            >
              <span>Review Clinical Architecture</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2B] overflow-hidden grid grid-cols-1 md:grid-cols-12">
          <div className="md:col-span-5 h-60 md:h-auto">
            <ClinicalImage
              src="/src/assets/images/awareness_skin_check_1794511593983.jpg"
              alt="Dermatologist reviewing digital skin health assessment notes with a patient in a bright clinic"
              fallbackTitle="Dermatology Clinical Consultation"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-center space-y-4">
            <div className="flex items-center gap-2 text-xs font-medium text-[#1769AA] dark:text-[#20B8A8]">
              <FileText className="h-4 w-4" />
              <span>Preparing for Your Visit</span>
            </div>
            <h3 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
              Bridge Online Screening With In-Person Care
            </h3>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Every completed assessment generates an informational PDF summary containing your
              reported symptom timeline, flagged ABCDE considerations, and tailored questions to ask
              your dermatologist—helping make every clinical visit more focused.
            </p>
            <div>
              <button
                type="button"
                onClick={() => onNavigate('assess')}
                className="inline-flex items-center gap-2 rounded-lg bg-[#1769AA] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#12548A] transition-colors"
              >
                <span>Start Guided Assessment</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Medical Safety Disclaimer */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-amber-300/80 dark:border-amber-800/70 bg-amber-50/70 dark:bg-amber-950/30 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <ShieldAlert className="h-6 w-6 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Important Medical Safety Notice
              </h2>
              <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                DermaAI is not a certified medical diagnostic device. An AI assessment cannot diagnose
                or exclude skin cancer, nor can any digital tool replace an in-person examination with
                dermoscopic magnification and histopathology when needed. Never ignore symptoms or
                delay professional dermatological care because of an AI output or demonstration result.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Frequently Asked Questions
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Clear answers on clinical boundaries, privacy controls, and demonstration mode.
          </p>
        </div>

        <div className="mt-8 divide-y divide-slate-200 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2B]">
          {FAQS.map((item, idx) => {
            const expanded = openFaq === idx;
            return (
              <div key={item.q}>
                <button
                  type="button"
                  aria-expanded={expanded}
                  onClick={() => setOpenFaq(expanded ? null : idx)}
                  className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left text-sm sm:text-base font-semibold text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <span>{item.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 text-slate-500 shrink-0 transition-transform ${
                      expanded ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {expanded && (
                  <div className="px-6 pb-5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
