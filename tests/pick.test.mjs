import test from "node:test";
import assert from "node:assert/strict";
import { outside, labelOf, statusOf, isAgent, machineOf } from "../mods/outside/pick.js";

const agent = { key: "claude", name: "Claude Code", agent: true };
const shell = { key: "shell", name: "zsh", shell: true, agent: false };
let clock = 0;
const term = (address, more = {}) => ({ address, state: "live", labels: {}, parent: null, program: agent, status: "idle", created_ms: ++clock, ...more });
const addresses = (rows) => rows.map((r) => r.terminal.address);

test("a terminal with a space label or a pane is not outside", () => {
  const all = [term("t1", { labels: { "herdr.space": "s1" } }), term("t2"), term("t3")];
  assert.deepEqual(addresses(outside(all, { placed: new Set(["t3"]) })), ["t2"]);
});

test("finished terminals stay out", () => {
  assert.deepEqual(outside([term("t1", { state: "finished" })]), []);
});

test("a sub-agent of an agent in a space belongs to that space", () => {
  const all = [term("t1", { labels: { "herdr.space": "s1" } }), term("t2", { parent: "t1" }), term("t3", { parent: "t2" })];
  assert.deepEqual(outside(all), []);
});

test("an outside agent's sub-agents follow it, one level in", () => {
  const all = [term("t1"), term("t2", { parent: "t1" }), term("t3", { parent: "t2" }), term("t4")];
  assert.deepEqual(outside(all).map((r) => [r.terminal.address, r.depth]), [["t1", 0], ["t2", 1], ["t3", 2], ["t4", 0]]);
});

test("a sub-agent whose parent has ended stands on its own", () => {
  const all = [term("t1", { state: "finished" }), term("t2", { parent: "t1" })];
  assert.deepEqual(outside(all).map((r) => [r.terminal.address, r.depth]), [["t2", 0]]);
});

test("the most urgent tree comes first, then the oldest", () => {
  const all = [term("t1", { status: "idle" }), term("t2", { status: "working" }), term("t3", { status: "idle" }), term("t4", { parent: "t3", status: "blocked" })];
  assert.deepEqual(addresses(outside(all)), ["t3", "t4", "t2", "t1"]);
});

test('"agents" leaves shells and scripts out, "all" keeps them', () => {
  const all = [term("t1", { program: shell, status: null }), term("t2")];
  assert.deepEqual(addresses(outside(all)), ["t2"]);
  // The agent first: anything with a status is more urgent than a program without one.
  assert.deepEqual(addresses(outside(all, { show: "all" })), ["t2", "t1"]);
});

test("a shell that started an agent is kept for the agent's sake", () => {
  const all = [term("t1", { program: shell, status: null }), term("t2", { parent: "t1" })];
  assert.deepEqual(addresses(outside(all)), ["t1", "t2"]);
});

test("another machine's terminals show only when Herdr lists the machine", () => {
  const all = [term("studio/t1"), term("sandbox/t1"), term("t1")];
  assert.deepEqual(addresses(outside(all, { machines: [null, "studio"] })), ["studio/t1", "t1"]);
  assert.deepEqual(addresses(outside(all)), ["t1"]);
});

test("a loop in the parents ends instead of hanging", () => {
  const all = [term("t1", { parent: "t2" }), term("t2", { parent: "t1" })];
  assert.equal(outside(all).length <= 2, true);
});

test("labels: name, then what it reports, then its program", () => {
  assert.equal(labelOf(term("t1", { name: "fix-auth", title: "x" })), "fix-auth");
  assert.equal(labelOf(term("t1", { report: { title: "Fix the login loop" } })), "Fix the login loop");
  assert.equal(labelOf(term("t1", { title: "✳ Review the PR" })), "Review the PR");
  assert.equal(labelOf(term("t1")), "Claude Code");
  assert.equal(labelOf(term("t1", { program: shell, argv: ["/usr/local/bin/run-watch.sh"] })), "run-watch.sh");
  assert.equal(labelOf({ address: "t9" }), "t9");
});

test("status, agents and machines", () => {
  assert.equal(statusOf({ status: "error" }), "blocked");
  assert.equal(statusOf({ status: null }), null);
  assert.equal(statusOf({ status: "odd" }), null);
  assert.equal(isAgent({ program: shell, reported: true }), true);
  assert.equal(isAgent({ program: shell, status: null }), false);
  assert.equal(machineOf("studio/t7"), "studio");
  assert.equal(machineOf("t7"), null);
});
