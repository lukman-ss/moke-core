import { expect } from 'chai';
import { Container } from '../src/container.js';
import { DependencyResolutionError } from '../src/errors.js';
import { Injectable, Inject } from '../src/decorators.js';
import { createToken } from '../src/types.js';

describe('Primitive Dependencies Diagnostics', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
  });

  it('should throw DependencyResolutionError if String is inferred', () => {
    @Injectable()
    class BadService {
      constructor(public val: string) {}
    }

    container.transient(BadService);
    expect(() => container.resolve(BadService)).to.throw(DependencyResolutionError, /Moke cannot infer dependency for parameter #0 of BadService/);
  });

  it('should throw DependencyResolutionError if Number is inferred', () => {
    @Injectable()
    class BadService {
      constructor(public config: number) {}
    }

    container.transient(BadService);
    expect(() => container.resolve(BadService)).to.throw(DependencyResolutionError);
  });

  it('should succeed if primitive is explicitly injected', () => {
    const STR_TOKEN = createToken<string>('STR');
    container.instance(STR_TOKEN, 'explicit-string');

    @Injectable()
    class GoodService {
      constructor(@Inject(STR_TOKEN) public val: string) {}
    }

    container.transient(GoodService);
    const instance = container.resolve(GoodService);
    expect(instance.val).to.equal('explicit-string');
  });
});
