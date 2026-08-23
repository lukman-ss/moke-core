import { expect } from 'chai';
import { MokeFactory, createToken } from '@lukman-ss/moke-core';
import { Injectable } from '@lukman-ss/moke-core';

describe('Application - Get & GetAsync', () => {
  it('should resolve dependency via get()', async () => {
    class Service {}
    
    const app = await MokeFactory.createApplicationContext({ providers: [Service] } as any);
    
    const service = app.get(Service);
    expect(service).to.be.instanceOf(Service);
  });

  it('should resolve async dependency via getAsync()', async () => {
    const TOKEN = createToken('ASYNC_SERVICE');
    
    const app = await MokeFactory.createApplicationContext({
      providers: [{
        provide: TOKEN,
        useFactory: async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return 'async-value';
        }
      }]
    } as any);
    
    await app.init();
    
    const value = await app.resolveAsync(TOKEN);
    expect(value).to.equal('async-value');
  });

  it('should resolve dependency via resolve() alias', async () => {
    class Service {}
    
    const app = await MokeFactory.createApplicationContext({ providers: [Service] } as any);
    await app.init();
    
    const service = app.resolve(Service);
    expect(service).to.be.instanceOf(Service);
  });
});
