# Incident Playbook Template

## Metadados

- Nome do playbook:
- Versao:
- Owner:
- Ultima revisao:
- Times acionados:

## Severidade

| Nivel | Criterio | Exemplo |
| --- | --- | --- |
| SEV-1 | indisponibilidade critica, exposicao relevante de dados, compromisso de admin, impacto multi-tenant | takeover de admin, vazamento entre clientes |
| SEV-2 | impacto alto com contencao possivel, falha importante de integridade ou autenticidade | webhook forjado com alteracao operacional |
| SEV-3 | impacto localizado ou sem evidencia de dano relevante | conta individual comprometida sem propagacao |
| SEV-4 | evento investigativo ou tentativa bloqueada | scan, brute force bloqueado, alerta falso positivo |

## Fluxo de resposta

1. Detectar e abrir incidente.
2. Classificar severidade.
3. Conter imediatamente.
4. Preservar evidencias.
5. Analisar escopo, causa e impacto.
6. Definir comunicacao interna e externa.
7. Corrigir e monitorar.
8. Fechar com licoes aprendidas.

## Checklist inicial

- fonte do alerta identificada
- owner tecnico nomeado
- owner executivo nomeado
- horario de deteccao registrado
- sistemas impactados listados
- tenants ou clientes possivelmente impactados listados
- evidencias preservadas

## Contencao

- Acesso a revogar:
- Segredos a rotacionar:
- Sistemas a isolar:
- Regras temporarias a aplicar:
- Janela de comunicacao interna:

## Analise de impacto

- Dados envolvidos:
- Quantidade estimada de titulares:
- Tipo de impacto:
- Ha dados sensiveis?:
- Ha indicio de exfiltracao?:
- Ha indisponibilidade material?:
- Ha impacto contratual imediato?:

## Comunicacao

- Lideranca:
- Cliente afetado:
- Juridico:
- Encarregado:
- Regulador:
- Prazo alvo:

## Pos-incidente

- Causa raiz:
- Acao corretiva imediata:
- Acao preventiva estrutural:
- Itens de backlog gerados:
- Data do postmortem:
- Responsavel pelo acompanhamento:
