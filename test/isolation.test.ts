import { expect } from 'chai';
import { Container } from '../src/container.js';
import { MokeFactory } from '../src/application.js';
import { Module } from '../src/module.js';
import { Injectable } from '../src/decorators.js';
import { createToken } from '../src/types.js';

describe('Multi Application Isolation', () => {
  it('should have completely isolated containers between apps', async () => {
    const TOKEN = createToken<string>('SHARED_TOKEN');

    @Module({ providers: [{ provide: TOKEN, useValue: 'appA' }] })
    class AppAModule {}

    @Module({ providers: [{ provide: TOKEN, useValue: 'appB' }] })
    class AppBModule {}

    const appA = await MokeFactory.createApplicationContext(AppAModule);
    const appB = await MokeFactory.createApplicationContext(AppBModule);

    expect(appA.get(TOKEN)).to.equal('appA');
    expect(appB.get(TOKEN)).to.equal('appB');
  });

  it('should isolate singleton instances per application', async () => {
    let counter = 0;

    class Counter {}
    const COUNTER_TOKEN = createToken<Counter>('COUNTER');

    @Module({
      providers: [
        { provide: COUNTER_TOKEN, useFactory: () => { const c = ++counter; return new Counter() } }
      ]
    })
    class AppModuleA {}

    @Module({
      providers: [
        { provide: COUNTER_TOKEN, useFactory: () => { const c = ++counter; return new Counter() } }
      ]
    })
    class AppModuleB {}

    const appA = await MokeFactory.createApplicationContext(AppModuleA);
    const appB = await MokeFactory.createApplicationContext(AppModuleB);

    expect(appA.get(COUNTER_TOKEN)).to.not.equal(appB.get(COUNTER_TOKEN));
    expect(counter).to.equal(2);
  });

  it('should allow shutdown of one app without affecting others', async () => {
    const TOKEN = createToken<number>('SHUTDOWN_TEST');
    
    let destroyedA = false;
    let destroyedB = false;

    @Module({
      providers: [{
        provide: TOKEN,
        useValue: { 
          destroy() { destroyedA = true; },
          name: 'AppA'
        }
      }]
    })
    class AppModuleA {}

    @Module({
      providers: [{
        provide: TOKEN,
        useValue: { 
          destroy() { destroyedB = true; },
          name: 'AppB'
        }
      }]
    })
    class AppModuleB {}

    const appA = await MokeFactory.createApplicationContext(AppModuleA);
    const appB = await MokeFactory.createApplicationContext(AppModuleB);

    await appA.close();
    expect(destroyedA).to.be.true;
    
    const tokenB = appB.get(TOKEN);
    expect((tokenB as any).name).to.equal('AppB');
    expect(destroyedB).to.be.false;
  });

  it('scoped provider in appA does not leak to appB', async () => {
    class RequestState {}
    const STATE_TOKEN = createToken<RequestState>('REQUEST_STATE');

    const appA = await MokeFactory.createApplicationContext({
      providers: [{ provide: STATE_TOKEN, useClass: RequestState, scope: 'scoped' }]
    } as any);

    const appB = await MokeFactory.createApplicationContext({
      providers: [{ provide: STATE_TOKEN, useClass: RequestState, scope: 'scoped' }]
    } as any);

    const childA = appA.container.createChild();
    const childB = appB.container.createChild();

    const reqA1 = childA.resolve(STATE_TOKEN);
    const reqA2 = childA.resolve(STATE_TOKEN);
    const reqB1 = childB.resolve(STATE_TOKEN);

    expect(reqA1).to.equal(reqA2);
    expect(reqA1).to.not.equal(reqB1);
  });
});
