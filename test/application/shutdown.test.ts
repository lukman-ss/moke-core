import { expect } from 'chai';
import { MokeFactory } from '@lukman-ss/moke-core';
import { OnModuleDestroy, OnApplicationShutdown } from '@lukman-ss/moke-core';
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

    const app = await MokeFactory.createApplicationContext({ providers: [Service1, Service2] } as any);
    await app.init();

    try {
      await app.close();
      expect.fail();
    } catch (e: any) {
      expect(e.name).to.equal('MokeShutdownError');
      expect(e.errors).to.have.length(2);
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
