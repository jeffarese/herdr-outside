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
//   remembers where it was dropped and comes back on the next start.

import { View, div, image, svg } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { terminals, panes, machines, spaces, focused, run, theme, props, openOverlay, closeOverlay } from "herdr";
import { outside, labelOf, statusOf, machineOf } from "./pick.js";

const ART = "mods/outside/";
// Below this width the panel is a rail of icons, as Herdr's own sidebar panels are.
const RAIL = 160;
// The floating window: its width, and how tall its list gets before it scrolls.
const WINDOW = { key: "outside", width: 280, rows: 12 };
const ROW = 30;
const STATUS_WORD = { blocked: "Needs you", done: "Done", working: "Working", idle: "Idle" };

// The program's icon from the app's table: a one-color glyph or a picture.
function icon(program, size, color) {
  if (!program?.icon) return div().w(size).h(size).flex_none();
  return program.tint ? svg(program.icon).size(size).flex_none().text_color(color) : image(program.icon).w(size).h(size).flex_none();
}

export default class Outside extends View {
  init() {
    const given = props() ?? {};
    // In a window: draw a close button, and size to the list.
    this.floats = Boolean(given.window);
    // `mod.open` shows a mod as a dialog. This one is for keeping an eye on things, so the
    // dialog hands over to a window that stays.
    this.handover = Boolean(given.overlay) && !this.floats;
    if (this.handover) {
      openOverlay({ mod: "outside", kind: "window", key: WINDOW.key, keep: true, width: WINDOW.width, props: { window: true } });
      closeOverlay(given.overlay);
    }
    // The header's filter is remembered; until it is used, a layout's `show` prop decides.
    const show = localStorage.getItem("show") ?? given.show;
    this.show = show === "all" ? "all" : "agents";
    this.folded = localStorage.getItem("folded") === "1";
    this.hovered = null;
    this.width = Infinity;
  }

  rows() {
    return outside(terminals(), {
      placed: new Set(panes().map((p) => p.terminal).filter(Boolean)),
      machines: machines().map((m) => m.name),
      show: this.show,
    });
  }

  // What the status column shows: a turning ring, a dot, a check, or nothing.
  mark(t, status) {
    if (status === "working") return svg(`${ART}spinner.svg`).size(12).flex_none().text_color(t.working).spin(900);
    if (status === "done") return svg(`${ART}check.svg`).size(12).flex_none().text_color(t.done);
    if (status === "blocked") return div().w(8).h(8).mx(2).flex_none().rounded(4).bg(t.blocked);
    if (status === "idle") return div().w(6).h(6).mx(3).flex_none().rounded(3).bg(t.idle);
    return div().w(12).flex_none();
  }

  row(t, { terminal: k, depth }, shown, here) {
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
      .when(k.address === shown, (el) => el.bg(t.selected))
      .hover((s) => s.bg(t.hover))
      .tooltip(`${STATUS_WORD[status] ?? k.program?.name ?? "Running"} · ${k.address}${k.cwd ? ` · ${k.cwd}` : ""}`)
      .on_hover((over, cx) => {
        if (over) this.hovered = k.address;
        else if (this.hovered === k.address) this.hovered = null;
        cx.notify();
      })
      // In a window, a press that reaches Herdr drags the window.
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .on_click(() => run("terminal.peek", { terminal: k.address }))
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

  empty(t) {
    return div().px(4).py(2).text_size(12).text_color(t.dim).child(
      this.show === "all"
        ? "Nothing runs outside your spaces."
        : "No agents outside your spaces. One started with hc run shows up here.");
  }

  render() {
    if (this.handover) return div();
    const t = theme();
    const rows = this.rows();
    const at = focused();
    const shown = at?.shown ?? null;
    // The machine of the shown space (null: this computer), or undefined when no space shows.
    const here = at ? (spaces().find((s) => s.id === at.space)?.machine ?? null) : undefined;
    const list = rows.map((r) => this.row(t, r, shown, here));

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
