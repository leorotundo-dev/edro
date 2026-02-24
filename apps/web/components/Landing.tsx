'use client';

import Link from 'next/link';

const FEATURES = [
  'Briefing com IA',
  'Copy generativa',
  'Arte IA',
  'Calendário editorial',
  'Social Listening',
  'Analytics',
  'Aprovação de clientes',
  'Gestão de entregas',
];

const CARDS = [
  {
    tag: 'Copy IA',
    tagColor: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
    text: '"Lançamento exclusivo para quem acredita que moda é expressão, não tendência."',
    sub: '4 variações · Tom editorial',
  },
  {
    tag: 'Calendário',
    tagColor: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
    text: 'Dia dos Namorados — 3 pautas sugeridas com base no histórico da marca.',
    sub: '12 jun · Alta relevância',
  },
  {
    tag: 'Social Listening',
    tagColor: 'text-teal-400 bg-teal-500/10 border-teal-500/30',
    text: 'Menções em alta: +42% em "conforto urbano" nos últimos 7 dias.',
    sub: 'Instagram · Facebook · Web',
  },
];

const PROVIDERS = [
  { name: 'Claude',  sub: 'Anthropic', dot: 'bg-[#cc785c]' },
  { name: 'Gemini',  sub: 'Google',    dot: 'bg-[#4285f4]' },
  { name: 'GPT-4o',  sub: 'OpenAI',    dot: 'bg-[#10a37f]' },
  { name: 'Tavily',  sub: 'Web search',dot: 'bg-[#7c3aed]' },
];

export default function Landing() {
  return (
    <div className="bg-[#0a0f1e] min-h-screen text-white font-sans">

      {/* Nav */}
      <nav className="flex items-center justify-between px-[6vw] py-5 border-b border-white/[0.06] sticky top-0 z-50 bg-[#0a0f1e]/85 backdrop-blur-md">
        <span className="font-serif text-[22px] tracking-tight">
          edro<span className="text-orange-500">.</span>
        </span>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="px-5 py-2 rounded-lg text-sm font-medium border border-white/15 text-slate-300 hover:border-white/30 transition-colors"
          >
            Entrar
          </Link>
          <Link
            href="/login"
            className="px-5 py-2 rounded-lg text-sm font-semibold bg-orange-500 text-white hover:bg-orange-600 transition-colors"
          >
            Solicitar acesso
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-[6vw] pt-24 pb-20 max-w-[1280px] mx-auto relative">

        {/* Glow */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full bg-[radial-gradient(ellipse,rgba(255,102,0,0.12)_0%,transparent_70%)] pointer-events-none" />

        {/* Tag */}
        <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/25 rounded-full px-4 py-1.5 mb-10">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 inline-block" />
          <span className="text-[11px] font-semibold text-orange-400 tracking-[0.05em] uppercase">
            Plataforma de IA para agências
          </span>
        </div>

        {/* Headline */}
        <h1 className="font-serif font-normal leading-[1.05] tracking-[-0.02em] mb-7 max-w-[800px] text-[clamp(40px,6vw,84px)]">
          A inteligência que<br />
          <em className="text-orange-500 italic">move</em> sua agência.
        </h1>

        {/* Sub */}
        <p className="text-[clamp(16px,1.4vw,20px)] text-slate-400 leading-relaxed max-w-[560px] mb-12">
          De briefings a publicação — copy, arte IA, calendário editorial e métricas em um único sistema pensado para agências de marketing.
        </p>

        {/* CTAs */}
        <div className="flex flex-wrap gap-3 mb-20">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-[15px] font-bold bg-orange-500 text-white shadow-[0_0_32px_rgba(255,102,0,0.35)] hover:bg-orange-600 transition-colors"
          >
            Começar agora
            <span className="text-lg">→</span>
          </Link>
          <a
            href="mailto:oi@edro.digital"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-[15px] font-semibold border border-white/12 text-slate-200 hover:border-white/25 transition-colors"
          >
            Falar com a equipe
          </a>
        </div>

        {/* Powered by */}
        <div className="mb-14">
          <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-slate-600 mb-5">
            Powered by
          </p>
          <div className="flex flex-wrap gap-2.5 items-center">
            {PROVIDERS.map((p) => (
              <div
                key={p.name}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-white/[0.07] bg-white/[0.025]"
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${p.dot}`} />
                <span className="text-[13px] font-bold text-slate-200">{p.name}</span>
                <span className="text-[11px] text-slate-500">{p.sub}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap gap-2.5 mb-20">
          {FEATURES.map((f) => (
            <span
              key={f}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] border border-white/[0.09] text-slate-400 bg-white/[0.03]"
            >
              <span className="text-orange-500 text-[9px]">✦</span>
              {f}
            </span>
          ))}
        </div>

        {/* Preview cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {CARDS.map((card) => (
            <div
              key={card.tag}
              className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6 backdrop-blur-sm"
            >
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold tracking-[0.05em] uppercase border mb-4 ${card.tagColor}`}>
                {card.tag}
              </span>
              <p className="text-sm text-slate-300 leading-relaxed mb-3">{card.text}</p>
              <p className="text-xs text-slate-500">{card.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] px-[6vw] py-8 flex justify-between items-center flex-wrap gap-3">
        <span className="text-[13px] text-slate-700">© 2026 Edro.Digital</span>
        <a href="mailto:oi@edro.digital" className="text-[13px] text-slate-600 hover:text-slate-400 transition-colors">
          oi@edro.digital
        </a>
      </footer>
    </div>
  );
}
