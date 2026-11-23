// Run the simulation tests under Node:  node js/test/node.mjs [regex]
import { runAll } from './tests.js';
const filter = process.argv[2] ? new RegExp(process.argv[2]) : null;
const res = await runAll((s) => console.log(s), filter);
process.exit(res.every((r) => r.pass) ? 0 : 1);
