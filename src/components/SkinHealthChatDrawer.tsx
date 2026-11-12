import { useEffect, useRef, useState } from 'react';
import { MessageSquare, Send, ShieldAlert, X } from 'lucide-react';
import { api } from '../lib/api';
import type { ChatTurn } from '../shared/types';

const SUGGESTED_QUESTIONS = [
  'What do the ABCDE signs of melanoma mean?',
  'When should a changing mole be checked by a doctor?',
  'How do dermatologists use dermoscopy and biopsy?',
  'What SPF and sun-protection habits are recommended?',
];

export function SkinHealthChatDrawer() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatTurn[]>([
    {
      role: 'model',
      text: 'Hello. I am the DermaAI Skin Health Education Assistant. Ask me about the ABCDE warning signs, sun protection, or how dermatologists evaluate skin spots. Please note: I provide educational information only and cannot diagnose skin lesions.',
    },
  ]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const sendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || loading) return;

    const nextMessages: ChatTurn[] = [...messages, { role: 'user', text: trimmed }];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await api.sendChat(nextMessages);
      setMessages((prev) => [...prev, { role: 'model', text: res.reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          text:
            err instanceof Error
              ? `Unable to connect right now: ${err.message}`
              : 'Unable to reach the educational assistant.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open Skin Health Education Assistant"
          className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2.5 rounded-xl bg-[#1769AA] px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-[#12548A] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20B8A8] focus-visible:ring-offset-2"
        >
          <MessageSquare className="h-4 w-4" />
          <span className="whitespace-nowrap">Skin Health Q&amp;A</span>
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-modal="false"
          aria-label="Skin Health Education Assistant"
          className="fixed bottom-4 right-4 z-50 flex w-[calc(100vw-2rem)] max-w-md flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2B] shadow-2xl overflow-hidden max-h-[80vh]"
        >
          <div className="flex items-center justify-between gap-3 bg-[#1769AA] px-4 py-3 text-white">
            <div>
              <div className="font-display text-sm font-semibold">
                Skin Health Education Assistant
              </div>
              <div className="text-xs text-blue-100">
                Educational guidance · Not a diagnostic tool
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat assistant"
              className="rounded-lg p-1.5 hover:bg-white/15"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/60 px-4 py-2 text-xs text-amber-900 dark:text-amber-200">
            <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-amber-700 dark:text-amber-400" />
            <span>
              Do not share personal identifying info. For changing, bleeding, or painful spots, see a
              qualified dermatologist.
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[260px] max-h-[420px]">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-line ${
                    m.role === 'user'
                      ? 'bg-[#1769AA] text-white'
                      : 'bg-slate-100 dark:bg-slate-800/90 text-slate-800 dark:text-slate-100'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-xl bg-slate-100 dark:bg-slate-800 px-3.5 py-2.5 text-xs text-slate-500 dark:text-slate-400">
                  Reviewing educational references…
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {messages.length <= 2 && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => void sendMessage(q)}
                  className="text-left text-xs rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void sendMessage(input);
            }}
            className="flex items-center gap-2 border-t border-slate-200 dark:border-slate-800 p-3 bg-slate-50 dark:bg-[#0E1726]"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a skin health question…"
              aria-label="Ask a skin health question"
              className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Send message"
              className="inline-flex items-center justify-center rounded-lg bg-[#1769AA] p-2.5 text-white hover:bg-[#12548A] disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
