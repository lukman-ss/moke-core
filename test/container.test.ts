import { expect } from 'chai';
import { Container } from '../src/container.js';
import { createToken } from '../src/types.js';
import { Inject, Injectable } from '../src/decorators.js';

describe('Container', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
  });

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
});
