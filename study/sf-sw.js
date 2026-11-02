// proxy service worker — pure RPC router. delegates fetch+rewrite to the page
// controller; needs no engine/wasm here. scoped to /study/ so it never touches
// the rest of the origin.
importScripts('sf-ctl-sw.js');
addEventListener('fetch', (e) => {
    if ($internalController.shouldRoute(e)) { e.respondWith($internalController.route(e)); return; }
    // the worker is ephemeral: chrome kills it when idle and restarts it with an
    // EMPTY route table (routes are per-frame, registered by the page over RPC). in
    // that gap shouldRoute() is false — and a /study/uv/ request would fall through
    // to the STATIC origin (on an S3 link that's an <Error>AccessDenied white page
    // that then cascades). never let that happen: nudge clients to re-register, wait
    // briefly for the routes to come back, then route. self-heal, don't leak.
    let u; try { u = new URL(e.request.url); } catch { return; }
    if (!u.pathname.includes('/study/uv/')) return;   // sw's own assets -> normal passthrough
    e.respondWith((async () => {
        try { const cs = await self.clients.matchAll(); for (const c of cs) c.postMessage({ $controller$swrevive: {} }); } catch {}
        for (let i = 0; i < 16; i++) {                 // brief wait for a concurrent re-register
            if ($internalController.shouldRoute(e)) { try { return await $internalController.route(e); } catch { break; } }
            await new Promise(r => setTimeout(r, 75));
        }
        // routes never came back — for a top-level navigation, show a tiny page that
        // pings the parent (the out-of-scope controller page, which never gets
        // swrevive) to re-register the route, then reloads to re-boot the proxy frame.
        // capped so a truly dead worker can't thrash-reload forever.
        if (e.request.mode === 'navigate') {
            return new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title></title><body style="margin:0;height:100vh;display:grid;place-items:center;background:#0a0a0c;color:#8a8a95;font:14px/1.5 system-ui,-apple-system,sans-serif">Reconnecting…<script>(function(){try{parent.postMessage({$serumReroute:1},"*")}catch(e){}var n=0,t=0,w=Date.now();try{n=+sessionStorage.getItem("_srr_n")||0;t=+sessionStorage.getItem("_srr_t")||0}catch(e){}if(w-t>15000)n=0;n++;try{sessionStorage.setItem("_srr_n",n);sessionStorage.setItem("_srr_t",w)}catch(e){}if(n<=6)setTimeout(function(){location.reload()},600)})()<\/script>',
                { status: 200, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
        }
        return new Response('', { status: 503, headers: { 'cache-control': 'no-store' } });
    })());
});
