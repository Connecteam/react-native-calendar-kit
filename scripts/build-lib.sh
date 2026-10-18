#!/usr/bin/env bash
# Rebuilds lib/ from src/.
#
# The JavaScript (lib/commonjs, lib/module) is built with upstream's own tooling, in a clone of the
# upstream monorepo. The declarations (lib/typescript) are built against the React Native types of a
# mobiapp checkout, the app that consumes this fork: upstream builds them against React 19 types,
# which mobiapp doesn't use.
#
# Usage: scripts/build-lib.sh <upstream-clone> <mobiapp-checkout>
#   <upstream-clone>    a clone of https://github.com/howljs/react-native-calendar-kit, any tag; its
#                       packages/react-native-calendar-kit/src and lib are overwritten
#   <mobiapp-checkout>  a mobiapp checkout with node_modules installed
set -euo pipefail

UPSTREAM=$(cd "${1:?path to an upstream calendar-kit clone}" && pwd)
MOBIAPP=$(cd "${2:?path to a mobiapp checkout}" && pwd)
HERE=$(cd "$(dirname "$0")/.." && pwd)
PKG="$UPSTREAM/packages/react-native-calendar-kit"
YARN=$(ls "$UPSTREAM"/.yarn/releases/yarn-*.cjs)

rm -rf "$PKG/src" "$PKG/lib"
cp -R "$HERE/src" "$PKG/src"

(cd "$UPSTREAM" && YARN_ENABLE_IMMUTABLE_INSTALLS=false node "$YARN" workspaces focus @howljs/calendar-kit)
(
  cd "$PKG"
  cp package.json package.json.bak
  trap 'mv package.json.bak package.json' EXIT
  node -e "
    const fs = require('fs');
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    pkg['react-native-builder-bob'].targets = ['commonjs', 'module'];
    fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
  "
  node "$YARN" bob build
)

TMP="$MOBIAPP/.calendar-kit-dts"
rm -rf "$TMP"
mkdir -p "$TMP"
trap 'rm -rf "$TMP"' EXIT
cp -R "$PKG/src" "$TMP/src"
rm -rf "$TMP/src/__tests__"
cat > "$TMP/tsconfig.json" <<JSON
{
  "extends": "../node_modules/@tsconfig/react-native/tsconfig.json",
  "compilerOptions": {
    "noEmit": false,
    "declaration": true,
    "emitDeclarationOnly": true,
    "noEmitOnError": false,
    "rootDir": "src",
    "outDir": "typescript",
    "strict": true,
    "skipLibCheck": true,
    "jsx": "react-jsx",
    "esModuleInterop": true,
    "lib": ["es2022", "dom"],
    "baseUrl": "..",
    "paths": {
      "lodash.debounce": ["node_modules/@types/lodash/debounce"],
      "lodash.isequal": ["node_modules/@types/lodash/isEqual"],
      "lodash.merge": ["node_modules/@types/lodash/merge"]
    }
  },
  "include": ["src"]
}
JSON
# Upstream's source has React 19 typing errors under React 18 types; they don't affect the emitted
# declarations, so they are reported but don't stop the build.
"$MOBIAPP/node_modules/.bin/tsc" -p "$TMP/tsconfig.json" || true

rm -rf "$HERE/lib"
mkdir -p "$HERE/lib"
cp -R "$PKG/lib/commonjs" "$PKG/lib/module" "$HERE/lib/"
cp -R "$TMP/typescript" "$HERE/lib/typescript"
echo "lib/ rebuilt from src/."
