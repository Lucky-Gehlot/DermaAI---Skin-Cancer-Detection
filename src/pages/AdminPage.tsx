import { useEffect, useState, type FormEvent } from 'react';
import { Lock, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import type { ArticleRecord, AuditLogRecord, ModelVersionRecord } from '../shared/types';

export function AdminPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<{
    totalUsers: number;
    totalAssessments: number;
    demonstrationAssessments: number;
    activeModelMode: string;
    activeProvider: {
      id: string;
      name: string;
      version: string;
      isClinicallyValidated: boolean;
    };
    geminiConfigured: boolean;
    systemStatus: string;
  } | null>(null);
  const [modelVersions, setModelVersions] = useState<ModelVersionRecord[]>([]);
  const [users, setUsers] = useState<
    Array<{
      id: string;
      displayName: string;
      email: string;
      role: 'patient' | 'admin';
      authProvider: 'local' | 'google';
      createdAt: string;
    }>
  >([]);
  const [articles, setArticles] = useState<ArticleRecord[]>([]);
  const [errorLogs, setErrorLogs] = useState<AuditLogRecord[]>([]);

  // New Article CMS state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Early Detection');
  const [readTime, setReadTime] = useState('4 min read');
  const [summaryText, setSummaryText] = useState('');
  const [content, setContent] = useState('');
  const [medicalSource, setMedicalSource] = useState('American Academy of Dermatology (AAD)');
  const [savingArticle, setSavingArticle] = useState(false);

  const loadDashboard = () => {
    setLoading(true);
    api
      .getAdminDashboard()
      .then((res) => {
        setSummary(res.summary);
        setModelVersions(res.modelVersions);
        setUsers(res.users);
        setArticles(res.articles);
        setErrorLogs(res.errorLogs);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load admin console.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      loadDashboard();
    } else {
      setLoading(false);
    }
  }, [user]);

  if (!user || user.role !== 'admin') {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center space-y-3">
        <Lock className="h-8 w-8 text-slate-400 mx-auto" />
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
          Administrator Access Required
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          This area is protected by role-based access control.
        </p>
      </div>
    );
  }

  const handleToggleRole = async (targetId: string, currentRole: 'patient' | 'admin') => {
    try {
      const nextRole = currentRole === 'admin' ? 'patient' : 'admin';
      const res = await api.updateUserRole(targetId, nextRole);
      setUsers((prev) => prev.map((u) => (u.id === targetId ? { ...u, role: res.user.role } : u)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Role update failed.');
    }
  };

  const handleCreateArticle = async (e: FormEvent) => {
    e.preventDefault();
    setSavingArticle(true);
    setError(null);
    try {
      const res = await api.createArticle({
        title,
        category,
        readTime,
        summary: summaryText,
        content,
        medicalSource,
      });
      setArticles((prev) => [res.article, ...prev]);
      setTitle('');
      setSummaryText('');
      setContent('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create article.');
    } finally {
      setSavingArticle(false);
    }
  };

  const handleDeleteArticle = async (id: string) => {
    try {
      await api.deleteArticle(id);
      setArticles((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete article.');
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-[#1769AA] dark:text-[#20B8A8]">
            <ShieldCheck className="h-4 w-4" />
            <span>RBAC Protected · Patient Images &amp; Lesion Notes Excluded</span>
          </div>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            DermaAI Admin &amp; Model Governance Console
          </h1>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 p-3.5 text-sm text-rose-800 dark:text-rose-200"
        >
          {error}
        </div>
      )}

      {loading || !summary ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="h-28 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2B] animate-pulse"
            />
          ))}
        </div>
      ) : (
        <>
          {/* Summary KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2B] p-5">
              <div className="text-xs text-slate-500 dark:text-slate-400">Total Registered Users</div>
              <div className="mt-2 font-mono text-3xl font-bold tabular-nums text-slate-900 dark:text-white">
                {summary.totalUsers}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2B] p-5">
              <div className="text-xs text-slate-500 dark:text-slate-400">Total Assessments</div>
              <div className="mt-2 font-mono text-3xl font-bold tabular-nums text-slate-900 dark:text-white">
                {summary.totalAssessments}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2B] p-5">
              <div className="text-xs text-slate-500 dark:text-slate-400">Dermatology Model Status</div>
              <div className="mt-2 font-display text-base font-bold text-slate-900 dark:text-white">
                {summary.activeProvider.isClinicallyValidated
                  ? 'Validated Endpoint Active'
                  : 'Demonstration Mode'}
              </div>
              <div className="mt-1 font-mono text-xs text-slate-500 dark:text-slate-400">
                {summary.activeProvider.version}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2B] p-5">
              <div className="text-xs text-slate-500 dark:text-slate-400">Platform &amp; Gemini Service</div>
              <div className="mt-2 font-display text-base font-bold text-emerald-700 dark:text-emerald-400">
                {summary.systemStatus.toUpperCase()}
              </div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Gemini Education: {summary.geminiConfigured ? 'Configured' : 'API key missing'}
              </div>
            </div>
          </div>

          {/* Model Registry & Skin Tone Evaluation */}
          <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2B] p-6 space-y-4">
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Model Integration Registry &amp; Demographic Fairness Evaluation
            </h2>
            {modelVersions.map((m) => (
              <div key={m.id} className="space-y-3 border-t border-slate-100 dark:border-slate-800 pt-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {m.name} ({m.version})
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {m.intendedModality}
                    </div>
                  </div>
                  <div className="text-xs font-mono tabular-nums text-slate-600 dark:text-slate-300">
                    Sensitivity: {m.metrics.sensitivity} · Specificity: {m.metrics.specificity}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                        <th className="py-2 pr-4 font-medium">Fitzpatrick Group</th>
                        <th className="py-2 pr-4 font-medium">Sample Coverage</th>
                        <th className="py-2 pr-4 font-medium">Sensitivity</th>
                        <th className="py-2 font-medium">Specificity</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {m.metrics.fitzpatrickBreakdown.map((row) => (
                        <tr key={row.skinToneGroup} className="text-slate-700 dark:text-slate-300">
                          <td className="py-2 pr-4 font-medium">{row.skinToneGroup}</td>
                          <td className="py-2 pr-4">{row.sampleSize}</td>
                          <td className="py-2 pr-4 font-mono tabular-nums">{row.sensitivity}</td>
                          <td className="py-2 font-mono tabular-nums">{row.specificity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </section>

          {/* User Management (No Medical Info Exposed) */}
          <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2B] p-6 space-y-4">
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              User Account Management
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                    <th className="py-2.5 pr-4 font-medium">Name</th>
                    <th className="py-2.5 pr-4 font-medium">Email</th>
                    <th className="py-2.5 pr-4 font-medium">Auth</th>
                    <th className="py-2.5 pr-4 font-medium">Role</th>
                    <th className="py-2.5 pr-4 font-medium">Joined</th>
                    <th className="py-2.5 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {users.map((u) => (
                    <tr key={u.id} className="text-slate-700 dark:text-slate-300">
                      <td className="py-2.5 pr-4 font-medium">{u.displayName}</td>
                      <td className="py-2.5 pr-4">{u.email}</td>
                      <td className="py-2.5 pr-4 uppercase font-mono">{u.authProvider}</td>
                      <td className="py-2.5 pr-4 font-semibold">{u.role}</td>
                      <td className="py-2.5 pr-4 font-mono tabular-nums">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 text-right">
                        {u.id !== user.id && (
                          <button
                            type="button"
                            onClick={() => void handleToggleRole(u.id, u.role)}
                            className="rounded-md border border-slate-300 dark:border-slate-700 px-2.5 py-1 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
                          >
                            {u.role === 'admin' ? 'Set Patient' : 'Promote Admin'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Content Management & Error Logs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2B] p-6 space-y-5">
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Educational Content Management
              </h2>
              <form onSubmit={handleCreateArticle} className="space-y-3">
                <input
                  type="text"
                  required
                  placeholder="Article title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    required
                    placeholder="Category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Read time"
                    value={readTime}
                    onChange={(e) => setReadTime(e.target.value)}
                    className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white"
                  />
                </div>
                <input
                  type="text"
                  required
                  placeholder="Medical reference source"
                  value={medicalSource}
                  onChange={(e) => setMedicalSource(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white"
                />
                <input
                  type="text"
                  required
                  placeholder="Short summary"
                  value={summaryText}
                  onChange={(e) => setSummaryText(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white"
                />
                <textarea
                  rows={3}
                  required
                  placeholder="Article body content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white"
                />
                <button
                  type="submit"
                  disabled={savingArticle}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#1769AA] px-4 py-2 text-xs font-semibold text-white hover:bg-[#12548A]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>{savingArticle ? 'Publishing…' : 'Publish Article'}</span>
                </button>
              </form>

              <div className="divide-y divide-slate-100 dark:divide-slate-800 pt-2">
                {articles.map((art) => (
                  <div key={art.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {art.title}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {art.category} · {art.medicalSource}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleDeleteArticle(art.id)}
                      aria-label={`Delete ${art.title}`}
                      className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2B] p-6 space-y-4">
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                System Warning &amp; Error Logs
              </h2>
              {errorLogs.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No error or warning events recorded.
                </p>
              ) : (
                <div className="space-y-2.5 max-h-96 overflow-y-auto">
                  {errorLogs.map((log) => (
                    <div
                      key={log.id}
                      className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between font-mono">
                        <span
                          className={
                            log.level === 'error'
                              ? 'text-rose-600 dark:text-rose-400 font-semibold'
                              : 'text-amber-600 dark:text-amber-400 font-semibold'
                          }
                        >
                          {log.level.toUpperCase()} · {log.action}
                        </span>
                        <span className="tabular-nums text-slate-500">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-slate-700 dark:text-slate-300">{log.summary}</div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
