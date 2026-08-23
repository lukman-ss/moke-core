# Release Process

This document describes the exact release process for moke-core.

## Prerequisites

- Ensure all changes are merged to `main` branch
- Ensure CI passes on `main`
- Ensure `npm pack --dry-run` succeeds

## Release Steps

Execute the following steps manually or via script:

### 1. Checkout main
```bash
git checkout main
```

### 2. Pull latest
```bash
git pull origin main
```

### 3. Run quality gate
```bash
npm ci
npm run typecheck
npm test
```

### 4. Bump version
```bash
npm version patch  # or minor or major
```

### 5. Commit version bump
```bash
git add package.json package-lock.json
git commit -m "chore: bump version to v0.1.x"
```

### 6. Create tag
```bash
git tag v0.1.x
```

### 7. Push
```bash
git push origin main
git push origin v0.1.x
```

### 8. Create GitHub Release
- Go to https://github.com/lukman-ss/moke-core/releases/new
- Select the tag `v0.1.x`
- Add release notes
- Publish release

### 9. Verify npm
```bash
npm pack --dry-run
```

Verify package contents are correct (see Package Tarball Audit below).

## Using the Release Script

```bash
./scripts/release.sh patch
```

This script will perform all steps automatically except creating the GitHub release.

## Quality Gates

Every release must pass:

1. TypeScript compilation (`npm run typecheck`)
2. All tests (`npm test`)
3. Build succeeds (`npm run build`)
4. Package validation (`npm pack --dry-run`)

## Package Tarball Audit

### Required Files

- `dist/` - Compiled TypeScript output
- `README.md` - Documentation
- `LICENSE` - MIT license file
- `package.json` - Package metadata

### Excluded Files

The following are intentionally excluded from the package:

- `test/` - Test files
- `examples/` - Example files
- `benchmarks/` - Benchmark scripts
- `src/` - Source TypeScript files
- `tsconfig*.json` - TypeScript configuration
- `.github/` - GitHub workflows
- `*.test.ts` - Test files
- `*.bench.ts` - Benchmark files

Verify with:
```bash
npm pack --dry-run
```

## Version Strategy

- **patch**: Bug fixes, non-breaking changes
- **minor**: New features, non-breaking
- **major**: Breaking changes

Follow [semantic versioning](https://semver.org/).

## Troubleshooting

### Tag version mismatch
If the tag version doesn't match package.json version:
1. Delete the tag: `git tag -d v0.1.x && git push origin :refs/tags/v0.1.x`
2. Recreate tag after fixing package.json

### Tests failing after version bump
- Check for TypeScript compilation errors
- Ensure no import side-effects
- Verify metadata symbol usage