import { expect } from 'chai';
import { Container } from '../src/container.js';
import { createToken } from '../src/types.js';
import { Inject, Injectable } from '../src/decorators.js';
import { AsyncProviderResolutionError } from '../src/errors.js';

describe('Container', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
  });

  // --- Sync Resolution Tests ---

  it('should resolve class dependency (singleton by default)', () => {
    class ServiceA {}
    container.singleton(ServiceA);

    const instance1 = container.resolve(ServiceA);
    const instance2 = container.resolve(ServiceA);

    expect(instance1).to.be.instanceOf(ServiceA);
    expect(instance1).to.equal(instance2);
  });

  it('should resolve transient dependency', () => {
    class ServiceB {}
    container.transient(ServiceB);

    const instance1 = container.resolve(ServiceB);
    const instance2 = container.resolve(ServiceB);

    expect(instance1).to.be.instanceOf(ServiceB);
    expect(instance1).to.not.equal(instance2);
  });

  it('should support instance provider', () => {
    const TOKEN = createToken<string>('CONFIG');
    container.instance(TOKEN, 'my-config');

    const result = container.resolve(TOKEN);
    expect(result).to.equal('my-config');
  });

  it('should support factory provider', () => {
    const TOKEN = createToken<number>('RANDOM');
    let counter = 0;
    container.factory(TOKEN, () => ++counter, 'transient');

    expect(container.resolve(TOKEN)).to.equal(1);
    expect(container.resolve(TOKEN)).to.equal(2);
  });

  it('should support existing provider', () => {
    class Logger {}
    const TOKEN = createToken<Logger>('LOGGER');

    container.singleton(Logger);
    container.bind(TOKEN, { provide: TOKEN, useExisting: Logger });

    const logger1 = container.resolve(Logger);
    const logger2 = container.resolve(TOKEN);

    expect(logger1).to.equal(logger2);
  });

  it('should auto-bind unhandled classes as singleton', () => {
    class ServiceC {}
    const instance1 = container.resolve(ServiceC);
    const instance2 = container.resolve(ServiceC);

    expect(instance1).to.be.instanceOf(ServiceC);
    expect(instance1).to.equal(instance2);
  });

  it('should has() return true if bound', () => {
    class ServiceD {}
    container.singleton(ServiceD);
    expect(container.has(ServiceD)).to.be.true;
  });

  it('should resolve constructor dependencies', () => {
    class Dep {}
    
    @Injectable()
    class Target {
      constructor(public dep: Dep) {}
    }

    const instance = container.resolve(Target);
    expect(instance.dep).to.be.instanceOf(Dep);
  });

  it('should resolve explicit @Inject() token overriding design:paramtypes', () => {
    interface ICache { val: string; }
    const CACHE_TOKEN = createToken<ICache>('CACHE');
    container.instance(CACHE_TOKEN, { val: 'redis' });

    class Dep {}

    @Injectable()
    class Target {
      constructor(
        public dep: Dep,
        @Inject(CACHE_TOKEN) public cache: ICache
      ) {}
    }

    const instance = container.resolve(Target);
    expect(instance.dep).to.be.instanceOf(Dep);
    expect(instance.cache.val).to.equal('redis');
  });

  it('should throw if dependency is undefined (e.g. interface without @Inject)', () => {
    interface ICache {}
    
    @Injectable()
    class Target {
      constructor(public cache: ICache) {}
    }

    expect(() => container.resolve(Target)).to.throw(/Cannot resolve constructor dependency at index 0/);
  });

  // --- Async Resolution Tests ---

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

  it('should throw AsyncProviderResolutionError when async factory resolved via sync resolve', () => {
    const TOKEN = createToken<string>('ASYNC_FACTORY_FAIL');
    container.factory(TOKEN, async () => 'fail-val');
    
    expect(() => container.resolve(TOKEN)).to.throw(AsyncProviderResolutionError);
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
      expect(e.message).to.equal('First fail');
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
});
