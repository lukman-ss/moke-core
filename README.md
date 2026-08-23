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

## Quick Start

```typescript
import { Injectable, MokeFactory } from '@lukman-ss/moke-core';

@Injectable()
class Logger {
  log(message: string) {
    console.log(`[LOG]: ${message}`);
  }
}

@Injectable()
class UserService {
  constructor(private logger: Logger) {}

  async create() {
    this.logger.log('Creating user...');
  }
}

const app = await MokeFactory.createApplicationContext(UserService);
await app.init();

const service = app.get(UserService);
await service.create();

await app.close();
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

## Tokens

For interfaces, primitives, or values that cannot be inferred via reflection:

```typescript
import { createToken } from '@lukman-ss/moke-core';

const PORT = createToken<number>('PORT');
const DATABASE_URL = createToken<string>('DATABASE_URL');

@Injectable()
class Database {
  constructor(@Inject(DATABASE_URL) private url: string) {}
}
```

## Provider Types

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
container.singleton(DatabasePool);
container.scoped(RequestContext);
container.transient(Logger);

const childScope = container.createChild();
const service = childScope.resolve(UserService);
```

### Async Providers

Async providers are supported safely without corrupting synchronous APIs:

```typescript
container.factory(DB_TOKEN, async () => await connectDb());

// container.resolve(DB_TOKEN) // Throws AsyncProviderResolutionError

const db = await container.resolveAsync(DB_TOKEN);
```

## Child Containers

Use `createChild()` to create isolated scopes:

```typescript
const requestScope = app.container.createChild();
const user = requestScope.resolve(CurrentUser);
const unitOfWork = requestScope.resolve(RequestUnitOfWork);
```

## Modules

Group features using the `@Module` decorator.

```typescript
import { Module } from '@lukman-ss/moke-core';

@Module({
  imports: [ConfigModule],
  providers: [UserService, UserRepository]
})
export class UserModule {}
```

## Application Context

`MokeApplicationContext` encapsulates the container and manages the application lifecycle.

```typescript
import { MokeFactory } from '@lukman-ss/moke-core';

const app = await MokeFactory.createApplicationContext(AppModule);

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

```typescript
import { OnModuleInit, OnApplicationBootstrap } from '@lukman-ss/moke-core';

@Injectable()
class DatabaseService implements OnModuleInit, OnApplicationBootstrap {
  async onModuleInit() {
    // Called during app.init()
    await this.connect();
  }

  async onApplicationBootstrap() {
    // Called after onModuleInit for all modules
  }
}
```

## Errors

Moke throws specific error types:

- `UnknownProviderError`: Token not found
- `CircularDependencyError`: Circular dependency detected
- `AsyncProviderResolutionError`: Sync resolve on async provider
- `DependencyResolutionError`: General resolution failure
- `MokeShutdownError`: Aggregated shutdown errors
- `DuplicateProviderError`: Duplicate provider registration
- `InvalidProviderError`: Invalid provider definition
- `PrimitiveDependencyError`: Cannot infer primitive dependency
- `MokeCircularModuleError`: Circular module imports

## Testing

### Override Providers for Testing

```typescript
import { createToken } from '@lukman-ss/moke-core';

const DATABASE = createToken('DATABASE');

// Production implementation
container.singleton(DATABASE, RealDatabase);

// Test override
container.override(DATABASE, FakeDatabase);

const service = container.resolve(UserService);
// Uses FakeDatabase instead of RealDatabase
```

### Integration Testing Pattern

```typescript
import { MokeFactory } from '@lukman-ss/moke-core';
import { describe, it, beforeEach } from 'mocha';

describe('UserService Integration', () => {
  let app: MokeApplicationContext;
  
  beforeEach(async () => {
    const appContext = await MokeFactory.createApplicationContext(AppModule);
    
    // Override production DB with in-memory fake
    appContext.container.override(DATABASE, InMemoryDatabase);
    
    await appContext.init();
    app = appContext;
  });

  it('creates user', async () => {
    const service = app.get(UserService);
    await service.create({ name: 'Alice' });
  });

  afterEach(async () => {
    await app.close();
  });
});
```

## Package Status

| Package | Version | Status |
|---------|---------|--------|
| `@lukman-ss/moke-core` | 0.1.16 | Alpha |
| `@lukman-ss/moke-http` | — | Not yet released |

### 0.x Stability

Moke Core is in **0.x alpha**. Public APIs may evolve before 1.0.0. We follow semantic versioning with awareness of early-stage instability.

## Architecture

See `ARCHITECTURE.md` for detailed design documentation.

## License

MIT
