import { expect } from 'chai';

import {
  Container,
  createToken,
  Inject,
  Injectable,
  Module,
  MokeFactory,
  MokeApplicationContext,
  ApplicationState,
  ApplicationContext,
  Logger,
  MokeLogger,
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
  OnModuleInit,
  OnApplicationBootstrap,
  OnModuleDestroy,
  OnApplicationShutdown,
  OnModuleInitAsync,
  OnApplicationBootstrapAsync,
  OnModuleDestroyAsync,
  OnApplicationShutdownAsync,
  Provider,
  ProviderDefinition,
  ClassProvider,
  ValueProvider,
  FactoryProvider,
  ExistingProvider,
  Scope,
  Constructor,
  Token,
  InjectionToken,
  ServiceProvider,
  registerProvider,
  ReflectionHost,
} from '@lukman-ss/moke-core';

describe('Public API Compile Test', () => {
  it('should export Container', () => {
    expect(Container).to.be.a('function');
  });

  it('should export createToken', () => {
    expect(createToken).to.be.a('function');
    const token = createToken<string>('TEST');
    expect(token).to.have.property('key');
  });

  it('should export Inject decorator', () => {
    expect(Inject).to.be.a('function');
  });

  it('should export Injectable decorator', () => {
    expect(Injectable).to.be.a('function');
  });

  it('should export Module decorator', () => {
    expect(Module).to.be.a('function');
  });

  it('should export MokeFactory', () => {
    expect(MokeFactory).to.have.property('createApplicationContext');
  });

  it('should export ApplicationContext type', () => {
    expect(MokeApplicationContext).to.be.a('function');
  });

  it('should export ApplicationState enum-like', () => {
    const app = new Container();
    expect(app).to.be.instanceOf(Container);
  });

  it('should export Logger interface and MokeLogger', () => {
    expect(MokeLogger).to.be.a('function');
  });

  it('should export error classes', () => {
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

  it('should export lifecycle interfaces', () => {
    expect(OnModuleInit).to.be.a('symbol');
    expect(OnApplicationBootstrap).to.be.a('symbol');
    expect(OnModuleDestroy).to.be.a('symbol');
    expect(OnApplicationShutdown).to.be.a('symbol');
  });

  it('should export provider types', () => {
    expect(ServiceProvider).to.not.be.undefined;
  });

  it('should export registerProvider function', () => {
    expect(registerProvider).to.be.a('function');
  });

  it('should export ReflectionHost', () => {
    expect(ReflectionHost).to.not.be.undefined;
  });
});

describe('Public API Functional Test', () => {
  it('should compile and run a basic DI example', async () => {
    const CACHE = createToken<{ get: (key: string) => any }>('CACHE');

    @Injectable()
    class UserService {
      constructor(
        @Inject(CACHE) private readonly cache: { get: (key: string) => any }
      ) {}
    }

    const container = new Container();
    container.instance(CACHE, { get: (key: string) => `cached:${key}` });

    const service = container.resolve(UserService);
    expect(service).to.be.instanceOf(UserService);
    expect(service.cache.get('test')).to.equal('cached:test');
  });

  it('should compile and run a module example', async () => {
    @Injectable()
    class UserRepository {
      findAll() { return [{ id: 1, name: 'Test' }]; }
    }

    @Module({
      providers: [UserRepository]
    })
    class UserModule {}

    const app = await MokeFactory.createApplicationContext(UserModule);
    await app.init();
    
    const repo = app.get(UserRepository);
    const users = repo.findAll();
    expect(users).to.deep.equal([{ id: 1, name: 'Test' }]);
    
    await app.close();
  });
});
