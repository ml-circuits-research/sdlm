export class TransactionManager {
  constructor({ participants = [], trace } = {}) {
    this.participants = participants;
    this.trace = trace;
    this.nextId = 0;
    this.active = new Map();
  }

  begin(label = 'transaction') {
    const id = `tx${++this.nextId}`;
    const snapshots = this.participants.map(p => ({ participant: p, state: p.snapshot() }));
    this.active.set(id, { id, label, snapshots });
    this.trace?.push({ type: 'tx-begin', transaction: id, label });
    return id;
  }

  commit(id) {
    if (!id) return;
    const tx = this.active.get(id);
    if (!tx) return;
    this.active.delete(id);
    this.trace?.push({ type: 'tx-commit', transaction: id, label: tx.label });
  }

  rollback(id, reason = 'rollback') {
    if (!id) return;
    const tx = this.active.get(id);
    if (!tx) return;
    for (let i = tx.snapshots.length - 1; i >= 0; i--) {
      const { participant, state } = tx.snapshots[i];
      participant.restore(state);
    }
    this.active.delete(id);
    this.trace?.push({ type: 'tx-rollback', transaction: id, label: tx.label, reason });
  }

  rollbackAll(reason = 'rollback-all') {
    for (const id of [...this.active.keys()].reverse()) this.rollback(id, reason);
  }
}
