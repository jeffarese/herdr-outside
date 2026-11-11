# The README's pictures

[preview.png](../../preview.png) and [docked.png](../media/docked.png) show the real mod in the
real Herdr app, on a stage that is synthetic from end to end. Nothing in them comes from a real
project, machine or person.

**Real:** the Herdr app, herdr-core, and this repository's mod.

**Synthetic:**

- **The agents.** [bin/agent](bin/agent) is a script, started under the names `claude` and
  `codex`. It reports the status it is given with OSC 7501, as those agents do, draws a few
  lines and waits. It never calls a model.
- **The projects.** `~/code/shop` and `~/code/api` are empty folders.
- **The machines.** This computer and studio are two herdr-core cores on one Mac, each with a
  home of its own in one folder under `/tmp`.
- **The app.** A second Herdr app whose home is that folder, with the welcome already seen and
  usage reports off.

Nothing of yours is read or written, and your own spaces and agents don't show.

## Take them again

```sh
sh docs/demo/record.sh
```

It needs the Herdr app, herdr-core and python3. The app draws the pictures itself
(`herdr-app shot`), so no screen recording permission is involved.

- **[stage.sh](stage.sh)** starts the two cores and the second app, and prints the stage's
  folder. `stage.sh --down <folder>` stops everything and deletes it.
- **[scene.sh](scene.sh)** starts the cast: one agent in a space, the rest outside.
- **[shots.sh](shots.sh)** takes the two pictures.
- **[record.sh](record.sh)** runs the three and takes the stage down.

Two things to know before you run it:

- **The second app's window comes to the front once,** when it opens.
- **Starting the Herdr app installs an app update that was waiting,** as any start does.

If the app shows a notice of its own in a corner (a herdr-core update, for one), close it and
run `shots.sh` on the stage again.
