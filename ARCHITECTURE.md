# Architecture

## Overview

Moke Core is the foundation layer of the Moke web framework. It provides transport-agnostic dependency injection, application lifecycle management, and modular composition.

## Responsibilities

### In Scope

- Inversion of Control (IoC) container with class/constructor injection
- Three provider scopes: `singleton`, `scoped`, `transient`
- Parent/child container hierarchy for scope isolation
- Application lifecycle: `create` → `initializing` → `ready` → `closing` → `closed`
- Module system with `@Module` decorator and import graph
- Async provider resolution with promise caching
- Override support for testing and environment injection
- Error handling and diagnostics

### Out of Scope

- HTTP routing, middleware, or request/response models
- Database drivers, connection pooling, or query builders
- Template engines, static file serving, or WebSocket support
- CLI tools or project scaffolding

These belong to `moke-http` or other packages.

## Container Ownership

The container is the single source of truth for:

- Provider registrations
- Scoped instance caches
- Singleton instances
- Frozen state (post-init)

`MokeApplicationContext` owns one root `Container`. Child containers are created transiently (e.g., per request) and inherit parent registrations but maintain isolated scoped instances.

## Provider Scopes

| Scope | Lifetime | Instance per Request | Instance per App |
|-------|----------|---------------------|-------------------|
| `singleton` | Application | Shared | Single |
| `scoped` | Container (child) | Unique | N/A |
| `transient` | Every resolve | New | New |

`instance()` registers a pre-created value as `singleton`. `factory()` registers a factory function, defaulting to `singleton` scope.

## Resolution Lifecycle

1. `resolve(token)` or `resolveAsync(token)` is called
2. Container looks up registration by token
3. If not found locally, checks parent recursively
4. If token is a class and unregistered anywhere, auto-registers as `singleton`
5. Checks `design:paramtypes` and `@Inject` metadata for constructor dependencies
6. Resolves each dependency recursively
7. Detects circular dependencies via path tracking
8. Instantiates class or returns value/factory result
9. Caches instance according to scope (`singleton` and `scoped` only)

### Synchronous vs Asynchronous

- `resolve()`: Synchronous. Throws `AsyncProviderResolutionError` if provider uses async factory.
- `resolveAsync()`: Asynchronous. Caches in-flight promises to prevent duplicate instantiation.

## Parent/Child Container

`createChild()` creates a new `Container` with a reference to its parent.

**Resolution**:
- Child inherits all parent registrations
- Singleton resolves from parent (shared instance)
- Scoped resolves to local cache (new instance per child)
- Transient resolves locally (new instance always)

**Registration**:
- Child can register new providers
- Child can `override()` parent providers without mutation
- Changes in child do not affect parent

**Use case**: HTTP request scoping. The application container holds singletons (`HttpServer`, `DatabasePool`). Each request creates a child container that holds scoped services (`RequestContext`, `HttpRequest`, `Response`, `Controller`, `UnitOfWork`).

## Module Graph

The `@Module` decorator defines:

```typescript
@Module({
  imports: [ConfigModule, DatabaseModule],
  providers: [UserService],
  controllers: [UserController],
  exports: [UserService]
})
export class UserModule {}
```

`MokeFactory.createApplicationContext()` compiles the module tree:

1. Detects circular imports and throws `MokeCircularModuleError`
2. Traverses `imports` recursively
3. Registers `providers` and `controllers` as `singleton` (unless already bound)
4. Registers module class itself as `singleton`
5. Resolves the root module to trigger graph instantiation
6. Freezes container to prevent post-init registration

### Current Module Model

The current implementation uses a flattened global model. All providers from all imported modules register on the same root container. `exports` are globally available. This is intentional for simplicity.

Future versions may support an encapsulated model where each module gets its own child container.

## Application Lifecycle

```
created → initializing → ready → closing → closed
```

| State | Transitions | Capabilities |
|-------|-------------|--------------|
| `created` | → `initializing` (via `init()`) | Register providers |
| `initializing` | → `ready` (via `init()`) | Read-only |
| `ready` | → `closing` (via `close()`) | Read-only |
| `closing` | → `closed` (via `close()`) | Read-only |
| `closed` | Terminal | None |

**Init sequence**:
1. `_initImpl()` runs
2. Calls `onModuleInit()` on all instantiated instances
3. Calls `onApplicationBootstrap()` on all instantiated instances
4. `initPromise` caches concurrent `init()` calls
5. Container freezes on success
6. Reverts to `created` on failure

**Close sequence**:
1. Calls `onApplicationShutdown()` on instances (reverse order)
2. Calls `onModuleDestroy()` on instances (reverse order)
3. Calls `container.dispose()`
4. Transitions to `closed`
5. Aggregates errors into `MokeShutdownError`

## Shutdown Semantics

- Shutdown is **idempotent**: calling `close()` multiple times is safe
- Errors during shutdown are collected, not thrown immediately
- All registered instances receive shutdown hooks even if earlier hooks fail
- Container is disposed (registrations and instances cleared) after hooks complete
- Once `closed`, the application cannot be re-initialized

## Package Boundaries

```
┌─────────────────────────────────────────┐
│           Application Layer             │
│   (Your code using Moke framework)      │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│         moke-http (future)              │
│   - HTTP server wrapper                 │
│   - Router, Middleware, Request/Response│
│   - Controllers with HTTP lifecycle     │
└──────────────┬──────────────────────────┘
               │ imports
┌──────────────▼──────────────────────────┐
│         moke-core (this package)        │
│   - IoC Container                       │
│   - Dependency Injection                │
│   - Scopes (singleton/scoped/transient) │
│   - Application lifecycle               │
│   - Module system                       │
└─────────────────────────────────────────┘
```

### Core Stability Guarantees

moke-core promises:

- Container semantics are stable across 0.x (scoped isolation works correctly)
- Public API surface documented in README is the contract moke-http will use
- Override mechanism supports test injection without core changes
- Child containers work correctly for request scoping

moke-http must:

- Use `container.createChild()` per request
- Register HTTP types (`Request`, `Response`, `Controller`) as `scoped`
- Use `container.override()` for test fakes
- Not require core redesign to express HTTP dependency graph

## Decision Log

- **Flattened module model**: Chose simplicity over encapsulation for 0.x
- **No service locator pattern**: Container only passed to factories via `Resolver`
- **Sync-first resolution**: `resolve()` is sync-only; async requires `resolveAsync()`
- **Frozen container post-init**: Prevents runtime registration errors
- **Three scopes only**: Sufficient for all known use cases
