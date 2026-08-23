import { expect } from 'chai';
import { Container, createToken } from '../../src/container.js';
import { Injectable } from '../../src/decorators.js';
import { DependencyResolutionError } from '../../src/errors.js';

describe('Container - Circular Dependencies', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
  });

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

    container.singleton(A);
    container.singleton(B);
    
    // Manually create circular dependency
    (container as any).registrations.get(container.getTokenKey(A)).provider = { 
      useFactory: (c: Container) => { c.resolve(B); return new A(); }
    };
    (container as any).registrations.get(container.getTokenKey(B)).provider = { 
      useFactory: (c: Container) => { c.resolve(A); return new B(); }
    };

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
});
