import { expect } from 'chai';
import { Container } from '../src/container.js';
import { createToken } from '../src/types.js';

describe('Container Scopes & Lifecycle', () => {
  let root: Container;

  beforeEach(() => {
    root = new Container();
  });

  describe('Scoped Semantics', () => {
    it('singleton resolved from child should yield same instance globally', () => {
      class DB {}
      root.singleton(DB);

      const childA = root.createChild();
      const childB = root.createChild();

      expect(childA.resolve(DB)).to.equal(childB.resolve(DB));
      expect(childA.resolve(DB)).to.equal(root.resolve(DB));
    });

    it('scoped resolved from child should yield same instance per child, but different globally', () => {
      class RequestContext {}
      root.scoped(RequestContext);

      const childA = root.createChild();
      const childB = root.createChild();

      const reqA1 = childA.resolve(RequestContext);
      const reqA2 = childA.resolve(RequestContext);
      const reqB = childB.resolve(RequestContext);

      expect(reqA1).to.equal(reqA2);
      expect(reqA1).to.not.equal(reqB);
    });

    it('transient should yield new instance every time even in same child', () => {
      class RandomId {}
      root.transient(RandomId);

      const childA = root.createChild();

      const r1 = childA.resolve(RandomId);
      const r2 = childA.resolve(RandomId);

      expect(r1).to.not.equal(r2);
    });

    it('child should be able to override parent registration locally', () => {
      const TOKEN = createToken<string>('T1');
      root.instance(TOKEN, 'root');

      const childA = root.createChild();
      childA.instance(TOKEN, 'childA');

      const childB = root.createChild();

      expect(root.resolve(TOKEN)).to.equal('root');
      expect(childA.resolve(TOKEN)).to.equal('childA');
      expect(childB.resolve(TOKEN)).to.equal('root');
    });

    it('value providers are inherited correctly', () => {
      const CONFIG = createToken<any>('CONFIG');
      root.instance(CONFIG, { port: 8080 });

      const child = root.createChild();
      expect(child.resolve(CONFIG).port).to.equal(8080);
    });
  });

  describe('Concurrency & Resolution Context', () => {
    it('should handle concurrent resolveAsync without mutating state or cross-talking paths', async () => {
      const TOKEN_A = createToken<string>('A');
      const TOKEN_B = createToken<string>('B');

      root.factory(TOKEN_A, async (c) => {
        await new Promise(r => setTimeout(r, 10));
        return 'A';
      }, 'transient');

      root.factory(TOKEN_B, async (c) => {
        await new Promise(r => setTimeout(r, 5));
        return 'B';
      }, 'transient');

      const [resA, resB] = await Promise.all([
        root.resolveAsync(TOKEN_A),
        root.resolveAsync(TOKEN_B)
      ]);

      expect(resA).to.equal('A');
      expect(resB).to.equal('B');
    });

    it('concurrent resolveAsync stress test', async () => {
      const T1 = createToken<number>('T1');
      
      let factoryCalls = 0;
      root.factory(T1, async () => {
        factoryCalls++;
        await new Promise(r => setTimeout(r, 1));
        return factoryCalls;
      }, 'singleton');

      const promises = Array.from({ length: 50 }, () => root.resolveAsync(T1));
      const results = await Promise.all(promises);

      expect(results.every(r => r === 1)).to.be.true;
      expect(factoryCalls).to.equal(1);
    });
  });

});