#!/bin/sh
# Builds the demo's stage on this Mac, all of it synthetic, and prints the folder it lives
# in. `stage.sh --down <folder>` stops it and deletes it.
#
#   w=$(sh docs/demo/stage.sh)
#   (. "$w/env.sh" && hc ls && herdr-app status)
#   sh docs/demo/stage.sh --down "$w"
#
# The stage is two herdr-core cores of their own (this computer and a machine called
# studio, both on this Mac) and a second Herdr app whose home is the stage, with this
# repository's mod installed. claude and codex there are bin/agent, a script. Nothing of
# yours is read or touched, and your own spaces and agents don't show.
set -eu
kit=$(cd "$(dirname "$0")" && pwd)
repo_root=$(cd "$kit/../.." && pwd)
hc_bin=$(command -v herdr-core 2>/dev/null || echo "$HOME/.local/bin/herdr-core")
app=${HERDR_APP:-/Applications/Herdr.app}
app_cli="$app/Contents/MacOS/Herdr"

if [ "${1:-}" = --down ]; then
  w=${2:?usage: stage.sh --down <folder>}
  [ -f "$w/env.sh" ] || { echo "not a demo folder: $w" >&2; exit 2; }
  # shellcheck disable=SC1091
  . "$w/env.sh"
  [ -f "$w/app.pid" ] && kill "$(cat "$w/app.pid")" 2>/dev/null || :
  # Here first: while it runs, it dials studio and would start its core again.
  for s in hod hod-studio; do HC_SESSION=$s herdr-core server stop >/dev/null 2>&1 || :; done
  # A program still running from the folder ends by its PID.
  pids=$(ps -axo pid=,command= | awk -v w="$w/" 'index($0, w) {print $1}')
  [ -z "$pids" ] || kill $pids 2>/dev/null || :
  rm -rf "$w"
  exit 0
fi

[ -x "$hc_bin" ] || { echo "needs herdr-core" >&2; exit 2; }
[ -x "$app_cli" ] || { echo "needs the Herdr app at $app (HERDR_APP picks another)" >&2; exit 2; }

# Short on purpose: Unix socket paths have a ~104 byte limit on macOS. The real path, so
# Herdr shows the shop as ~/code/shop.
w=$(mktemp -d /tmp/hod.XXXXXX)
w=$(cd "$w" && pwd -P)
mkdir -p "$w/bin" "$w/s" "$w/c" "$w/app/mods" "$w/home/code/shop" "$w/home/code/api" "$w/studio/code/shop"
ln -s "$hc_bin" "$w/bin/herdr-core"
ln -s "$hc_bin" "$w/bin/hc"
ln -s "$app_cli" "$w/bin/herdr-app"
ln -s "$kit/bin/agent" "$w/bin/claude"
ln -s "$kit/bin/agent" "$w/bin/codex"

cat > "$w/env.sh" <<ENV
# The demo stage's environment (stage.sh).
export DEMO_WORK='$w' HOME='$w/home' ZDOTDIR='$w/home' SHELL=/bin/zsh
export PATH='$w/bin:/usr/bin:/bin:/usr/sbin:/sbin'
export XDG_STATE_HOME='$w/s' XDG_CONFIG_HOME='$w/c'
export HC_SESSION=hod HERDR_APP_HOME='$w/app' HERDR_TELEMETRY=0
export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8
unset HC_TERMINAL_ID HC_TERMINAL_SOCKET CLAUDE_CONFIG_DIR TERM_PROGRAM TERM_PROGRAM_VERSION
unset REX_SESSION REX_BLOCK REX_SERVER REX_CLIENT REX_HOME REX_BIN_DIR
ENV
# shellcheck disable=SC1091
. "$w/env.sh"

# A terminal app may start a shell with the account's real home; the stage's go back to the stage's.
printf 'export HOME="%s"\n' "$HOME" > "$HOME/.zshenv"
printf 'PROMPT="%%F{cyan}%%~%%f %%F{magenta}❯%%f "\nunsetopt beep\n' > "$HOME/.zshrc"

# Each core is named for its machine: hc names a core after the host the first time it
# starts and keeps the name in core.json.
name_core() { # name_core <session> <machine> <home>
  HOME="$3" HC_SESSION=$1 herdr-core server start >/dev/null
  HC_SESSION=$1 herdr-core server stop >/dev/null
  sed -i '' "s/\"name\": *\"[^\"]*\"/\"name\": \"$2\"/" "$XDG_STATE_HOME/herdr-core/$1/core.json"
}
name_core hod laptop "$HOME"
name_core hod-studio studio "$w/studio"
cd "$HOME"
herdr-core server start >/dev/null
hc machine add --via "env HOME=$w/studio sh -c" --name studio --session hod-studio >/dev/null

# The mod, as someone who installed it has it.
cp -R "$repo_root/mods/outside" "$w/app/mods/outside"
# A home that has seen the welcome, with the side panels closed, and that reports nothing.
printf '{"frame.welcomed":"skipped","workspace.panels":[]}\n' > "$w/app/shared.json"
printf '{"telemetry":false,"sounds":{"enabled":false}}\n' > "$w/app/settings.json"
# And that has run this version before, so it doesn't announce an update.
version=$(defaults read "$app/Contents/Info.plist" CFBundleShortVersionString)
printf '{"last_run":"%s","presented":[]}\n' "$version" > "$w/app/update-notes.json"

# The app: its home is the stage, and it finds the stage's core through HC_SESSION.
/usr/bin/open -n -a "$app"
i=0
until herdr-app status >/dev/null 2>&1; do
  i=$((i + 1)); [ $i -lt 60 ] || { echo "the Herdr app didn't start" >&2; exit 1; }
  sleep 0.5
done
pgrep -n -f "$app_cli" > "$w/app.pid"
echo "$w"
