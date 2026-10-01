// Direct Wikimedia Commons thumbnail URL for a file name (Commons hashes the name with MD5).
const crypto = require("crypto");
function directThumb(fileName, width = 330) {
  if (!fileName) return null;
  const name = fileName.replace(/ /g, "_");
  const h = crypto.createHash("md5").update(name).digest("hex");
  const enc = encodeURIComponent(name);
  const ext = name.split(".").pop().toLowerCase();
  const suffix = ext === "svg" ? ".png" : ext === "tif" || ext === "tiff" ? ".jpg" : "";
  const prefix = ext === "tif" || ext === "tiff" ? "lossy-page1-" : "";
  return `https://upload.wikimedia.org/wikipedia/commons/thumb/${h[0]}/${h.slice(0, 2)}/${enc}/${prefix}${width}px-${enc}${suffix}`;
}
module.exports = { directThumb };
