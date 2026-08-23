import { expect } from 'chai';
import { Container } from '../src/container.js';
import { MokeFactory } from '../src/application.js';
import { ServiceProvider } from '../src/service-provider.js';

describe('ServiceProvider', () => {

  it('allows external package registration', async () => {
    class FakeHttpServer {
      started = false;
      start() { this.started = true; }
      stop() { this.started = false; }
    }

    class FakeHttpServiceProvider extends ServiceProvider {
      register() {
        this.app.container.singleton(FakeHttpServer);
      }
      async boot() {
        await this.app.getAsync(FakeHttpServer).then(server => server.start());
      }
      async shutdown() {
        await this.app.getAsync(FakeHttpServer).then(server => server.stop());
      }
    }

    class AppModule {}

    const app = await MokeFactory.createApplicationContext(AppModule);
    
    // Mimic manual service provider booting
    const provider = new FakeHttpServiceProvider(app);
    await provider.register?.();
    
    const server = app.get(FakeHttpServer);
    expect(server).to.be.instanceOf(FakeHttpServer);
    expect(server.started).to.be.false;

    await provider.boot?.();
    expect(server.started).to.be.true;

    await provider.shutdown?.();
    expect(server.started).to.be.false;
  });

});
