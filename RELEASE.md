# Release Notes

## v0.2.0

This release marks a significant milestone for Moke Core. The architecture has been refined and audited to ensure it is robust enough to serve as the foundation for the upcoming `moke-http` package.

### 💥 Breaking Changes

- **Removed `MokeFactory.create()` and `MokeFactory.createAsync()`**: These methods bypassed the module traversal and lifecycle hooks. Use `MokeFactory.createApplicationContext()` instead.
- **Removed `MokeApplicationContext.resolve()` and `resolveAsync()`**: These aliases have been removed to clarify the API. Use `get()` and `getAsync()` instead.
- **Removed `MokeLogger`**: The class has been renamed to `ConsoleLogger` to clearly indicate its implementation.
- **Removed Default `init()` Execution**: `MokeFactory.createApplicationContext()` no longer calls `init()` automatically. You must call `await app.init()` manually. This allows you to register `ServiceProviders` or test overrides before initialization.

### ✨ Features

- **Test Overrides**: Added `container.override(Token, Provider)` API to safely swap implementations during integration testing.
- **`moke-http` Readiness**: Core semantics have been thoroughly audited and proven against simulated HTTP dependency graphs (Singleton `HttpServer`, Scoped `RequestContext`, `Controller`).
- **Child Container Improvements**: Fixed a bug where child containers could accidentally mutate the parent container's registrations when overriding.

### 🐛 Bug Fixes

- Fixed `override()` allowing modifications on a frozen container. It now correctly throws if `app.init()` has already completed.
- Fixed async lifecycle hooks occasionally causing race conditions during simultaneous `app.init()` calls.

### 🏗️ Architecture

- Added `ARCHITECTURE.md` to document the internal ownership, lifecycle, module graph, and provider scopes.
- Added `STABILITY.md` to explicitly state the public API stability matrix during the `0.x` phase.
