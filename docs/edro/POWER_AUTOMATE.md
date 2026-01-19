# Power Automate - Flows

## Fluxo 1: Novo briefing no iClips
Trigger: iClips new project
1. Extrair campos obrigatorios do briefing
2. Chamar Edro API: POST /api/edro/briefings
3. Se sucesso, registrar ID do briefing no iClips
4. Notificar trafego

## Fluxo 2: Gerar copy
Trigger: status no iClips == "briefing_ok" (ou manual)
1. Definir persona por tipo de campanha
2. Montar prompt template
3. Chamar ChatGPT API
4. Salvar copy no Edro (POST /api/edro/briefings/:id/copy)
5. Atualizar status no iClips

## Fluxo 3: Aprovacao
Trigger: gestor aprova no Edro
1. Atualizar iClips status
2. Enviar briefing visual para Ad Creative
3. Criar tarefa para DA

## Fluxo 4: Entrega
Trigger: DA entrega no Edro
1. Atualizar iClips (etapa iclips_out)
2. Enviar email de entrega

## Mapeamento de campos (exemplo)
- client_name -> edro_briefings.client_name
- campaign_type -> payload.campaign_type
- product_description -> payload.product
- target_demographic -> payload.target
- objective -> payload.objective
- channel -> payload.channel
- due_date -> due_at

## Observacoes
- Se iClips nao tiver API, usar email + CSV como fallback.
- Registrar erros do Power Automate no log do Edro.
