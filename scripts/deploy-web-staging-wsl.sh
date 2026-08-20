#!/usr/bin/env bash
set -Eeuo pipefail

# Run from Ubuntu/WSL at the repository root:
#   bash scripts/deploy-web-staging-wsl.sh
#
# This intentionally deploys only the staging web Worker.

repo_path="${1:-$(pwd)}"
if [[ ! -f "$repo_path/pnpm-workspace.yaml" ]]; then
  echo "Run this from the repository root, or pass the repository path as the first argument." >&2
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  sudo apt-get update
  sudo apt-get install -y curl ca-certificates
fi

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [[ ! -s "$NVM_DIR/nvm.sh" ]]; then
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
fi
# shellcheck disable=SC1090
source "$NVM_DIR/nvm.sh"

nvm install 22
nvm alias default 22
nvm use 22 >/dev/null

if command -v corepack >/dev/null 2>&1; then
  corepack enable
  corepack prepare pnpm@11.0.9 --activate
else
  npm install --global pnpm@11.0.9
fi

build_path="$(mktemp -d "${TMPDIR:-/tmp}/carbon-web-staging.XXXXXX")"
cleanup() {
  rm -rf -- "$build_path"
}
trap cleanup EXIT

echo "Copying the repository into Ubuntu's Linux filesystem..."
tar \
  --exclude='./.git' \
  --exclude='./node_modules' \
  --exclude='*/node_modules' \
  --exclude='*/.next' \
  --exclude='*/.open-next' \
  --exclude='*/.turbo' \
  --exclude='*/.wrangler' \
  --exclude='*/.wrangler-config' \
  --exclude='./.env' \
  --exclude='./.env.*' \
  -C "$repo_path" -cf - . | tar -C "$build_path" -xf -

cd "$build_path"
pnpm install --frozen-lockfile
pnpm --filter @carbon/web build
pnpm --filter @carbon/web exec opennextjs-cloudflare build

if [[ ! -f apps/web/.open-next/worker.js ]]; then
  echo "OpenNext build failed: apps/web/.open-next/worker.js was not created." >&2
  exit 1
fi

echo "Checking Wrangler authentication..."
if ! pnpm --filter @carbon/web exec wrangler whoami; then
  echo "Wrangler is not authenticated in Ubuntu. Starting Cloudflare login..."
  pnpm --filter @carbon/web exec wrangler login
fi

echo "Deploying staging web Worker only..."
pnpm --filter @carbon/web exec wrangler deploy --env staging --domains app-staging.getscenepass.com
echo "Deployed: https://app-staging.getscenepass.com"
