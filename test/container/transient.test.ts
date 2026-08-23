import { expect } from 'chai';
import { Container } from '../../src/container.js';

describe('Container - Transient', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
  });

  it('should return new instance on every resolve', () => {
    class TransientService {}
    container.transient(TransientService);

    const instance1 = container.resolve(TransientService);
    const instance2 = container.resolve(TransientService);

    expect(instance1).to.not.equal(instance2);
  });

  it('should create new instance even within same child container', () => {
    class TransientService {}
    container.transient(TransientService);

    const child = container.createChild();

    const instance1 = child.resolve(TransientService);
    const instance2 = child.resolve(TransientService);

    expect(instance1).to.not.equal(instance2);
  });

  it('should increment constructor call count for each resolution', () => {
    let instanceCount = 0;

    class TransientService {
      constructor() {
        instanceCount++;
      }
    }

    container.transient(TransientService);

    container.resolve(TransientService);
    container.resolve(TransientService);
    container.resolve(TransientService);
    container.resolve(TransientService);

    expect(instanceCount).to.equal(4);
  });
});
