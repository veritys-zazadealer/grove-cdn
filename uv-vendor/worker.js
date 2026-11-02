"use strict";(()=>{var h=self.Ultraviolet,O=["cross-origin-embedder-policy","cross-origin-opener-policy","cross-origin-resource-policy","content-security-policy","content-security-policy-report-only","expect-ct","feature-policy","origin-isolation","strict-transport-security","upgrade-insecure-requests","x-content-type-options","x-download-options","x-frame-options","x-permitted-cross-domain-policies","x-powered-by","x-xss-protection"],C=["GET","HEAD"],g=class extends h.EventEmitter{constructor(e=_sc){super(),e.prefix||(e.prefix="/service/"),this.config=e,this.bareClient=new h.BareClient}route({request:e}){return!!e.url.startsWith(location.origin+this.config.prefix)}async fetch({request:e}){let s;try{if(!e.url.startsWith(location.origin+this.config.prefix))return await fetch(e);let t=new h(this.config);typeof this.config.construct=="function"&&this.config.construct(t,"service");let w=await t.cookie.db();t.meta.origin=location.origin,t.meta.base=t.meta.url=new URL(t.sourceUrl(e.url));let o=new v(e,t,C.includes(e.method.toUpperCase())?null:await e.blob());if(t.meta.url.protocol==="blob:"&&(o.blob=!0,o.base=o.url=new URL(o.url.pathname)),e.referrer&&e.referrer.startsWith(location.origin)){let i=new URL(t.sourceUrl(e.referrer));(o.headers.origin||t.meta.url.origin!==i.origin&&e.mode==="cors")&&(o.headers.origin=i.origin),o.headers.referer=i.href}let f=await t.cookie.getCookies(w)||[],x=t.cookie.serialize(f,t.meta,!1);o.headers["user-agent"]=navigator.userAgent,x&&(o.headers.cookie=x);let p=new u(o,null,null);if(this.emit("request",p),p.intercepted)return p.returnValue;s=o.blob?"blob:"+location.origin+o.url.pathname:o.url;let c=await this.bareClient.fetch(s,{headers:o.headers,method:o.method,body:o.body,credentials:o.credentials,mode:o.mode,cache:o.cache,redirect:o.redirect}),r=new y(o,c),l=new u(r,null,null);if(this.emit("beforemod",l),l.intercepted)return l.returnValue;for(let i of O)r.headers[i]&&delete r.headers[i];if(r.headers.location&&(r.headers.location=t.rewriteUrl(r.headers.location)),["document","iframe"].includes(e.destination)){let i=r.getHeader("content-disposition");if(!/\s*?((inline|attachment);\s*?)filename=/i.test(i)){let n=/^\s*?attachment/i.test(i)?"attachment":"inline",[m]=new URL(c.finalURL).pathname.split("/").slice(-1);r.headers["content-disposition"]=`${n}; filename=${JSON.stringify(m)}`}}if(r.headers["set-cookie"]&&(Promise.resolve(t.cookie.setCookies(r.headers["set-cookie"],w,t.meta)).then(()=>{self.clients.matchAll().then(function(i){i.forEach(function(n){n.postMessage({msg:"updateCookies",url:t.meta.url.href})})})}),delete r.headers["set-cookie"]),r.body)switch(e.destination){case"script":r.body=t.js.rewrite(await c.text());break;case"worker":{let i=[t.bundleScript,t.clientScript,t.configScript,t.handlerScript].map(n=>JSON.stringify(n)).join(",");r.body=`if (!self.__uv) {
                                ${t.createJsInject(t.cookie.serialize(f,t.meta,!0),e.referrer)}
                            importScripts(${i});
                            }
`,r.body+=t.js.rewrite(await c.text())}break;case"style":r.body=t.rewriteCSS(await c.text());break;case"iframe":case"document":if(r.getHeader("content-type")&&r.getHeader("content-type").startsWith("text/html")){let i=await c.text();if(Array.isArray(this.config.inject)){let n=i.indexOf("<head>"),m=i.indexOf("<HEAD>"),b=i.indexOf("<body>"),k=i.indexOf("<BODY>"),S=new URL(s),U=this.config.inject;for(let d of U)new RegExp(d.host).test(S.host)&&(d.injectTo==="head"?(n!==-1||m!==-1)&&(i=i.slice(0,n)+`${d.html}`+i.slice(n)):d.injectTo==="body"&&(b!==-1||k!==-1)&&(i=i.slice(0,b)+`${d.html}`+i.slice(b)))}r.body=t.rewriteHtml(i,{document:!0,injectHead:t.createHtmlInject(t.handlerScript,t.bundleScript,t.clientScript,t.configScript,t.cookie.serialize(f,t.meta,!0),e.referrer)})}break;default:break}return o.headers.accept==="text/event-stream"&&(r.headers["content-type"]="text/event-stream"),crossOriginIsolated&&(r.headers["Cross-Origin-Embedder-Policy"]="require-corp"),this.emit("response",l),l.intercepted?l.returnValue:new Response(r.body,{headers:r.headers,status:r.status,statusText:r.statusText})}catch(t){return["document","iframe"].includes(e.destination)?(console.error(t),T(t,s)):new Response(void 0,{status:500})}}static Ultraviolet=h};self.UVServiceWorker=g;var y=class{constructor(e,s){this.request=e,this.raw=s,this.ultraviolet=e.ultraviolet,this.headers={};for(let t in s.rawHeaders)this.headers[t.toLowerCase()]=s.rawHeaders[t];this.status=s.status,this.statusText=s.statusText,this.body=s.body}get url(){return this.request.url}get base(){return this.request.base}set base(e){this.request.base=e}getHeader(e){return Array.isArray(this.headers[e])?this.headers[e][0]:this.headers[e]}},v=class{constructor(e,s,t=null){this.ultraviolet=s,this.request=e,this.headers=Object.fromEntries(e.headers.entries()),this.method=e.method,this.body=t||null,this.cache=e.cache,this.redirect=e.redirect,this.credentials="omit",this.mode=e.mode==="cors"?e.mode:"same-origin",this.blob=!1}get url(){return this.ultraviolet.meta.url}set url(e){this.ultraviolet.meta.url=e}get base(){return this.ultraviolet.meta.base}set base(e){this.ultraviolet.meta.base=e}},u=class{#e;#t;constructor(e={},s=null,t=null){this.#e=!1,this.#t=null,this.data=e,this.target=s,this.that=t}get intercepted(){return this.#e}get returnValue(){return this.#t}respondWith(e){this.#t=e,this.#e=!0}};function E(a,e){let s=`
// set error info
document.getElementById('errorTrace').value = ${JSON.stringify(a)};
document.getElementById('fetchedURL').textContent = ${JSON.stringify(e)};

// copy error trace
document.getElementById('copy-btn').addEventListener('click', async () => {
    var t = document.getElementById('errorTrace').value;
    try { await navigator.clipboard.writeText(t); } catch(x) {
        var ta = document.createElement('textarea'); ta.value = t;
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    }
    var b = document.getElementById('copy-btn'); b.textContent = 'Copied!';
    setTimeout(function(){ b.textContent = 'Copy Error'; }, 2000);
});

// toggle error details
document.getElementById('toggle-trace').addEventListener('click', function() {
    var w = document.getElementById('trace-wrap');
    var b = document.getElementById('toggle-trace');
    if (w.style.display === 'none') { w.style.display = 'block'; b.textContent = 'Hide Details'; }
    else { w.style.display = 'none'; b.textContent = 'Show Details'; }
});

// hard refresh - reload the actual page, not just the iframe
document.getElementById('hard-refresh').addEventListener('click', function() { try { window.top.location.reload(true); } catch(e) { window.location.reload(true); } });

// nuke site data and reload
document.getElementById('clear-data').addEventListener('click', async function() {
    try {
        var regs = await navigator.serviceWorker.getRegistrations();
        for (var r of regs) await r.unregister();
    } catch(e) {}
    try {
        var keys = await caches.keys();
        for (var k of keys) await caches.delete(k);
    } catch(e) {}
    try { localStorage.clear(); } catch(e) {}
    try { sessionStorage.clear(); } catch(e) {}
    try { window.top.location.reload(true); } catch(e) { window.location.reload(true); }
});
`;return`<!DOCTYPE html>
<html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Error - Infamous</title>
<style>*{margin:0;padding:0;box-sizing:border-box}
body{background:#0a0a0a;color:#a0a0a0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
.card{background:#141414;border:1px solid #1e1e1e;border-radius:12px;padding:40px;max-width:560px;width:100%}
h1{color:#fff;font-size:22px;font-weight:600;margin-bottom:8px}
.url-line{color:#e25858;font-size:14px;margin-bottom:24px;word-break:break-all}
.url-line span{color:#a0a0a0}
.section{margin-bottom:20px}
.section-title{color:#ccc;font-size:13px;font-weight:500;margin-bottom:8px}
textarea{background:#0e0e0e;color:#888;border:1px solid #1e1e1e;border-radius:8px;width:100%;height:120px;padding:12px;font-family:monospace;font-size:12px;resize:vertical;outline:none}
textarea:focus{border-color:#333}
select{background:#0e0e0e;color:#ccc;border:1px solid #1e1e1e;border-radius:8px;width:100%;padding:10px 12px;font-size:14px;outline:none;cursor:pointer;-webkit-appearance:none;appearance:none}
select:focus{border-color:#333}
.btn{display:inline-block;padding:10px 20px;border-radius:8px;border:1px solid #1e1e1e;background:#1a1a1a;color:#ccc;font-size:13px;cursor:pointer;transition:background .2s,border-color .2s}
.btn:hover{background:#222;border-color:#333}
.btn-accent{background:#e25858;border-color:#e25858;color:#fff}
.btn-accent:hover{background:#c94444;border-color:#c94444}
.btn-sm{padding:6px 14px;font-size:12px}
.btn-row{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}
.tips{font-size:13px;line-height:1.7;padding-left:18px}
.tips li{margin-bottom:4px}
.server-info{color:#888;font-size:12px;margin-top:6px;margin-bottom:8px}
.footer{margin-top:24px;padding-top:16px;border-top:1px solid #1e1e1e;display:flex;justify-content:space-between;align-items:center;font-size:12px;color:#555}
.footer a{color:#e25858;text-decoration:none}
.footer a:hover{text-decoration:underline}
#trace-wrap{display:none}
@media(max-width:600px){.card{padding:24px 16px}h1{font-size:18px}.footer{flex-direction:column;gap:8px;text-align:center}}</style></head>
<body>
<div class="card">
<h1>Something went wrong</h1>
<div class="url-line"><span>Failed to load:</span> <b id="fetchedURL"></b></div>
<div class="section">
<button class="btn btn-sm" id="toggle-trace">Show Details</button>
<div id="trace-wrap" style="margin-top:8px">
<textarea id="errorTrace" readonly></textarea>
<button class="btn btn-sm" id="copy-btn" style="margin-top:6px">Copy Error</button>
</div>
</div>
<div class="section">
<div class="section-title">Troubleshooting</div>
<ol class="tips">
<li><b>Click Clear Site Data</b> below to reset everything</li>
<li>Page will reload automatically \u2014 wait for "proxy ready" notification</li>
<li>Try browsing again once the proxy is ready</li>
<li>Double-check the URL you entered</li>
</ol>
</div>
<div class="btn-row">
<button class="btn btn-accent" id="clear-data">Clear Site Data</button>
<button class="btn" id="hard-refresh">Hard Refresh</button>
</div>
<div class="footer">
<span>Ultraviolet v3.2.10</span>
<a href="https://discord.gg/NSF6nfryW3" target="_blank">Need help? Join Discord</a>
</div>
</div>
<script src="${"data:application/javascript,"+encodeURIComponent(s)}"><\/script>
</body></html>
`}function T(a,e){let s={"content-type":"text/html"};return crossOriginIsolated&&(s["Cross-Origin-Embedder-Policy"]="require-corp"),new Response(E(String(a),e),{status:500,headers:s})}})();
