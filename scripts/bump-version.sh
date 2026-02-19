#!/usr/bin/env bash
set -euo pipefail

# Bump version across all packages in the monorepo.
# Usage: ./scripts/bump-version.sh <version>
# Example: ./scripts/bump-version.sh 0.3.0
#          ./scripts/bump-version.sh 0.3.0-beta.1

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <version>"
  echo "  e.g. $0 0.3.0"
  echo "  e.g. $0 0.3.0-beta.1"
  exit 1
fi

VERSION="$1"

# Validate semver (with optional pre-release suffix)
if ! echo "$VERSION" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9]+(\.[a-zA-Z0-9]+)*)?$'; then
  echo "Error: '$VERSION' is not a valid semver version."
  echo "Expected format: MAJOR.MINOR.PATCH or MAJOR.MINOR.PATCH-prerelease"
  exit 1
fi

echo "Bumping all packages to v$VERSION..."

# 1. Update package.json files
PACKAGE_FILES=(
  "packages/core/package.json"
  "packages/cli/package.json"
  "packages/mcp-server/package.json"
)

for pkg in "${PACKAGE_FILES[@]}"; do
  filepath="$ROOT_DIR/$pkg"
  if [[ ! -f "$filepath" ]]; then
    echo "Error: $pkg not found"
    exit 1
  fi
  # Use node to update JSON without mangling formatting
  node -e "
    const fs = require('fs');
    const path = '$filepath';
    const raw = fs.readFileSync(path, 'utf8');
    const pkg = JSON.parse(raw);
    pkg.version = '$VERSION';
    fs.writeFileSync(path, JSON.stringify(pkg, null, 2) + '\n');
  "
  echo "  Updated $pkg -> $VERSION"
done

# 2. Update CLI version string in source code
CLI_INDEX="$ROOT_DIR/packages/cli/src/index.ts"
if [[ ! -f "$CLI_INDEX" ]]; then
  echo "Error: packages/cli/src/index.ts not found"
  exit 1
fi

sed -i '' "s/\.version('[^']*')/\.version('$VERSION')/" "$CLI_INDEX"
echo "  Updated packages/cli/src/index.ts .version() -> $VERSION"

echo ""
echo "All packages bumped to v$VERSION."
echo ""
echo "Next steps:"
echo "  1. Update CHANGELOG.md with a ## [$VERSION] entry"
echo "  2. Commit: git commit -am \"chore: release v$VERSION\""
echo "  3. Tag:    git tag -a v$VERSION -m \"Release v$VERSION\""
echo "  4. Push:   git push origin main --follow-tags"
