#!/bin/sh
# Takes the README's pictures from a stage that scene.sh has filled.
#
#   sh docs/demo/shots.sh <stage folder>
#
# preview.png: the Outside window over Herdr's own layout, as `mod.open` shows it.
# docs/media/docked.png: the panel as a block in the sidebar of a copy of that layout,
# listing shells and scripts too. The app draws both itself (`herdr-app shot`), so no
# screen recording is involved.
set -eu
kit=$(cd "$(dirname "$0")" && pwd)
repo_root=$(cd "$kit/../.." && pwd)
w=${1:?usage: shots.sh <stage folder>}
# shellcheck disable=SC1091
. "$w/env.sh"
mkdir -p "$repo_root/docs/media"

herdr-app do mod.open --name outside >/dev/null
sleep 3
herdr-app shot "$repo_root/preview.png" >/dev/null
herdr-app do mod.open --name outside >/dev/null

# A second run on the same stage finds the copy already made.
if [ -f "$w/app/layouts/with-outside.json" ]; then
  herdr-app do layout.switch --name with-outside >/dev/null
  sleep 3
  herdr-app shot "$repo_root/docs/media/docked.png" >/dev/null
  herdr-app do layout.switch --name main >/dev/null
  exit 0
fi
herdr-app do layout.clone --name main --as with-outside >/dev/null
sleep 1
python3 - "$w/app/layouts/with-outside.json" <<'PY'
import json, sys

path = sys.argv[1]
layout = json.load(open(path))


def find(node, wanted):
    if node.get("id") == wanted:
        return node
    for child in node.get("children", []):
        found = find(child, wanted)
        if found:
            return found


find(layout, "sidebar-lists")["children"].append(
    {"id": "outside", "type": "block", "size": {"weight": 1}, "content": {"mod": "outside", "props": {"show": "all"}}}
)
json.dump(layout, open(path, "w"), indent=2)
PY
sleep 3
herdr-app shot "$repo_root/docs/media/docked.png" >/dev/null
herdr-app do layout.switch --name main >/dev/null
