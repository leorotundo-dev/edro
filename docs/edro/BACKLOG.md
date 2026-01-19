# Backlog - Edro Automacao

## Epico 1: Fundacao e acesso interno
- Login por codigo via email com dominio permitido.
- Roles: staff, gestor.
- Auditoria basica de login e etapas.

Criterios de aceite
- Apenas emails @edro.digital entram.
- Gestor consegue aprovar etapas criticas.

## Epico 2: Briefing e validacao
- Formulario com campos obrigatorios.
- Validacao de dados antes de salvar.
- Registro de briefing completo no banco.

Criterios de aceite
- Briefing nao salva se faltar campo obrigatorio.
- Payload contem briefing, entregas, canais e referencias.

## Epico 3: Kanban bloqueado
- Etapas fixas do fluxo.
- Apenas avanca se etapa anterior estiver done.
- Status visivel no quadro.

Criterios de aceite
- Nao e possivel pular etapa.
- Status atual aparece no card.

## Epico 4: Copy IA
- Templates por tipo de campanha (B2B, Ecommerce, Branding).
- Gerar 10 copys por briefing.
- Salvar versao e prompt.

Criterios de aceite
- Copy salva com idioma e prompt.
- Copys exibidas no detalhe do briefing.

## Epico 5: Aprovacao
- Aprovacao obrigatoria por gestor.
- Bloqueio de avancar sem aprovacao.

Criterios de aceite
- Somente gestor conclui aprovacao.

## Epico 6: Notificacoes
- Email para trafego e DA.
- WhatsApp com provider escolhido.

Criterios de aceite
- Notificacoes registradas com status.

## Epico 7: Integracao iClips
- Entrada: criar/atualizar tarefa ao receber briefing.
- Saida: marcar entrega.

Criterios de aceite
- iClips recebe update nas etapas iclips_in e iclips_out.

## Epico 8: Ad Creative
- Enviar briefing visual gerado automaticamente.
- Receber arte e anexar ao briefing.

Criterios de aceite
- Arte associada ao briefing no Edro.

## Epico 9: Relatorios
- KPIs semanais e alertas.
- Top copys e templates.

Criterios de aceite
- Relatorio exportavel em CSV ou PDF.
