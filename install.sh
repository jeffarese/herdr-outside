#!/bin/sh
# Install the Outside mod into the Herdr app, or update it.
#
#   ./install.sh            copy mods/outside into the app's home and open it
#   ./install.sh --remove   close it and delete it from the app's home
#
# The app's home is ~/.config/herdr-app, or $HERDR_APP_HOME.
set -eu
here=$(cd "$(dirname "$0")" && pwd)
home=${HERDR_APP_HOME:-$HOME/.config/herdr-app}
dest="$home/mods/outside"
app=$(command -v herdr-app 2>/dev/null || echo "$HOME/.local/bin/herdr-app")

[ -d "$home/mods" ] || { echo "No Herdr app home at $home. Start the Herdr app once first." >&2; exit 1; }
running() { [ -x "$app" ] && "$app" status >/dev/null 2>&1; }

if [ "${1:-}" = "--remove" ]; then
  if running; then "$app" do overlay.close --id outside >/dev/null 2>&1 || :; fi
  rm -rf "$dest"
  echo "Removed the Outside mod. A layout that names it shows an empty block until you take the block out."
  exit 0
fi

was_there=0
[ -d "$dest" ] && was_there=1
mkdir -p "$dest"
cp "$here"/mods/outside/*.js "$here"/mods/outside/*.json "$here"/mods/outside/*.svg "$dest/"

if [ -x "$app" ]; then "$app" check "$dest"; fi
if [ $was_there = 1 ]; then
  echo "Updated the Outside mod. The app reloads it by itself."
elif running; then
  "$app" do mod.open --name outside >/dev/null
  echo "Installed. The Outside window is open in Herdr: drag it where you want it."
else
  echo "Installed. With Herdr open, run: herdr-app do mod.open --name outside"
fi
