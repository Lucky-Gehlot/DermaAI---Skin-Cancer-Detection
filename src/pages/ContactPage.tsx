import { useState, type FormEvent } from 'react';
import { CheckCircle2, Mail, Send } from 'lucide-react';
import { api } from '../lib/api';

export function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await api.submitContact({ name, email, subject, message });
      setSubmittedId(res.message.id);
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send message.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-medium text-[#1769AA] dark:text-[#20B8A8]">
          <Mail className="h-4 w-4" />
          <span>Feedback &amp; Platform Inquiries</span>
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Contact DermaAI
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Share product feedback, accessibility suggestions, or model-integration inquiries. Please do
          not send personal medical records or urgent clinical questions through this form.
        </p>
      </div>

      {submittedId && (
        <div
          role="status"
          className="rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-5 flex items-start gap-3 text-sm text-emerald-900 dark:text-emerald-200"
        >
          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">Thank you — your message has been received.</div>
            <div className="text-xs mt-1 font-mono">Reference ID: {submittedId}</div>
          </div>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 p-3.5 text-sm text-rose-800 dark:text-rose-200"
        >
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2B] p-6 sm:p-8 space-y-5"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label htmlFor="contact-name" className="block text-sm font-medium text-slate-800 dark:text-slate-200">
              Full Name
            </label>
            <input
              id="contact-name"
              type="text"
              required
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-900 dark:text-white"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="contact-email" className="block text-sm font-medium text-slate-800 dark:text-slate-200">
              Email Address
            </label>
            <input
              id="contact-email"
              type="email"
              required
              maxLength={254}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="contact-subject" className="block text-sm font-medium text-slate-800 dark:text-slate-200">
            Subject
          </label>
          <input
            id="contact-subject"
            type="text"
            required
            maxLength={180}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-900 dark:text-white"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="contact-message" className="block text-sm font-medium text-slate-800 dark:text-slate-200">
            Message
          </label>
          <textarea
            id="contact-message"
            rows={5}
            required
            minLength={5}
            maxLength={3000}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-[#1769AA] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#12548A] disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            <span>{submitting ? 'Sending…' : 'Submit Feedback'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
