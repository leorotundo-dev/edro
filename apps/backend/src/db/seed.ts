/**
 * Database Seed Script
 * Populate database with example data
 */

import { query } from './db';
import bcrypt from 'bcryptjs';

// ============================================
// SEED DATA
// ============================================

const seedData = {
  users: [
    {
      email: 'admin@edro.digital',
      password: 'Admin123!',
      full_name: 'Administrador',
      role: 'admin',
    },
    {
      email: 'aluno@example.com',
      password: 'Aluno123!',
      full_name: 'João Silva',
      role: 'student',
    },
    {
      email: 'maria@example.com',
      password: 'Maria123!',
      full_name: 'Maria Santos',
      role: 'student',
    },
  ],

  disciplines: [
    { code: 'DIR_CONST', name: 'Direito Constitucional', area: 'Direito' },
    { code: 'DIR_ADM', name: 'Direito Administrativo', area: 'Direito' },
    { code: 'PORT', name: 'Língua Portuguesa', area: 'Português' },
    { code: 'INFO', name: 'Informática', area: 'Informática' },
    { code: 'RLM', name: 'Raciocínio Lógico', area: 'Raciocínio' },
  ],

  plans: [
    {
      code: 'FREE',
      name: 'Plano Gratuito',
      price_cents: 0,
      duration_days: null,
      features: ['10 drops por mês', 'Acesso básico'],
    },
    {
      code: 'PREMIUM_MONTH',
      name: 'Premium Mensal',
      price_cents: 4990,
      duration_days: 30,
      features: ['Drops ilimitados', 'Simulados', 'Suporte prioritário'],
    },
    {
      code: 'PREMIUM_YEAR',
      name: 'Premium Anual',
      price_cents: 47990,
      duration_days: 365,
      features: ['Drops ilimitados', 'Simulados', 'Suporte prioritário', '20% desconto'],
    },
  ],

  drops: [
    {
      tipo: 'flashcard',
      dificuldade: 2,
      disciplina: 'DIR_CONST',
      topico: 'Direitos Fundamentais',
      conteudo: {
        frente: 'O que são direitos fundamentais?',
        verso: 'São direitos humanos positivados na Constituição, essenciais à dignidade da pessoa humana.',
      },
    },
    {
      tipo: 'questao_objetiva',
      dificuldade: 3,
      disciplina: 'PORT',
      topico: 'Concordância Verbal',
      conteudo: {
        enunciado: 'Assinale a alternativa correta quanto à concordância verbal:',
        alternativas: [
          { texto: 'Fazem dois anos que não o vejo.', correta: false },
          { texto: 'Faz dois anos que não o vejo.', correta: true },
          { texto: 'Faz dois anos que não os vejo.', correta: false },
        ],
        gabarito: 'B',
        explicacao: 'O verbo FAZER, quando indica tempo decorrido, é impessoal e fica no singular.',
      },
    },
    {
      tipo: 'mnemônico',
      dificuldade: 1,
      disciplina: 'DIR_ADM',
      topico: 'Princípios',
      conteudo: {
        palavra: 'LIMPE',
        significado: 'Legalidade, Impessoalidade, Moralidade, Publicidade, Eficiência',
        contexto: 'Princípios da Administração Pública (Art. 37, CF/88)',
      },
    },
  ],

  questions: [
    {
      discipline_code: 'DIR_CONST',
      question_text: '(CESPE) Sobre os direitos fundamentais, é correto afirmar que:',
      question_type: 'multiple_choice',
      exam_board: 'CESPE',
      difficulty: 3,
      alternatives: [
        { letter: 'A', text: 'São absolutos e ilimitados', is_correct: false },
        { letter: 'B', text: 'Podem sofrer restrições', is_correct: true },
        { letter: 'C', text: 'Não se aplicam a relações privadas', is_correct: false },
        { letter: 'D', text: 'São todos autoaplicáveis', is_correct: false },
      ],
      correct_answer: 'B',
      explanation: 'Nenhum direito fundamental é absoluto, todos podem sofrer restrições quando conflitam com outros direitos.',
      tags: ['direitos fundamentais', 'limitações'],
    },
    {
      discipline_code: 'PORT',
      question_text: '(FCC) Está correta a concordância verbal em:',
      question_type: 'multiple_choice',
      exam_board: 'FCC',
      difficulty: 2,
      alternatives: [
        { letter: 'A', text: 'Haviam muitas pessoas na fila', is_correct: false },
        { letter: 'B', text: 'Havia muitas pessoas na fila', is_correct: true },
        { letter: 'C', text: 'Houveram muitas reclamações', is_correct: false },
        { letter: 'D', text: 'Fazem três meses', is_correct: false },
      ],
      correct_answer: 'B',
      explanation: 'O verbo HAVER, no sentido de existir, é impessoal e fica no singular.',
      tags: ['concordância', 'verbo haver'],
    },
    {
      discipline_code: 'INFO',
      question_text: '(CESGRANRIO) O sistema operacional é responsável por:',
      question_type: 'multiple_choice',
      exam_board: 'CESGRANRIO',
      difficulty: 2,
      alternatives: [
        { letter: 'A', text: 'Apenas gerenciar arquivos', is_correct: false },
        { letter: 'B', text: 'Gerenciar hardware e software', is_correct: true },
        { letter: 'C', text: 'Apenas executar programas', is_correct: false },
        { letter: 'D', text: 'Conectar à internet', is_correct: false },
      ],
      correct_answer: 'B',
      explanation: 'O sistema operacional gerencia tanto o hardware quanto o software do computador.',
      tags: ['sistema operacional', 'conceitos básicos'],
    },
  ],

  mnemonics: [
    {
      discipline_code: 'DIR_CONST',
      keyword: 'SOFIA',
      full_text: 'Soberania, Cidadania, Dignidade, Valores Sociais do Trabalho, Livre Iniciativa, Pluralismo Político',
      context: 'Fundamentos da República (Art. 1º, CF/88)',
      category: 'fundamentos',
    },
    {
      discipline_code: 'DIR_ADM',
      keyword: 'LIMPE',
      full_text: 'Legalidade, Impessoalidade, Moralidade, Publicidade, Eficiência',
      context: 'Princípios da Administração Pública (Art. 37, CF/88)',
      category: 'princípios',
    },
    {
      discipline_code: 'PORT',
      keyword: 'PORQUE',
      full_text: 'Por que (pergunta), Por quê (fim de frase), Porque (resposta), Porquê (substantivo)',
      context: 'Uso dos porquês',
      category: 'ortografia',
    },
  ],
};

// ============================================
// SEED FUNCTIONS
// ============================================

async function seedUsers() {
  console.log('\n📝 Seeding users...');
  
  for (const user of seedData.users) {
    try {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      
      await query(
        `INSERT INTO users (email, password_hash, full_name, role, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (email) DO NOTHING`,
        [user.email, hashedPassword, user.full_name, user.role]
      );
      
      console.log(`  ✅ User: ${user.email}`);
    } catch (err: any) {
      console.error(`  ❌ Error seeding user ${user.email}:`, err.message);
    }
  }
}

async function seedDisciplines() {
  console.log('\n📚 Seeding disciplines...');
  
  for (const disc of seedData.disciplines) {
    try {
      await query(
        `INSERT INTO disciplines (code, name, area, created_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (code) DO NOTHING`,
        [disc.code, disc.name, disc.area]
      );
      
      console.log(`  ✅ Discipline: ${disc.name}`);
    } catch (err: any) {
      console.error(`  ❌ Error seeding discipline ${disc.code}:`, err.message);
    }
  }
}

async function seedPlans() {
  console.log('\n💳 Seeding plans...');
  
  for (const plan of seedData.plans) {
    try {
      await query(
        `INSERT INTO plans (code, name, price_cents, duration_days, features, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (code) DO NOTHING`,
        [plan.code, plan.name, plan.price_cents, plan.duration_days, JSON.stringify(plan.features)]
      );
      
      console.log(`  ✅ Plan: ${plan.name}`);
    } catch (err: any) {
      console.error(`  ❌ Error seeding plan ${plan.code}:`, err.message);
    }
  }
}

async function seedDrops() {
  console.log('\n💧 Seeding drops...');
  
  for (const drop of seedData.drops) {
    try {
      await query(
        `INSERT INTO drops (tipo, dificuldade, disciplina, topico, conteudo, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [drop.tipo, drop.dificuldade, drop.disciplina, drop.topico, JSON.stringify(drop.conteudo)]
      );
      
      console.log(`  ✅ Drop: ${drop.tipo} - ${drop.topico}`);
    } catch (err: any) {
      console.error(`  ❌ Error seeding drop:`, err.message);
    }
  }
}

async function seedQuestions() {
  console.log('\n❓ Seeding questions...');
  
  for (const q of seedData.questions) {
    try {
      await query(
        `INSERT INTO questoes (
          discipline_code, question_text, question_type, exam_board,
          difficulty, alternatives, correct_answer, explanation, tags, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
        [
          q.discipline_code,
          q.question_text,
          q.question_type,
          q.exam_board,
          q.difficulty,
          JSON.stringify(q.alternatives),
          q.correct_answer,
          q.explanation,
          JSON.stringify(q.tags),
        ]
      );
      
      console.log(`  ✅ Question: ${q.discipline_code} - ${q.exam_board}`);
    } catch (err: any) {
      console.error(`  ❌ Error seeding question:`, err.message);
    }
  }
}

async function seedMnemonics() {
  console.log('\n🧠 Seeding mnemonics...');
  
  for (const m of seedData.mnemonics) {
    try {
      await query(
        `INSERT INTO mnemonicos (
          discipline_code, keyword, full_text, context, category, created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())`,
        [m.discipline_code, m.keyword, m.full_text, m.context, m.category]
      );
      
      console.log(`  ✅ Mnemonic: ${m.keyword}`);
    } catch (err: any) {
      console.error(`  ❌ Error seeding mnemonic:`, err.message);
    }
  }
}

// ============================================
// MAIN SEED
// ============================================

export async function runSeed() {
  console.log('\n========================================');
  console.log('  🌱 DATABASE SEED');
  console.log('========================================');

  try {
    await seedUsers();
    await seedDisciplines();
    await seedPlans();
    await seedDrops();
    await seedQuestions();
    await seedMnemonics();

    console.log('\n========================================');
    console.log('  ✅ SEED COMPLETED SUCCESSFULLY!');
    console.log('========================================\n');
    
    console.log('📊 Summary:');
    console.log(`  Users: ${seedData.users.length}`);
    console.log(`  Disciplines: ${seedData.disciplines.length}`);
    console.log(`  Plans: ${seedData.plans.length}`);
    console.log(`  Drops: ${seedData.drops.length}`);
    console.log(`  Questions: ${seedData.questions.length}`);
    console.log(`  Mnemonics: ${seedData.mnemonics.length}`);
    console.log('');

    return true;
  } catch (err) {
    console.error('\n❌ SEED FAILED:', err);
    return false;
  }
}

// Run if executed directly
if (require.main === module) {
  runSeed()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((err) => {
      console.error('Fatal error:', err);
      process.exit(1);
    });
}

export default runSeed;
