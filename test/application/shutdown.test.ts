import { expect } from 'chai';
import { MokeFactory } from '@lukman-ss/moke-core';
import { OnModuleDestroy, OnApplicationShutdown, Module } from '@lukman-ss/moke-core';
import { Injectable } from '@lukman-ss/moke-core';

describe('Application - Shutdown', () => {
  it('should close application successfully', async () => {
    let shutdownCalled = false;
    
    @Injectable()
    class Service implements OnApplicationShutdown {
      onApplicationShutdown() {
        shutdownCalled = true;
      }
    }

    const app = await MokeFactory.createApplicationContext(Service);
    await app.init();
    await app.close();

    expect(shutdownCalled).to.be.true;
    expect(app.state).to.equal('closed');
  });

  it('should execute shutdown hooks in reverse order', async () => {
    const order: string[] = [];
    
    @Injectable()
    class Service implements OnModuleDestroy, OnApplicationShutdown {
      onModuleDestroy() { order.push('destroy'); }
      onApplicationShutdown() { order.push('shutdown'); }
    }

    const app = await MokeFactory.createApplicationContext(Service);
    await app.init();
    await app.close();

    expect(order).to.deep.equal(['shutdown', 'destroy']);
  });

  it('should aggregate shutdown errors', async () => {
    @Injectable()
    class Service1 implements OnApplicationShutdown {
      onApplicationShutdown() { throw new Error('Error 1'); }
    }
    
    @Injectable()
    class Service2 implements OnApplicationShutdown {
      onApplicationShutdown() { throw new Error('Error 2'); }
    }

    @Module({ providers: [Service1, Service2] })
    class AppModule {}
    const app = await MokeFactory.createApplicationContext(AppModule);
    
    // Resolve services to instantiate them so they receive lifecycle hooks
    app.get(Service1);
    app.get(Service2);
    
    await app.init();

    try {
      await app.close();
      expect.fail();
    } catch (e: any) {
      expect(e.name).to.equal('MokeShutdownError');
      expect(e.errors).to.have.lengthOf(2);
    }

    expect(app.state).to.equal('closed');
  });

  it('should handle double close', async () => {
    @Injectable()
    class Service {}

    const app = await MokeFactory.createApplicationContext(Service);
    await app.init();
    await app.close();
    await app.close();

    expect(app.state).to.equal('closed');
  });

  it('should handle shutdown with signal', async () => {
    let receivedSignal: string | undefined;
    
    @Injectable()
    class Service implements OnApplicationShutdown {
      onApplicationShutdown(signal?: string) {
        receivedSignal = signal;
      }
    }

    const app = await MokeFactory.createApplicationContext(Service);
    await app.init();
    await app.close('SIGTERM');

    expect(receivedSignal).to.equal('SIGTERM');
  });
});
