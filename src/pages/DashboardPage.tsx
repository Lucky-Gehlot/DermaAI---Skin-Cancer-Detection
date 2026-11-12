import { useEffect, useState, type FormEvent } from 'react';
import {
  CheckCircle2,
  Download,
  Eye,
  ImageOff,
  LogOut,
  Plus,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import {
  deleteFirebaseAssessment,
  syncFirebaseUserProfile,
  updateFirebaseAssessmentImageState,
} from '../lib/firebase';
import { downloadAssessmentPdf } from '../lib/pdfReport';
import type { AppRoute } from '../components/Navbar';
import type { AssessmentRecord } from '../shared/types';

interface DashboardPageProps {
  onNavigate: (route: AppRoute) => void;
  onViewAssessment: (record: AssessmentRecord) => void;
}

export function DashboardPage({ onNavigate, onViewAssessment }: DashboardPageProps) {
  const { user, logout, refreshUser } = useAuth();
  const [tab, setTab] = useState<'history' | 'settings'>('history');
  const [assessments, setAssessments] = useState<AssessmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Settings form state
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [ageRange, setAgeRange] = useState(user?.ageRange || '');
  const [defaultRetentionDays, setDefaultRetentionDays] = useState(
    user?.defaultRetentionDays ?? 30
  );
  const [allowImageStorage, setAllowImageStorage] = useState(user?.allowImageStorage ?? true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.displayName);
    setAgeRange(user.ageRange || '');
    setDefaultRetentionDays(user.defaultRetentionDays);
    setAllowImageStorage(user.allowImageStorage);

    setLoading(true);
    api
      .getHistory()
      .then((res) => setAssessments(res.assessments))
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Unable to load assessment history.')
      )
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center space-y-4">
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
          Sign in to access your Dashboard
        </h1>
        <button
          type="button"
          onClick={() => onNavigate('auth')}
          className="rounded-lg bg-[#1769AA] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#12548A]"
        >
          Login / Sign Up
        </button>
      </div>
    );
  }

  const handleDeleteImageOnly = async (id: string) => {
    try {
      const res = await api.deleteAssessmentImage(id);
      setAssessments((prev) => prev.map((a) => (a.id === id ? res.assessment : a)));
      updateFirebaseAssessmentImageState(id, user.id, false).catch(() => undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete image.');
    }
  };

  const handleDeleteAssessment = async (id: string) => {
    try {
      await api.deleteAssessment(id);
      setAssessments((prev) => prev.filter((a) => a.id !== id));
      deleteFirebaseAssessment(id, user.id).catch(() => undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete assessment.');
    }
  };

  const handleSaveSettings = async (e: FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsMessage(null);
    setError(null);
    try {
      const res = await api.updateProfile({
        displayName,
        ageRange,
        defaultRetentionDays: Number(defaultRetentionDays),
        allowImageStorage,
      });
      await refreshUser();
      syncFirebaseUserProfile(res.profile).catch(() => undefined);
      setSettingsMessage('Profile and privacy retention settings updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    onNavigate('home');
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div className="space-y-1">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Signed in as {user.email} · {user.role === 'admin' ? 'Administrator' : 'Patient Account'}
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Welcome, {user.displayName}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate('assess')}
            className="inline-flex items-center gap-2 rounded-lg bg-[#1769AA] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#12548A] whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            <span>Start New Assessment</span>
          </button>
          {user.role === 'admin' && (
            <button
              type="button"
              onClick={() => onNavigate('admin')}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
            >
              <ShieldCheck className="h-4 w-4 text-[#20B8A8]" />
              <span>Admin Console</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 px-3.5 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Informational Notice */}
      <div className="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/30 p-4 flex items-start gap-3 text-xs sm:text-sm text-amber-950 dark:text-amber-200">
        <ShieldAlert className="h-5 w-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
        <span>
          <strong>Informational Records Only:</strong> Historical assessments saved here are
          informational pre-screening records, not medical diagnoses. Always review changing or
          concerning spots with a dermatologist.
        </span>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-900 p-1">
        <button
          type="button"
          onClick={() => setTab('history')}
          className={`rounded-md px-4 py-2 text-xs font-semibold transition-colors ${
            tab === 'history'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Assessment History ({assessments.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('settings')}
          className={`inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-xs font-semibold transition-colors ${
            tab === 'settings'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          <Settings className="h-3.5 w-3.5" />
          <span>Profile &amp; Privacy Settings</span>
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 p-3.5 text-sm text-rose-800 dark:text-rose-200"
        >
          {error}
        </div>
      )}

      {tab === 'history' && (
        <>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-24 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2B] animate-pulse"
                />
              ))}
            </div>
          ) : assessments.length === 0 ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2B] p-12 text-center space-y-3">
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                No Assessment Records Yet
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                Start an informational lesion assessment to document a spot’s timeline, check image
                quality, and generate a dermatologist-ready PDF summary.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => onNavigate('assess')}
                  className="rounded-lg bg-[#1769AA] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#12548A]"
                >
                  Start First Assessment
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {assessments.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2B] p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5"
                >
                  <div className="flex items-start gap-4">
                    <div className="h-20 w-20 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 overflow-hidden shrink-0 flex items-center justify-center">
                      {item.imageStored ? (
                        <img
                          src={`/api/assessment/${encodeURIComponent(item.id)}/image`}
                          alt="Lesion thumbnail"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <ImageOff className="h-5 w-5 text-slate-400" />
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-mono tabular-nums">
                          {new Date(item.createdAt).toLocaleString()}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {item.patientContext.bodyLocation || 'Location not specified'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {item.modelResult.isClinicallyValidated
                            ? 'Validated Model'
                            : 'Demonstration Mode'}
                        </span>
                      </div>

                      <div className="font-display text-base font-bold text-slate-900 dark:text-white">
                        Informational Record —{' '}
                        {item.modelResult.classificationAvailable && item.modelResult.topCategory
                          ? item.modelResult.topCategory
                          : 'No Medical Classification Available'}
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 max-w-2xl">
                        {item.warningSigns.length > 0
                          ? `${item.warningSigns.length} clinical warning consideration(s) noted.`
                          : 'No urgent symptom flags reported; follow standard dermatological guidance.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onViewAssessment(item)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>View Report</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => downloadAssessmentPdf(item)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>PDF</span>
                    </button>

                    {item.imageStored && (
                      <button
                        type="button"
                        onClick={() => void handleDeleteImageOnly(item.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <ImageOff className="h-3.5 w-3.5" />
                        <span>Delete Image</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => void handleDeleteAssessment(item.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 dark:border-rose-900 px-3 py-2 text-xs font-medium text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'settings' && (
        <form
          onSubmit={handleSaveSettings}
          className="max-w-2xl rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2B] p-6 space-y-5"
        >
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
            Account &amp; Image Retention Settings
          </h2>

          {settingsMessage && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-3 text-xs text-emerald-900 dark:text-emerald-200">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{settingsMessage}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="profile-name" className="block text-sm font-medium text-slate-800 dark:text-slate-200">
              Display Name
            </label>
            <input
              id="profile-name"
              type="text"
              required
              maxLength={100}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="profile-age" className="block text-sm font-medium text-slate-800 dark:text-slate-200">
                Default Age Range
              </label>
              <select
                id="profile-age"
                value={ageRange}
                onChange={(e) => setAgeRange(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-900 dark:text-white"
              >
                <option value="">Not set</option>
                <option value="18–29">18–29</option>
                <option value="30–49">30–49</option>
                <option value="50–64">50–64</option>
                <option value="65+">65 or older</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="retention-days" className="block text-sm font-medium text-slate-800 dark:text-slate-200">
                Automatic Image Retention (Days)
              </label>
              <input
                id="retention-days"
                type="number"
                min={0}
                max={365}
                value={defaultRetentionDays}
                onChange={(e) => setDefaultRetentionDays(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm font-mono tabular-nums text-slate-900 dark:text-white"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Set to 0 for immediate deletion after assessment.
              </p>
            </div>
          </div>

          <label className="flex items-start gap-3 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={allowImageStorage}
              onChange={(e) => setAllowImageStorage(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-[#1769AA]"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">
              Allow storing uploaded lesion images privately in my assessment history by default
            </span>
          </label>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingSettings}
              className="rounded-lg bg-[#1769AA] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#12548A] disabled:opacity-50"
            >
              {savingSettings ? 'Saving…' : 'Save Preferences'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
