#!/bin/sh
# Shrinks a picture over 2.5 MB to a 256-colour palette (PIL), which the eye doesn't see in a
# window's flat colours. Smaller pictures are left as they are.
#
#   sh docs/demo/quantize.sh <picture.png>...
set -eu
for f in "$@"; do
  [ "$(wc -c < "$f")" -gt 2621440 ] || continue
  python3 - "$f" <<'PY'
import sys
from PIL import Image
path = sys.argv[1]
Image.open(path).convert("RGB").quantize(256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).save(path, optimize=True)
PY
done
