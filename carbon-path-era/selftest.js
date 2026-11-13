// 用 Node + 假 DOM 跑 web-2d/game.js 的内置自检（?selftest=1）
// 用法：node __test.js
const fs = require("fs");
const vm = require("vm");
const path = require("path");

const captured = {};
const noop = () => {};

const gradient = { addColorStop: noop };
const ctx = new Proxy(
  {},
  {
    get(t, k) {
      if (k === "createLinearGradient" || k === "createRadialGradient") return () => gradient;
      if (k === "measureText") return (s) => ({ width: String(s).length * 10 });
      if (k in t) return t[k];
      return noop;
    },
    set(t, k, v) {
      t[k] = v;
      return true;
    },
  }
);

const canvasEl = {
  style: {},
  width: 0,
  height: 0,
  getContext: () => ctx,
  addEventListener: noop,
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 540, height: 1080 }),
};

const doc = {
  title: "",
  getElementById: () => canvasEl,
  createElement: () => ({ style: {}, setAttribute: noop, appendChild: noop, textContent: "" }),
  body: { setAttribute: (k, v) => { captured[k] = v; }, appendChild: noop },
};

const sandbox = {
  innerWidth: 540, innerHeight: 1080, devicePixelRatio: 1,
  addEventListener: noop,
  document: doc,
  location: { search: process.env.WEB2D_QS || "?selftest=1" },
  performance: { now: () => Date.now() },
  requestAnimationFrame: () => {},
  localStorage: { getItem: () => null, setItem: noop },
  URLSearchParams,
  Math,
  console,
};
// window === 全局对象，这样 data.js 里的 window.LEVELS 才能被 game.js 当裸标识符读到
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
sandbox.self = sandbox;

const ctxVm = vm.createContext(sandbox);
for (const f of ["data.js", "game.js"]) {
  const code = fs.readFileSync(path.join(__dirname, f), "utf8");
  vm.runInContext(code, ctxVm, { filename: f });
}

if (captured["data-shot"]) { console.log("SHOT: " + captured["data-shot"]); process.exit(0); }
const result = captured["data-result"] || "";
if (!result) {
  console.log("NO RESULT（自检没跑起来）");
  process.exit(1);
}
const lines = result.split(" | ");
let fail = 0;
for (const l of lines) {
  console.log(l);
  if (l.startsWith("FAIL")) fail++;
}
console.log(`\n${lines.length - fail}/${lines.length} passed`);
process.exit(fail === 0 ? 0 : 1);
