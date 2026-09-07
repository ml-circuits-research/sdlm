import { createSDLM as createRuntime } from '../../src/sd_lm.mjs';

// Kernel and controlled-language regressions explicitly start without background knowledge.
export const createSDLM = (options = {}) => createRuntime({ foundation: false, ...options });
