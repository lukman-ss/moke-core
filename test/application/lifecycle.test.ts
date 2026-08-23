import { expect } from 'chai';
import { MokeFactory } from '../../src/index.js';
import { OnModuleInit, OnApplicationBootstrap, OnModuleDestroy } from '../../src/index.js';
import { Injectable } from '../../src/index.js';

describe('Application - Lifecycle Hooks', () => {
  it('should execute lifecycle hooks in deterministic order', async () => {
    const order: string[] = [];

    @Injectable()
    class Service implements OnModuleInit, OnApplicationBootstrap {
      async onModuleInit() { 
        order.push('init');
        await new Promise(resolve => setTimeout(resolve, 5));
      }
      
      async onApplicationBootstrap() { 
        order.push('bootstrap');
        await new Promise(resolve => setTimeout(resolve, 5));
      }
    }

    const app = await MokeFactory.createApplicationContext(Service);
    await app.init();

    expect(order).to.deep.equal(['init', 'bootstrap']);
  });

  it('should handle async lifecycle hooks', async () => {
    const timestamps: number[] = [];
    
    @Injectable()
    class Service implements OnModuleInit, OnApplicationBootstrap {
      async onModuleInit() {
        timestamps.push(Date.now());
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      async onApplicationBootstrap() {
        timestamps.push(Date.now());
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    const app = await MokeFactory.createApplicationContext(Service);
    await app.init();

    expect(timestamps.length).to.equal(2);
    expect(timestamps[1]).to.be.greaterThan(timestamps[0]);
  });

  it('should not execute duplicate hooks', async () => {
    let callCount = 0;

    @Injectable()
    class Service implements OnModuleInit {
      onModuleInit() {
        callCount++;
      }
    }

    const app = await MokeFactory.createApplicationContext(Service);
    await app.init();
    await app.init();
    await app.init();

    expect(callCount).to.equal(1);
  });

  it('should handle initialization failure and cleanup', async () => {
    let cleanupCalled = false;

    @Injectable()
    class Service implements OnModuleInit, OnModuleDestroy {
      onModuleInit() {
        throw new Error('Init failed');
      }
      
      onModuleDestroy() {
        cleanupCalled = true;
      }
    }

    const app = await MokeFactory.createApplicationContext(Service);
    
    try {
      await app.init();
      expect.fail();
    } catch (e: any) {
      expect(e.name).to.equal('MokeBootstrapError');
    }

    expect(app.state).to.equal('created');
  });
});
