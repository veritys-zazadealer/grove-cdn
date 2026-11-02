
const CATALOG_ENDPOINT = '/_o/d/l';
const SERUM = window.parent && window.parent !== window ? window.parent.SerumOS : null;

// ---- filter cloak: render gaming text in Private-Use codepoints via the 'ck'
// font so keyword/DOM classifiers read gibberish while students see it normally.
function cloak(str) {
    let o = '';
    for (const ch of String(str)) { const c = ch.codePointAt(0); o += (c >= 0x20 && c <= 0x7e) ? String.fromCharCode(0xE000 + c) : ch; }
    return o;
}
function cloakTree(root) {
    if (!root) return;
    root.classList.add('ck');
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = []; let n; while (n = w.nextNode()) nodes.push(n);
    for (const t of nodes) { if (t.nodeValue && /\S/.test(t.nodeValue)) t.nodeValue = cloak(t.nodeValue); }
    root.querySelectorAll('[title],[aria-label]').forEach(el => {
        for (const a of ['title', 'aria-label']) { const v = el.getAttribute(a); if (v) el.setAttribute(a, cloak(v)); }
    });
}
// catalog decode — server sends base64(xor(json)); tolerant of plain json too
const _CK_KEY = 'srmLibKey42Qz';
function _ckDecode(b64) {
    const bin = atob(b64); const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i) ^ _CK_KEY.charCodeAt(i % _CK_KEY.length);
    return new TextDecoder().decode(out);
}

let catalog = [];
let categories = ['all'];
let currentCategory = 'all';
let currentQuery = '';
let heroTimer = null;
let heroIdx = 0;

async function loadCatalog() {
    try {
        const r = await fetch(CATALOG_ENDPOINT, { signal: AbortSignal.timeout(8000) });
        if (r.ok) {
            const txt = await r.text();
            let data; try { data = JSON.parse(txt); } catch { data = JSON.parse(_ckDecode(txt)); }
            const games = data?.games || [];
            if (games.length) { catalog = games; catalog.forEach((g, i) => { g._i = i; }); }
        }
    } catch {}
}

function buildCategories() {
    const set = new Set(['all']);
    for (const g of catalog) if (g.category) set.add(g.category);
    categories = [...set];
}
function isInstalled(id) { return !!SERUM?.library?.has(id); }
function libraryList() { return SERUM?.library?.list() || []; }

// recently played — module-local (the bridge exposes plays.get/record but no list)
const RECENT_KEY = 'serum.lib.recent';
function loadRecent() { try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || []; } catch { return []; } }
function pushRecent(id) {
    try { let a = loadRecent().filter(x => x !== id); a.unshift(id); a = a.slice(0, 14); localStorage.setItem(RECENT_KEY, JSON.stringify(a)); } catch {}
}
function recentList() { return loadRecent().map(id => catalog.find(g => g.id === id)).filter(Boolean); }
// single entry point for launching a game so "Jump back in" always stays current
function playGame(g) { if (!g) return; pushRecent(g.id); SERUM?.openGame?.(g); }

// favorites — saved via SerumSync (local when signed out, account when signed in)
const favs = new Map();
async function loadFavs() {
    try { const m = await SerumSync.all('game_fav'); favs.clear(); Object.values(m).forEach(g => { if (g && g.id) favs.set(g.id, g); }); } catch {}
}
function isFav(id) { return favs.has(id); }
function favsList() { return [...favs.keys()].map(id => catalog.find(g => g.id === id) || favs.get(id)).filter(Boolean); }
function toggleFav(g, btn) {
    if (favs.has(g.id)) { favs.delete(g.id); try { SerumSync.del('game_fav', g.id); } catch {} }
    else { favs.set(g.id, g); try { SerumSync.set('game_fav', g.id, g); } catch {} }
    const on = favs.has(g.id);
    if (btn) { btn.classList.toggle('on', on); const ic = btn.querySelector('i'); if (ic) ic.className = `ri-heart-${on ? 'fill' : 'line'}`; }
    if (currentCategory === 'favorites') renderActive();
}

function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function accentFor(g) {
    const palette = ['#ff8453','#5a8cff','#ff5a8c','#5affb6','#c75aff','#ffd45a','#5affef','#ff5a5a','#7c74ff','#2fd4d4'];
    const idx = Math.abs([...g.id].reduce((a, c) => a + c.charCodeAt(0), 0)) % palette.length;
    return palette[idx];
}
function thumbBg(g) {
    if (g.img) return `background-image: url('${g.img.replace(/'/g,'%27')}?w=1'); background-color: #0a0a0c;`;
    const a = accentFor(g);
    return `background: linear-gradient(145deg, ${a} 0%, ${a}66 55%, #0a0a0c 100%);`;
}
// lazy thumbs — render the base (color/gradient) immediately, defer the image
// to an IntersectionObserver so opening the page doesn't fire a burst of image
// requests (weaker network fingerprint + faster).
function thumbBase(g) {
    if (g.img) return 'background-color: #0a0a0c;';
    return thumbBg(g);
}
function thumbData(g) {
    return g.img ? ` data-bg="${escapeHTML(g.img.replace(/'/g, '%27'))}?w=1"` : '';
}
const _thumbObs = ('IntersectionObserver' in window) ? new IntersectionObserver((ents, obs) => {
    for (const e of ents) {
        if (!e.isIntersecting) continue;
        const el = e.target, u = el.getAttribute('data-bg');
        if (u) { el.style.backgroundImage = `url('${u}')`; el.removeAttribute('data-bg'); }
        obs.unobserve(el);
    }
}, { rootMargin: '300px' }) : null;
function observeThumbs(root) {
    if (!_thumbObs || !root) return;
    root.querySelectorAll('.thumb[data-bg], .fart[data-bg]').forEach(el => _thumbObs.observe(el));
}
function genThumbInner(g) {
    if (g.img) return '';
    const initials = (g.name || '?').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
    return `<div class="gen-thumb"><span class="ini">${escapeHTML(initials)}</span></div>`;
}
function pickN(arr, n, seed = 0) {
    const out = arr.slice();
    let s = seed || 1337;
    for (let i = out.length - 1; i > 0; i--) {
        s = (s * 9301 + 49297) % 233280;
        const j = Math.floor((s / 233280) * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out.slice(0, n);
}

// recommended — real + local: weight the categories you actually play / favorite /
// pin, then surface more games from those categories you haven't touched yet.
function recommendedList(n = 20) {
    const signal = [
        ...recentList(),
        ...favsList(),
        ...libraryList().map(x => catalog.find(g => g.id === x.id)).filter(Boolean)
    ];
    const seen = new Set(signal.map(g => g.id));
    // cold start (no history) — lead with featured, then a varied sample
    if (!signal.length) {
        const out = []; const add = g => { if (g && !out.some(x => x.id === g.id)) out.push(g); };
        catalog.filter(g => g.featured).forEach(add);
        pickN(catalog, n, 5).forEach(add);
        return out.slice(0, n);
    }
    const weight = {};
    signal.forEach(g => { if (g.category) weight[g.category] = (weight[g.category] || 0) + 1; });
    const topCats = Object.keys(weight).sort((a, b) => weight[b] - weight[a]);
    const picks = [];
    for (const cat of topCats) {
        const inCat = catalog.filter(g => g.category === cat && !seen.has(g.id));
        pickN(inCat, inCat.length, weight[cat] * 7 + 3).forEach(g => picks.push(g));
        if (picks.length >= n) break;
    }
    // pad if a thin history didn't fill the row
    if (picks.length < n) for (const g of catalog) {
        if (!seen.has(g.id) && !picks.some(x => x.id === g.id)) { picks.push(g); if (picks.length >= n) break; }
    }
    return picks.slice(0, n);
}

// card — cover art with the title + category tag overlaid (console-store style)
function cardHTML(g) {
    return `
    <div class="card" data-gi="${g._i}">
        <div class="art">
            <div class="thumb" style="${thumbBase(g)}"${thumbData(g)}>${genThumbInner(g)}</div>
            <span class="tag">${escapeHTML(g.category || 'game')}</span>
            <button class="fav-btn ${isFav(g.id) ? 'on' : ''}" data-act="fav" title="Favorite"><i class="ri-heart-${isFav(g.id) ? 'fill' : 'line'}"></i></button>
            <button class="play-ov" data-act="play" title="Play"><i class="ri-play-fill"></i></button>
            <div class="cap"><span class="cname">${escapeHTML(g.name)}</span></div>
        </div>
    </div>`;
}

function featHTML(picks) {
    const slides = picks.map((g, i) => `
        <div class="fslide ${i === 0 ? 'active' : ''}" data-i="${i}" data-gi="${g._i}">
            <div class="fart" style="${thumbBase(g)}"${thumbData(g)}></div>
            <div class="fscrim"></div>
            <div class="fbody">
                <span class="fcat">${escapeHTML(g.category || 'featured')}</span>
                <div class="fname">${escapeHTML(g.name)}</div>
                <div class="fmeta"><span>Instant play</span><span class="sep">·</span><span>No download</span><span class="sep">·</span><span>Free</span></div>
                <div class="factions">
                    <button class="btn primary" data-act="play"><i class="ri-play-fill"></i> Play now</button>
                    <button class="btn ghost" data-act="more"><i class="ri-information-line"></i> Details</button>
                </div>
            </div>
        </div>`).join('');
    const dots = picks.map((_, i) => `<button class="fdot ${i === 0 ? 'active' : ''}" data-i="${i}"></button>`).join('');
    return `<div class="feat" id="feat">${slides}<div class="fdots">${dots}</div></div>`;
}

// auto-scrolling marquee row — list duplicated so translateX(-50%) loops seamlessly
function shelfHTML(title, games, dur) {
    const items = games.concat(games).map(cardHTML).join('');
    return `<section class="shelf">
        <div class="shelf-head padded"><h3 class="shelf-title">${title}</h3></div>
        <div class="row-mask"><div class="marquee" style="--dur:${dur || 90}s">${items}</div></div>
    </section>`;
}

function renderStore() {
    const root = document.getElementById('content');
    const q = currentQuery.trim().toLowerCase();
    const browsing = (q || (currentCategory !== 'all'));

    let html = `<div class="padded"><div class="chips">`
        + `<button class="chip fav-chip ${currentCategory==='favorites'?'active':''}" data-ci="fav"><i class="ri-heart-fill"></i>Favorites</button>`
        + `${categories.map((c, ci) => `<button class="chip ${c===currentCategory?'active':''}" data-ci="${ci}">${c==='all'?'All':escapeHTML(c)}</button>`).join('')}</div></div>`;

    if (browsing) {
        const favView = currentCategory === 'favorites';
        const filtered = (favView ? favsList() : catalog).filter(g => {
            if (!favView && currentCategory !== 'all' && g.category !== currentCategory) return false;
            if (q) return g.name.toLowerCase().includes(q) || (g.category || '').toLowerCase().includes(q);
            return true;
        });
        const title = q ? 'Results' : favView ? 'Favorites' : (currentCategory === 'all' ? 'All Games' : currentCategory[0].toUpperCase() + currentCategory.slice(1));
        const emptyMsg = favView
            ? `<div class="empty"><i class="ri-heart-line"></i>No favorites yet — tap the heart on any game</div>`
            : `<div class="empty"><i class="ri-search-line"></i>No matches</div>`;
        html += `<div class="padded"><div class="section">
            <div class="section-head"><h3 class="section-title">${title}</h3><span class="section-meta">${filtered.length}</span></div>
            ${filtered.length ? `<div class="grid">${filtered.map(cardHTML).join('')}</div>` : emptyMsg}
        </div></div>`;
        root.innerHTML = html;
    } else {
        let featured = catalog.filter(g => g.featured).slice(0, 6);
        if (featured.length < 2) featured = pickN(catalog, 6, 3);
        const recent = recentList();
        const recommended = recommendedList(20);

        html += `<div class="padded">${featHTML(featured)}</div>`;
        if (recent.length) html += shelfHTML('Jump back in', recent, 80);
        if (recommended.length) html += shelfHTML('Recommended for you', recommended, 105);
        html += `<div class="padded"><div class="section">
            <div class="section-head"><h3 class="section-title">All Games</h3><span class="section-meta">${catalog.length}</span></div>
            <div class="grid">${catalog.slice(0, 72).map(cardHTML).join('')}</div>
        </div></div>`;
        root.innerHTML = html;
        startHero(featured);
    }
    wireAll(root);
    cloakTree(root);
    observeThumbs(root);
}

function startHero(picks) {
    if (heroTimer) clearInterval(heroTimer);
    heroIdx = 0;
    if (!picks.length) return;
    const slides = document.querySelectorAll('#feat .fslide');
    const dots = document.querySelectorAll('#feat .fdot');
    const setActive = (i) => {
        heroIdx = (i + picks.length) % picks.length;
        slides.forEach((s, k) => s.classList.toggle('active', k === heroIdx));
        dots.forEach((d, k) => d.classList.toggle('active', k === heroIdx));
    };
    const resetTimer = () => {
        if (heroTimer) clearInterval(heroTimer);
        heroTimer = setInterval(() => setActive(heroIdx + 1), 6500);
    };
    dots.forEach((d, k) => d.addEventListener('click', (e) => { e.stopPropagation(); setActive(k); resetTimer(); }));
    resetTimer();
}

function wireAll(root) {
    // chips
    root.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => {
        const ci = c.dataset.ci;
        currentCategory = (ci === 'fav') ? 'favorites' : categories[+ci];
        document.getElementById('shell').scrollTo({ top: 0, behavior: 'smooth' });
        renderActive();
    }));

    // cards — play overlay launches, heart favorites, body opens info modal
    root.querySelectorAll('.card').forEach(el => {
        const game = catalog[+el.dataset.gi];
        if (!game) return;
        el.addEventListener('click', (e) => {
            const favBtn = e.target.closest('[data-act="fav"]');
            if (favBtn) { e.stopPropagation(); toggleFav(game, favBtn); return; }
            if (e.target.closest('[data-act="play"]')) { e.stopPropagation(); playGame(game); return; }
            openModal(game);
        });
    });

    // featured hero — buttons direct, slide body opens modal
    root.querySelectorAll('.feat .fslide').forEach(slide => {
        const game = catalog[+slide.dataset.gi];
        if (!game) return;
        slide.querySelectorAll('.btn').forEach(b => {
            b.addEventListener('click', (e) => {
                e.stopPropagation();
                const act = b.dataset.act;
                if (act === 'play') playGame(game);
                else if (act === 'more') openModal(game);
            });
        });
        slide.addEventListener('click', () => openModal(game));
    });
}

// ===== modal =====
let modalGame = null;

function fmtRelative(ts) {
    if (!ts) return 'Never';
    const d = Math.floor((Date.now() - ts) / 1000);
    if (d < 60) return 'Just now';
    if (d < 3600) return `${Math.floor(d/60)}m ago`;
    if (d < 86400) return `${Math.floor(d/3600)}h ago`;
    if (d < 30 * 86400) return `${Math.floor(d/86400)}d ago`;
    return `${Math.floor(d / (30*86400))}mo ago`;
}

function describeGame(g) {
    const cat = g.category ? g.category[0].toUpperCase() + g.category.slice(1) : 'Game';
    const sourceMap = { a: 'Library One', b: 'Library Two', s: 'Library Three' };
    const src = sourceMap[(g.id || '').split(':')[0]] || 'Library';
    return `A ${cat.toLowerCase()} game from ${src}. Quick to load, plays straight in your browser. No downloads, no logins — get in and play.`;
}

function openModal(g) {
    modalGame = g;
    renderModal();
    document.getElementById('modal').hidden = false;
}
function closeModal() {
    document.getElementById('modal').hidden = true;
    modalGame = null;
}

function renderModal() {
    const g = modalGame; if (!g) return;
    const installed = isInstalled(g.id);
    const stats = SERUM?.plays?.get?.(g.id) || null;

    document.getElementById('modal-art').setAttribute('style', thumbBg(g));
    document.getElementById('modal-cat').textContent = (g.category || 'game').toUpperCase();
    document.getElementById('modal-name').textContent = g.name;

    const sourceMap = { a: 'Library One', b: 'Library Two', s: 'Library Three' };
    const src = sourceMap[(g.id || '').split(':')[0]] || 'Library';
    document.getElementById('modal-stats').innerHTML = `
        <span class="stat"><i class="ri-folder-line"></i><strong>${escapeHTML(src)}</strong></span>
        <span class="stat"><i class="ri-play-circle-line"></i><strong>${stats?.count || 0}</strong> plays</span>
        <span class="stat"><i class="ri-time-line"></i>Last <strong>${fmtRelative(stats?.last)}</strong></span>
        ${installed ? '<span class="stat" style="color:var(--good)"><i class="ri-pushpin-line"></i><strong>On desktop</strong></span>' : ''}
    `;
    document.getElementById('modal-desc').textContent = describeGame(g);

    const acts = document.getElementById('modal-actions');
    acts.innerHTML = `
        <button class="btn success" data-act="play"><i class="ri-play-fill"></i> Play</button>
        <button class="btn ghost2" data-act="fav"><i class="ri-heart-${isFav(g.id) ? 'fill' : 'line'}" ${isFav(g.id) ? 'style="color:#ff5a7a"' : ''}></i> ${isFav(g.id) ? 'Favorited' : 'Favorite'}</button>
        ${installed
            ? `<button class="btn ghost2" data-act="unpin"><i class="ri-pushpin-fill"></i> Remove from desktop</button>`
            : `<button class="btn primary" data-act="pin"><i class="ri-pushpin-line"></i> Add to desktop</button>`}
    `;
    cloakTree(document.querySelector('#modal .modal-card'));
    acts.querySelectorAll('.btn').forEach(b => b.addEventListener('click', () => {
        const act = b.dataset.act;
        if (act === 'play')       { playGame(g); closeModal(); }
        else if (act === 'fav')   { toggleFav(g); renderModal(); }
        else if (act === 'pin')   { SERUM?.library?.install(g);  renderModal(); renderActive(); }
        else if (act === 'unpin') { SERUM?.library?.uninstall(g.id); renderModal(); renderActive(); }
    }));
}

document.getElementById('modal').addEventListener('click', (e) => {
    if (e.target.dataset.close !== undefined || e.target.closest('[data-close]')) closeModal();
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !document.getElementById('modal').hidden) closeModal();
});

function renderActive() {
    const pinned = libraryList().length;
    const ht = document.getElementById('hero-title');
    if (ht && !ht.textContent) { ht.classList.add('ck'); ht.textContent = cloak('Games'); }
    const sh = document.getElementById('subhead');
    sh.classList.add('ck');
    sh.textContent = cloak(`${catalog.length} games${pinned ? ` · ${pinned} pinned to desktop` : ''}`);
    renderStore();
}

document.getElementById('search').addEventListener('input', (e) => {
    currentQuery = e.target.value;
    renderActive();
});

// skeleton while catalog loads
function renderSkeleton() {
    const root = document.getElementById('content');
    if (!root) return;
    const card = `<div class="sk-card"><div class="sk sk-square"></div><div class="sk sk-text sk-w70"></div><div class="sk sk-text sm sk-w40"></div></div>`;
    root.innerHTML = `<div class="sk-wrap">
        <div class="sk sk-hero" style="margin-bottom:28px"></div>
        <div class="sk sk-title" style="margin-bottom:16px"></div>
        <div class="sk-grid">${card.repeat(18)}</div>
    </div>`;
}

(async () => {
    renderSkeleton();
    await loadCatalog();
    buildCategories();
    renderActive();
    loadFavs().then(() => renderActive());
})();
