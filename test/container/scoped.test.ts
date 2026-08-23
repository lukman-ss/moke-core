import { expect } from 'chai';
import { Container } from '../../src/container.js';

describe('Container - Scoped', () => {
  let root: Container;

  beforeEach(() => {
    root = new Container();
  });

  it('should return same instance within same container', () => {
    class ScopedService {}
    root.scoped(ScopedService);

    const instance1 = root.resolve(ScopedService);
    const instance2 = root.resolve(ScopedService);

    expect(instance1).to.equal(instance2);
  });

  it('should return different instances across different child containers', () => {
    class ScopedService {}
    root.scoped(ScopedService);

    const child1 = root.createChild();
    const child2 = root.createChild();

    const instance1 = child1.resolve(ScopedService);
    const instance2 = child2.resolve(ScopedService);

    expect(instance1).to.not.equal(instance2);
  });

  it('should allow child to override parent scoped provider', () => {
    class ScopedService {
      constructor(public value: string) {}
    }
    root.scoped(ScopedService, { useValue: new ScopedService('parent') });

    const child = root.createChild();
    child.scoped(ScopedService, { useValue: new ScopedService('child') });

    expect(root.resolve(ScopedService).value).to.equal('parent');
    expect(child.resolve(ScopedService).value).to.equal('child');
  });
});
