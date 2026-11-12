import { ExternalLink, MapPin, Stethoscope, X } from 'lucide-react';

interface DermatologistFinderModalProps {
  open: boolean;
  onClose: () => void;
}

export function DermatologistFinderModal({ open, onClose }: DermatologistFinderModalProps) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="derm-finder-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
    >
      <div className="w-full max-w-xl rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2B] p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1769AA]/10 text-[#1769AA] dark:bg-[#20B8A8]/15 dark:text-[#20B8A8]">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <h2 id="derm-finder-title" className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Find a Qualified Dermatologist
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Verified clinical directories and appointment preparation
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dermatologist finder"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4 text-sm text-slate-700 dark:text-slate-300">
          <p>
            Only a licensed dermatologist or qualified clinician using dermoscopy and, when appropriate, a
            skin biopsy can evaluate a lesion definitively.
          </p>

          <div className="space-y-2.5">
            <a
              href="https://find-a-derm.aad.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 p-3.5 hover:border-[#1769AA] dark:hover:border-[#20B8A8] transition-colors"
            >
              <div>
                <div className="font-semibold text-slate-900 dark:text-white">
                  American Academy of Dermatology (AAD) Directory
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Search board-certified dermatologists by city, state, or ZIP code
                </div>
              </div>
              <ExternalLink className="h-4 w-4 text-[#1769AA] dark:text-[#20B8A8] shrink-0" />
            </a>

            <a
              href="https://www.google.com/maps/search/dermatologist+clinic+near+me"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 p-3.5 hover:border-[#1769AA] dark:hover:border-[#20B8A8] transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <MapPin className="h-4 w-4 text-[#20B8A8] shrink-0" />
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">
                    Local Dermatology Clinics on Maps
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Locate nearby clinics, hospital dermatology departments, and urgent skin clinics
                  </div>
                </div>
              </div>
              <ExternalLink className="h-4 w-4 text-[#1769AA] dark:text-[#20B8A8] shrink-0" />
            </a>
          </div>

          <div className="rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-4 space-y-2">
            <div className="font-semibold text-slate-900 dark:text-white">
              What to bring to your appointment
            </div>
            <ul className="list-disc pl-5 space-y-1 text-xs text-slate-600 dark:text-slate-300">
              <li>Your exported DermaAI PDF summary noting when you first spotted the lesion.</li>
              <li>Any earlier photos showing changes in size, border, or color over time.</li>
              <li>A note of personal or family history of melanoma or non-melanoma skin cancer.</li>
              <li>Request a full-body skin check in addition to inspecting the specific spot.</li>
            </ul>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-[#1769AA] px-4 py-2 text-sm font-semibold text-white hover:bg-[#12548A]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
