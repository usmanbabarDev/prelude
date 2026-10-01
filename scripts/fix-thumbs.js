// Rewrites photo links in public/famous.json from Special:FilePath redirects to direct
// upload.wikimedia.org thumbnails (one request instead of a redirect; standard 330px size).
const fs = require("fs");
const path = require("path");
const { directThumb } = require("./thumbs");
const FILE = path.join(__dirname, "..", "public", "famous.json");
const data = JSON.parse(fs.readFileSync(FILE, "utf8"));
let n = 0;
for (const c of data.countries) for (const p of c.people) {
  const m = p.img && /Special:FilePath\/([^?]+)/.exec(p.img);
  if (m) { p.img = directThumb(decodeURIComponent(m[1])); n++; }
}
fs.writeFileSync(FILE, JSON.stringify(data));
console.log(`rewrote ${n} photo links`);
