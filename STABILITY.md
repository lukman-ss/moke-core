# Public API Stability Matrix

Moke Core is currently in **0.x alpha**. We do not guarantee semver stability until 1.0.0. However, some APIs are closer to their final form than others.

| API | Type | Status | Notes |
|---|---|---|---|
| `Container` | Class | Stable-ish | Core DI semantics are solid. |
| `createToken` | Function | Stable-ish | Will remain the primary way to define injection tokens. |
| `Inject` | Decorator | Stable-ish | Core metadata approach is stable. |
| `Injectable` | Decorator | Stable-ish | Core metadata approach is stable. |
| `Module` | Decorator | Experimental | Flattened graph might evolve into encapsulated child containers. |
| `MokeApplicationContext` | Class | Experimental | Lifecycle and init sequence might change based on moke-http needs. |
| `MokeFactory` | Class | Experimental | API for bootstrapping modules may evolve. |
| `ServiceProvider` | Abstract Class | Experimental | Legacy concept. Being evaluated vs `@Module` + Lifecycle hooks. |
| `OnModuleInit` | Interface | Stable-ish | Standard lifecycle hook. |
| `OnApplicationBootstrap` | Interface | Stable-ish | Standard lifecycle hook. |
| `OnModuleDestroy` | Interface | Stable-ish | Standard lifecycle hook. |
| `OnApplicationShutdown` | Interface | Stable-ish | Standard lifecycle hook. |
| `Logger` | Interface | Stable-ish | Standard logging contract. |
| `ConsoleLogger` | Class | Stable-ish | Default logger implementation. |
| Error Classes | Classes | Stable-ish | Error hierarchy and semantics are well-defined. |

## Why no strict semver for 0.x?

As moke-http and other packages are built, the core requirements will be battle-tested. We will perform breaking cleanups as needed during the 0.x phase to ensure the architecture is clean and robust for 1.0.0. Do not expect backwards compatibility during 0.x if an API is deemed a poor design fit for the framework's goals.
