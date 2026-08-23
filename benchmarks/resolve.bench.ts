import { Container, createToken } from '../src/container.js';

interface BenchmarkResult {
  name: string;
  durationMs: number;
  opsPerSec: number;
}

async function benchmark(name: string, fn: () => Promise<void> | void, iterations = 100): Promise<BenchmarkResult> {
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    await fn();
  }
  const end = performance.now();
  const duration = end - start;
  return {
    name,
    durationMs: duration,
    opsPerSec: Math.round((iterations / duration) * 1000)
  };
}

async function runBenchmarks() {
  console.log('Moke Core Performance Benchmarks\n');

  const results: BenchmarkResult[] = [];

  // 1. Resolve direct singleton
  results.push(await benchmark('resolve direct singleton', () => {
    const container = new Container();
    class Service {}
    container.singleton(Service);
    const instance = container.resolve(Service);
    if (!instance) throw new Error('Failed');
  }));

  // 2. Resolve direct transient
  results.push(await benchmark('resolve direct transient', () => {
    const container = new Container();
    class Service {}
    container.transient(Service);
    const instance = container.resolve(Service);
    if (!instance) throw new Error('Failed');
  }));

  // 3. 5-level graph
  results.push(await benchmark('5-level graph', async () => {
    const container = new Container();
    class Level5 {}
    class Level4 { constructor(public l5: Level5) {} }
    class Level3 { constructor(public l4: Level4) {} }
    class Level2 { constructor(public l3: Level3) {} }
    class Level1 { constructor(public l2: Level2) {} }
    container.singleton(Level1);
    const instance = container.resolve(Level1);
    if (!instance) throw new Error('Failed');
  }, 10));

  // 4. 20-level graph
  results.push(await benchmark('20-level graph', async () => {
    const container = new Container();
    const levels = [];
    for (let i = 0; i < 20; i++) {
      if (i === 0) {
        levels[i] = class Level0 {};
      } else {
        levels[i] = eval(`class Level${i} { constructor(public l${i-1}: any) {} }`);
      }
    }
    container.singleton(levels[19]);
    const instance = container.resolve(levels[19]);
    if (!instance) throw new Error('Failed');
  }, 5));

  // 5. Scoped child
  results.push(await benchmark('scoped child', () => {
    const root = new Container();
    class ScopedService {}
    root.scoped(ScopedService);
    const child = root.createChild();
    const instance = child.resolve(ScopedService);
    if (!instance) throw new Error('Failed');
  }));

  // 6. Async singleton
  results.push(await benchmark('async singleton', async () => {
    const container = new Container();
    const TOKEN = createToken<string>('ASYNC_TOKEN');
    container.factory(TOKEN, async () => 'value', 'singleton');
    const value = await container.resolveAsync(TOKEN);
    if (value !== 'value') throw new Error('Failed');
  }, 50));

  // 7. 100 concurrent async singleton
  results.push(await benchmark('100 concurrent async singleton', async () => {
    const container = new Container();
    const TOKEN = createToken<number>('CONCURRENT');
    let callCount = 0;
    container.factory(TOKEN, async () => {
      await new Promise(r => setTimeout(r, 1));
      return ++callCount;
    }, 'singleton');
    
    const promises = Array(100).fill(null).map(() => container.resolveAsync(TOKEN));
    const results = await Promise.all(promises);
    
    if (results.every(r => r === 1)) throw new Error('Failed');
  }, 10));

  // Print results
  console.table(results.map(r => ({
    name: r.name,
    'duration (ms)': r.durationMs.toFixed(2),
    'ops/sec': r.opsPerSec
  })));

  console.log('\nBenchmarks completed successfully.');
}

runBenchmarks().catch(console.error);