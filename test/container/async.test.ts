import { expect } from 'chai';
import { Container } from '../../src/container.js';
import { Injectable, Inject } from '../../src/decorators.js';
import { createToken } from '../../src/types.js';

describe('Container - Async', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
  });

  it('should resolve sync factory via resolveAsync', async () => {
    const TOKEN = createToken<string>('SYNC_FACTORY');
    container.factory(TOKEN, () => 'sync-val');
    
    const val = await container.resolveAsync(TOKEN);
    expect(val).to.equal('sync-val');
  });

  it('should resolve async factory via resolveAsync', async () => {
    const TOKEN = createToken<string>('ASYNC_FACTORY');
    container.factory(TOKEN, async () => 'async-val');
    
    const val = await container.resolveAsync(TOKEN);
    expect(val).to.equal('async-val');
  });

  it('should resolve async singleton only once (cache in-flight promise)', async () => {
    const TOKEN = createToken<number>('ASYNC_SINGLETON');
    let calls = 0;
    container.factory(TOKEN, async () => {
      calls++;
      return new Promise(resolve => setTimeout(() => resolve(calls), 10));
    });

    const results = await Promise.all([
      container.resolveAsync(TOKEN),
      container.resolveAsync(TOKEN),
      container.resolveAsync(TOKEN)
    ]);

    expect(results).to.deep.equal([1, 1, 1]);
    expect(calls).to.equal(1);
  });

  it('should retry failed async factory on next resolution', async () => {
    const TOKEN = createToken<string>('ASYNC_RETRY');
    let fail = true;
    container.factory(TOKEN, async () => {
      if (fail) {
        fail = false;
        throw new Error('First fail');
      }
      return 'success';
    });

    try {
      await container.resolveAsync(TOKEN);
      expect.fail('Should have thrown');
    } catch (e: any) {
      expect(e.cause).to.be.instanceOf(Error);
      expect(e.cause.message).to.equal('First fail');
    }

    const val = await container.resolveAsync(TOKEN);
    expect(val).to.equal('success');
  });

  it('should support transient async factory', async () => {
    const TOKEN = createToken<number>('ASYNC_TRANSIENT');
    let counter = 0;
    container.factory(TOKEN, async () => ++counter, 'transient');

    const v1 = await container.resolveAsync(TOKEN);
    const v2 = await container.resolveAsync(TOKEN);

    expect(v1).to.equal(1);
    expect(v2).to.equal(2);
  });

  it('should support nested async dependencies', async () => {
    const ASYNC_DEP = createToken<string>('ASYNC_DEP');
    container.factory(ASYNC_DEP, async () => 'async-dep-value');

    @Injectable()
    class Target {
      constructor(@Inject(ASYNC_DEP) public dep: string) {}
    }

    const instance = await container.resolveAsync(Target);
    expect(instance.dep).to.equal('async-dep-value');
  });

  it('should throw when async factory resolved via sync resolve', () => {
    const TOKEN = createToken<string>('ASYNC_FACTORY_FAIL');
    container.factory(TOKEN, async () => 'fail-val');
    
    expect(() => container.resolve(TOKEN)).to.throw(/Cannot synchronously resolve async provider/);
  });

  it('should detect nested async dependency in sync graph', () => {
    const ASYNC_TOKEN = createToken<string>('ASYNC_TOKEN');
    container.factory(ASYNC_TOKEN, async () => 'async-val');

    @Injectable()
    class SyncRoot {
      constructor(@Inject(ASYNC_TOKEN) public val: string) {}
    }

    expect(() => container.resolve(SyncRoot)).to.throw(/Cannot synchronously resolve async provider/);
  });
});
