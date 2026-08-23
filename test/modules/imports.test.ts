import { expect } from 'chai';
import { MokeFactory } from '../../src/index.js';
import { Module } from '../../src/index.js';
import { Injectable } from '../../src/index.js';

describe('Module - Imports', () => {
  it('should import providers from another module', async () => {
    class ImportedService {}

    @Module({
      providers: [ImportedService]
    })
    class ImportedModule {}

    @Module({
      imports: [ImportedModule]
    })
    class RootModule {}

    const app = await MokeFactory.createApplicationContext(RootModule);
    expect(app.get(ImportedService)).to.be.instanceOf(ImportedService);
  });

  it('should support nested imports', async () => {
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

  it('should handle circular module imports', async () => {
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
      expect(e.message).to.include('AModule');
      expect(e.message).to.include('BModule');
    }
  });

  it('should share singleton providers across imports', async () => {
    let instanceCount = 0;
    
    class SharedService {
      constructor() {
        instanceCount++;
      }
    }

    @Module({
      providers: [SharedService]
    })
    class SharedModule {}

    @Module({
      imports: [SharedModule]
    })
    class ImporterModule1 {}

    @Module({
      imports: [SharedModule]
    })
    class ImporterModule2 {}

    @Module({
      imports: [ImporterModule1, ImporterModule2]
    })
    class RootModule {}

    const app = await MokeFactory.createApplicationContext(RootModule);
    app.get(SharedService); // trigger instantiation
    expect(instanceCount).to.equal(1);
  });

  it('should handle shared imported module', async () => {
    const SHARED_TOKEN = Symbol('SHARED');
    
    @Module({
      providers: [{ provide: SHARED_TOKEN, useValue: 'shared' }]
    })
    class SharedModule {}

    @Module({
      imports: [SharedModule]
    })
    class Module1 {}

    @Module({
      imports: [SharedModule]
    })
    class Module2 {}

    @Module({ imports: [Module1, Module2] })
    class RootModule {}
    const app = await MokeFactory.createApplicationContext(RootModule);
    expect(app.get(SHARED_TOKEN)).to.equal('shared');
  });
});
