import { expect } from 'chai';
import { MokeFactory, ApplicationState } from '../../src/index.js';
import { OnModuleInit, OnApplicationBootstrap, OnModuleDestroy, OnApplicationShutdown } from '../../src/index.js';
import { Injectable } from '../../src/index.js';

describe('Application - Create & Initialize', () => {
  it('should create application without initialization', async () => {
    @Injectable()
    class Service {}

    const app = await MokeFactory.createApplicationContext(Service);
    expect(app.state).to.equal('created');
  });

  it('should initialize application successfully', async () => {
    @Injectable()
    class Service {}

    const app = await MokeFactory.createApplicationContext(Service);
    await app.init();

    expect(app.state).to.equal('ready');
    expect(app.get(Service)).to.be.instanceOf(Service);
  });

  it('should prevent double initialization', async () => {
    let initCount = 0;

    @Injectable()
    class Service implements OnModuleInit {
      async onModuleInit() {
        initCount++;
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    const app = await MokeFactory.createApplicationContext(Service);
    
    await Promise.all([app.init(), app.init(), app.init()]);

    expect(initCount).to.equal(1);
    expect(app.state).to.equal('ready');
  });

  it('should revert to created if init fails', async () => {
    @Injectable()
    class Service implements OnModuleInit {
      onModuleInit() { 
        throw new Error('Init failed');
      }
    }

    const app = await MokeFactory.createApplicationContext(Service);
    
    try {
      await app.init();
      expect.fail();
    } catch (e: any) {
      expect(e.name).to.equal('MokeBootstrapError');
      expect(e.message).to.include('onModuleInit');
    }

    expect(app.state).to.equal('created');
  });

  it('should prevent init after close', async () => {
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
});
