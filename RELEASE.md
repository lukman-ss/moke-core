# Release & Publishing

`@lukman-ss/moke-core` is published using **npm Trusted Publishing (OIDC)** via GitHub Actions.

## Configuration Details
- **GitHub User/Org**: `lukman-ss`
- **Repository**: `moke-core`
- **Workflow**: `publish.yml`
- **Allowed Action**: `npm publish`

No long-lived `NPM_TOKEN` is required or stored in this repository.

## Publishing Steps
1. Create a GitHub Release with a tag matching the `version` in `package.json` (e.g. `v0.1.3`).
2. The `publish.yml` GitHub Action will automatically:
   - Validate version match.
   - Run tests and typechecks.
   - Request short-lived OIDC token.
   - Publish to npm registry.