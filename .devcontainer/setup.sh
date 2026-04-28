#!/usr/bin/env bash
set -e

echo -e '\n=== Updating package lists ==='
sudo apt-get update

echo -e '\n=== Upgrading packages ==='
sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y

# xvfb is pre-installed in the universal (Codespaces) image but not in base images
if ! command -v Xvfb &>/dev/null; then
  echo -e '\n=== Installing xvfb ==='
  sudo apt-get install xvfb -y
fi

# nvm may need to be sourced depending on the image
if [ -s "/usr/local/share/nvm/nvm.sh" ]; then
  . /usr/local/share/nvm/nvm.sh
fi

# Switch to Node 22 if nvm is available and Node 22 is installed
if command -v nvm &>/dev/null; then
  echo -e '\n=== Switching to Node 22 ==='
  nvm use 22
fi

echo -e '\n=== Enabling corepack ==='
if command -v sudo &>/dev/null; then
  sudo env PATH="$PATH" corepack enable
else
  corepack enable
fi

echo -e '\n=== Installing corepack packages ==='
COREPACK_ENABLE_DOWNLOAD_PROMPT=0 corepack install

echo -e '\n=== Setting up pnpm ==='
COREPACK_ENABLE_DOWNLOAD_PROMPT=0 SHELL=/bin/bash pnpm setup

export PNPM_HOME="$HOME/.local/share/pnpm"
export PATH="$PNPM_HOME:$PATH"

echo -e '\n=== Installing patchright globally ==='
COREPACK_ENABLE_DOWNLOAD_PROMPT=0 pnpm add -g patchright

echo -e '\n=== Installing patchright dependencies ==='
sudo env PATH="$PATH" patchright install-deps

echo -e '\n=== Installing npm packages ==='
COREPACK_ENABLE_DOWNLOAD_PROMPT=0 pnpm install

echo -e '\n=== Setting up environment ==='
chmod +x scripts/setup-env.sh
node scripts/setup-env.js

echo -e '\n=== Setup complete ==='
