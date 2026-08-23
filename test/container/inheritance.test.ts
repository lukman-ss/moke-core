import { expect } from 'chai';
import { Container } from '../../src/index.js';
import { Inject, Injectable } from '../../src/index.js';

describe('Decorator Inheritance', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
  });

  it('should inherit constructor dependencies from base class', () => {
    class Dependency {}
    
    @Injectable()
    class BaseService {
      constructor(public dep: Dependency) {}
    }

    @Injectable()
    class ChildService extends BaseService {}

    container.singleton(Dependency);
    container.singleton(ChildService);

    const child = container.resolve(ChildService);
    expect(child).to.be.instanceOf(ChildService);
    expect(child.dep).to.be.instanceOf(Dependency);
  });

  it('should allow child to extend base without @Injectable (but explicit @Inject required for child)', () => {
    class Dependency {}

    class BaseService {
      constructor(public dep: Dependency) {}
    }

    @Injectable()
    class ChildService extends BaseService {
      constructor(@Inject(Dependency) dep: Dependency) {
        super(dep);
      }
    }

    container.singleton(Dependency);
    container.singleton(ChildService);

    const child = container.resolve(ChildService);
    expect(child).to.be.instanceOf(ChildService);
    expect(child.dep).to.be.instanceOf(Dependency);
  });

  it('should handle multi-level inheritance', () => {
    class BaseDependency {}
    class MiddleDependency extends BaseDependency {}
    class FinalDependency extends MiddleDependency {}

    @Injectable()
    class BaseClass {
      constructor(public base: BaseDependency) {}
    }

    @Injectable()
    class MiddleClass extends BaseClass {
      constructor(public middle: MiddleDependency, base: BaseDependency) {
        super(base);
      }
    }

    @Injectable()
    class FinalClass extends MiddleClass {
      constructor(public final: FinalDependency, middle: MiddleDependency, base: BaseDependency) {
        super(middle, base);
      }
    }

    container.singleton(BaseDependency);
    container.singleton(MiddleDependency);
    container.singleton(FinalDependency);
    container.singleton(FinalClass);

    const instance = container.resolve(FinalClass);
    expect(instance).to.be.instanceOf(FinalClass);
    expect(instance.base).to.be.instanceOf(BaseDependency);
    expect(instance.middle).to.be.instanceOf(MiddleDependency);
    expect(instance.final).to.be.instanceOf(FinalDependency);
  });

  it('should allow child to override base dependencies with @Inject', () => {
    const BASE_TOKEN = Symbol('BASE');
    const CHILD_TOKEN = Symbol('CHILD');

    @Injectable()
    class BaseService {
      constructor(
        @Inject(BASE_TOKEN) public dep: string
      ) {}
    }

    @Injectable()
    class ChildService extends BaseService {
      constructor(
        @Inject(CHILD_TOKEN) public childDep: string,
        @Inject(BASE_TOKEN) baseDep: string
      ) {
        super(baseDep);
      }
    }

    container.instance(BASE_TOKEN, 'base-value');
    container.instance(CHILD_TOKEN, 'child-value');
    container.singleton(ChildService);

    const child = container.resolve(ChildService);
    expect(child.dep).to.equal('base-value');
    expect(child.childDep).to.equal('child-value');
  });
});
