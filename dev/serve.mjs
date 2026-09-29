import http from "node:http"; import fs from "node:fs"; import path from "node:path";
const pub = path.resolve("public"); const types = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript" };
http.createServer((q, s) => {
  const u = new URL(q.url, "http://x");
  if (u.pathname.startsWith("/api/result/")) { s.writeHead(200, { "content-type": "application/json" }); return s.end(fs.readFileSync("dev/demo.json")); }
  let f = u.pathname === "/" ? "/index.html" : /^\/r\//.test(u.pathname) ? "/result.html" : u.pathname;
  const p = path.join(pub, f); if (!fs.existsSync(p)) { s.writeHead(404); return s.end(); }
  s.writeHead(200, { "content-type": types[path.extname(p)] || "text/plain" }); s.end(fs.readFileSync(p));
}).listen(8788);
