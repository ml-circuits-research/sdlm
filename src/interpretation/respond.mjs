import { tokenize } from '../primitives/tokenizer.mjs';
import { atomText } from '../datalog/knowledge-base.mjs';

// Sentence boundaries are punctuation followed by whitespace or the end of input.
// Decimal points stay inside a token; no words are silently removed before parsing.
export function segments(text) {
  return text.split(/(?<=[.!?])\s+/u).map(part => part.trim()).filter(Boolean);
}

export function createResponder(context) {
  const { run, transactions, evidence, kb, language, selector, effectAnalyzer, trace } = context;
  const attempt = async operation => {
    const id = transactions.begin('interpretation-trial');
    try { return await operation(); }
    catch (error) { if (error.name === 'NoMatchError') return null; throw error; }
    finally { transactions.rollbackScope(id, 'Interpretation trials do not assert knowledge'); }
  };

  const interpret = async (input, repair = true, depth = 0) => {
    const tokens = context.checkTokens(tokenize(input).map(token => language.classify(token)));
    const conversational = depth < 4 && effectAnalyzer.isSpeculativelySafe('ChatInterpret') ?
      await attempt(() => run('ChatInterpret', { tokens })) : null;
    if (conversational?.rewrite !== undefined) {
      const rewritten = await interpret(conversational.rewrite, repair, depth + 1);
      if (rewritten.command) {
        const decisions = [...(conversational.decisions ?? []), ...rewritten.decisions];
        if (!decisions.some(decision => evidence.blocked(decision, rewritten.circuit))) {
          return { ...rewritten, tokens, decisions,
            evidence_atoms: [...(conversational.evidence_atoms ?? []), ...(rewritten.evidence_atoms ?? [])],
            rewrites: [{ circuit: conversational.policy, text: conversational.rewrite }, ...(rewritten.rewrites ?? [])] };
        }
      }
      // A recognized reference must not fall through and become an unrelated variable or predicate.
      if (conversational.exclusive) return { tokens };
    }
    const candidates = selector.selectAll('english.interpretation', { tokens }).slice(0, 12);
    const proposals = conversational?.command ? [{ ...conversational, circuit: 'ChatInterpret', score: null }] : [];
    const command = proposals.length ? null : await attempt(() => run('ParseText', { text: input }));
    if (command?.kind === 'ambiguity') {
      const alternatives = command.alternatives ?? [];
      if (alternatives.length) proposals.push(await run('ChooseFirstInterpretation', { alternatives, input }));
    } else if (command) proposals.push({ command, decisions: [], circuit: 'ParseText', score: null });
    for (const candidate of proposals.length ? [] : candidates) {
      if (!effectAnalyzer.isSpeculativelySafe(candidate.circuit)) continue;
      const proposal = await attempt(() => run(candidate.circuit, { tokens }));
      if (proposal) proposals.push({ ...proposal, circuit: candidate.circuit, score: candidate.score });
    }
    for (const proposal of proposals) {
      const reviewed = await run('ReviewInterpretation', { proposal, entities: kb.summarize().entities,
        rejected: evidence.state.decisions.filter(item => item.status === 'rejected') });
      if (reviewed.decisions.some(decision => evidence.blocked(decision, proposal.circuit))) continue;
      return { ...reviewed, tokens, candidates: proposals.map(item => ({ circuit: item.circuit,
        score: item.score ?? null, command: item.command })) };
    }
    if (repair && !proposals.length) {
      for (const candidate of selector.selectAll('english.inputRepair', { tokens }).slice(0, 2)) {
        if (!effectAnalyzer.isSpeculativelySafe(candidate.circuit)) continue;
        const suggestion = await attempt(() => run(candidate.circuit, { tokens }));
        if (!suggestion) continue;
        const repaired = await interpret(input + suggestion.suffix, false, depth);
        if (!repaired.command || evidence.blocked(suggestion.decision, repaired.circuit)) continue;
        repaired.decisions.unshift({ ...suggestion.decision, policy: candidate.circuit });
        return repaired;
      }
    }
    return { tokens };
  };

  const one = async input => {
    let proposal = await interpret(input);
    if (!proposal.command) {
      const gap = evidence.gap(input, proposal.tokens);
      const answerText = await run('RenderUnknownShort');
      const explanation = await run('RenderUnresolved', { input, tokens: proposal.tokens });
      return { input, status: 'unresolved', command: null, answer: null, assumptions: [], candidates: [], gap,
        answer_text: answerText, explanation };
    }
    for (const candidate of selector.selectAll('foundation.default', { value: proposal.command }).slice(0, 4)) {
      if (!context.foundation || !effectAnalyzer.isSpeculativelySafe(candidate.circuit)) continue;
      const fallback = await attempt(() => run(candidate.circuit, { command: proposal.command }));
      if (!fallback || fallback.decisions.some(item => evidence.blocked(item, candidate.circuit))) continue;
      proposal = { ...proposal, command: fallback.command, circuit: candidate.circuit,
        decisions: [...proposal.decisions, ...fallback.decisions] };
      break;
    }
    const assumptions = evidence.select(proposal.decisions, input, proposal.circuit);
    const contextProofs = (proposal.evidence_atoms ?? []).map(atom => kb.explain(atom));
    const inputDependencies = contextProofs.flatMap(item => evidence.dependencies(item.support));
    evidence.active = [...new Set([...assumptions.map(item => item.id), ...inputDependencies])];
    trace.push({ type: 'interpretation-selected', input, circuit: proposal.circuit,
      command: proposal.command, assumptions, candidates: proposal.candidates });
    let answer;
    for (const token of proposal.tokens) if (token.classes.includes('entity')) {
      language.rememberDisplay(token.norm, token.surface);
    }
    try {
      answer = await run('ExecuteCommand', { command: proposal.command });
      await run('ObserveConversation', { command: proposal.command, answer });
    }
    finally { evidence.active = []; }
    const answerText = await run('RenderEnglish', { answer });
    const proof = answer.hypothetical ? { kind: 'explanation', status: 'conditional', atom: answer.atom,
      support: { atom: atomText(answer.atom), atomObject: answer.atom, source: 'assumption',
        children: answer.support.map(item => item.support).filter(Boolean) }, refutation: null } :
      answer.atom ? kb.explain(answer.atom) : null;
    const proofs = [proof, ...contextProofs, ...answerProofs(answer, kb)].filter(Boolean);
    const dependencies = [...new Set(proofs.flatMap(item => [
      ...evidence.dependencies(item.support), ...evidence.dependencies(item.refutation)
    ]))];
    const inherited = evidence.state.decisions.filter(item => dependencies.includes(item.id) &&
      !assumptions.some(own => own.id === item.id));
    const used = [...assumptions, ...inherited];
    const complete = !proofs.some(item => incomplete(item.support) || incomplete(item.refutation));
    const contextIds = !complete || (!answer.atom && !answer.computation &&
      !['ack', 'preference', 'chat'].includes(answer.kind)) ? new Set(
      evidence.state.sources.flatMap(source => evidence.sourceIds(source.kind, source.value))) : new Set();
    const contextAssumptions = evidence.state.decisions.filter(item => contextIds.has(item.id) &&
      !used.some(own => own.id === item.id));
    const hypothesis = await run('ConversationHypothesis', { answer });
    const result = { input, status: used.length ? 'assumed' : 'executed', command: proposal.command, answer,
      answer_text: answerText, assumptions: used, dependencies, proof, provenance_complete: complete,
      context_assumptions: contextAssumptions, hypothesis, circuit: proposal.circuit, candidates: proposal.candidates,
      rewrites: proposal.rewrites ?? [] };
    result.explanation = await run('RenderConversationExplanation', { value: result });
    return result;
  };

  return async (texts, { verbosity } = {}) => {
    if (verbosity !== undefined) await run('SetResponseStyle', { style: verbosity });
    if (!Array.isArray(texts) || !texts.length || texts.length > 128) throw new Error('Expected 1 to 128 inputs');
    texts.forEach(context.checkText);
    const parts = texts.flatMap(segments);
    if (!parts.length || parts.length > 128) throw new Error('Expected 1 to 128 sentences');
    const results = [];
    for (const input of parts) results.push(await one(input));
    const textsToDisplay = await run('PresentConversation', { results });
    return results.map((result, index) => ({ ...result, text: textsToDisplay[index],
      response_style: context.settings.read('response_style') }));
  };
}

function incomplete(tree) {
  return tree?.source === 'derived' || (tree?.children ?? []).some(incomplete);
}

function answerProofs(answer, kb) {
  const atoms = [];
  const walk = value => {
    if (!value || typeof value !== 'object') return;
    if (value.kind === 'atom') {
      const variables = [...new Set(value.args.filter(term => term.kind === 'var').map(term => term.name))];
      if (!variables.length) atoms.push(value);
      else if (variables.length === 1) for (const name of answer.values ?? []) atoms.push({ ...value,
        args: value.args.map(term => term.kind === 'var' ? { kind: 'const', value: name } : term) });
    } else for (const child of Object.values(value)) {
      if (Array.isArray(child)) child.forEach(walk); else walk(child);
    }
  };
  walk(answer);
  return atoms.map(atom => kb.explain(atom));
}
