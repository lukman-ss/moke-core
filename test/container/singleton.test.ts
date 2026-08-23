import { expect } from 'chai';
import { Container } from '../../src/container.js';

describe('Container - Singleton', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
  });

  it('should return the same instance across multiple resolves', () => {
    class SingletonService {}
    container.singleton(SingletonService);

    const instance1 = container.resolve(SingletonService);
    const instance2 = container.resolve(SingletonService);

    expect(instance1).to.equal(instance2);
  });

  it('should share singleton instance across child containers', () => {
    class SingletonService {}
    container.singleton(SingletonService);

    const child1 = container.createChild();
    const child2 = container.createChild();

    const instanceRoot = container.resolve(SingletonService);
    const instanceChild1 = child1.resolve(SingletonService);
    const instanceChild2 = child2.resolve(SingletonService);

    expect(instanceRoot).to.equal(instanceChild1);
    expect(instanceChild1).to.equal(instanceChild2);
  });

  it('should only instantiate singleton once', () => {
    let instanceCount = 0;

    class SingletonService {
      constructor() {
        instanceCount++;
      }
    }

    container.singleton(SingletonService);

    container.resolve(SingletonService);
    container.resolve(SingletonService);
    container.resolve(SingletonService);

    expect(instanceCount).to.equal(1);
  });
});
