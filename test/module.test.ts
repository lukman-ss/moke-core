import { expect } from 'chai';
import { Container } from '../src/container.js';
import { Module } from '../src/module.js';
import { MokeFactory } from '../src/application.js';
import { Injectable } from '../src/decorators.js';

describe('Module System', () => {

  it('compiles simple module with providers', async () => {
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

  it('compiles nested imports', async () => {
    class NestedService {}

    @Module({
      providers: [NestedService]
    })
    class NestedModule {}

    class RootService {}

    @Module({
      imports: [NestedModule],
      providers: [RootService]
    })
    class RootModule {}

    const app = await MokeFactory.createApplicationContext(RootModule);
    expect(app.get(NestedService)).to.be.instanceOf(NestedService);
    expect(app.get(RootService)).to.be.instanceOf(RootService);
  });

  it('detects circular module imports', async () => {
    // using function indirection to bypass temporal dead zone on cyclical decorators
    let BModuleRef: any;

    @Module({
      get imports() { return [BModuleRef]; }
    })
    class AModule {}

    @Module({
      imports: [AModule]
    })
    class BModule {}
    BModuleRef = BModule;

    try {
      await MokeFactory.createApplicationContext(AModule);
      expect.fail();
    } catch (e: any) {
      expect(e.name).to.equal('MokeCircularModuleError');
      expect(e.message).to.include('AModule -> BModule -> AModule');
    }
  });
});
