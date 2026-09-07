export class SerialQueue {
  #tail = Promise.resolve();

  enqueue(operation) {
    const result = this.#tail.then(operation);
    this.#tail = result.catch(() => {});
    return result;
  }
}
