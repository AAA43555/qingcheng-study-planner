import { readFileSync } from "node:fs";
import { deflateRawSync } from "node:zlib";

const json = readFileSync(process.argv[2] || "design.json", "utf8");
console.log("https://lnkiai.github.io/m3e-canvas/#docz=" + deflateRawSync(json).toString("base64url"));
