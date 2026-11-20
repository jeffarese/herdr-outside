#!/bin/sh
# The README's pictures, on a showcase stage (~/workspace/herdr/herdr-showcase). stage.sh runs
# this after the cast with the stage folder: it starts a few agents outside every space and
# opens the Outside window over the default scene (preview.png).
#
#   SHOWCASE_TFVPN=0 SHOWCASE_HOOK=$PWD/docs/demo/showcase.sh sh ~/workspace/herdr/herdr-showcase/stage.sh > /tmp/stage.txt
#   w=$(head -n 1 /tmp/stage.txt)
#
# showcase-shots.sh does all of it, pictures included.
#
# Then, for docs/media/docked.png, on the same stage:
#
#   sh docs/demo/showcase.sh "$w" docked
#
# closes the window and shows a copy of the layout with the panel as a block in the left
# sidebar, under Sessions, listing shells and scripts too.
set -eu
w=${1:?usage: showcase.sh <stage folder> [docked]}
# shellcheck disable=SC1091
. "$w/env.sh"
H=$HOME

if [ "${2:-}" = docked ]; then
  # The window off, so the panel shows once.
  [ -f "$w/run/outside-window" ] && { herdr-app do mod.open --name outside >/dev/null; rm -f "$w/run/outside-window"; }
  layouts="$HERDR_APP_HOME/layouts"
  if [ ! -f "$layouts/with-outside.json" ]; then
    /usr/bin/python3 - "$layouts/$SC_LAYOUT.json" "$layouts/with-outside.json" <<'PY'
import json, sys

src, dst = sys.argv[1], sys.argv[2]
layout = json.load(open(src))


def find(node, wanted):
    if node.get("id") == wanted:
        return node
    for child in node.get("children", []):
        found = find(child, wanted)
        if found:
            return found


find(layout, "sidebar-lists")["children"].insert(
    1, {"id": "outside", "type": "block", "size": {"weight": 1}, "content": {"mod": "outside", "props": {"show": "all"}}}
)
layout.pop("preview", None)
json.dump(layout, open(dst, "w"), indent=2)
PY
    sleep 1
  fi
  herdr-app do layout.switch --name with-outside >/dev/null
  sleep 3
  exit 0
fi

# Outside every space: started from a shell, by a script or by another tool, as `hc run` does.
# The default cast already has one, the dev-server shell. Each starts in the state it shows, and
# before the window opens: the window tells you only of changes it sees, so no notification
# joins the two toasts.
cd "$H/code/api"
hc run --bg --no-notify --name billing-migration -- \
  claude --state blocked --ask "Run the migration on staging?" "Add the billing table" >/dev/null
cd "$H/code/shop"
hc run --bg --no-notify -- \
  claude --cpu 0.05 --spawn "dupes=codex --cpu 0.02 Find the duplicate reports" "Triage the new bug reports" >/dev/null
hc run --bg --no-notify --name nightly-deps -- codex --state done "Bump the shop's dependencies" >/dev/null
hc run --bg --no-notify --on studio --name ranker-eval --cwd "$w/studio/code/search" -- \
  claude --cpu 0.05 "Compare the two rankers" >/dev/null
sleep 4

herdr-app do mod.open --name outside >/dev/null
: > "$w/run/outside-window"
sleep 2
