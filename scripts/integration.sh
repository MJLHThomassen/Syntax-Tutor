#!/bin/sh
# Runs test/integration/suite.js inside an isolated VS Code instance (your own
# settings and extensions are untouched). Override the binary with VSCODE_BIN.
set -e
cd "$(dirname "$0")/.."
BIN="${VSCODE_BIN:-/Applications/Visual Studio Code.app/Contents/MacOS/Code}"
T="$PWD/.vscode-test"
mkdir -p "$T"
"$BIN" --extensionDevelopmentPath="$PWD" --extensionTestsPath="$PWD/test/integration/suite.js" \
  --user-data-dir="$T/u" --extensions-dir="$T/e" --disable-extensions --disable-workspace-trust \
  --skip-welcome --new-window "$PWD/samples" > "$T/run.log" 2>&1 || { tail -40 "$T/run.log"; exit 1; }
grep '\[syntax-tutor\]' "$T/run.log"
echo "Integration tests passed."
