import { expect } from 'chai';
import { MokeFactory } from '@lukman-ss/moke-core';
import { Module } from '@lukman-ss/moke-core';
import { Injectable } from '@lukman-ss/moke-core';

describe('Module - Providers', () => {
  it('should compile simple module with providers', async () => {
    class ServiceA {}
    class ServiceB {}

    @Module({
      providers: [ServiceA, ServiceB]
    })
    class MyModule {}

    const app = await MokeFactory.createApplicationContext(MyModule);
    expect(app.get(ServiceA)).to.be.instanceOf(ServiceA);
    expect(app.get(ServiceB)).to.be.instanceOf(ServiceB);
  });

  it('should handle mixed provider definitions', async () => {
    class ServiceA {}
    const SERVICE_B_TOKEN = Symbol('SERVICE_B');
    
    @Module({
      providers: [
        ServiceA,
        { provide: SERVICE_B_TOKEN, useValue: 'service-b-value' },
        { provide: 'FACTORY', useFactory: () => 'factory-value' }
      ]
    })
    class MyModule {}

    const app = await MokeFactory.createApplicationContext(MyModule);
    expect(app.get(ServiceA)).to.be.instanceOf(ServiceA);
    expect(app.get(SERVICE_B_TOKEN)).to.equal('service-b-value');
    expect(app.get('FACTORY')).to.equal('factory-value');
  });

  it('should handle async providers in modules', async () => {
    const ASYNC_TOKEN = Symbol('ASYNC_TOKEN');
    
    @Module({
      providers: [{
        provide: ASYNC_TOKEN,
        useFactory: async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return 'async-value';
        }
      }]
    })
    class AsyncModule {}

    const app = await MokeFactory.createApplicationContext(AsyncModule);
    const value = await app.getAsync(ASYNC_TOKEN);
    expect(value).to.equal('async-value');
  });
});
