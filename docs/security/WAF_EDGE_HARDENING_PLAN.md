# WAF and Edge Hardening Plan

## Objetivo

Definir a camada minima de protecao de borda que falta para a Edro sair de hardening de aplicacao e entrar em postura enterprise defensavel contra abuso automatizado e exploracao basica.

Este documento nao afirma que o `WAF` ja esta implantado. Ele define o que precisa existir, em qual ordem, e qual evidencia deve ser guardada.

## Escopo

- `https://edro-backend-production.up.railway.app`
- `https://edro-production.up.railway.app`
- `https://edro-web-cliente-production.up.railway.app`
- `https://edro-web-freelancer-production.up.railway.app`
- callbacks e webhooks publicos ligados ao backend

## Resultado esperado

- todo trafego externo relevante passa por um proxy/edge controlado
- regras de rate limit e anti-bot existem fora da aplicacao
- payloads anormais e origens abusivas sao bloqueados antes do runtime
- logs de bloqueio e alertas podem ser consultados

## Arquitetura alvo

### Camada 1 - DNS e TLS

- dominio canonico sob controle da Edro
- TLS gerenciado no edge
- redirecionamento forcado de HTTP para HTTPS

### Camada 2 - WAF

- regras gerenciadas ativas para ataques web comuns
- bloqueio ou challenge para trafego malicioso conhecido
- limite de pais/origem apenas se houver justificativa contratual ou operacional

### Camada 3 - Rate limiting e anti-abuse

- rate limit por IP/origem para auth, SSO, portais publicos e webhooks
- protecao anti-bot com challenge quando aplicavel
- limite de payload e timeout coerentes para uploads e callbacks

### Camada 4 - Observabilidade

- logs de request bloqueada
- alerta para bursts, brute force e webhook abuse
- retencao minima definida para troubleshooting e incidente

## Entradas publicas prioritarias

### Prioridade P0

- `/auth/sso/start`
- `/auth/sso/callback`
- `/webhook/evolution`
- `/webhook/recall`
- `/webhook/instagram`
- `/webhook/whatsapp`
- `/webhooks/whatsapp`
- rotas publicas de aprovacao/portal

### Prioridade P1

- login e magic link dos tres portais
- uploads publicos ou semi-publicos
- downloads assinados ou sensiveis

## Regras minimas recomendadas

### 1. Managed rules

- ativar ruleset gerenciado do provider
- bloquear ou challenge em categorias de risco alto
- revisar falsos positivos nas primeiras 72h

### 2. Rate limiting por superficie

Valores exatos dependem de telemetria, mas o baseline inicial deve seguir a mesma intencao do backend:

- auth e SSO: estrito
- aprovacoes publicas: medio
- webhooks assinados: medio/alto com allowlist quando possivel
- assets e paginas publicas: mais permissivo

### 3. Limite de payload

- webhooks: limitar ao tamanho esperado do provedor
- uploads: limitar por tipo de fluxo
- requests JSON genericas: negar payload anormal

### 4. Origem e reputacao

- bloquear user agents obviamente maliciosos
- aplicar challenge para IPs com padrao de abuso
- usar allowlist para integracoes quando o provedor suportar IP fixo

### 5. Protecao administrativa

- considerar allowlist, VPN ou IdP adicional para superficies de administracao
- nunca expor painel operacional desnecessario diretamente

## Plano de rollout

### Fase 1 - Observacao

- colocar proxy/edge na frente das URLs canonicas
- ativar logs e modo monitor para regras mais agressivas
- capturar baseline de trafego por 3 a 7 dias

### Fase 2 - Enforcement leve

- ativar rate limit para auth, SSO e portais publicos
- ativar managed rules em modo bloqueio para categorias obvias
- revisar falsos positivos diariamente

### Fase 3 - Enforcement forte

- ativar challenge anti-bot
- limitar payloads
- adicionar regras especificas para abusos observados

## Evidencia de pronto

- captura da configuracao do provider
- lista de dominos e rotas protegidas
- amostra de request bloqueada com motivo
- alerta configurado para excesso de bloqueio ou brute force
- teste manual demonstrando rate limit/challenge

## Criterio de sucesso

- entradas publicas prioritarias passam pelo edge
- backend deixa de ser a unica linha de defesa contra abuso
- existe evidencia consultavel de bloqueios e thresholds

## O que ainda nao substitui

- autenticacao de origem em webhook
- rate limiting local na aplicacao
- logs internos e auditoria
- pentest externo

O `WAF` complementa esses controles; nao substitui o hardening ja feito no codigo.
