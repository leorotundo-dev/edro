# Secrets And Rotation Matrix

## Objetivo

Dar visibilidade minima de quais segredos existem, para que servem, onde ficam e com que frequencia devem ser rotacionados.

## Regras

- segredo nao entra em repositorio
- segredo nao entra em screenshot, log ou ticket
- segredo de terceiro deve ter owner explicito
- segredo critico precisa de runbook de emergencia

## Matriz inicial

| Segredo | Uso | Ambiente esperado | Owner | Rotacao recomendada | Observacao |
| --- | --- | --- | --- | --- | --- |
| `JWT_SECRET` | assinatura de JWT interno | backend | CTO/Backend | 90 dias ou incidente | rotacao coordenada com sessoes |
| `EDRO_LOGIN_SECRET` | OTP e magic link | backend | CTO/Backend | 90 dias | nao reutilizar segredo fraco |
| `META_APP_SECRET` | assinatura de webhook Meta | backend | Integracoes | 90 dias ou troca de app | necessario para validacao de assinatura |
| `EVOLUTION_WEBHOOK_SECRET` | autenticidade de webhook Evolution | backend | Integracoes | 90 dias | segredo compartilhado com provedor |
| `WHATSAPP_TOKEN` | envio WhatsApp | backend | Integracoes | conforme fornecedor | tratar como segredo de producao |
| `RESEND_API_KEY` / `SMTP_PASS` | envio de email | backend | Operacoes | 90 dias | revisar origem e destino |
| `GOOGLE_CLIENT_SECRET` | OAuth Google | backend | Integracoes | 180 dias ou incidente | callbacks devem ser validados |
| `OIDC_CLIENT_SECRET` | SSO/OIDC | backend | Infra/Auth | 180 dias | restringir ao IdP certo |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / outras chaves IA | consumo de IA | backend | Plataforma IA | 90 dias | monitorar uso anomalo |
| `S3_SECRET_KEY` | storage | backend/infra | Infra | 90 dias | revisar escopo e bucket policy |
| `GATEWAY_SHARED_SECRET` | gateway publisher | backend | Infra/Integracoes | 90 dias | nao repassar ao frontend |
| `RECALL_WEBHOOK_SECRET` | autenticidade de webhook Recall.ai | backend | Integracoes | 90 dias | obrigatorio em producao quando Recall habilitado |
| `D4SIGN_TOKEN_API` | autenticacao na API D4Sign | backend | Juridico/Contrato | conforme D4Sign | revogar no dashboard D4Sign em caso de incidente |
| `D4SIGN_CRYPT_KEY` | chave criptografica D4Sign | backend | Juridico/Contrato | conforme D4Sign | par com TOKEN_API — nao separar |
| `D4SIGN_WEBHOOK_SECRET` | autenticidade de webhook D4Sign | backend | Juridico/Contrato | 90 dias | registrar como `?token=<valor>` na URL do webhook no painel D4Sign |

## Runbook minimo de rotacao

1. abrir ticket com owner, janela e impacto
2. gerar novo segredo no provider ou secret manager
3. publicar novo segredo no ambiente alvo
4. validar healthcheck, webhook ou login dependente
5. revogar segredo antigo
6. registrar data, owner e motivo

## Sinais de risco

- segredo compartilhado por mais de um ambiente
- segredo sem owner claro
- segredo copiado manualmente entre pessoas
- segredo usado em fallback hardcoded
- segredo sem rotacao conhecida
