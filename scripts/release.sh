#!/bin/bash
set -e

# Release script for moke-core
# Usage: ./scripts/release.sh [patch|minor|major]

TYPE=${1:-patch}

echo "=== Starting Release Process ==="

# 1. Ensure we're on main branch
echo "Checking branch..."
git branch --show-current | grep -q "main" || { echo "Error: Must be on main branch"; exit 1; }

# 2. Pull latest changes
echo "Pulling latest changes..."
git pull origin main

# 3. Install dependencies and run quality gate
echo "Running quality gate..."
npm ci
npm run typecheck
npm test

# 4. Bump version
echo "Bumping version ($TYPE)..."
npm version $TYPE --no-git-tag-version

# 5. Commit version bump
NEW_VERSION=$(node -p "require('./package.json').version")
git add package.json package-lock.json
git commit -m "chore: bump version to v$NEW_VERSION"

# 6. Create and push tag
TAG="v$NEW_VERSION"
echo "Creating tag $TAG..."
git tag $TAG
git push origin main
git push origin $TAG

# 7. Build
echo "Building..."
npm run build

# 8. Verify package
echo "Verifying package..."
npm pack --dry-run

echo "=== Release Complete ==="
echo "Tag: $TAG"
echo ""
echo "Next steps:"
echo "1. Create GitHub Release for $TAG"
echo "2. Verify npm publish at https://www.npmjs.com/package/@lukman-ss/moke-core"