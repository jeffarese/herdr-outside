// Packaged with each independently installed sidebar mod. Herdr gives a block its props,
// but no parent id, so find its column in the live layout before offering a resize.
import { div, svg } from "gpui-kit";
import { layout, panes, placement, props, run, shared, setShared, theme, window } from "herdr";

const holdsWork = node => Boolean(node?.content?.tab || node?.content?.terminal || node?.content?.agent)
  || (node?.children ?? []).some(holdsWork);

function containingSidebar(root, mod, given) {
  let match = null;
  let matched = false;
  let ambiguous = false;
  function visit(node, sidebar) {
    if (!node || node.hidden) return;
    if (node.content?.mod === mod && (node.content.props?.spot ?? null) === (given.spot ?? null)
        && (node.content.props?.block ?? null) === (given.block ?? null)) {
      if (matched && match?.node !== sidebar?.node) ambiguous = true;
      matched = true;
      match = sidebar;
    }
    const children = node.children ?? [];
    const tabs = !sidebar && node.type === "row" ? children.findIndex(holdsWork) : -1;
    const active = node.type === "stack" ? node.active ?? children.find(c => !c.hidden)?.id : null;
    children.forEach((child, i) => {
      if (active && active !== child.id) return;
      const beside = tabs >= 0 && i !== tabs && !holdsWork(child);
      visit(child, beside ? { node: child, side: i < tabs ? "left" : "right" } : sidebar);
    });
  }
  visit(root, null);
  return ambiguous ? null : match;
}

export function currentSidebar(mod) {
  const given = props() ?? {};
  if (given.overlay || given.pane || placement()) return null;
  if (!given.block && !given.spot && panes().some(p => p.mod === mod)) return null;
  return containingSidebar(layout(), mod, given);
}

// A sidebar holds several of these mods, and each would draw its own toggle. Only the topmost
// shown one does. The shipped brand row counts too, except where it draws none (its footer,
// and the macOS rail).
const TOGGLERS = new Set(["agent-sidebar", "agent-toast", "bar", "github-prs", "herdr-stats", "mod-hub", "outside", "running", "team-agents"]);

function ownsToggle(sidebar, mod, given) {
  const collapsed = (sidebar.size?.px ?? Infinity) < 160;
  let first = null;
  function visit(node) {
    if (first || !node || node.hidden) return;
    const content = node.content;
    if (content?.mod === "workspace-chrome") {
      if (sidebar.id === "sidebar" && !content.props?.footer && !(collapsed && window()?.platform === "macos")) first = content;
    } else if (content?.mod && (TOGGLERS.has(content.mod) || content.mod === mod)) first = content;
    if (first) return;
    const children = node.children ?? [];
    const active = node.type === "stack" ? node.active ?? children.find(c => !c.hidden)?.id : null;
    for (const child of children) if (!active || active === child.id) visit(child);
  }
  visit(sidebar);
  return !first || (first.mod === mod && (first.props?.spot ?? null) === (given.spot ?? null)
    && (first.props?.block ?? null) === (given.block ?? null));
}

export function sidebarButton(mod, width, { expandId = "expand", fallback = 320 } = {}) {
  const dock = currentSidebar(mod);
  if (!dock?.node.id || (dock.node.min ?? 0) >= 160) return null;
  if (!ownsToggle(dock.node, mod, props() ?? {})) return null;
  const { node, side } = dock;
  const previous = node.size?.px ?? width;
  const expand = previous < 160;
  const stock = node.id === "sidebar";
  const key = stock ? "sidebar.width" : `sidebar.width.${node.id}`;
  const label = `${expand ? "Expand" : "Collapse"} ${side} sidebar`;
  const icon = side === "left" ? "mods/workspace-chrome/sidebar.svg" : `mods/${mod}/sidebar-right.svg`;
  const t = theme();
  return div().id(expand ? expandId : "collapse").size(26).flex_none().rounded(6).flex().items_center().justify_center()
    .role("button").accessibility_label(label).tooltip(label).cursor_pointer()
    .text_color(t.muted).hover(s => s.bg(t.hover).text_color(t.foreground))
    .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
    .on_click((_e, cx) => {
      cx?.stop_propagation();
      if (!expand && Number.isFinite(previous) && previous >= 160) setShared(key, previous);
      if (stock) setShared("sidebar.collapsed", !expand);
      const saved = Number(shared(key));
      const rail = stock ? (window()?.platform === "macos" ? 76 : 44) : 52;
      run("layout.resize", { id: node.id, px: expand ? (Number.isFinite(saved) && saved >= 160 ? saved : fallback) : rail });
    })
    .child(svg(icon).size(15));
}
