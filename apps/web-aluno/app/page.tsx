import Image from 'next/image';
import Link from 'next/link';

import { Badge, Button, Card } from '@edro/ui';

const heroHighlights = [
  {
    label: 'Drops guiados',
    value: '4',
    detail: 'Níveis N1–N5 por edital'
  },
  {
    label: 'Retenção prevista',
    value: '+38%',
    detail: 'SRS adaptado + tutor'
  },
  {
    label: 'Tutor IA',
    value: '24/7',
    detail: 'Humor + energia + contexto'
  }
];

const courses = [
  {
    title: 'Trilha Memória Essencial',
    description: 'Drops N1–N2 com mnemônicos e reforço de revisão em 3h.',
    next: 'Revisão hoje às 18h',
    tag: 'Drop turbo',
    progress: 72,
    badgeVariant: 'success'
  },
  {
    title: 'Questões FGV & Cebraspe',
    description: '40 questões adaptativas com timer flexível e mapas de erro.',
    next: 'Simulado adaptativo amanhã',
    tag: 'Simulado adaptativo',
    progress: 45,
    badgeVariant: 'warning'
  },
  {
    title: 'Trilha Edital Nível Hard',
    description: 'Auto-formação com heatmap por banca e previsão de prova.',
    next: 'Tutor + simplificação liberado',
    tag: 'Auto-formação',
    progress: 58,
    badgeVariant: 'primary'
  }
];

const flowSteps = [
  {
    title: 'Drop guiado',
    description: 'Gota que chega pronta: aula curta, mnemônico e instruções do tutor.',
    emoji: '💧'
  },
  {
    title: 'Tutor contextual',
    description: 'IA conversa sobre seus erros recentes, estilo cognitivo e humor.',
    emoji: '🗣️'
  },
  {
    title: 'SRS ativo',
    description: 'Intervalos personalizados, atrasados e próximos reforçam a memória.',
    emoji: '🎯'
  }
];

const featureTiles = [
  {
    title: 'Auto-formações dinâmicas',
    description: 'Gere módulos, trilhas e blocos a partir do edital escolhido.',
    icon: '🧭',
    accent: 'from-lavender-light/80 to-primary-200/70'
  },
  {
    title: 'Heatmap e previsão',
    description: 'Probabilidade por banca/subtópico alimenta a trilha do dia.',
    icon: '🌐',
    accent: 'from-sky-light/80 to-slate-100/80'
  },
  {
    title: 'Notificações acolhedoras',
    description: 'Missões leves, streak recuperável e notificações gentis.',
    icon: '🔔',
    accent: 'from-coral-light/80 to-accent-gold/80'
  }
];

export default function Page() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <main className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-12">
        <section className="relative overflow-hidden rounded-[2rem] border border-white/30 bg-gradient-to-br from-lavender-light/70 via-primary-200/70 to-slate-50/70 p-8 text-slate-900 shadow-[0_20px_45px_-20px_rgba(15,23,42,0.8)] sm:p-10 lg:p-12">
          <div className="lg:grid lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-10">
            <div className="space-y-6">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/80 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-slate-600">
                Conhecimento que fica
              </p>
              <div>
                <h1 className="text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl">
                  Edro regula seu foco e guarda conhecimento para valer.
                </h1>
                <p className="mt-4 text-lg text-slate-700">
                  O app monta trilhas, conversa com você e transforma erro em aprendizado sem pressionar.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/register">
                  <Button variant="primary">Começar gratuito</Button>
                </Link>
                <Link href="/login">
                  <Button variant="secondary">Acessar app do aluno</Button>
                </Link>
                <Button variant="outline">Ver trilha inteligente</Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {heroHighlights.map((highlight) => (
                  <div
                    key={highlight.label}
                    className="rounded-2xl border border-white/70 bg-white/80 p-4 text-slate-900 shadow-[0_10px_20px_-15px_rgba(15,23,42,0.5)]"
                  >
                    <p className="text-xs uppercase tracking-wider text-slate-500">{highlight.label}</p>
                    <p className="text-2xl font-semibold">{highlight.value}</p>
                    <p className="text-xs text-slate-500">{highlight.detail}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-10 flex items-center justify-center lg:mt-0">
              <div className="relative h-64 w-64 rounded-[2rem] border border-white/60 bg-gradient-to-br from-white to-sky-100/80 p-6 shadow-[0_30px_60px_-30px_rgba(15,23,42,0.9)]">
                <div className="relative h-full w-full">
                  <Image
                    src="/icon.svg"
                    alt="Edro droplet"
                    fill
                    sizes="(max-width: 1024px) 50vw, 256px"
                    className="object-contain"
                    priority
                  />
                </div>
                <div className="absolute -bottom-6 left-4 rounded-2xl bg-white/95 px-4 py-2 text-xs font-semibold text-slate-700 shadow-lg">
                  Tutor contextual e mapas de erro
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-400">Trilhas em destaque</p>
              <h2 className="text-3xl font-semibold text-white">Conteúdo N1–N5 pronto para o seu ritmo</h2>
            </div>
            <Button variant="outline">Explorar banco de questões</Button>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {courses.map((course) => (
              <Card
                key={course.title}
                padding="lg"
                className="border-0 bg-gradient-to-br from-white/90 to-slate-50/80 shadow-[0_22px_45px_-25px_rgba(15,23,42,0.6)]"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-lg font-semibold text-slate-900">{course.title}</p>
                  <Badge variant={course.badgeVariant as 'primary' | 'success' | 'warning' | 'danger'} size="sm" soft>
                    {course.tag}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-slate-500">{course.description}</p>
                <div className="mt-4 flex items-center justify-between gap-4 text-xs text-slate-500">
                  <span>{course.next}</span>
                  <Badge variant="gray" size="sm" soft>
                    Rotina SRS
                  </Badge>
                </div>
                <div className="mt-5 space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                    <span>Progresso</span>
                    <span>{course.progress}%</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-200/70">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-sky-light to-primary-500"
                      style={{ width: `${course.progress}%` }}
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-400">Fluxo inteligente</p>
            <h2 className="text-3xl font-semibold text-white">Trilha diária que se ajusta</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Recco v2 prioriza correções, carga disponível e proximidade da prova—sem exigir planejamento manual.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {flowSteps.map((step, index) => (
              <Card
                key={step.title}
                padding="lg"
                bordered={false}
                className="bg-gradient-to-br from-slate-900/80 to-slate-950/90 text-white shadow-[0_25px_50px_-30px_rgba(15,23,42,0.9)]"
              >
                <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-slate-400">
                  <span className="text-2xl">{step.emoji}</span>
                  Passo {index + 1}
                </div>
                <h3 className="mt-4 text-xl font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-slate-300">{step.description}</p>
              </Card>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-400">Experiência completa</p>
              <h2 className="text-3xl font-semibold text-white">Editorais, gamificação e acessibilidade</h2>
            </div>
            <Button variant="outline">Ver plano com quotas</Button>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {featureTiles.map((feature) => (
              <Card
                key={feature.title}
                padding="lg"
                bordered={false}
                className={`bg-gradient-to-br ${feature.accent} text-slate-900 shadow-[0_25px_45px_-25px_rgba(15,23,42,0.55)]`}
              >
                <div className="flex items-center gap-3 text-sm font-semibold">
                  <span className="text-2xl">{feature.icon}</span>
                  {feature.title}
                </div>
                <p className="mt-3 text-sm text-slate-700">{feature.description}</p>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
