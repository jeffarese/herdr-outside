#!/bin/sh
# Fills a stage (stage.sh) with the demo's cast: one agent in a space, as Herdr starts
# them, and the rest outside every space, as `hc run` starts them.
#
#   sh docs/demo/scene.sh <stage folder>
set -eu
w=${1:?usage: scene.sh <stage folder>}
# shellcheck disable=SC1091
. "$w/env.sh"
cd "$HOME/code/shop"

# In spaces: a shell, and an agent the Agents list shows.
herdr-app do space.new --folder "$HOME/code/api" >/dev/null
herdr-app do space.new --folder "$HOME/code/shop" --argv '["claude","Speed up the checkout page"]' >/dev/null

# Outside: started from a shell, by a script, or by another tool.
hc run --bg --name fix-auth -- claude --state blocked --ask "Run npm run test:integration?" "Fix the login redirect loop" >/dev/null
hc run --bg -- claude --spawn "review=codex Review the retry change" "Add retries to the webhook client" >/dev/null
hc run --bg --name docs -- codex --state done "Update the docs for the new API" >/dev/null
hc run --bg --on studio --name bench --cwd "$w/studio/code/shop" -- claude "Benchmark the search index" >/dev/null
hc run --bg --name dev-server -- sh -c 'while :; do echo "GET /health 200"; sleep 5; done' >/dev/null
sleep 2
