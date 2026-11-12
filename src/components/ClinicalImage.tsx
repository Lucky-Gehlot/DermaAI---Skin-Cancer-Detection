import { useState } from 'react';
import { ShieldAlert } from 'lucide-react';

interface ClinicalImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackTitle?: string;
}

export function ClinicalImage({
  src,
  alt,
  className = '',
  fallbackTitle = 'DermaAI Clinical Visual',
}: ClinicalImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#1769AA]/10 via-[#20B8A8]/10 to-slate-100 dark:from-[#1769AA]/20 dark:via-[#20B8A8]/15 dark:to-slate-900 border border-slate-200 dark:border-slate-800 p-6 text-center ${className}`}
      >
        <ShieldAlert className="h-8 w-8 text-[#1769AA] dark:text-[#20B8A8] mb-2" />
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {fallbackTitle}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
