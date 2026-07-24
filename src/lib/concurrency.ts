// Runs `worker` over `items` with at most `limit` in flight at once, calling
// `onEach` as each result lands (not just at the end) so callers can update
// UI progressively instead of waiting for the whole batch.
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
  onEach?: (result: R, index: number) => void
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;

  async function runner() {
    while (next < items.length) {
      const index = next++;
      const result = await worker(items[index], index);
      results[index] = result;
      onEach?.(result, index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, runner));
  return results;
}
