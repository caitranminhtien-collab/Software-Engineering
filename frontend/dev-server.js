/* Development-only static server with same-origin reverse proxy to the
   EXISTING Hue Tourism Guide backend. No dependencies or CORS changes.
   Do not expose this development server publicly. */
'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');
const PORT = Number(process.env.FRONTEND_PORT || 8000);
const API_HOST = '127.0.0.1';
const API_PORT = 3000;
const root = __dirname;
const mime = { '.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon' };
const allowedFiles = new Set(['index.html','admin.html','app.js','admin-auth.js','styles.css','theme.css','split.css']);

http.createServer((req,res)=>{
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400); res.end('Bad request'); return; }
  if (pathname.startsWith('/api/v1/')) {
    const proxy = http.request({
      hostname:API_HOST,port:API_PORT,method:req.method,path:req.url,
      headers:{...req.headers,host:`${API_HOST}:${API_PORT}`},
      timeout:30000,
    }, upstream=>{
      res.writeHead(upstream.statusCode||502,{...upstream.headers,'cache-control':'no-store'});
      upstream.pipe(res);
    });
    proxy.on('timeout',()=>proxy.destroy(new Error('Backend timeout')));
    proxy.on('error',()=>{ if(!res.headersSent)res.writeHead(502,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify({error:{code:'BACKEND_UNAVAILABLE',message:'Backend chưa chạy tại localhost:3000'}})); });
    req.pipe(proxy);
    return;
  }
  if(req.method!=='GET'&&req.method!=='HEAD') {res.writeHead(405);res.end('Method Not Allowed');return;}
  const relative = pathname==='/'?'index.html':pathname.replace(/^\//,'');
  if(!allowedFiles.has(relative) && !/^assets\/[\w.-]+\.(png|jpg|jpeg|svg|ico)$/i.test(relative)) {res.writeHead(404);res.end('Not Found');return;}
  const file=path.resolve(root,relative);
  if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end('Forbidden');return;}
  fs.stat(file,(err,stat)=>{
    if(err||!stat.isFile()){res.writeHead(404);res.end('Not Found');return;}
    res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream', 'x-content-type-options':'nosniff'});
    if(req.method==='HEAD')res.end();else fs.createReadStream(file).pipe(res);
  });
}).listen(PORT,'127.0.0.1',()=>{
  console.log(`Hue Guide User:  http://localhost:${PORT}/`);
  console.log(`Hue Guide Admin: http://localhost:${PORT}/admin.html`);
  console.log(`Backend proxy:  http://localhost:${API_PORT}/api/v1`);
});
