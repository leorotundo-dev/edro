import { query } from '../db/db';
import { notifyEvent } from './notificationService';

type WorkflowTrigger = {
  id: string;
  trigger_event: string;
  action_type: string;
  config: Record<string, any>;
};

/**
 * Run all enabled workflow triggers for a given event.
 * Called from route handlers (briefing creation, stage changes, etc.)
 */
export async function runTriggersForEvent(
  tenantId: string,
  event: string,
  payload: Record<string, any>
) {
  try {
    const { rows: triggers } = await query<WorkflowTrigger>(
      `SELECT id, trigger_event, action_type, config
       FROM workflow_triggers
       WHERE tenant_id = $1 AND trigger_event = $2 AND enabled = true`,
      [tenantId, event]
    );

    if (triggers.length === 0) return;

    for (const trigger of triggers) {
      try {
        await executeTriggerAction(tenantId, trigger, payload);
      } catch (err) {
        console.error(`[workflow] trigger ${trigger.id} action ${trigger.action_type} failed:`, err);
      }
    }
  } catch (err) {
    console.error('[workflow] runTriggersForEvent error:', err);
  }
}

async function executeTriggerAction(
  tenantId: string,
  trigger: WorkflowTrigger,
  payload: Record<string, any>
) {
  switch (trigger.action_type) {
    case 'notify_team': {
      // Notify all team members with manager/staff roles
      const { rows: teamMembers } = await query(
        `SELECT u.id, u.email, u.name FROM edro_users u
         JOIN tenant_users tu ON tu.user_id = u.id
         WHERE tu.tenant_id = $1 AND tu.role IN ('admin', 'manager', 'staff')`,
        [tenantId]
      );

      for (const member of teamMembers) {
        await notifyEvent({
          event: trigger.trigger_event,
          tenantId,
          userId: member.id,
          title: payload.title || `Automação: ${trigger.trigger_event}`,
          body: payload.body || payload.message,
          link: payload.link,
          recipientEmail: member.email,
        });
      }
      break;
    }

    case 'notify_client': {
      // Notify the client contact (if available in payload)
      const clientEmail = payload.client_email || trigger.config.client_email;
      if (clientEmail) {
        // Create a notification record for external client
        const { rows: admins } = await query(
          `SELECT u.id FROM edro_users u
           JOIN tenant_users tu ON tu.user_id = u.id
           WHERE tu.tenant_id = $1 AND tu.role = 'admin' LIMIT 1`,
          [tenantId]
        );
        const adminId = admins[0]?.id;
        if (adminId) {
          await notifyEvent({
            event: trigger.trigger_event,
            tenantId,
            userId: adminId,
            title: payload.title || 'Notificação enviada ao cliente',
            body: `Notificação enviada para ${clientEmail}`,
            recipientEmail: clientEmail,
          });
        }
      }
      break;
    }

    case 'generate_copy': {
      // Enqueue a copy generation job
      const briefingId = payload.briefingId || payload.briefing_id;
      if (briefingId) {
        await query(
          `INSERT INTO job_queue (tenant_id, type, payload, status)
           VALUES ($1, 'copy_generation', $2, 'queued')`,
          [tenantId, JSON.stringify({ briefingId, triggeredBy: trigger.id })]
        );
      }
      break;
    }

    default:
      console.warn(`[workflow] unknown action_type: ${trigger.action_type}`);
  }
}

// CRUD helpers for the automations admin page

export async function listWorkflowTriggers(tenantId: string) {
  const { rows } = await query(
    `SELECT * FROM workflow_triggers WHERE tenant_id = $1 ORDER BY created_at DESC`,
    [tenantId]
  );
  return rows;
}

export async function createWorkflowTrigger(
  tenantId: string,
  data: { trigger_event: string; action_type: string; config?: Record<string, any> }
) {
  const { rows } = await query(
    `INSERT INTO workflow_triggers (tenant_id, trigger_event, action_type, config)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [tenantId, data.trigger_event, data.action_type, JSON.stringify(data.config || {})]
  );
  return rows[0];
}

export async function updateWorkflowTrigger(
  id: string,
  tenantId: string,
  data: { enabled?: boolean; config?: Record<string, any> }
) {
  const sets: string[] = [];
  const params: any[] = [];
  let idx = 1;

  if (data.enabled !== undefined) {
    sets.push(`enabled = $${idx++}`);
    params.push(data.enabled);
  }
  if (data.config !== undefined) {
    sets.push(`config = $${idx++}`);
    params.push(JSON.stringify(data.config));
  }

  if (sets.length === 0) return null;

  params.push(id, tenantId);
  const { rows } = await query(
    `UPDATE workflow_triggers SET ${sets.join(', ')} WHERE id = $${idx++} AND tenant_id = $${idx} RETURNING *`,
    params
  );
  return rows[0];
}

export async function deleteWorkflowTrigger(id: string, tenantId: string) {
  await query(
    `DELETE FROM workflow_triggers WHERE id = $1 AND tenant_id = $2`,
    [id, tenantId]
  );
}
