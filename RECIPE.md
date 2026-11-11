# Outside

A list of the agents and terminals herdr-core runs that have no place in Herdr's window: ones
started with `hc run` in a shell, by a script or by another tool. Each row shows the program,
a name and the live status. A click peeks at the terminal, and a button on the hovered row
gives it a tab in the shown space.

![Outside](preview.png)

## What you see

One mod, `outside`, drawn in one of two ways.

**As a window** (what `mod.open {name: "outside"}` leads to): 280 px wide, as tall as its list,
which scrolls beyond 12 rows. Herdr draws the frame.

- **Header**, 32 px: "Outside" in `foreground`, 12 px; the row count in `dim`; then, at the
  right, a filter button and a close button, each a 13 px icon in `dim` with 3 px padding and a
  4 px radius.
- **Rows**, 30 px each, 1 px apart, 8 px radius, text 13 px, left to right:
  - the program's icon from the app's table, 16 px (`svg` tinted `foreground` when
    `program.tint`, else `image`);
  - the name, truncated, in `foreground`; in `muted` when the status is idle or there is none;
  - the machine's name, 10 px in `dim`, for a terminal on another machine;
  - the status mark, 12 px wide.
- A sub-agent's row is indented 14 px per level under the terminal that started it.
- **Empty**: one 12 px line in `dim`: "No agents outside your spaces. One started with hc run
  shows up here." With the filter on everything: "Nothing runs outside your spaces."

**As a block** in a layout: it fills the block on the `chrome` color. The header gains a 12 px
chevron at the left, and a click on the header folds the list. The close button is gone.
Narrower than 160 px it is a rail: one 18 px icon per top-level row, centered, 6 px apart, with
a 7 px dot on its top right corner in `blocked`, `done` or `working`.

## How it behaves

- **Statuses:** working is a 12 px arc in `working` that turns once every 900 ms; blocked is an
  8 px dot in `blocked`; done is a 12 px check in `done`; idle is a 6 px dot in `idle`; a
  program that reports no status has no mark. A status of `error` counts as blocked.
- **Order:** top-level rows by the most urgent status in their tree (blocked, done, working,
  idle, none), then oldest first. Each is followed by the terminals it started.
- **Name:** the terminal's `name`; else the title it reports; else its terminal title, without
  leading symbols; else its template; else the program's name for an agent or the basename of
  `argv[0]` for anything else; else the address.
- **Click a row:** `terminal.peek`.
- **Hover a row:** it takes the `hover` color and shows a tab button before the status mark.
  The button runs `terminal.keep`, which gives the terminal a tab in the shown space; the row
  then leaves the list. The button shows only when the shown space is on the terminal's machine.
- **Tooltip on a row:** the status in words, the address and the folder.
- **Filter button:** switches between agents only (the default) and every terminal. It is
  drawn in `foreground` on `raised` while everything shows. The choice is kept in
  `localStorage`; until it is made, the block's `show` prop (`"all"` or `"agents"`) decides.
- **Window:** a press on the header drags it. It remembers where it was dropped and reopens on
  the next start. The close button closes it for good, until `mod.open` runs again.

## Built from

- `mods/outside/mod.json`: `{ "place": "left", "size": 240, "title": "Outside" }`.
- `mods/outside/pick.js`: pure functions, no app imports. `outside(all, { placed, machines,
  show })` returns `[{ terminal, depth }]`; `labelOf`, `statusOf`, `isAgent`, `machineOf`.
  A terminal is outside when its `state` is `"live"`, it has no `herdr.space` label, its
  address is not in `placed`, no ancestor through `parent` has a place, and its machine is in
  `machines`. With `show: "agents"`, a tree is kept when any row in it is an agent
  (`program.agent`, `reported`, or a status).
- `mods/outside/main.js`: the view. From `herdr`: `terminals()`, `panes()` (the placed
  addresses), `machines()` (the known machines), `spaces()` and `focused()` (the shown space's
  machine), `theme()`, `props()`, `run()`, `openOverlay()`, `closeOverlay()`.
- Commands: `terminal.peek {terminal}`, `terminal.keep {terminal}`.
- The window: `mod.open` shows a mod as a dialog. In `init`, a copy that has `props().overlay`
  but not `props().window` opens `openOverlay({ mod: "outside", kind: "window", key: "outside",
  keep: true, width: 280, props: { window: true } })`, closes its own overlay and renders
  nothing.
- Art, all 16×16 one-color SVGs in the mod's folder: `spinner` (an open arc), `check`, `tab`
  (a rounded rectangle with a plus), `filter` (three shortening lines), `close`, `chevron`,
  `chevron-right`.
- No `exec`, no `hc`, no network, no timers: the app re-renders the mod when its data changes.

## Watch out

- Herdr's own layouts are read-only, so `"place": "left"` docks nothing in them. The window is
  what makes the mod usable without a copied layout.
- In a window, a press that reaches Herdr drags the window. Every row and button stops its own
  left press with `on_mouse_down("left", (_e, cx) => cx.stop_propagation())`.
- A dialog sizes to its content: a list with `flex_1` and `min_h(0)` collapses to nothing
  there. The window's list uses `max_h` instead.
- `terminal.keep` fails with "A terminal's pane must stay on its own machine" when the shown
  space is on another machine, hence the rule for the tab button.
- A sub-agent of an agent that has a pane must stay out: the Agents list shows it under its
  parent. Walk up `parent` and guard against a loop.
- `terminals()` lists other machines' terminals with a `machine/` prefix on the address. Keep
  only machines in `machines()`, which leaves out `--temp` ones.
- Measure the block with `on_size_change` on the root, not with the layout's `sidebar` node:
  the block may sit anywhere.
- Animate the working mark with `.spin(900)`, never with a timer.

## Done when

- `herdr-app check mods/outside` passes.
- `hc run --bg -- claude` in a shell adds a row within a second, and the Agents list does not
  show that agent.
- A row's status mark follows the agent: working, blocked, done.
- An agent started from inside another outside agent is listed under it, indented.
- A click on a row opens a peek of that terminal.
- The tab button gives the terminal a tab in the shown space, and its row leaves the list.
- The filter button adds a plain `hc run --bg -- sh` terminal to the list and removes it again.
- `herdr-app do mod.open --name outside` opens the window, and it is there again after Herdr
  restarts.
- As a block in a copied layout's sidebar, the panel fills its block, and at 76 px wide it
  shows icons only.
