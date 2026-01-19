import { generateFullAnalysis, SimuladoExecution } from '../services/simulados/analysisEngine';
import { pool } from '../db';

type TestFn = () => void | Promise<void>;
const tests: Array<Promise<void>> = [];

// Simple async-aware test runner
const describe = (description: string, fn: () => void) => {
  console.log(`\n# ${description}`);
  fn();
};

const it = (description: string, fn: TestFn) => {
  const test = Promise.resolve()
    .then(() => fn())
    .then(() => {
      console.log(`  ✓ ${description}`);
    })
    .catch((error) => {
      console.error(`  ✗ ${description}`);
      console.error(error);
      throw error;
    });
  tests.push(test);
};

const assert = (condition: boolean, message?: string) => {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
};

// Mock data for tests
const mockExecution: SimuladoExecution = {
  id: 'exec_1',
  user_id: '11111111-1111-4111-8111-111111111111',
  simulado_id: '22222222-2222-4222-8222-222222222222',
  questions: [
    { question_id: 'q1', selected_answer: 'A', is_correct: true, time_spent: 60, difficulty: 2, topic: 'Topic A', concepts: ['c1'] },
    { question_id: 'q2', selected_answer: 'B', is_correct: false, time_spent: 120, difficulty: 3, topic: 'Topic B', concepts: ['c2'] },
    { question_id: 'q3', selected_answer: 'C', is_correct: true, time_spent: 80, difficulty: 3, topic: 'Topic A', concepts: ['c3'] },
    { question_id: 'q4', selected_answer: 'D', is_correct: true, time_spent: 90, difficulty: 4, topic: 'Topic C', concepts: ['c4'] },
    { question_id: 'q5', selected_answer: 'A', is_correct: false, time_spent: 150, difficulty: 5, topic: 'Topic B', concepts: ['c5'] },
  ],
  started_at: new Date().toISOString(),
  finished_at: new Date().toISOString(),
  total_time: 500,
  adaptive_state: {},
};

// Mock the database query function. Since we can't use jest, we can't properly mock the db.
// We will skip the tests that require db access.

describe('Analysis Engine', () => {
  it('should generate a correct summary', async () => {
    const analysis = await generateFullAnalysis(mockExecution);
    const summary = analysis.summary;

    assert(summary.total_questions === 5, 'Incorrect total questions');
    assert(summary.correct_answers === 3, 'Incorrect correct answers');
    assert(summary.wrong_answers === 2, 'Incorrect wrong answers');
    assert(summary.accuracy === 60, 'Incorrect accuracy');
    assert(summary.total_time_seconds === 500, 'Incorrect total time');
    assert(summary.average_time_per_question === 100, 'Incorrect average time');
    assert(summary.score === 60, 'Incorrect score');
    assert(summary.grade === 'D', 'Incorrect grade');
  });

  it('should correctly calculate performance by difficulty', async () => {
    const analysis = await generateFullAnalysis(mockExecution);
    const performance = analysis.performanceByDifficulty;

    const diff2 = performance.find(p => p.difficulty === 2);
    const diff3 = performance.find(p => p.difficulty === 3);
    const diff4 = performance.find(p => p.difficulty === 4);
    const diff5 = performance.find(p => p.difficulty === 5);

    assert(diff2?.correct === 1 && diff2?.total === 1, 'Incorrect stats for difficulty 2');
    assert(diff3?.correct === 1 && diff3?.total === 2, 'Incorrect stats for difficulty 3');
    assert(diff4?.correct === 1 && diff4?.total === 1, 'Incorrect stats for difficulty 4');
    assert(diff5?.correct === 0 && diff5?.total === 1, 'Incorrect stats for difficulty 5');
  });

  it('should correctly identify strengths', async () => {
    const analysis = await generateFullAnalysis(mockExecution);
    const strengths = analysis.strengths;

    assert(strengths.length === 1, 'Should have one strength');
    assert(strengths[0].topic === 'Topic A', 'Incorrect strength topic');
  });

  it('should correctly identify weaknesses', async () => {
    const analysis = await generateFullAnalysis(mockExecution);
    const weaknesses = analysis.weaknesses;

    assert(weaknesses.length === 1, 'Should have one weakness');
    assert(weaknesses[0].topic === 'Topic B', 'Incorrect weakness topic');
    assert(weaknesses[0].accuracy === 0, 'Incorrect weakness accuracy');
  });
});

Promise.all(tests)
  .then(async () => {
    console.log('\nAll tests for analysisEngine passed!');
    await pool.end();
  })
  .catch(async () => {
    await pool.end();
    process.exit(1);
  });
