import { expect } from 'chai';
import { MokeFactory, createToken, Module } from '../../src/index.js';
import { Injectable } from '../../src/index.js';

describe('Application - Get & GetAsync', () => {
  it('should resolve dependency via get()', async () => {
    class Service {}
    
    @Module({ providers: [Service] })
    class AppModule {}
    
    const app = await MokeFactory.createApplicationContext(AppModule);
    
    const service = app.get(Service);
    expect(service).to.be.instanceOf(Service);
  });

  it('should resolve async dependency via getAsync()', async () => {
    const TOKEN = createToken('ASYNC_SERVICE');
    
    @Module({
      providers: [{
        provide: TOKEN,
        useFactory: async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return 'async-value';
        }
      }]
    })
    class AppModule {}

    const app = await MokeFactory.createApplicationContext(AppModule);
    await app.init();
    
    const value = await app.getAsync(TOKEN);
    expect(value).to.equal('async-value');
  });
});
