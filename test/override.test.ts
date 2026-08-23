import { expect } from 'chai';
import { Container } from '../src/container.js';
import { createToken } from '../src/types.js';

describe('Override', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
  });

  it('should clean up old singleton and resolve new provider synchronously', () => {
    class A { val = 1; }
    class B { val = 2; }
    
    const TOKEN = createToken<{ val: number }>('TOKEN');

    container.singleton(TOKEN, A);
    
    const first = container.resolve(TOKEN);
    expect(first.val).to.equal(1);

    container.override(TOKEN, B);

    const second = container.resolve(TOKEN);
    expect(second.val).to.equal(2);
  });

  it('should clean up old async singleton and resolve new provider asynchronously', async () => {
    class A { val = 1; }
    class B { val = 2; }
    
    const TOKEN = createToken<{ val: number }>('TOKEN_ASYNC');

    container.factory(TOKEN, async () => new A(), 'singleton');
    
    const first = await container.resolveAsync(TOKEN);
    expect(first.val).to.equal(1);

    container.override(TOKEN, { useFactory: async () => new B() }, 'singleton');

    const second = await container.resolveAsync(TOKEN);
    expect(second.val).to.equal(2);
  });
});
