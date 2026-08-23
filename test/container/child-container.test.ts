import { expect } from 'chai';
import { Container, createToken } from '../../src/container.js';
import { DependencyResolutionError } from '../../src/errors.js';

describe('Container - Child Container', () => {
  let root: Container;

  beforeEach(() => {
    root = new Container();
  });

  it('should resolve dependencies from parent when not bound in child', () => {
    class ParentService {}
    root.singleton(ParentService);

    const child = root.createChild();
    const instance = child.resolve(ParentService);

    expect(instance).to.be.instanceOf(ParentService);
  });

  it('hasOwn should distinguish parent vs child registrations', () => {
    class Service {}
    
    const child = root.createChild();
    child.singleton(Service);

    expect(child.hasOwn(Service)).to.be.true;
    expect(root.hasOwn(Service)).to.be.false;
  });

  it('should allow child to override parent transparently', () => {
    class Target {
      constructor(public value: string) {}
    }
    
    root.instance(Target, { val: 'root' } as any);
    
    const childA = root.createChild();
    const childB = root.createChild();
    
    childA.instance(Target, { val: 'childA' } as any);
    childB.instance(Target, { val: 'childB' } as any);

    expect((root.resolve(Target) as any).val).to.equal('root');
    expect((childA.resolve(Target) as any).val).to.equal('childA');
    expect((childB.resolve(Target) as any).val).to.equal('childB');
  });

  it('should allow child to override parent singleton', () => {
    class Service {
      constructor(public name: string) {}
    }
    
    root.singleton(Service, { useValue: new Service('root') });
    
    const child = root.createChild();
    child.singleton(Service, { useValue: new Service('child') });

    expect(child.resolve(Service).name).to.equal('child');
    expect(root.resolve(Service).name).to.equal('root');
  });

  it('should detect duplicate provider in child when not in parent', () => {
    class Service {}
    const child = root.createChild();
    
    child.singleton(Service);
    expect(() => child.singleton(Service)).to.throw();
  });

  it('should create isolated child container instances', () => {
    class Service {}
    root.singleton(Service);
    
    const child1 = root.createChild();
    const child2 = root.createChild();
    
    expect(child1).to.not.equal(child2);
    expect(child1).to.not.equal(root);
  });
});
