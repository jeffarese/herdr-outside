// Outside: the agents and terminals herdr-core runs that have no place in Herdr's window.
//
// Herdr shows a terminal when it carries a space's label. One started another way, with
// `hc run` in a shell, by a script or by another tool, runs in the same herdr-core but appears
// nowhere in the window. This panel lists those: a click peeks at one, and the button on a
// hovered row gives it a tab in the shown space.
//
// It shows in one of two ways:
// - a block in a layout (`{ "mod": "outside" }`, or with `"props": { "show": "all" }` to
//   start with shells and scripts listed too): it fills the block, and narrower than 160 px
//   it is a rail of icons;
// - a window that floats over the layout: what `mod.open {name: "outside"}` leads to. Herdr
//   opens the mod as a dialog, and the dialog swaps itself for a window that stays open,
//   remembers where it was dropped and comes back on the next start. The same command
//   closes the window again.
//
// A right-click on a row opens a third copy as a popup: the spaces the terminal can go to.

import { View, div, image, svg } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { terminals, panes, machines, spaces, focused, run, theme, props, settings, notify, playSound, openOverlay, closeOverlay, nextCommand } from "herdr";
import { outside, news, labelOf, statusOf, machineOf } from "./pick.js";

const ART = "mods/outside/";
// Below this width the panel is a rail of icons, as Herdr's own sidebar panels are.
const RAIL = 160;
// The floating window: its width, and how tall its list gets before it scrolls.
// Its key is not the mod's name: `mod.open` calls its own dialog by that.
const WINDOW = { key: "outside-window", width: 280, rows: 12 };
const ROW = 30;
// The right-click menu: its width, its rows' height, and how many show before it scrolls.
const MENU = { width: 220, row: 28, rows: 8 };
const STATUS_WORD = { blocked: "Needs you", done: "Done", working: "Working", idle: "Idle" };

// The open window's overlay id, so `mod.open` closes the window when it is already there.
let openWindow = null;

// Each outside terminal's last status, to tell a change from a redraw. Module code is shared
// by every copy of the mod, so a window and a sidebar block announce a change once between them.
const seen = new Map();

// The program's icon from the app's table: a one-color glyph or a picture.
function icon(program, size, color) {
  if (!program?.icon) return div().w(size).h(size).flex_none();
  return program.tint ? svg(program.icon).size(size).flex_none().text_color(color) : image(program.icon).w(size).h(size).flex_none();
}

export default class Outside extends View {
  init(_props, cx) {
    const given = props() ?? {};
    // In a window: draw a close button, and size to the list.
    this.floats = Boolean(given.window);
    if (this.floats) {
      openWindow = given.overlay;
      // `outside.close` (a key, or `herdr-app do outside.close`) closes the window.
      cx.spawn(async () => {
        for (;;) if ((await nextCommand()) === "close") closeOverlay(given.overlay);
      });
    }
    // `mod.open` shows a mod as a dialog. This one is for keeping an eye on things, so the
    // dialog hands over to a window that stays, or closes the window if it is already open:
    // the command toggles, as it does for any mod.
    // The right-click menu of one row: the address it is for.
    this.menu = given.menu ?? null;
    this.handover = Boolean(given.overlay) && !this.floats && !this.menu;
    if (this.handover) {
      if (openWindow) closeOverlay(openWindow);
      else openOverlay({ mod: "outside", kind: "window", key: WINDOW.key, keep: true, width: WINDOW.width, props: { window: true } });
      closeOverlay(given.overlay);
    }
    // The header's filter is remembered; until it is used, a layout's `show` prop decides.
    const show = localStorage.getItem("show") ?? given.show;
    this.show = show === "all" ? "all" : "agents";
    this.folded = localStorage.getItem("folded") === "1";
    this.quiet = localStorage.getItem("quiet") === "1";
    this.hovered = null;
    this.width = Infinity;
  }

  // The window is going (its close button, `mod.open` again, or the app quitting).
  async close() {
    if (this.floats && openWindow === props()?.overlay) openWindow = null;
  }

  rows() {
    return outside(terminals(), {
      placed: new Set(panes().map((p) => p.terminal).filter(Boolean)),
      machines: machines().map((m) => m.name),
      show: this.show,
    });
  }

  // Herdr tells the person when an agent in a space needs them or finishes. It says nothing
  // about agents outside, so this does: a notification that peeks when clicked, and the sound.
  announce(rows) {
    for (const { terminal: k, status } of news(rows, seen)) {
      if (this.quiet) continue;
      const blocked = status === "blocked";
      const machine = machineOf(k.address);
      notify({
        title: `${labelOf(k)} ${blocked ? "needs you" : "finished"}`,
        body: (blocked && k.report?.msg) || (machine ? `Outside your spaces, on ${machine}` : "Outside your spaces"),
        level: blocked ? "warning" : "success",
        icon: k.program?.icon && !k.program.tint ? k.program.icon : undefined,
        action: { name: "terminal.peek", args: { terminal: k.address } },
      });
      if (settings()?.sounds?.enabled !== false) playSound(blocked ? "blocked" : "done");
    }
  }

  // What the status column shows: a turning ring, a dot, a check, or nothing.
  mark(t, status) {
    if (status === "working") return svg(`${ART}spinner.svg`).size(12).flex_none().text_color(t.working).spin(900);
    if (status === "done") return svg(`${ART}check.svg`).size(12).flex_none().text_color(t.done);
    if (status === "blocked") return div().w(8).h(8).mx(2).flex_none().rounded(4).bg(t.blocked);
    if (status === "idle") return div().w(6).h(6).mx(3).flex_none().rounded(3).bg(t.idle);
    return div().w(12).flex_none();
  }

  row(t, { terminal: k, depth }, here) {
    const status = statusOf(k);
    const machine = machineOf(k.address);
    // A terminal's pane must stay on its own machine: no tab for it in another machine's space.
    const hover = this.hovered === k.address && here === machine;
    const keep = div()
      .id(`keep-${k.address}`)
      .flex_none()
      .p(2)
      .rounded(4)
      .text_color(t.muted)
      .cursor_pointer()
      .hover((s) => s.bg(t.raised).text_color(t.foreground))
      .tooltip("Open as a tab in this space")
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .on_click((_e, cx) => {
        cx.stop_propagation();
        run("terminal.keep", { terminal: k.address });
        this.hovered = null;
        cx.notify();
      })
      .child(svg(`${ART}tab.svg`).size(14));
    return h_flex()
      .id(`row-${k.address}`)
      .h(ROW)
      .flex_none()
      .pl(8 + depth * 14)
      .pr(8)
      .gap(9)
      .items_center()
      .rounded(8)
      .cursor_pointer()
      .hover((s) => s.bg(t.hover))
      .tooltip([
        status === "blocked" && k.report?.msg ? `Needs you: ${k.report.msg}` : (STATUS_WORD[status] ?? k.program?.name ?? "Running"),
        k.address,
        k.cwd,
      ].filter(Boolean).join(" · "))
      .on_hover((over, cx) => {
        if (over) this.hovered = k.address;
        else if (this.hovered === k.address) this.hovered = null;
        cx.notify();
      })
      // In a window, a press that reaches Herdr drags the window.
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .on_click(() => run("terminal.peek", { terminal: k.address }))
      .on_mouse_down("right", (e, cx) => {
        cx.stop_propagation();
        openOverlay({ mod: "outside", kind: "popup", at: { x: e.position.x, y: e.position.y }, width: MENU.width, props: { menu: k.address } });
      })
      .child(icon(k.program, 16, t.foreground))
      .child(div().flex_1().min_w(0).truncate().text_color(status === "idle" || !status ? t.muted : t.foreground).child(labelOf(k)))
      .when(Boolean(machine), (el) => el.child(div().flex_none().text_size(10).text_color(t.dim).child(machine)))
      .when(hover, (el) => el.child(keep))
      .child(this.mark(t, status));
  }

  // The rail: one icon per terminal that nobody outside started, its status as a dot on the corner.
  rail(t, rows) {
    const color = { blocked: t.blocked, done: t.done, working: t.working };
    return v_flex().w_full().items_center().gap(6).py(8).children(
      rows.filter((r) => r.depth === 0).map(({ terminal: k }) =>
        div()
          .id(`rail-${k.address}`)
          .relative()
          .p(5)
          .rounded(8)
          .cursor_pointer()
          .hover((s) => s.bg(t.hover))
          .tooltip(labelOf(k))
          .on_click(() => run("terminal.peek", { terminal: k.address }))
          .child(icon(k.program, 18, t.foreground))
          .when(Boolean(color[statusOf(k)]), (el) =>
            el.child(div().absolute().top(2).right(2).w(7).h(7).rounded(4).bg(color[statusOf(k)])))));
  }

  header(t, count) {
    const all = this.show === "all";
    return h_flex()
      .id("outside-header")
      .h(32)
      .flex_none()
      .px(8)
      .gap(6)
      .items_center()
      .text_size(12)
      .text_color(t.muted)
      .when(!this.floats, (el) => el.cursor_pointer())
      .on_click((_e, cx) => {
        if (this.floats) return;
        this.folded = !this.folded;
        localStorage.setItem("folded", this.folded ? "1" : "0");
        cx.notify();
      })
      .when(!this.floats, (el) => el.child(svg(`${ART}${this.folded ? "chevron-right" : "chevron"}.svg`).size(12).flex_none().text_color(t.dim)))
      .child(div().when(this.floats, (el) => el.pl(4).text_color(t.foreground)).child("Outside"))
      .when(count > 0, (el) => el.child(div().text_color(t.dim).child(String(count))))
      .child(div().flex_1())
      .child(
        div()
          .id("outside-quiet")
          .flex_none()
          .p(3)
          .rounded(4)
          .text_color(t.dim)
          .hover((s) => s.bg(t.hover).text_color(t.foreground))
          .tooltip(this.quiet ? "Notifications are off. Click to hear when an agent here needs you or finishes." : "Notifies you when an agent here needs you or finishes. Click to turn off.")
          .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
          .on_click((_e, cx) => {
            cx.stop_propagation();
            this.quiet = !this.quiet;
            localStorage.setItem("quiet", this.quiet ? "1" : "0");
            cx.notify();
          })
          .child(svg(`${ART}${this.quiet ? "bell-off" : "bell"}.svg`).size(13)))
      .child(
        div()
          .id("outside-show")
          .flex_none()
          .p(3)
          .rounded(4)
          .text_color(all ? t.foreground : t.dim)
          .when(all, (el) => el.bg(t.raised))
          .hover((s) => s.bg(t.hover).text_color(t.foreground))
          .tooltip(all ? "Showing every terminal. Click for agents only." : "Showing agents. Click to add shells and scripts.")
          .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
          .on_click((_e, cx) => {
            cx.stop_propagation();
            this.show = all ? "agents" : "all";
            localStorage.setItem("show", this.show);
            cx.notify();
          })
          .child(svg(`${ART}filter.svg`).size(13)))
      .when(this.floats, (el) =>
        el.child(
          div()
            .id("outside-close")
            .flex_none()
            .p(3)
            .rounded(4)
            .text_color(t.dim)
            .hover((s) => s.bg(t.hover).text_color(t.foreground))
            .tooltip("Close")
            .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
            .on_click(() => closeOverlay(props().overlay))
            .child(svg(`${ART}close.svg`).size(13))));
  }

  // The right-click menu: the spaces on the terminal's machine. A click shows that space and
  // gives the terminal a tab there.
  spaceMenu(t) {
    const address = this.menu;
    const machine = machineOf(address);
    const choices = spaces().filter((s) => (s.machine ?? null) === machine);
    const close = () => closeOverlay(props().overlay);
    // A popup is as tall as its content, so the list has a height of its own.
    return v_flex()
      .id("outside-menu")
      .w(MENU.width)
      .p(6)
      .text_size(13)
      .child(div().h(24).px(8).text_size(11).text_color(t.dim).child("Add to space"))
      .child(
        v_flex()
          .id("outside-menu-rows")
          .max_h(MENU.rows * MENU.row)
          .overflow_y_scrollbar()
          .children(
            choices.map((s) =>
              h_flex()
                .id(`space-${s.id}`)
                .h(MENU.row)
                .flex_none()
                .px(8)
                .gap(8)
                .items_center()
                .rounded(6)
                .cursor_pointer()
                .hover((el) => el.bg(t.hover))
                .on_click(() => {
                  run("space.select", { id: s.id });
                  run("terminal.keep", { terminal: address });
                  close();
                })
                .child(div().flex_1().min_w(0).truncate().text_color(t.foreground).child(s.name))
                .when(s.active, (el) => el.child(div().flex_none().text_size(10).text_color(t.dim).child("shown")))))
          .when(choices.length === 0, (el) =>
            el.child(div().px(8).py(4).text_size(12).text_color(t.dim).child(
              machine ? `No space on ${machine} yet.` : "No space yet."))));
  }

  empty(t) {
    return div().px(4).py(2).text_size(12).text_color(t.dim).child(
      this.show === "all"
        ? "Nothing runs outside your spaces."
        : "No agents outside your spaces. One started with hc run shows up here.");
  }

  render() {
    if (this.handover) return div();
    const t = theme();
    if (this.menu) return this.spaceMenu(t);
    const rows = this.rows();
    this.announce(rows);
    const at = focused();
    // The machine of the shown space (null: this computer), or undefined when no space shows.
    const here = at ? (spaces().find((s) => s.id === at.space)?.machine ?? null) : undefined;
    const list = rows.map((r) => this.row(t, r, here));

    // A window is as tall as its list, up to a point; Herdr draws its frame.
    if (this.floats) {
      return v_flex()
        .id("outside")
        .w(WINDOW.width)
        .text_size(13)
        .child(this.header(t, rows.length))
        .child(
          v_flex()
            .id("outside-rows")
            .max_h(WINDOW.rows * (ROW + 1))
            .px(6)
            .pb(6)
            .gap(1)
            .overflow_y_scrollbar()
            .children(list)
            .when(rows.length === 0, (el) => el.child(this.empty(t))));
    }

    const root = v_flex()
      .id("outside")
      .size_full()
      .bg(t.chrome)
      .text_size(13)
      .on_size_change((size, cx) => {
        if (size.width === this.width) return;
        this.width = size.width;
        cx.notify();
      });
    if (this.width < RAIL) return root.child(this.rail(t, rows));
    return root
      .child(this.header(t, rows.length))
      .when(!this.folded, (el) =>
        el.child(
          v_flex()
            .id("outside-rows")
            .flex_1()
            .min_h(0)
            .px(6)
            .pb(6)
            .gap(1)
            .overflow_y_scrollbar()
            .children(list)
            .when(rows.length === 0, (el) => el.child(this.empty(t)))));
  }
}
