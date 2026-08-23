import { expect } from 'chai';
import { Container } from '../src/container.js';
import { createToken } from '../src/types.js';
import { DuplicateProviderError } from '../src/errors.js';

describe('Duplicate Bindings', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
  });

  it('should throw DuplicateProviderError on double bind()', () => {
    const TOKEN = createToken('T1');
    container.bind(TOKEN, { useValue: 1 });
    expect(() => container.bind(TOKEN, { useValue: 2 })).to.throw(DuplicateProviderError);
  });

  it('should allow override()', () => {
    const TOKEN = createToken('T1');
    container.bind(TOKEN, { useValue: 1 });
    container.override(TOKEN, { useValue: 2 });
    expect(container.resolve(TOKEN)).to.equal(2);
  });

  it('hasOwn should distinguish parent vs child registrations', () => {
    const TOKEN = createToken('T1');
    container.instance(TOKEN, 1);
    
    const child = container.createChild();
    
    expect(container.hasOwn(TOKEN)).to.be.true;
    expect(child.hasOwn(TOKEN)).to.be.false;
    expect(child.has(TOKEN)).to.be.true; // Inherited
  });
});
