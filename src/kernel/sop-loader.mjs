import fs from 'node:fs/promises';
import path from 'node:path';

const unquote = (s) => JSON.parse(s);

export function parseValue(text) {
  const s = text.trim();
  if (s.startsWith('$')) return { ref: s.slice(1) };
  if (s.startsWith('"') && s.endsWith('"')) return unquote(s);
  if (/^-?\d+(?:\.\d+)?$/.test(s)) return Number(s);
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (s === 'null') return null;
  return s;
}

export function parseCircuit(text, { name, group, file }) {
  const lines = text.split(/\r?\n/);
  const inputs = [];
  const nodes = [];
  const outputs = new Map();
  let current = null;

  const flush = () => {
    if (!current) return;
    nodes.push(current);
    current = null;
  };

  for (let lineNo = 0; lineNo < lines.length; lineNo++) {
    const raw = lines[lineNo];
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    if (trimmed.startsWith('@input ')) {
      flush();
      const input = trimmed.slice(7).trim();
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(input)) throw new Error(`${file}:${lineNo + 1}: invalid input ${input}`);
      inputs.push(input);
      continue;
    }

    if (trimmed.startsWith('@output ')) {
      flush();
      const m = trimmed.match(/^@output\s+([A-Za-z_][A-Za-z0-9_]*)\s+(\$[A-Za-z_][A-Za-z0-9_]*)$/);
      if (!m) throw new Error(`${file}:${lineNo + 1}: expected @output name $ref`);
      outputs.set(m[1], m[2].slice(1));
      continue;
    }

    if (trimmed.startsWith('@')) {
      flush();
      const m = trimmed.match(/^@([A-Za-z_][A-Za-z0-9_]*)\s+([A-Za-z_][A-Za-z0-9_.-]*)$/);
      if (!m) throw new Error(`${file}:${lineNo + 1}: expected @ssa command`);
      current = { id: m[1], command: m[2], args: {}, line: lineNo + 1 };
      continue;
    }

    if (!current) throw new Error(`${file}:${lineNo + 1}: parameter without a node`);
    const pm = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s+(.+)$/);
    if (!pm) throw new Error(`${file}:${lineNo + 1}: expected key value`);
    if (Object.hasOwn(current.args, pm[1])) throw new Error(`${file}:${lineNo + 1}: duplicate parameter ${pm[1]}`);
    current.args[pm[1]] = parseValue(pm[2]);
  }
  flush();

  const names = new Set(inputs);
  for (const node of nodes) {
    if (names.has(node.id)) throw new Error(`${file}:${node.line}: duplicate SSA name ${node.id}`);
    names.add(node.id);
  }
  for (const node of nodes) {
    for (const value of Object.values(node.args)) {
      if (value && typeof value === 'object' && value.ref && !names.has(value.ref)) {
        throw new Error(`${file}:${node.line}: unknown reference $${value.ref}`);
      }
    }
  }
  for (const [out, ref] of outputs) {
    if (!names.has(ref)) throw new Error(`${file}: output ${out} references unknown $${ref}`);
  }
  if (outputs.size === 0) throw new Error(`${file}: circuit needs at least one @output`);
  return { name, group, file, inputs, nodes, outputs };
}

async function walk(dir) {
  const out = [];
  for (const ent of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...await walk(p));
    else if (ent.isFile() && ent.name.endsWith('.sop')) out.push(p);
  }
  return out;
}

export async function loadCircuits(roots) {
  const circuits = new Map();
  for (const root of roots) {
    const files = await walk(root);
    for (const file of files) {
      const rel = path.relative(root, file);
      const parts = rel.split(path.sep);
      const name = path.basename(file, '.sop');
      const group = parts.length > 1 ? parts.slice(0, -1).join('.') : 'root';
      const text = await fs.readFile(file, 'utf8');
      const def = parseCircuit(text, { name, group, file });
      if (circuits.has(name)) throw new Error(`duplicate circuit name ${name}: ${file}`);
      circuits.set(name, def);
    }
  }
  return circuits;
}
