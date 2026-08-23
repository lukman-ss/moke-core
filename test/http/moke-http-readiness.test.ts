import { expect } from 'chai';
import { Container } from '../../src/container.js';
import { MokeApplicationContext, MokeFactory } from '../../src/application.js';
import { ServiceProvider } from '../../src/service-provider.js';
import { Injectable, Module } from '../../src/index.js';

describe('moke-http Readiness Test', () => {
  it('should support external package integration correctly', async () => {
    // 1. Define HTTP classes (simulating moke-http internals)
    @Injectable()
    class HttpServer {
      public isStarted = false;
      start() { this.isStarted = true; }
      stop() { this.isStarted = false; }
    }

    @Injectable()
    class RequestContext {
      public id = Math.random();
    }

    // 2. Define the ServiceProvider (simulating how moke-http registers itself)
    class HttpProvider extends ServiceProvider {
      register() {
        this.app.container.singleton(HttpServer);
        this.app.container.scoped(RequestContext);
      }

      async boot() {
        await this.app.getAsync(HttpServer).then(server => server.start());
      }

      async shutdown() {
        await this.app.getAsync(HttpServer).then(server => server.stop());
      }
    }

    // 3. Application setup
    @Module({})
    class AppModule {}
    
    const app = await MokeFactory.createApplicationContext(AppModule);
    const provider = new HttpProvider(app);

    // Moke's register phase
    await provider.register();
    
    // Moke's init phase (app.init() would call provider.boot() in real implementation)
    // We simulate it here by calling provider.boot() manually for the ServiceProvider pattern
    await app.init();
    await provider.boot();

    // 4. Simulate two requests
    const requestA = app.container.createChild();
    const requestB = app.container.createChild();

    // 5. Assertions (Acceptance Criteria)
    
    // HttpServer same singleton
    expect(requestA.resolve(HttpServer)).to.equal(requestB.resolve(HttpServer));
    expect(requestA.resolve(HttpServer)).to.equal(app.get(HttpServer));
    expect(app.get(HttpServer).isStarted).to.be.true;

    // RequestContext same inside requestA
    expect(requestA.resolve(RequestContext)).to.equal(requestA.resolve(RequestContext));
    
    // RequestContext same inside requestB
    expect(requestB.resolve(RequestContext)).to.equal(requestB.resolve(RequestContext));
    
    // requestA context != requestB context
    expect(requestA.resolve(RequestContext)).to.not.equal(requestB.resolve(RequestContext));

    // Shutdown execution
    await provider.shutdown();
    expect(app.get(HttpServer).isStarted).to.be.false;
  });
});
