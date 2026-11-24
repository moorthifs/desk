#!/usr/bin/env bash
# Fetch one DESIGN.md from VoltAgent/awesome-design-md at a pinned commit.
# Usage: fetch.sh <slug> [dest]      e.g. fetch.sh linear.app DESIGN.md
#        fetch.sh --list              print the available slugs
# REF overrides the pinned commit (e.g. REF=main fetch.sh stripe).
set -euo pipefail
REPO="VoltAgent/awesome-design-md"
REF="${REF:-fcc70284932276d085f01ef9f83edde90b1258cb}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ "${1:-}" = "--list" ]; then
  grep -o '^| `[^`]*`' "$HERE/../catalog.md" | tr -d '|` '
  exit 0
fi
slug="${1:?usage: fetch.sh <slug> [dest]  (fetch.sh --list for slugs)}"
case "$slug" in *[!A-Za-z0-9._-]*|.*) echo "bad slug: $slug" >&2; exit 2;; esac
dest="${2:-DESIGN.md}"

if [ -e "$dest" ] && [ -z "${FORCE:-}" ]; then
  echo "$dest already exists; set FORCE=1 to overwrite" >&2; exit 3
fi
url="https://raw.githubusercontent.com/$REPO/$REF/design-md/$slug/DESIGN.md"
tmp="$(mktemp)"; trap 'rm -f "$tmp"' EXIT
if ! curl -fsSL "$url" -o "$tmp"; then
  echo "could not fetch $slug ($url); check the slug with --list" >&2; exit 4
fi
mkdir -p "$(dirname "$dest")"
mv "$tmp" "$dest"; trap - EXIT
echo "wrote $dest ($(wc -c < "$dest") bytes) from $REPO@${REF:0:7}/design-md/$slug"
