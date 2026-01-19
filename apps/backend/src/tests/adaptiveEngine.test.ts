import { calculateNextDifficulty, AdaptiveState, AdaptiveConfig, DEFAULT_ADAPTIVE_CONFIG } from '../services/simulados/adaptiveEngine';

// Simple test runner
const describe = (description: string, fn: () => void) => {
  console.log(`\n# ${description}`);
  fn();
};

const it = (description: string, fn: () => void) => {
  try {
    fn();
    console.log(`  ✓ ${description}`);
  } catch (error) {
    console.error(`  ✗ ${description}`);
    console.error(error);
    process.exit(1);
  }
};

const assert = (condition: boolean, message?: string) => {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
};

describe('Adaptive Engine: calculateNextDifficulty', () => {

  const config: AdaptiveConfig = {
    ...DEFAULT_ADAPTIVE_CONFIG,
    increaseThreshold: 3,
    decreaseThreshold: 3,
    difficultyStep: 1,
  };

  it('should increase difficulty after 3 consecutive correct answers', () => {
    const state: AdaptiveState = {
      currentDifficulty: 3,
      consecutiveCorrect: 3,
      consecutiveWrong: 0,
      totalCorrect: 3,
      totalWrong: 0,
      averageTime: 30,
      performanceByDifficulty: {},
    };
    const nextDifficulty = calculateNextDifficulty(state, config);
    assert(nextDifficulty === 4, `Expected difficulty to be 4, but got ${nextDifficulty}`);
  });

  it('should decrease difficulty after 3 consecutive wrong answers', () => {
    const state: AdaptiveState = {
      currentDifficulty: 3,
      consecutiveCorrect: 0,
      consecutiveWrong: 3,
      totalCorrect: 0,
      totalWrong: 3,
      averageTime: 30,
      performanceByDifficulty: {},
    };
    const nextDifficulty = calculateNextDifficulty(state, config);
    assert(nextDifficulty === 2, `Expected difficulty to be 2, but got ${nextDifficulty}`);
  });

  it('should not change difficulty with mixed answers', () => {
    const state: AdaptiveState = {
      currentDifficulty: 3,
      consecutiveCorrect: 1,
      consecutiveWrong: 1,
      totalCorrect: 1,
      totalWrong: 1,
      averageTime: 30,
      performanceByDifficulty: {},
    };
    const nextDifficulty = calculateNextDifficulty(state, config);
    assert(nextDifficulty === 3, `Expected difficulty to be 3, but got ${nextDifficulty}`);
  });

  it('should not increase difficulty beyond the max limit', () => {
    const state: AdaptiveState = {
      currentDifficulty: 5,
      consecutiveCorrect: 3,
      consecutiveWrong: 0,
      totalCorrect: 5,
      totalWrong: 0,
      averageTime: 30,
      performanceByDifficulty: {},
    };
    const nextDifficulty = calculateNextDifficulty(state, { ...config, maxDifficulty: 5 });
    assert(nextDifficulty === 5, `Expected difficulty to be 5, but got ${nextDifficulty}`);
  });

  it('should not decrease difficulty below the min limit', () => {
    const state: AdaptiveState = {
      currentDifficulty: 1,
      consecutiveCorrect: 0,
      consecutiveWrong: 3,
      totalCorrect: 0,
      totalWrong: 5,
      averageTime: 30,
      performanceByDifficulty: {},
    };
    const nextDifficulty = calculateNextDifficulty(state, { ...config, minDifficulty: 1 });
    assert(nextDifficulty === 1, `Expected difficulty to be 1, but got ${nextDifficulty}`);
  });

  it('should apply fine-tuning adjustment for high accuracy', () => {
    const state: AdaptiveState = {
        currentDifficulty: 3,
        consecutiveCorrect: 1,
        consecutiveWrong: 0,
        totalCorrect: 9,
        totalWrong: 1,
        averageTime: 30,
        performanceByDifficulty: {},
    };
    const nextDifficulty = calculateNextDifficulty(state, config);
    assert(nextDifficulty === 4, `Expected fine-tuning to increase difficulty to 4, but got ${nextDifficulty}`);
  });

  it('should apply fine-tuning adjustment for low accuracy', () => {
      const state: AdaptiveState = {
          currentDifficulty: 3,
          consecutiveCorrect: 0,
          consecutiveWrong: 1,
          totalCorrect: 3,
          totalWrong: 7,
          averageTime: 30,
          performanceByDifficulty: {},
      };
      const nextDifficulty = calculateNextDifficulty(state, config);
      assert(nextDifficulty === 2, `Expected fine-tuning to decrease difficulty to 2, but got ${nextDifficulty}`);
  });
});

console.log('\nAll tests for adaptiveEngine passed!');