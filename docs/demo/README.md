# The README's pictures

[preview.png](../../preview.png) and [docked.png](../media/docked.png) show the real mod in the
real Herdr app, on a showcase stage: a second Herdr app on this Mac with a home of its own, every
one of Jeff's mods installed, his layout, and a made-up world around them (Sam, who works at
Acme, with agents on two machines, pull requests, servers and two notifications). Nothing in
them comes from a real project, machine or person.

**Real:** the Herdr app, herdr-core, this repository's mod as the working tree has it, and the
other mods.

**Made up:** every session, project, machine, pull request and server. The agents are a
stand-in started under the names `claude` and `codex`: it reports the state it is given, as
those agents do, and draws a screen; it never calls a model. `studio` is a second herdr-core on
this same Mac. Nothing of yours is read or written, and your own spaces and agents don't show.

The stage is the showcase kit in `~/workspace/herdr/herdr-showcase` (its `README.md` explains
it, and `BRIEF.md` is the world every mod's picture shares). This folder holds the piece that is
this mod's own: [showcase.sh](showcase.sh), the hook the kit runs after its cast.

- **After the cast** it starts four agents outside every space, with `hc run`, as a shell, a
  script or another tool would: `billing-migration` waiting on a question, an agent triaging bug
  reports with a sub-agent, `nightly-deps` done, and `ranker-eval` on studio. The cast already
  has one shell outside, `dev-server`. Then it opens the Outside window. The agents start
  before the window opens, so it posts no notification of its own.
- **`showcase.sh <stage> docked`** closes the window and shows a copy of the layout,
  `with-outside`, with the panel as a block in the left sidebar under Sessions, listing shells
  and scripts too.

## Take them again

From the repository's root:

```sh
sh docs/demo/showcase-shots.sh
```

[showcase-shots.sh](showcase-shots.sh) builds the stage with the hook, takes `preview.png`,
docks the panel, takes `docs/media/docked.png`, both with the kit's `shoot.sh`, shrinks a
picture to a palette if it is over 2.5 MB ([quantize.sh](quantize.sh)), and takes the stage
down. To look before shooting, build a stage and keep it:

```sh
SHOWCASE_VPN=0 SHOWCASE_HOOK=$PWD/docs/demo/showcase.sh sh ~/workspace/herdr/herdr-showcase/stage.sh > /tmp/stage.txt
w=$(head -n 1 /tmp/stage.txt)
sh ~/workspace/herdr/herdr-showcase/shoot.sh "$w" preview.png
sh docs/demo/showcase.sh "$w" docked
sh ~/workspace/herdr/herdr-showcase/shoot.sh "$w" docs/media/docked.png
sh ~/workspace/herdr/herdr-showcase/stage.sh --down "$w"
```

(The stage's folder is read from a file: some of its processes keep `stage.sh`'s output open,
so `w=$(sh stage.sh)` waits until the stage is gone.)

- `SHOWCASE_VPN=0` leaves out the private VPN switch, as every public README's picture does.
- `shoot.sh` waits until the keyboard and mouse have been still for a minute, then brings the
  stage's window forward for about two seconds. Run it when you can leave the Mac alone.
- The pictures are the window at 2x, 3200 pixels wide.

## The older demo

[stage.sh](stage.sh), [scene.sh](scene.sh), [shots.sh](shots.sh), [record.sh](record.sh) and
[bin/agent](bin/agent) built the earlier pictures on a smaller stage of their own, over Herdr's
`main` layout. They no longer make any README picture. `record.sh` still runs, and writes over
`preview.png` and `docs/media/docked.png`, so don't run it to refresh the README.
