# OnStarJS Setup Scripts

This directory contains utilities for setting up your OnStarJS environment, particularly useful for GitHub Codespaces.

## Scripts

### `request-service-cli.mjs`

Interactive runner for any public RequestService method with verbose JSON output. It reads credentials from your environment (supports `.env` via dotenv), then lets you pick an action and optionally enter parameters.

Usage

```bash
pnpm run run:request-service
```

Environment variables required (same as other samples):

- `DEVICEID` (uuid for the device)
- `VIN` (vehicle VIN)
- `ONSTAR_USERNAME`
- `ONSTAR_PASSWORD`
- `ONSTAR_PIN`
- `ONSTAR_TOTPKEY`
- Optional: `TOKEN_LOCATION`, request/429 knobs like `MAX_429_RETRIES`, `INITIAL_429_DELAY_MS`, `BACKOFF_FACTOR`, `JITTER_MS`, `MAX_429_DELAY_MS`, `CHECK_REQUEST_STATUS`, `REQUEST_POLL_INTERVAL_SECONDS`, `REQUEST_POLL_TIMEOUT_SECONDS`, `RETRY_POST_ON_429`.

Notes

- Builds the library before running to ensure `dist/` is up to date.
- Shows full result payloads to help with debugging.
- Includes a toggle to flip `checkRequestStatus` at runtime.
- Includes `simulateReauth` command that deletes tokens, authenticates twice, and prints Xvfb diagnostics.

### `setup-env.js`

#### Automatic environment setup

- Reads environment variables (from Codespace secrets or system)
- Validates required credentials
- Generates `.env` file automatically
- Provides helpful error messages and setup instructions

#### Usage

```bash
pnpm run setup:env
# or
node scripts/setup-env.js
```

### `setup-env.sh`

#### Bash version of environment setup

- Cross-platform shell script
- Same functionality as the Node.js version
- Useful for environments without Node.js

#### Shell Script Usage

```bash
pnpm run setup:env:bash
# or
./scripts/setup-env.sh
```

### `credential-manager.js`

#### Interactive credential setup

- Prompts for all credentials interactively
- Masks sensitive input
- Creates backups of existing `.env` files
- Validates credential format

#### Interactive Usage

```bash
pnpm run setup:interactive
# or
node scripts/credential-manager.js
```

## Quick Start

### For GitHub Codespaces

1. Set up repository secrets in GitHub:
   - Go to Settings > Secrets and variables > Codespaces
   - Add: `ONSTAR_USERNAME`, `ONSTAR_PASSWORD`, `ONSTAR_PIN`, `ONSTAR_TOTPKEY`

2. Environment will be automatically configured when Codespace starts

3. Or manually run: `pnpm run setup:env`

### For Local Development

```bash
# Interactive setup (recommended for first time)
pnpm run setup:interactive

# Or set environment variables and auto-generate
export ONSTAR_USERNAME="your-email@example.com"
export ONSTAR_PASSWORD="your-password"
export ONSTAR_PIN="1234"
export ONSTAR_TOTPKEY="your-totp-secret"
pnpm run setup:env
```

## Environment Variables

### Required

- `ONSTAR_USERNAME` - Your OnStar account email
- `ONSTAR_PASSWORD` - Your OnStar account password
- `ONSTAR_PIN` - Your OnStar PIN (4-6 digits)
- `ONSTAR_TOTPKEY` - Your TOTP secret key for 2FA

### Optional

- `DEVICEID` - Device UUID (auto-generated if not provided)
- `VIN` - Vehicle Identification Number
- `TOKEN_LOCATION` - Custom token storage location

## Security

- Scripts mask sensitive data in output
- Backup existing `.env` files before overwriting
- Never log passwords or secrets to console
- Support for secure input prompting
- **Environment files protected**: All `.env*` files, token files, and credential directories are excluded from git commits and npm package publishing via comprehensive `.gitignore` and `.npmignore` configurations

## Integration

These scripts integrate with:

- GitHub Codespaces (automatic setup via `.devcontainer/devcontainer.json`)
- VS Code tasks
- npm scripts
- CI/CD pipelines
