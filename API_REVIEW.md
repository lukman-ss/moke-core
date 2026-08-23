# API Naming Review

## Container API

| Method | Purpose | Status |
|--------|---------|--------|
| `bind(token, providerDef)` | Register with explicit provider | ✅ Clear |
| `register(provider)` | Register {provide, ...} object | ✅ Clear |
| `singleton(token)` | Register as singleton | ✅ Clear |
| `scoped(token)` | Register as scoped | ✅ Clear |
| `transient(token)` | Register as transient | ✅ Clear |
| `instance(token, value)` | Register pre-created value | ✅ Clear |
| `factory(token, factory)` | Register with factory function | ✅ Clear |
| `override(token, providerDef)` | Replace existing registration | ✅ Clear |
| `resolve<T>(token)` | Resolve dependency (sync) | ✅ Clear |
| `resolveAsync<T>(token)` | Resolve dependency (async) | ⚠️ Consider alias `getAsync` for consistency |

## Application API

| Method | Purpose | Status |
|--------|---------|--------|
| `get<T>(token)` | Resolve dependency | ✅ Clear |
| `resolve<T>(token)` | Alias of `get()` | ❌ **DUPPLICATE** |
| `resolveAsync<T>(token)` | Resolve async dependency | ✅ Clear |
| `register(token, providerDef)` | Register before init | ✅ Clear |
| `init()` | Start lifecycle hooks | ✅ Clear |
| `close(signal?)` | Clean shutdown | ✅ Clear |
| `state` | Current app state | ✅ Clear |

## Issues Found

### Issue 1: Duplicate `resolve()` and `get()` on Application

**Problem:**
- `MokeApplicationContext.get()` and `.resolve()` are identical
- Two names for the same operation

**Solution:**
- Keep `get()` as primary API (shorter, more intuitive)
- Mark `resolve()` as deprecated alias
- Add `getAsync()` as alias for `resolveAsync()` for consistency

### Issue 2: Missing `getAsync()` on Application

**Problem:**
- Container has `resolveAsync()` 
- Application has `resolveAsync()` but no `getAsync()`
- Inconsistent with `get()` vs `resolve()`

**Solution:**
- Add `getAsync<T>()` method to Application
- Keep `resolveAsync()` as primary implementation
- `getAsync` delegates to `resolveAsync`

## Recommended Changes

```typescript
// In MokeApplicationContext:

// Primary API
get<T>(token: Token<T>): T;
getAsync<T>(token: Token<T>): Promise<T>;

// Deprecated aliases (marked with JSDoc @deprecated)
/** @deprecated Use get() instead */
resolve<T>(token: Token<T>): T;
/** @deprecated Use getAsync() instead */
resolveAsync<T>(token: Token<T>): Promise<T>;
```

This ensures:
1. No duplicate functionality with confusing naming
2. Consistent get/getAsync pattern
3. Backward compatibility with deprecated aliases
4. Clear migration path for consumers