import * as fallback from './mini-datalog.mjs';

export async function loadDatalog({ trace } = {}) {
  try {
    const mod = await import('@suss/datalog');
    trace?.push({ type: 'datalog', message: 'using @suss/datalog' });
    return { ...mod, engineName: '@suss/datalog' };
  } catch (error) {
    trace?.push({ type: 'datalog', message: `@suss/datalog unavailable; using bundled positive-Datalog fallback (${error.code ?? error.message})` });
    return { ...fallback, engineName: 'bundled-mini-datalog' };
  }
}
