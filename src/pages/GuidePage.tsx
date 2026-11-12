import { useEffect, useState } from 'react';
import { BookOpen, ShieldAlert, Sun, ArrowRight } from 'lucide-react';
import { ClinicalImage } from '../components/ClinicalImage';
import { api } from '../lib/api';
import type { AppRoute } from '../components/Navbar';
import type { ArticleRecord } from '../shared/types';

interface GuidePageProps {
  onNavigate: (route: AppRoute) => void;
}

const ABCDE_ITEMS = [
  {
    letter: 'A',
    title: 'Asymmetry',
    summary:
      'One half of a mole or pigmented spot does not match the shape of the other half when divided down the center.',
    notice:
      'Compare left vs. right and top vs. bottom halves. Benign moles are typically symmetric, whereas atypical or malignant lesions often appear uneven.',
    svg: (
      <svg viewBox="0 0 120 90" className="w-full h-24" aria-hidden="true">
        <rect width="120" height="90" rx="8" className="fill-slate-100 dark:fill-slate-900" />
        <circle cx="34" cy="45" r="18" className="fill-[#20B8A8]/35 stroke-[#1769AA]" strokeWidth="2" />
        <line x1="34" y1="20" x2="34" y2="70" stroke="#1769AA" strokeDasharray="3 3" strokeWidth="1.5" />
        <path
          d="M74 28 C88 22, 102 36, 98 54 C94 68, 70 66, 68 48 C67 38, 69 30, 74 28 Z"
          className="fill-amber-500/35 stroke-amber-700 dark:stroke-amber-400"
          strokeWidth="2"
        />
        <line x1="83" y1="20" x2="83" y2="70" stroke="#B45309" strokeDasharray="3 3" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    letter: 'B',
    title: 'Border Irregularity',
    summary:
      'Edges appear ragged, notched, scalloped, or poorly defined rather than forming a crisp, smooth perimeter.',
    notice:
      'Look closely at where the pigment meets surrounding normal skin. Pigment bleeding unevenly into healthy skin warrants an in-person dermatoscope check.',
    svg: (
      <svg viewBox="0 0 120 90" className="w-full h-24" aria-hidden="true">
        <rect width="120" height="90" rx="8" className="fill-slate-100 dark:fill-slate-900" />
        <circle cx="34" cy="45" r="17" className="fill-[#20B8A8]/35 stroke-[#1769AA]" strokeWidth="2" />
        <path
          d="M75 26 L84 31 L95 25 L98 37 L106 46 L96 56 L99 67 L85 63 L75 68 L69 55 L63 45 L71 36 Z"
          className="fill-amber-500/35 stroke-amber-700 dark:stroke-amber-400"
          strokeWidth="2"
        />
      </svg>
    ),
  },
  {
    letter: 'C',
    title: 'Color Variation',
    summary:
      'Color is not uniform across the spot and may include multiple shades of brown or tan alongside black, pink, red, white, or blue.',
    notice:
      'A spot containing two or more distinct pigment tones—or newly darkened patches within an older mole—should be evaluated by a dermatologist.',
    svg: (
      <svg viewBox="0 0 120 90" className="w-full h-24" aria-hidden="true">
        <rect width="120" height="90" rx="8" className="fill-slate-100 dark:fill-slate-900" />
        <circle cx="34" cy="45" r="17" className="fill-amber-800/40 stroke-[#1769AA]" strokeWidth="2" />
        <circle cx="84" cy="45" r="19" className="fill-amber-700/40 stroke-amber-800 dark:stroke-amber-400" strokeWidth="2" />
        <circle cx="78" cy="40" r="7" className="fill-slate-900/70" />
        <circle cx="91" cy="50" r="6" className="fill-rose-500/60" />
        <circle cx="83" cy="53" r="4" className="fill-amber-200/80" />
      </svg>
    ),
  },
  {
    letter: 'D',
    title: 'Diameter',
    summary:
      'Spots larger than 6 millimeters across (roughly the width of a pencil eraser), although early melanomas can be smaller.',
    notice:
      'Use a millimeter scale when photographing lesions over time. Size alone never rules out risk—small changing spots also merit evaluation.',
    svg: (
      <svg viewBox="0 0 120 90" className="w-full h-24" aria-hidden="true">
        <rect width="120" height="90" rx="8" className="fill-slate-100 dark:fill-slate-900" />
        <circle cx="60" cy="39" r="18" className="fill-amber-500/35 stroke-amber-700 dark:stroke-amber-400" strokeWidth="2" />
        <line x1="36" y1="68" x2="84" y2="68" stroke="#1769AA" strokeWidth="2" />
        <line x1="36" y1="63" x2="36" y2="73" stroke="#1769AA" strokeWidth="2" />
        <line x1="84" y1="63" x2="84" y2="73" stroke="#1769AA" strokeWidth="2" />
        <text x="60" y="82" textAnchor="middle" className="fill-slate-600 dark:fill-slate-300 text-[9px] font-mono">
          &gt; 6 mm
        </text>
      </svg>
    ),
  },
  {
    letter: 'E',
    title: 'Evolving',
    summary:
      'Any change over weeks or months in size, shape, color, elevation, or new symptoms such as bleeding, itching, or crusting.',
    notice:
      'Evolution is often the most critical warning sign. Any new spot after age 30 or an existing mole behaving differently ("ugly duckling") deserves prompt care.',
    svg: (
      <svg viewBox="0 0 120 90" className="w-full h-24" aria-hidden="true">
        <rect width="120" height="90" rx="8" className="fill-slate-100 dark:fill-slate-900" />
        <circle cx="30" cy="45" r="9" className="fill-[#20B8A8]/40 stroke-[#1769AA]" strokeWidth="1.5" />
        <path d="M46 45 L62 45 M58 40 L63 45 L58 50" stroke="#1769AA" strokeWidth="2" fill="none" />
        <path
          d="M78 27 C93 23, 104 37, 99 54 C94 69, 73 66, 71 48 C69 37, 72 29, 78 27 Z"
          className="fill-amber-500/40 stroke-amber-700 dark:stroke-amber-400"
          strokeWidth="2"
        />
      </svg>
    ),
  },
];

const CONDITIONS = [
  {
    name: 'Melanoma',
    detail:
      'A potentially serious skin cancer arising from pigment-producing melanocytes. Early detection before deep invasion dramatically improves clinical outcomes. Watch for ABCDE features and "ugly duckling" lesions.',
  },
  {
    name: 'Basal Cell Carcinoma (BCC)',
    detail:
      'The most common form of skin cancer, typically on sun-exposed head, neck, and torso areas. Often appears as a translucent pearly bump, pink patch, or recurring bleeding sore that crusts and never fully heals.',
  },
  {
    name: 'Squamous Cell Carcinoma (SCC)',
    detail:
      'The second most common skin cancer, frequently presenting as a firm red nodule, scaly rough patch, or tender persistent sore on chronically sun-exposed skin or scars.',
  },
  {
    name: 'Common Benign Lesions',
    detail:
      'Includes acquired benign nevi (moles), seborrheic keratoses, cherry angiomas, and dermatofibromas. Because benign and malignant spots can overlap visually, clinical dermoscopy is essential whenever uncertainty exists.',
  },
];

export function GuidePage({ onNavigate }: GuidePageProps) {
  const [articles, setArticles] = useState<ArticleRecord[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<ArticleRecord | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  useEffect(() => {
    api
      .getArticles()
      .then((res) => setArticles(res.articles))
      .catch(() => setArticles([]));
  }, []);

  const categories = ['All', ...Array.from(new Set(articles.map((a) => a.category)))];
  const filteredArticles =
    categoryFilter === 'All' ? articles : articles.filter((a) => a.category === categoryFilter);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 space-y-16">
      {/* Intro */}
      <div className="max-w-3xl space-y-3">
        <div className="text-xs font-medium text-[#1769AA] dark:text-[#20B8A8]">
          Medically Reviewed Educational Reference · AAD &amp; NCI Aligned
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
          ABCDE Skin Health &amp; Lesion Awareness Guide
        </h1>
        <p className="text-base leading-relaxed text-slate-600 dark:text-slate-300">
          Understanding warning signs empowers earlier dermatologist visits. Use this guide during
          routine self-examinations and seek professional evaluation for any concerning or changing
          spot.
        </p>
      </div>

      {/* ABCDE Interactive Cards */}
      <section className="space-y-6">
        <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
          The ABCDE Melanoma Warning Signs
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ABCDE_ITEMS.map((item) => (
            <article
              key={item.letter}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2B] p-6 space-y-4"
            >
              <div className="flex items-baseline gap-3">
                <span className="font-display text-2xl font-bold text-[#1769AA] dark:text-[#20B8A8]">
                  {item.letter}
                </span>
                <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                  {item.title}
                </h3>
              </div>
              {item.svg}
              <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                {item.summary}
              </p>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                <strong className="text-slate-800 dark:text-slate-200">What to watch: </strong>
                {item.notice}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Skin Conditions Overview */}
      <section className="space-y-6">
        <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
          Skin Conditions &amp; When to Consult a Dermatologist
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {CONDITIONS.map((cond) => (
            <div
              key={cond.name}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2B] p-6 space-y-2"
            >
              <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                {cond.name}
              </h3>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {cond.detail}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Sun Protection Section */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2B] overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        <div className="lg:col-span-5 h-64 lg:h-auto">
          <ClinicalImage
            src="/src/assets/images/sun_protection_care_1794511592199.jpg"
            alt="Broad-spectrum mineral sunscreen and wide-brimmed sun hat in morning sunlight"
            fallbackTitle="Daily UV Sun Protection"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="lg:col-span-7 p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-2 text-xs font-medium text-[#20B8A8]">
            <Sun className="h-4 w-4" />
            <span>Evidence-Based Prevention</span>
          </div>
          <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            Sun Protection &amp; Self-Exam Recommendations
          </h2>
          <ul className="space-y-2.5 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            <li>
              • Use broad-spectrum, water-resistant sunscreen (SPF 30+) daily on exposed skin and
              reapply every 2 hours outdoors.
            </li>
            <li>
              • Seek shade between 10:00 AM and 4:00 PM, wear UPF 50+ clothing, wide-brimmed hats,
              and UV-filtering sunglasses.
            </li>
            <li>
              • Perform monthly head-to-toe skin checks including palms, soles, nail beds, scalp,
              and behind the ears—areas where lesions can occur across all skin tones.
            </li>
            <li>
              • Schedule an urgent dermatology visit for any non-healing sore, spontaneous bleeding,
              or rapid evolution.
            </li>
          </ul>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => onNavigate('assess')}
              className="inline-flex items-center gap-2 rounded-lg bg-[#1769AA] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#12548A]"
            >
              <span>Assess a Skin Spot</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Skin Cancer Awareness Articles */}
      <section className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
              Skin Cancer Awareness Articles
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Curated educational reading grounded in dermatology clinical guidelines
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 p-1">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  categoryFilter === cat
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredArticles.map((art) => (
            <article
              key={art.id}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2B] p-6 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>{art.category}</span>
                  <span aria-hidden="true">·</span>
                  <span>{art.readTime}</span>
                </div>
                <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                  {art.title}
                </h3>
                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  {art.summary}
                </p>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[65%]">
                  Source: {art.medicalSource}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedArticle(art)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1769AA] dark:text-[#20B8A8] hover:underline whitespace-nowrap"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>Read Article</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Article Reader Modal */}
      {selectedArticle && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="article-reader-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
        >
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2B] p-6 sm:p-8 shadow-xl max-h-[85vh] overflow-y-auto space-y-4">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>{selectedArticle.category}</span>
              <span aria-hidden="true">·</span>
              <span>{selectedArticle.readTime}</span>
            </div>
            <h2
              id="article-reader-title"
              className="font-display text-2xl font-bold text-slate-900 dark:text-white"
            >
              {selectedArticle.title}
            </h2>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Reference: {selectedArticle.medicalSource}
            </div>
            <div className="text-sm leading-relaxed text-slate-700 dark:text-slate-200 whitespace-pre-line pt-2">
              {selectedArticle.content}
            </div>
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 p-3 flex items-start gap-2 text-xs text-amber-900 dark:text-amber-200">
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                Educational article only. Consult a licensed dermatologist for individual medical
                advice.
              </span>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedArticle(null)}
                className="rounded-lg bg-[#1769AA] px-4 py-2 text-sm font-semibold text-white hover:bg-[#12548A]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
