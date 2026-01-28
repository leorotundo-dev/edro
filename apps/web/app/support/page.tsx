'use client';

import AppShell from '@/components/AppShell';

export default function SupportPage() {
  return (
    <AppShell
      title="Support"
      meta="Help Center"
      topbarLeft={<div className="text-sm font-semibold text-slate-500 uppercase tracking-widest">Support</div>}
    >
      <div className="page-content">
        <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h2 className="font-display text-2xl text-slate-900">Support Desk</h2>
          <p className="text-sm text-slate-500 mt-2 max-w-2xl">
            For now, use this area to log operational issues, request access, or share platform feedback.
            We can wire the real ticketing system when needed.
          </p>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="text-xs uppercase tracking-widest text-slate-400 font-semibold">Knowledge Base</div>
            <h3 className="text-lg font-semibold mt-3">Quick Guides</h3>
            <p className="text-sm text-slate-500 mt-2">
              Best practices for calendar ops, clipping triage, and AI usage inside the Studio.
            </p>
            <button className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">
              Open docs
              <span className="material-symbols-outlined text-base">arrow_forward</span>
            </button>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="text-xs uppercase tracking-widest text-slate-400 font-semibold">Contact</div>
            <h3 className="text-lg font-semibold mt-3">Studio Operations</h3>
            <p className="text-sm text-slate-500 mt-2">
              Reach the internal team for platform incidents or access changes.
            </p>
            <button className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">
              Send a request
              <span className="material-symbols-outlined text-base">mail</span>
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
