import { expect } from 'chai';
import { Container } from '../src/container.js';
import { createToken } from '../src/types.js';
import { Inject, Injectable } from '../src/decorators.js';
import { DependencyResolutionError, InvalidProviderError } from '../src/errors.js';

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

  it('should support existing provider semantics (alias)', () => {
    class Logger {}
    const TOKEN = createToken<Logger>('LOGGER');

    // Make target transient to prove alias doesn't cache it
    container.transient(Logger);
    container.bind(TOKEN, { useExisting: Logger });

    const loggerFromAlias1 = container.resolve(TOKEN);
    const loggerFromAlias2 = container.resolve(TOKEN);

    expect(loggerFromAlias1).to.not.equal(loggerFromAlias2);
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

    expect(() => container.resolve(Target)).to.throw(); // Could be UnknownProviderError or PrimitiveDependencyError depending on TS emit, just ensure it throws
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

  it('should throw DependencyResolutionError capturing AsyncProviderResolutionError when async factory resolved via sync resolve', () => {
    const TOKEN = createToken<string>('ASYNC_FACTORY_FAIL');
    container.factory(TOKEN, async () => 'fail-val');
    
    try {
      container.resolve(TOKEN);
      expect.fail();
    } catch (e: any) {
      expect(e).to.be.instanceOf(DependencyResolutionError);
      expect(e.cause).to.be.instanceOf(Error);
      expect(e.cause.name).to.equal('AsyncProviderResolutionError');
      expect(e.message).to.include('Failed while constructing "ASYNC_FACTORY_FAIL"');
      expect(e.cause.message).to.include('Cannot synchronously resolve async provider for token: "ASYNC_FACTORY_FAIL". Use resolveAsync() instead.');
    }
  });

  it('should detect nested async dependency in sync graph and direct to resolveAsync', () => {
    const ASYNC_TOKEN = createToken<string>('ASYNC_TOKEN');
    container.factory(ASYNC_TOKEN, async () => 'async-val');

    @Injectable()
    class SyncRoot {
      constructor(@Inject(ASYNC_TOKEN) public val: string) {}
    }

    try {
      container.resolve(SyncRoot);
      expect.fail();
    } catch (e: any) {
      expect(e.cause.name).to.equal('AsyncProviderResolutionError');
      expect(e.cause.message).to.include('Cannot synchronously resolve async provider for token: "ASYNC_TOKEN". Use resolveAsync() instead.');
    }
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

  // --- Circular Dependency Tests ---

  it('should detect direct A -> A cycle', () => {
    @Injectable()
    class A {
      constructor(public a: A) {}
    }

    container.singleton(A);
    expect(() => container.resolve(A)).to.throw(DependencyResolutionError, /Circular dependency detected/);
  });

  it('should detect A -> B -> A cycle', () => {
    class A {}
    class B {}

    // Manually register to simulate circular metadata
    container.bind(A, { useFactory: (c: Container) => new A() } as any);
    container.bind(B, { useFactory: (c: Container) => new B() } as any);

    // Patch factories to resolve each other to trigger cycle
    (container as any).registrations.get(A).provider.useFactory = (c: Container) => { c.resolve(B); return new A(); };
    (container as any).registrations.get(B).provider.useFactory = (c: Container) => { c.resolve(A); return new B(); };

    expect(() => container.resolve(A)).to.throw(DependencyResolutionError, /Circular dependency detected/);
  });

  it('should detect useExisting cycle', () => {
    const T1 = createToken('T1');
    const T2 = createToken('T2');
    container.bind(T1, { useExisting: T2 });
    container.bind(T2, { useExisting: T1 });

    expect(() => container.resolve(T1)).to.throw(DependencyResolutionError, /Circular dependency detected/);
  });

  it('should not throw on valid diamond non-cycle', () => {
    class Leaf {}
    
    @Injectable()
    class Left {
      constructor(public leaf: Leaf) {}
    }

    @Injectable()
    class Right {
      constructor(public leaf: Leaf) {}
    }

    @Injectable()
    class Root {
      constructor(public left: Left, public right: Right) {}
    }

    const root = container.resolve(Root);
    expect(root.left.leaf).to.be.instanceOf(Leaf);
    expect(root.right.leaf).to.be.instanceOf(Leaf);
  });

  // --- Provider Ambiguity Validation Tests ---

  it('should throw InvalidProviderError on malformed provider', () => {
    expect(() => container.bind('token', {} as any)).to.throw(InvalidProviderError);
  });

  it('should throw InvalidProviderError if bind token mismatch', () => {
    const T1 = createToken('T1');
    const T2 = createToken('T2');
    expect(() => container.bind(T1, { provide: T2, useValue: 'val' })).to.throw(InvalidProviderError);
  });

  it('should support register()', () => {
    const T1 = createToken<string>('T1');
    container.register({ provide: T1, useValue: 'value1' });
    expect(container.resolve(T1)).to.equal('value1');
  });

  it('should throw if register() missing provide', () => {
    expect(() => container.register({ useValue: 'val' } as any)).to.throw(InvalidProviderError);
  });
});
