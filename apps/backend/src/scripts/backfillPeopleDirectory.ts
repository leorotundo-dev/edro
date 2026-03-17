import 'dotenv/config';
import { pool, query } from '../db';
import {
  resolveOrCreatePerson,
  syncClientContactPerson,
  syncFreelancerPerson,
} from '../repos/peopleRepo';

async function tableExists(tableName: string): Promise<boolean> {
  const { rows } = await query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1
         FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = $1
     ) AS exists`,
    [tableName],
  );
  return Boolean(rows[0]?.exists);
}

async function ensureCoreTables() {
  const required = ['client_contacts', 'freelancer_profiles', 'whatsapp_group_messages', 'whatsapp_messages'];
  const missing: string[] = [];

  for (const tableName of required) {
    if (!(await tableExists(tableName))) {
      missing.push(tableName);
    }
  }

  if (missing.length) {
    throw new Error(`missing_tables:${missing.join(',')}`);
  }
}

async function countPending(label: string, sql: string) {
  const { rows } = await query<{ total: string }>(sql);
  console.log(`${label}: ${Number(rows[0]?.total ?? 0)}`);
}

async function reportPendingWork() {
  console.log('People directory backfill preview');
  await countPending('client_contacts sem person_id', `SELECT COUNT(*) AS total FROM client_contacts WHERE person_id IS NULL`);
  await countPending('freelancer_profiles sem person_id', `SELECT COUNT(*) AS total FROM freelancer_profiles WHERE person_id IS NULL`);
  await countPending('whatsapp_group_messages sem sender_person_id', `SELECT COUNT(*) AS total FROM whatsapp_group_messages WHERE sender_person_id IS NULL AND sender_jid IS NOT NULL`);
  await countPending('whatsapp_messages inbound sem sender_person_id', `SELECT COUNT(*) AS total FROM whatsapp_messages WHERE sender_person_id IS NULL AND direction = 'inbound' AND sender_phone IS NOT NULL`);
}

async function backfillTenantUsers() {
  const { rows } = await query<{
    tenant_id: string;
    user_id: string;
    email: string | null;
    name: string | null;
  }>(
    `SELECT tu.tenant_id::text AS tenant_id,
            eu.id::text AS user_id,
            eu.email,
            eu.name
       FROM tenant_users tu
       JOIN edro_users eu ON eu.id = tu.user_id`,
  );

  for (const row of rows) {
    await resolveOrCreatePerson({
      tenantId: row.tenant_id,
      displayName: row.name ?? row.email ?? 'Equipe Edro',
      isInternal: true,
      identities: [
        { type: 'edro_user_id', value: row.user_id, primary: true },
        { type: 'email', value: row.email, primary: false },
      ],
    });
  }

  console.log(`tenant_users processados: ${rows.length}`);
}

async function backfillFreelancers() {
  const { rows } = await query<{
    id: string;
    tenant_id: string;
    person_id: string | null;
    user_id: string;
    display_name: string | null;
    email: string | null;
    email_personal: string | null;
    phone: string | null;
    whatsapp_jid: string | null;
  }>(
    `SELECT fp.id,
            tu.tenant_id::text AS tenant_id,
            fp.person_id::text AS person_id,
            fp.user_id::text AS user_id,
            fp.display_name,
            eu.email,
            fp.email_personal,
            fp.phone,
            fp.whatsapp_jid
       FROM freelancer_profiles fp
       JOIN edro_users eu ON eu.id = fp.user_id
       JOIN tenant_users tu ON tu.user_id = eu.id`,
  );

  for (const row of rows) {
    await syncFreelancerPerson({
      freelancerId: row.id,
      tenantId: row.tenant_id,
      displayName: row.display_name,
      userId: row.user_id,
      email: row.email,
      emailPersonal: row.email_personal,
      phone: row.phone,
      whatsappJid: row.whatsapp_jid,
      existingPersonId: row.person_id,
    });
  }

  console.log(`freelancer_profiles processados: ${rows.length}`);
}

async function backfillClientContacts() {
  const { rows } = await query<{
    id: string;
    tenant_id: string;
    person_id: string | null;
    name: string | null;
    email: string | null;
    phone: string | null;
    whatsapp_jid: string | null;
  }>(
    `SELECT id,
            tenant_id::text AS tenant_id,
            person_id::text AS person_id,
            name,
            email,
            phone,
            whatsapp_jid
       FROM client_contacts`,
  );

  for (const row of rows) {
    await syncClientContactPerson({
      contactId: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      whatsappJid: row.whatsapp_jid,
      existingPersonId: row.person_id,
    });
  }

  console.log(`client_contacts processados: ${rows.length}`);
}

async function backfillGroupMessages() {
  const { rows } = await query<{
    id: string;
    tenant_id: string;
    sender_name: string | null;
    sender_jid: string | null;
  }>(
    `SELECT id,
            tenant_id::text AS tenant_id,
            sender_name,
            sender_jid
       FROM whatsapp_group_messages
      WHERE sender_person_id IS NULL
        AND sender_jid IS NOT NULL`,
  );

  for (const row of rows) {
    const phone = row.sender_jid?.includes('@')
      ? `+${row.sender_jid.split('@')[0]}`
      : null;
    const person = await resolveOrCreatePerson({
      tenantId: row.tenant_id,
      displayName: row.sender_name,
      identities: [
        { type: 'whatsapp_jid', value: row.sender_jid, primary: true },
        { type: 'phone_e164', value: phone, primary: false },
      ],
    });

    await query(
      `UPDATE whatsapp_group_messages
          SET sender_person_id = $1
        WHERE id = $2`,
      [person.personId, row.id],
    );
  }

  console.log(`whatsapp_group_messages processadas: ${rows.length}`);
}

async function backfillCloudMessages() {
  const { rows } = await query<{
    id: string;
    tenant_id: string;
    sender_phone: string | null;
  }>(
    `SELECT id,
            tenant_id::text AS tenant_id,
            sender_phone
       FROM whatsapp_messages
      WHERE sender_person_id IS NULL
        AND direction = 'inbound'
        AND sender_phone IS NOT NULL`,
  );

  for (const row of rows) {
    const person = await resolveOrCreatePerson({
      tenantId: row.tenant_id,
      displayName: row.sender_phone,
      identities: [
        { type: 'phone_e164', value: row.sender_phone, primary: true },
      ],
    });

    await query(
      `UPDATE whatsapp_messages
          SET sender_person_id = $1
        WHERE id = $2`,
      [person.personId, row.id],
    );
  }

  console.log(`whatsapp_messages inbound processadas: ${rows.length}`);
}

async function run() {
  const shouldApply = process.argv.includes('--apply');
  await ensureCoreTables();

  if (!shouldApply) {
    await reportPendingWork();
    console.log('Nenhuma escrita executada. Rode com --apply para efetivar o backfill.');
    return;
  }

  await backfillTenantUsers();
  await backfillFreelancers();
  await backfillClientContacts();
  await backfillGroupMessages();
  await backfillCloudMessages();

  console.log('Backfill do diretório global de pessoas concluído.');
}

run()
  .catch((error) => {
    if (typeof error?.message === 'string' && error.message.startsWith('missing_tables:')) {
      console.error('[backfillPeopleDirectory] banco atual sem schema carregado:', error.message.replace('missing_tables:', ''));
      process.exitCode = 1;
      return;
    }
    console.error('[backfillPeopleDirectory] failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
