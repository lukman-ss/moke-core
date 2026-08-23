import { expect } from 'chai';
import { Container } from '../../src/container.js';
import { createToken } from '../../src/types.js';
import { InvalidProviderError, DuplicateProviderError } from '../../src/errors.js';

describe('Container - Diagnostics', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
  });

  it('should throw InvalidProviderError on malformed provider', () => {
    expect(() => container.bind('token', {} as any)).to.throw(InvalidProviderError);
  });

  it('should throw InvalidProviderError if bind token mismatch', () => {
    const T1 = createToken('T1');
    const T2 = createToken('T2');
    expect(() => container.bind(T1, { provide: T2, useValue: 'val' })).to.throw(InvalidProviderError);
  });

  it('should support register()', () => {
    const T1 = createToken<string>('T1');
    container.register({ provide: T1, useValue: 'value1' });
    expect(container.resolve(T1)).to.equal('value1');
  });

  it('should throw if register() missing provide', () => {
    expect(() => container.register({ useValue: 'val' } as any)).to.throw(InvalidProviderError);
  });

  it('should throw DuplicateProviderError on double bind()', () => {
    class Service {}
    container.singleton(Service);
    expect(() => container.singleton(Service)).to.throw(DuplicateProviderError);
  });

  it('should allow override()', () => {
    class Service {}
    container.singleton(Service);
    
    const original = container.resolve(Service);
    container.override(Service, { useValue: 'replaced' });
    const replaced = container.resolve(Service);
    
    expect(original).to.not.equal(replaced);
  });

  it('should hasOwn() distinguish parent vs child registrations', () => {
    class Service {}
    container.singleton(Service);
    const child = container.createChild();
    class ServiceB {}
    child.singleton(ServiceB);

    expect(child.hasOwn(ServiceB)).to.be.true;
    expect(container.hasOwn(ServiceB)).to.be.false;
  });
});
