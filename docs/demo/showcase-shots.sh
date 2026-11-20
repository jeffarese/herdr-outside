#!/bin/sh
# Takes the README's pictures from start to end: builds a showcase stage with showcase.sh as its
# hook (agents outside every space, the Outside window open), takes each picture with the kit's
# shoot.sh, and takes the stage down, also when something fails.
#
#   sh docs/demo/showcase-shots.sh
#
# preview.png            the Outside window floating over the whole window, the rest dimmed
# docs/media/docked.png  the panel docked in the left sidebar, under Sessions, shells included
#
# Each picture waits until nobody has typed for a minute (shoot.sh), so a run takes a few minutes.
set -eu
here=$(cd "$(dirname "$0")" && pwd)
repo=$(cd "$here/../.." && pwd)
kit=${SHOWCASE_KIT:-$HOME/workspace/herdr/herdr-showcase}

# stage.sh prints the stage's folder. Read from a file: some of the stage's processes keep
# stage.sh's output open, so `w=$(sh stage.sh)` would wait until the stage is gone.
out=$(mktemp "${TMPDIR:-/tmp}/outside-stage.XXXXXX")
w=
trap '[ -n "$w" ] && sh "$kit/stage.sh" --down "$w"; rm -f "$out"' EXIT
SHOWCASE_TFVPN=0 SHOWCASE_HOOK="$here/showcase.sh" sh "$kit/stage.sh" > "$out"
w=$(head -n 1 "$out")
[ -d "$w" ] || { echo "showcase-shots: no stage" >&2; exit 1; }

# The Outside window lit, the rest dimmed. At zoom 0.9 the window is 1350,752 to 1854,1194 with
# corners of 16 px, in a picture 1942 tall; it sits in the middle of the Herdr window, so a
# taller picture moves it down by half the difference.
sh "$kit/shoot.sh" "$w" "$w/preview-raw.png"
h=$(sips -g pixelHeight "$w/preview-raw.png" | awk '/pixelHeight/ { print $2 }')
sh "$kit/spot.sh" "$w/preview-raw.png" "$repo/preview.png" "${OUTSIDE_SPOT:-round:1350,$((752 + (h - 1942) / 2)),504,442,16}"
sh "$here/showcase.sh" "$w" docked
mkdir -p "$repo/docs/media"
sh "$kit/shoot.sh" "$w" "$repo/docs/media/docked.png"
sh "$here/quantize.sh" "$repo/preview.png" "$repo/docs/media/docked.png"
