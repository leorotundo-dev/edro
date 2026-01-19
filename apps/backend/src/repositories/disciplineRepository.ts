import { query } from '../db';

export interface Discipline {
  id: string;
  name: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateDisciplineInput {
  name: string;
}

export async function listDisciplines(): Promise<Discipline[]> {
  const { rows } = await query<Discipline>('SELECT * FROM disciplines ORDER BY name ASC');
  return rows;
}

export async function createDiscipline(input: CreateDisciplineInput): Promise<Discipline> {
  const { rows } = await query<Discipline>(
    `
      INSERT INTO disciplines (name)
      VALUES ($1)
      RETURNING *
    `,
    [input.name]
  );
  return rows[0];
}
