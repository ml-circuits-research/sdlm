export const DEFAULT_LIMITS = Object.freeze({
  maxSteps: 100000,
  maxActiveNodes: 10000,
  maxTokens: 128,
  maxInputLength: 8192,
  timeoutMs: 10000
});

export class BudgetExceededError extends Error {
  constructor(message) {
    super(message);
    this.name = 'BudgetExceededError';
  }
}

export class ExecutionBudget {
  constructor(limits = {}) {
    this.limits = { ...DEFAULT_LIMITS, ...limits };
    for (const [name, value] of Object.entries(this.limits)) {
      if (!Object.hasOwn(DEFAULT_LIMITS, name) || !Number.isSafeInteger(value) || value < 1) {
        throw new Error(`Invalid execution limit ${name}: ${value}`);
      }
    }
    this.started = performance.now();
    this.steps = 0;
  }

  check(activeNodes = 0) {
    if (++this.steps > this.limits.maxSteps) throw new BudgetExceededError('Execution step limit exceeded');
    if (activeNodes > this.limits.maxActiveNodes) throw new BudgetExceededError('Active node limit exceeded');
    if (performance.now() - this.started > this.limits.timeoutMs) {
      throw new BudgetExceededError('Execution time budget exceeded');
    }
  }
}
