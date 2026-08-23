import { expect } from 'chai';
import { MokeFactory, createToken } from '@lukman-ss/moke-core';
import { Module } from '@lukman-ss/moke-core';

describe('Module - Duplicates & Visibility', () => {
  it('should detect duplicate module import', async () => {
    class Service {}

    @Module({
      providers: [Service]
    })
    class DuplicateModule {}

    @Module({
      imports: [DuplicateModule, DuplicateModule]
    })
    class RootModule {}

    try {
      await MokeFactory.createApplicationContext(RootModule);
      expect.fail();
    } catch (e: any) {
      expect(e.name).to.include('Moke');
    }
  });

  it('should handle duplicate provider in imports', async () => {
    const SHARED_TOKEN = createToken<string>('SHARED');

    @Module({
      providers: [{ provide: SHARED_TOKEN, useValue: 'from-module' }]
    })
    class SharedModule {}

    @Module({
      imports: [SharedModule],
      providers: [{ provide: SHARED_TOKEN, useValue: 'from-root' }]
    })
    class RootModule {}

    const app = await MokeFactory.createApplicationContext(RootModule);
    
    expect(app.get(SHARED_TOKEN)).to.equal('from-root');
  });

  it('should respect provider visibility', async () => {
    class InternalService {}
    const PUBLIC_TOKEN = Symbol('PUBLIC');
    
    @Module({
      providers: [
        InternalService,
        { provide: PUBLIC_TOKEN, useValue: 'public' }
      ]
    })
    class InternalModule {}

    const app = await MokeFactory.createApplicationContext(InternalModule);
    
    expect(app.get(PUBLIC_TOKEN)).to.equal('public');
    expect(() => app.get(InternalService)).to.throw();
  });
});
