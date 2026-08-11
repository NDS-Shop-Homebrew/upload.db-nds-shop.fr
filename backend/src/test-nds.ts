import fs from "fs";
import { analyzeNds } from "./lib/nds.ts";

const dir = "C:\\Users\\Rinzler\\Downloads\\roms NDS";
for (const f of fs.readdirSync(dir).slice(0, 4)) {
  const meta = analyzeNds(fs.readFileSync(dir + "\\" + f));
  const b64 = meta.icon.split(",")[1];
  fs.writeFileSync("C:\\Users\\Rinzler\\AppData\\Local\\Temp\\opencode\\icon-" + f.slice(0, 8).replace(/[^a-z0-9]/gi, "") + ".png", Buffer.from(b64, "base64"));
  console.log("écrit icône pour", f.slice(0, 20));
}
