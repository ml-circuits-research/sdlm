import { createHash } from 'node:crypto';

export const EMPTY_HISTORY = '';
export function extendHistory(hash, messages) {
  for (const { role, content } of messages) hash = createHash('sha256').update(hash + JSON.stringify({ role, content })).digest('hex');
  return hash;
}

export function newMessages(record, messages) {
  if (!record?.historyCount) return { messages, ignored: 0 };
  if (messages.length === 1 && messages[0].role === 'user') return { messages, ignored: 0 };
  const count = record.historyCount;
  if (messages.length > count && extendHistory(EMPTY_HISTORY, messages.slice(0, count)) === record.historyHash) {
    return { messages: messages.slice(count), ignored: count };
  }
  const retained = record.messages.length;
  if (messages.length > retained && extendHistory('', messages.slice(0, retained)) === extendHistory('', record.messages)) {
    return { messages: messages.slice(retained), ignored: retained };
  }
  throw Object.assign(new Error('Session history mismatch. Send one new user message or an unchanged history prefix plus new messages.'), { statusCode: 409 });
}
