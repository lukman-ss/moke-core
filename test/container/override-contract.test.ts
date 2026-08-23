import { expect } from 'chai';
import { Container } from '../../src/container.js';
import { createToken } from '../../src/types.js';
import { Injectable, Inject } from '../../src/decorators.js';

describe('Test Override Contract', () => {
  let app: Container;

  beforeEach(() => {
    app = new Container();
  });

  describe('Container Override Semantics', () => {
    it('should allow overriding singleton with fake implementation', () => {
      const DATABASE = createToken<any>('DATABASE');
      
      @Injectable()
      class RealDatabase {
        query() { return 'real data'; }
      }
      
      class FakeDatabase {
        query() { return 'fake data'; }
      }

      app.singleton(DATABASE, RealDatabase);
      
      // Test override before resolution
      app.override(DATABASE, FakeDatabase);

      const db = app.resolve(DATABASE);
      expect(db.query()).to.equal('fake data');
    });

    it('should allow overriding scoped with fake value', () => {
      const REPOSITORY = createToken<any>('REPOSITORY');
      
      @Injectable()
      class RealRepository {
        find() { return 'real user'; }
      }

      app.scoped(REPOSITORY, RealRepository);
      
      // Override with a pre-configured instance
      const fakeRepo = { find: () => 'fake user' };
      app.override(REPOSITORY, { useValue: fakeRepo }, 'scoped');

      const child = app.createChild();
      const repo = child.resolve(REPOSITORY);
      expect(repo.find()).to.equal('fake user');
    });

    it('should handle overriding async providers', async () => {
      const CONFIG = createToken<any>('CONFIG');

      app.factory(CONFIG, async () => {
        return { isProduction: true };
      }, 'singleton');

      // Test override
      app.override(CONFIG, { 
        useFactory: async () => ({ isProduction: false }) 
      }, 'singleton');

      const config = await app.resolveAsync(CONFIG);
      expect(config.isProduction).to.be.false;
    });

    it('should clean up existing instances when overriding', () => {
      @Injectable()
      class ApiClient {
        public initialized = false;
        constructor() { this.initialized = true; }
        fetch() { return 'real api'; }
      }

      class MockApiClient {
        public initialized = false;
        constructor() { this.initialized = true; }
        fetch() { return 'mock api'; }
      }

      app.singleton(ApiClient);
      
      // Resolve once to create instance
      app.resolve(ApiClient);
      expect(app.getInstantiatedInstances().length).to.equal(1);

      // Override should replace it
      app.override(ApiClient, MockApiClient);
      
      const newInstance = app.resolve(ApiClient);
      expect(newInstance.fetch()).to.equal('mock api');
      expect(newInstance).to.be.instanceOf(MockApiClient);
      
      // Old instance should be gone, new one added
      const instances = app.getInstantiatedInstances();
      expect(instances.length).to.equal(1);
      expect(instances[0]).to.be.instanceOf(MockApiClient);
    });

    it('should allow child container to override parent without mutating parent', () => {
      const SERVICE = createToken<any>('SERVICE');
      
      class ParentService {
        call() { return 'parent'; }
      }
      class ChildOverrideService {
        call() { return 'child'; }
      }

      app.singleton(SERVICE, ParentService);

      const child = app.createChild();
      
      // Child overrides for its own scope
      child.override(SERVICE, ChildOverrideService);

      expect(child.resolve(SERVICE).call()).to.equal('child');
      expect(app.resolve(SERVICE).call()).to.equal('parent');
    });

    it('should throw if attempting to override frozen container', () => {
      const SERVICE = createToken<any>('SERVICE');
      
      app.singleton(SERVICE, class { });
      app.freeze();

      expect(() => app.override(SERVICE, class { })).to.throw(/frozen/);
    });
  });
});
