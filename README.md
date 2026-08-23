# Moke Core

The transport-agnostic Dependency Injection and Application Lifecycle foundation of the Moke web framework.

## What is Moke Core?

Moke Core provides a robust, strictly typed Inversion of Control (IoC) container designed for ESM. It manages dependency resolution, scopes, lifecycle hooks, and modular composition without tying you to any specific transport (like HTTP).

## Requirements

- **Node.js**: >= 22.14.0
- **Format**: ESM strictly. CommonJS is not supported.
- **TypeScript**: Experimental Decorators must be enabled.

## Installation

```bash
npm install @lukman-ss/moke-core
# or
pnpm add @lukman-ss/moke-core
# or
yarn add @lukman-ss/moke-core
# or
bun add @lukman-ss/moke-core
```

## TypeScript Configuration

Moke Core relies on `reflect-metadata` and experimental decorators. Ensure your `tsconfig.json` contains:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "module": "NodeNext",
    "moduleResolution": "NodeNext"
  }
}
```

## Dependency Injection

Moke Core uses class decorators and constructor injection to resolve dependencies automatically.

### @Injectable & @Inject

```typescript
import { Injectable, Inject, createToken } from '@lukman-ss/moke-core';

const CACHE = createToken<Cache>('CACHE');

@Injectable()
export class UserService {
  constructor(
    private readonly repo: UserRepository,      // Auto-inferred via reflection
    @Inject(CACHE) private readonly cache: Cache // Interface/Primitive overrides
  ) {}
}
```

## Container

The core container handles registrations and resolutions. 

```typescript
import { Container } from '@lukman-ss/moke-core';

const container = new Container();

container.bind(UserService, { useClass: UserService });
// Shorthands:
container.singleton(UserService);
container.transient(UserService);
container.instance(CONFIG_TOKEN, myConfig);
container.factory(RANDOM_TOKEN, () => Math.random(), 'transient');

const service = container.resolve(UserService);
```

### Asynchronous Resolution

Async providers are supported safely without corrupting synchronous APIs:

```typescript
container.factory(DB_TOKEN, async () => await connectDb());

// container.resolve(DB_TOKEN) // Throws AsyncProviderResolutionError

const db = await container.resolveAsync(DB_TOKEN);
```

## Providers

Moke supports four provider types:

- **ClassProvider**: `{ provide: Token, useClass: Constructor }`
- **ValueProvider**: `{ provide: Token, useValue: any }`
- **FactoryProvider**: `{ provide: Token, useFactory: (c: Container) => any }`
- **ExistingProvider (Alias)**: `{ provide: Token, useExisting: Token }`

## Scopes

- **singleton**: One instance across the entire application and all child scopes.
- **scoped**: One instance per Container instance (useful for request-scoped instances).
- **transient**: A new instance is created every time it is injected.

```typescript
const childScope = container.createChild();
const service = childScope.resolve(UserService);
```

## Application Context

`MokeApplicationContext` encapsulates the container and manages the application lifecycle.

```typescript
import { MokeFactory } from '@lukman-ss/moke-core';

const app = await MokeFactory.createApplicationContextAsync(AppModule);

const service = app.get(UserService);

// Start lifecycle hooks
await app.init();

// Graceful shutdown
await app.close();
```

### Lifecycle Hooks

Classes can implement lifecycle interfaces. They are executed deterministically:
- `OnModuleInit`
- `OnApplicationBootstrap`
- `OnModuleDestroy`
- `OnApplicationShutdown`

## Modules

Group features using the `@Module` decorator.

```typescript
import { Module } from '@lukman-ss/moke-core';

@Module({
  imports: [ConfigModule],
  providers: [UserService]
})
export class UserModule {}
```

## Package Architecture

```
moke-core (IoC, Lifecycle, Modules)
    ↑
moke-http (Router, Requests, Middleware)
    ↑
Application
```

## Stability

Moke Core is currently in `0.x`. Public APIs may evolve as the framework matures towards `1.0.0`.

## License

MIT
