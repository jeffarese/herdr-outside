// Which herdr-core terminals are outside Herdr's spaces, and how each one shows.
// No app imports here, so `node --test` can run it.

const RANK = { blocked: 4, done: 3, working: 2, idle: 1 };

/** An agent's status as one of Herdr's four words, or null for a program that reports none. */
export function statusOf(t) {
  const s = t.status === "error" ? "blocked" : t.status;
  return s in RANK ? s : null;
}

/** A coding agent, or any program that reports a status. */
export const isAgent = (t) => Boolean(t.program?.agent || t.reported || statusOf(t));

/** The machine an address is on (`studio/t7` is on studio), or null for this computer. */
export const machineOf = (address) => (address.includes("/") ? address.slice(0, address.indexOf("/")) : null);

const clean = (s) => (s ?? "").replace(/^[^\p{L}\p{N}]+/u, "").trim();
const base = (path) => (path ?? "").split(/[\\/]/).pop();

/** What to call a terminal: its name, else what it says it is doing, else its program. */
export function labelOf(t) {
  return t.name
    || clean(t.report?.title)
    || clean(t.title)
    || t.template
    || (t.program?.agent ? t.program.name : base(t.argv?.[0]))
    || t.program?.name
    || t.address;
}

/**
 * The terminals Herdr's window has no place for, as rows in display order.
 *
 * A terminal is outside when it is live, has no `herdr.space` label and no pane, and none of
 * its ancestors has a place either: a sub-agent belongs to the tab of the agent that started
 * it, and the Agents list already shows it there.
 *
 * `placed`: addresses that have a pane. `machines`: the machines Herdr lists (null is this
 * computer); terminals on any other machine, such as an agent's short-lived sandbox, stay out.
 * `show`: "agents" keeps only trees that hold an agent, "all" keeps shells and scripts too.
 *
 * Returns [{ terminal, depth }]: each outside terminal that nobody outside started (depth 0),
 * the most urgent first, followed by the terminals it started.
 */
export function outside(all, { placed = new Set(), machines = [null], show = "agents" } = {}) {
  const known = new Set(machines);
  const live = all.filter((t) => t.state === "live" && known.has(machineOf(t.address)));
  const byAddress = new Map(live.map((t) => [t.address, t]));
  const hasPlace = (t) => Boolean(t.labels?.["herdr.space"]) || placed.has(t.address);

  // Walks up the parents; a loop in them (never seen, but the data is not ours) ends the walk.
  const ancestors = (t) => {
    const up = [];
    const seen = new Set([t.address]);
    for (let p = byAddress.get(t.parent); p && !seen.has(p.address); p = byAddress.get(p.parent)) {
      up.push(p);
      seen.add(p.address);
    }
    return up;
  };

  const out = live.filter((t) => !hasPlace(t) && !ancestors(t).some(hasPlace));
  const isOut = new Set(out.map((t) => t.address));
  const kids = new Map();
  const roots = [];
  for (const t of out) {
    if (isOut.has(t.parent) && t.parent !== t.address) {
      if (!kids.has(t.parent)) kids.set(t.parent, []);
      kids.get(t.parent).push(t);
    } else {
      roots.push(t);
    }
  }

  const tree = (t, depth, seen) => {
    if (seen.has(t.address)) return [];
    seen.add(t.address);
    return [{ terminal: t, depth }, ...(kids.get(t.address) ?? []).sort(order).flatMap((k) => tree(k, depth + 1, seen))];
  };
  const urgency = (rows) => Math.max(0, ...rows.map((r) => RANK[statusOf(r.terminal)] ?? 0));

  return roots
    .map((t) => tree(t, 0, new Set()))
    .filter((rows) => show === "all" || rows.some((r) => isAgent(r.terminal)))
    .sort((a, b) => urgency(b) - urgency(a) || order(a[0].terminal, b[0].terminal))
    .flat();
}

/**
 * What changed that is worth telling the person: the rows that became blocked or done since
 * `before`, a Map of address -> status that this call brings up to date. A terminal seen for
 * the first time tells nothing, whatever its status: it may have been waiting for hours.
 */
export function news(rows, before) {
  const told = [];
  const now = new Map();
  for (const { terminal } of rows) {
    const status = statusOf(terminal);
    now.set(terminal.address, status);
    if (!before.has(terminal.address) || before.get(terminal.address) === status) continue;
    if (status === "blocked" || status === "done") told.push({ terminal, status });
  }
  before.clear();
  for (const [address, status] of now) before.set(address, status);
  return told;
}

// Oldest first, so a list doesn't reshuffle as terminals come and go; address breaks ties.
function order(a, b) {
  return (a.created_ms ?? 0) - (b.created_ms ?? 0) || a.address.localeCompare(b.address, undefined, { numeric: true });
}
