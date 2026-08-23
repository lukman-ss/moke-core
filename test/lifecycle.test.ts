import { expect } from 'chai';
import { Container } from '../src/container.js';
import { MokeFactory, ApplicationState } from '../src/application.js';
import { OnModuleInit, OnApplicationBootstrap, OnModuleDestroy, OnApplicationShutdown } from '../src/lifecycle.js';
import { Injectable } from '../src/decorators.js';

describe('ApplicationContext & Lifecycle', () => {

  it('maintains explicit state machine', async () => {
    @Injectable()
    class Service {}

    const app = await MokeFactory.createApplicationContext(Service);
    expect(app.state).to.equal('created');

    await app.init();
    expect(app.state).to.equal('ready');

    await app.close();
    expect(app.state).to.equal('closed');
  });

  it('prevents double init concurrently', async () => {
    let calls = 0;

    @Injectable()
    class Service implements OnModuleInit {
      async onModuleInit() {
        calls++;
        await new Promise(r => setTimeout(r, 10));
      }
    }

    const app = await MokeFactory.createApplicationContext(Service);
    
    // Concurrent
    await Promise.all([app.init(), app.init(), app.init()]);

    expect(calls).to.equal(1);
    expect(app.state).to.equal('ready');
  });

  it('reverts to created if init fails', async () => {
    @Injectable()
    class Service implements OnModuleInit {
      onModuleInit() { throw new Error('fail'); }
    }

    const app = await MokeFactory.createApplicationContext(Service);
    
    try {
      await app.init();
      expect.fail();
    } catch (e: any) {
      expect(e.message).to.equal('fail');
      expect(app.state).to.equal('created');
    }
  });

  it('prevents init after close', async () => {
    @Injectable()
    class Service {}

    const app = await MokeFactory.createApplicationContext(Service);
    await app.close();
    
    try {
      await app.init();
      expect.fail();
    } catch (e: any) {
      expect(e.message).to.include('Cannot initialize');
    }
  });

  it('executes lifecycle hooks deterministically', async () => {
    const order: string[] = [];

    @Injectable()
    class Service implements OnModuleInit, OnApplicationBootstrap, OnModuleDestroy, OnApplicationShutdown {
      async onModuleInit() { order.push('init'); }
      async onApplicationBootstrap() { order.push('bootstrap'); }
      async onModuleDestroy() { order.push('destroy'); }
      async onApplicationShutdown() { order.push('shutdown'); }
    }

    const app = await MokeFactory.createApplicationContext(Service);
    
    await app.init();
    expect(order).to.deep.equal(['init', 'bootstrap']);

    await app.close();
    expect(order).to.deep.equal(['init', 'bootstrap', 'destroy', 'shutdown']);
  });

  it('swallows shutdown errors idempotently', async () => {
    let destroyCalls = 0;

    @Injectable()
    class Service implements OnModuleDestroy {
      onModuleDestroy() { 
        destroyCalls++;
        throw new Error('fail'); 
      }
    }

    const app = await MokeFactory.createApplicationContext(Service);
    await app.close();
    await app.close(); // idempotent
    
    expect(destroyCalls).to.equal(1);
    expect(app.state).to.equal('closed');
  });

});