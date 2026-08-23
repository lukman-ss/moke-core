import { expect } from 'chai';
import {
  Container,
  createToken,
  Inject,
  Injectable,
  Module,
  MokeFactory,
  MokeApplicationContext,
  ConsoleLogger,
  MokeError,
  UnknownProviderError,
  CircularDependencyError,
  DuplicateProviderError,
  InvalidProviderError,
  AsyncProviderResolutionError,
  PrimitiveDependencyError,
  DependencyResolutionError,
  MokeBootstrapError,
  MokeShutdownError,
  MokeCircularModuleError,
  ServiceProvider,
} from '../src/index.js';

import type {
  OnModuleInit,
  OnApplicationBootstrap,
  OnModuleDestroy,
  OnApplicationShutdown,
  Provider,
  ClassProvider,
  ValueProvider,
  FactoryProvider,
  ExistingProvider,
  Scope,
  Resolver,
  Token,
  Constructor,
  InjectionToken,
  ProviderDefinition,
} from '../src/index.js';

describe('Public API Compile Test', () => {
  it('should export Container', () => {
    expect(Container).to.be.a('function');
  });

  it('should export createToken', () => {
    expect(createToken).to.be.a('function');
  });

  it('should export Inject and Injectable decorators', () => {
    expect(Inject).to.be.a('function');
    expect(Injectable).to.be.a('function');
  });

  it('should export Module decorator', () => {
    expect(Module).to.be.a('function');
  });

  it('should export MokeFactory and MokeApplicationContext', () => {
    expect(MokeFactory).to.be.a('function');
    expect(MokeApplicationContext).to.be.a('function');
  });

  it('should export ConsoleLogger', () => {
    expect(ConsoleLogger).to.be.a('function');
  });

  it('should export all error classes', () => {
    expect(MokeError).to.be.a('function');
    expect(UnknownProviderError).to.be.a('function');
    expect(CircularDependencyError).to.be.a('function');
    expect(DuplicateProviderError).to.be.a('function');
    expect(InvalidProviderError).to.be.a('function');
    expect(AsyncProviderResolutionError).to.be.a('function');
    expect(PrimitiveDependencyError).to.be.a('function');
    expect(DependencyResolutionError).to.be.a('function');
    expect(MokeBootstrapError).to.be.a('function');
    expect(MokeShutdownError).to.be.a('function');
    expect(MokeCircularModuleError).to.be.a('function');
  });

  it('should export ServiceProvider', () => {
    expect(ServiceProvider).to.be.a('function');
  });

  it('should compile with type-only exports available', () => {
    const scope: Scope = 'singleton';
    const token: Token<string> = createToken('test');
    const ctor: Constructor<unknown> = class {};
    const inj: InjectionToken<string> = token;
    const def: ProviderDefinition = ctor;

    expect(scope).to.equal('singleton');
    expect(token).to.not.be.undefined;
    expect(ctor).to.be.a('function');
    expect(inj).to.not.be.undefined;
    expect(def).to.not.be.undefined;
  });
});
