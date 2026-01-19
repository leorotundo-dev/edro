# Inventario de telas (admin + aluno)

Resumo
- Web admin: 31 telas
- Web aluno: 50 telas
- Total atual: 81 (meta 80+)

## Web admin (apps/web/app)
- / -> apps/web/app/page.tsx
- /login -> apps/web/app/(auth)/login/page.tsx
- /admin -> apps/web/app/admin/page.tsx
- /admin/dashboard -> apps/web/app/admin/dashboard/page.tsx
- /admin/analytics -> apps/web/app/admin/analytics/page.tsx
- /admin/blueprints -> apps/web/app/admin/blueprints/page.tsx
- /admin/blueprints/[id] -> apps/web/app/admin/blueprints/[id]/page.tsx
- /admin/costs -> apps/web/app/admin/costs/page.tsx
- /admin/drops -> apps/web/app/admin/drops/page.tsx
- /admin/drops/[id] -> apps/web/app/admin/drops/[id]/page.tsx
- /admin/editais -> apps/web/app/admin/editais/page.tsx
- /admin/editais/novo -> apps/web/app/admin/editais/novo/page.tsx
- /admin/editais/[id] -> apps/web/app/admin/editais/[id]/page.tsx
- /admin/editais/[id]/editar -> apps/web/app/admin/editais/[id]/editar/page.tsx
- /admin/editais/harvest -> apps/web/app/admin/editais/harvest/page.tsx
- /admin/editais/relatorios -> apps/web/app/admin/editais/relatorios/page.tsx
- /admin/gamification -> apps/web/app/admin/gamification/page.tsx
- /admin/harvest -> apps/web/app/admin/harvest/page.tsx
- /admin/harvest/[id] -> apps/web/app/admin/harvest/[id]/page.tsx
- /admin/notifications -> apps/web/app/admin/notifications/page.tsx
- /admin/payments -> apps/web/app/admin/payments/page.tsx
- /admin/questoes -> apps/web/app/admin/questoes/page.tsx
- /admin/rag -> apps/web/app/admin/rag/page.tsx
- /admin/rag/[id] -> apps/web/app/admin/rag/[id]/page.tsx
- /admin/recco-engine -> apps/web/app/admin/recco-engine/page.tsx
- /admin/scrapers -> apps/web/app/admin/scrapers/page.tsx
- /admin/scrapers/[id] -> apps/web/app/admin/scrapers/[id]/page.tsx
- /admin/simulados -> apps/web/app/admin/simulados/page.tsx
- /admin/users -> apps/web/app/admin/users/page.tsx
- /admin/users/[id] -> apps/web/app/admin/users/[id]/page.tsx
- /test-heroui -> apps/web/app/test-heroui/page.tsx

## Web aluno (apps/web-aluno/app)
- / -> apps/web-aluno/app/page.tsx
- /login -> apps/web-aluno/app/(auth)/login/page.tsx
- /register -> apps/web-aluno/app/(auth)/register/page.tsx
- /acessibilidade -> apps/web-aluno/app/(aluno)/acessibilidade/page.tsx
- /dashboard -> apps/web-aluno/app/(aluno)/dashboard/page.tsx
- /editais -> apps/web-aluno/app/(aluno)/editais/page.tsx
- /estudo/[id] -> apps/web-aluno/app/(aluno)/estudo/[id]/page.tsx
- /gamificacao -> apps/web-aluno/app/(aluno)/gamificacao/page.tsx
- /mnemonicos -> apps/web-aluno/app/(aluno)/mnemonicos/page.tsx
- /notificacoes -> apps/web-aluno/app/(aluno)/notificacoes/page.tsx
- /perfil -> apps/web-aluno/app/(aluno)/perfil/page.tsx
- /plano-diario -> apps/web-aluno/app/(aluno)/plano-diario/page.tsx
- /progresso -> apps/web-aluno/app/(aluno)/progresso/page.tsx
- /questoes -> apps/web-aluno/app/(aluno)/questoes/page.tsx
- /revisao -> apps/web-aluno/app/(aluno)/revisao/page.tsx
- /simulados -> apps/web-aluno/app/(aluno)/simulados/page.tsx
- /simulados/[id] -> apps/web-aluno/app/(aluno)/simulados/[id]/page.tsx
- /tutor -> apps/web-aluno/app/(aluno)/tutor/page.tsx
- /configuracoes -> apps/web-aluno/app/(aluno)/configuracoes/page.tsx
- /configuracoes/conta -> apps/web-aluno/app/(aluno)/configuracoes/conta/page.tsx
- /configuracoes/seguranca -> apps/web-aluno/app/(aluno)/configuracoes/seguranca/page.tsx
- /configuracoes/notificacoes -> apps/web-aluno/app/(aluno)/configuracoes/notificacoes/page.tsx
- /configuracoes/planos -> apps/web-aluno/app/(aluno)/configuracoes/planos/page.tsx
- /configuracoes/assinatura -> apps/web-aluno/app/(aluno)/configuracoes/assinatura/page.tsx
- /configuracoes/metodo-pagamento -> apps/web-aluno/app/(aluno)/configuracoes/metodo-pagamento/page.tsx
- /configuracoes/faturamento -> apps/web-aluno/app/(aluno)/configuracoes/faturamento/page.tsx
- /suporte -> apps/web-aluno/app/(aluno)/suporte/page.tsx
- /suporte/faq -> apps/web-aluno/app/(aluno)/suporte/faq/page.tsx
- /suporte/tickets -> apps/web-aluno/app/(aluno)/suporte/tickets/page.tsx
- /suporte/tickets/[id] -> apps/web-aluno/app/(aluno)/suporte/tickets/[id]/page.tsx
- /onboarding -> apps/web-aluno/app/(aluno)/onboarding/page.tsx
- /onboarding/perfil -> apps/web-aluno/app/(aluno)/onboarding/perfil/page.tsx
- /onboarding/objetivos -> apps/web-aluno/app/(aluno)/onboarding/objetivos/page.tsx
- /onboarding/tempo -> apps/web-aluno/app/(aluno)/onboarding/tempo/page.tsx
- /onboarding/diagnostico -> apps/web-aluno/app/(aluno)/onboarding/diagnostico/page.tsx
- /onboarding/confirmacao -> apps/web-aluno/app/(aluno)/onboarding/confirmacao/page.tsx
- /historico -> apps/web-aluno/app/(aluno)/historico/page.tsx
- /historico/simulados -> apps/web-aluno/app/(aluno)/historico/simulados/page.tsx
- /historico/revisoes -> apps/web-aluno/app/(aluno)/historico/revisoes/page.tsx
- /historico/erros -> apps/web-aluno/app/(aluno)/historico/erros/page.tsx
- /biblioteca -> apps/web-aluno/app/(aluno)/biblioteca/page.tsx
- /biblioteca/drops -> apps/web-aluno/app/(aluno)/biblioteca/drops/page.tsx
- /biblioteca/questoes -> apps/web-aluno/app/(aluno)/biblioteca/questoes/page.tsx
- /biblioteca/colecoes -> apps/web-aluno/app/(aluno)/biblioteca/colecoes/page.tsx
- /trilhas -> apps/web-aluno/app/(aluno)/trilhas/page.tsx
- /trilhas/[id] -> apps/web-aluno/app/(aluno)/trilhas/[id]/page.tsx
- /gamificacao/rankings -> apps/web-aluno/app/(aluno)/gamificacao/rankings/page.tsx
- /gamificacao/missoes -> apps/web-aluno/app/(aluno)/gamificacao/missoes/page.tsx
- /gamificacao/eventos -> apps/web-aluno/app/(aluno)/gamificacao/eventos/page.tsx
- /gamificacao/clans -> apps/web-aluno/app/(aluno)/gamificacao/clans/page.tsx

## UI kit (packages/ui)
- components: Badge, Button, Card, DataTable, StatCard
- layout: ResponsiveShell (+ ResponsiveShell.css)
- navigation: Sidebar, MobileNavBar, types
- utils: cn

## Proximos gaps
- Admin avancado: auditoria, seguranca, jobs, filas, alertas e custos detalhados
- Aluno: reforcos, dashboards analiticos e expansao de simulados
