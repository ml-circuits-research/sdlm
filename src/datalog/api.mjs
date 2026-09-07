import * as fallback from './mini-datalog.mjs';

export async function loadDatalog({ trace, backend = process.env.SD_LM_DATALOG_BACKEND ?? 'auto' } = {}) {
  if (!['auto', 'bundled', 'external'].includes(backend)) throw new Error(`Unknown Datalog backend: ${backend}`);
  if (backend === 'bundled') return { ...fallback, engineName: 'bundled-mini-datalog' };
  try {
    const mod = await import('@suss/datalog');
    trace?.push({ type: 'datalog', message: 'using @suss/datalog' });
    return { ...mod, engineName: '@suss/datalog' };
  } catch (error) {
    if (backend === 'external') throw new Error('External @suss/datalog could not be loaded. Run npm ci.', { cause: error });
    if (error.code !== 'ERR_MODULE_NOT_FOUND' || !error.message.includes("'@suss/datalog'")) throw error;
    trace?.push({ type: 'datalog', message: `@suss/datalog unavailable; using bundled positive-Datalog fallback (${error.code ?? error.message})` });
    return { ...fallback, engineName: 'bundled-mini-datalog' };
  }
}
