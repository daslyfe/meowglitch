'use strict';

/* ------------------------------------------------------------------
   File browser: folders the user adds, starred and recent files, a
   search over every folder, and a preview of the selected image.
   Uses the File System Access API where available (Chrome, Edge), so
   folders and stars survive a reload; elsewhere a folder picked with
   <input webkitdirectory> lasts for the session only.
   Shares globals with app.js ($, el, clamp, loadFiles, setStatus).
------------------------------------------------------------------ */

const IMG_RE = /\.(png|jpe?g|webp|gif|avif|bmp)$/i;
const BROWSER_MIME = 'application/x-meowglitch-file';
const RECENT_MAX = 40;
const SEARCH_MAX = 500;

// Tiny IndexedDB key-value store. Directory handles can only be kept here.
const kv = (() => {
  let dbp = null;
  const open = () => (dbp ||= new Promise((res, rej) => {
    const r = indexedDB.open('meowglitch', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  }));
  const tx = async (mode, fn) => {
    const db = await open();
    return new Promise((res, rej) => {
      const t = db.transaction('kv', mode);
      const req = fn(t.objectStore('kv'));
      t.oncomplete = () => res(req.result);
      t.onerror = () => rej(t.error);
    });
  };
  return {
    get: (k) => tx('readonly', (s) => s.get(k)).catch(() => undefined),
    set: (k, v) => tx('readwrite', (s) => s.put(v, k)).catch(() => undefined),
  };
})();

const B = {
  tab: 'all', // 'all' | 'starred' | 'recent'
  roots: [], // { id, name, handle?, temp?, needsAccess?, node }
  stars: [], // { rootId, path, kind, name }
  recent: [], // { rootId, path, kind, name }
  top: { starred: [], recent: [], search: [] },
  rows: [],
  sel: null,
  query: '',
  searching: false,
  searchTok: 0,
  previewTok: 0,
  previewUrl: null,
  drag: null,
};

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
const join = (a, b) => (a ? a + '/' + b : b);
const nodeKey = (n) => n.root.id + ':' + n.path;
const entryKey = (e) => e.rootId + ':' + e.path;
const toEntry = (n) => ({ rootId: n.root.id, path: n.path, kind: n.kind, name: n.name });
const byKindName = (a, b) => (a.kind === b.kind
  ? a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
  : a.kind === 'dir' ? -1 : 1);

function mkNode(root, parent, kind, name, path, extra = {}) {
  return { root, parent, kind, name, path, children: null, open: false, ...extra };
}

function fmtSize(n) {
  if (n < 1024) return n + 'B';
  if (n < 1048576) return (n / 1024).toFixed(1) + 'K';
  return (n / 1048576).toFixed(1) + 'M';
}

/* ---------------- tree data ---------------- */

async function listDir(node) {
  if (node.children) return node.children;
  if (node.root.needsAccess || !node.handle) return [];
  const kids = [];
  try {
    for await (const h of node.handle.values()) {
      if (h.name.startsWith('.')) continue;
      if (h.kind === 'directory') kids.push(mkNode(node.root, node, 'dir', h.name, join(node.path, h.name), { handle: h }));
      else if (IMG_RE.test(h.name)) kids.push(mkNode(node.root, node, 'file', h.name, join(node.path, h.name), { handle: h }));
    }
  } catch (err) {
    console.error(err);
    setStatus('! COULD NOT READ ' + node.name.toUpperCase(), true);
  }
  kids.sort(byKindName);
  node.children = kids;
  return kids;
}

const getNodeFile = (n) => (n.file ? Promise.resolve(n.file) : n.handle.getFile());

function missingNode(e, why) {
  return mkNode({ id: e.rootId, name: '?' }, null, e.kind, e.name, e.path, { missing: why, children: [] });
}

// Finds a starred or recent entry in the current roots.
async function resolveEntry(e) {
  const root = B.roots.find((r) => r.id === e.rootId);
  if (!root) return missingNode(e, 'MISSING');
  if (root.needsAccess) return missingNode(e, 'NO ACCESS');
  let node = root.node;
  for (const seg of e.path.split('/').filter(Boolean)) {
    node = (await listDir(node)).find((k) => k.name === seg);
    if (!node) return missingNode(e, 'MISSING');
  }
  return node;
}

/* ---------------- persistence ---------------- */

const saveRoots = () => kv.set('roots', B.roots.filter((r) => !r.temp).map(({ id, name, handle }) => ({ id, name, handle })));
const saveStars = () => kv.set('stars', B.stars);
const saveRecent = () => kv.set('recent', B.recent);

async function loadBrowserState() {
  const [roots, stars, recent] = await Promise.all([kv.get('roots'), kv.get('stars'), kv.get('recent')]);
  B.stars = stars || [];
  B.recent = recent || [];
  for (const r of roots || []) {
    const root = { id: r.id, name: r.name, handle: r.handle };
    root.node = mkNode(root, null, 'dir', r.name, '', { handle: r.handle, isRoot: true });
    try {
      root.needsAccess = (await r.handle.queryPermission({ mode: 'read' })) !== 'granted';
    } catch {
      root.needsAccess = true;
    }
    B.roots.push(root);
  }
  renderBrowser();
}

/* ---------------- adding and removing folders ---------------- */

async function addFolder() {
  if (!window.showDirectoryPicker) { $('folderPick').click(); return; }
  let handle;
  try {
    handle = await window.showDirectoryPicker({ id: 'meowglitch', mode: 'read' });
  } catch (err) {
    if (err.name !== 'AbortError') setStatus('! COULD NOT OPEN THAT FOLDER', true);
    return;
  }
  for (const r of B.roots) {
    if (r.handle && (await r.handle.isSameEntry(handle))) { setStatus('> ' + r.name.toUpperCase() + ' IS ALREADY IN THE BROWSER'); return; }
  }
  const root = { id: uid(), name: handle.name, handle };
  root.node = mkNode(root, null, 'dir', handle.name, '', { handle, isRoot: true });
  B.roots.push(root);
  saveRoots();
  setTab('all');
  await toggleNode(root.node, true);
  selectNode(root.node);
}

// <input webkitdirectory> fallback: the whole tree arrives at once.
function addFallbackFolder(files) {
  const imgs = [...files].filter((f) => IMG_RE.test(f.name) && f.webkitRelativePath);
  if (!imgs.length) { setStatus('! NO IMAGES IN THAT FOLDER', true); return; }
  const name = imgs[0].webkitRelativePath.split('/')[0];
  const root = { id: 'tmp-' + uid(), name, temp: true };
  root.node = mkNode(root, null, 'dir', name, '', { isRoot: true, children: [] });
  for (const f of imgs) {
    const segs = f.webkitRelativePath.split('/').slice(1);
    let node = root.node;
    let path = '';
    for (const seg of segs.slice(0, -1)) {
      path = join(path, seg);
      let d = node.children.find((c) => c.kind === 'dir' && c.name === seg);
      if (!d) { d = mkNode(root, node, 'dir', seg, path, { children: [] }); node.children.push(d); }
      node = d;
    }
    node.children.push(mkNode(root, node, 'file', f.name, join(path, f.name), { file: f }));
  }
  const sortAll = (n) => { n.children.sort(byKindName); n.children.forEach((c) => c.children && sortAll(c)); };
  sortAll(root.node);
  root.node.open = true;
  B.roots.push(root);
  setTab('all');
  selectNode(root.node);
  setStatus('> THIS BROWSER CANNOT REMEMBER FOLDERS. RE-ADD ' + name.toUpperCase() + ' AFTER A RELOAD');
}

function removeRoot(root) {
  B.roots = B.roots.filter((r) => r !== root);
  if (B.sel?.root === root) B.sel = null;
  saveRoots();
  renderBrowser();
  setStatus('> REMOVED ' + root.name.toUpperCase() + ' FROM THE BROWSER (THE FOLDER IS UNTOUCHED)');
}

async function grantAccess(root) {
  try {
    if ((await root.handle.requestPermission({ mode: 'read' })) !== 'granted') return;
  } catch {
    return;
  }
  root.needsAccess = false;
  root.node.children = null;
  await toggleNode(root.node, true);
  if (B.tab !== 'all') setTab(B.tab);
}

/* ---------------- stars and recent ---------------- */

const isStarred = (n) => B.stars.some((s) => entryKey(s) === nodeKey(n));

function toggleStar(n) {
  if (n.missing) {
    B.stars = B.stars.filter((s) => entryKey(s) !== nodeKey(n));
  } else if (isStarred(n)) {
    B.stars = B.stars.filter((s) => entryKey(s) !== nodeKey(n));
  } else {
    B.stars.unshift(toEntry(n));
  }
  saveStars();
  if (B.tab === 'starred') rebuildTop().then(renderBrowser);
  else renderBrowser();
}

function pushRecent(n) {
  B.recent = [toEntry(n), ...B.recent.filter((e) => entryKey(e) !== nodeKey(n))].slice(0, RECENT_MAX);
  saveRecent();
  if (B.tab === 'recent') rebuildTop().then(renderBrowser);
}

async function rebuildTop() {
  if (B.tab === 'starred') B.top.starred = await Promise.all(B.stars.map(resolveEntry));
  if (B.tab === 'recent') B.top.recent = await Promise.all(B.recent.map(resolveEntry));
}

/* ---------------- search ---------------- */

async function runSearch() {
  const q = B.query.toLowerCase();
  const tok = ++B.searchTok;
  if (!q) { B.searching = false; renderBrowser(); return; }
  if (B.tab !== 'all') { renderBrowser(); return; } // starred/recent filter in place
  B.searching = true;
  B.top.search = [];
  renderBrowser();
  const out = [];
  let dirs = 0;
  const walk = async (node) => {
    if (out.length >= SEARCH_MAX || dirs > 4000 || tok !== B.searchTok) return;
    dirs++;
    const kids = await listDir(node);
    for (const k of kids) if (k.kind === 'file' && k.name.toLowerCase().includes(q)) out.push(k);
    for (const k of kids) if (k.kind === 'dir') await walk(k);
  };
  for (const r of B.roots) if (!r.needsAccess) await walk(r.node);
  if (tok !== B.searchTok) return;
  B.searching = false;
  B.top.search = out.slice(0, SEARCH_MAX);
  renderBrowser();
}

/* ---------------- view ---------------- */

function topNodes() {
  const q = B.query.toLowerCase();
  if (B.tab === 'all') return q ? B.top.search : B.roots.map((r) => r.node);
  const list = B.top[B.tab];
  return q ? list.filter((n) => n.name.toLowerCase().includes(q)) : list;
}

function flatten(nodes, depth, out) {
  for (const n of nodes) {
    out.push({ n, depth });
    if (n.kind === 'dir' && n.open && n.children && !(B.query && B.tab === 'all')) flatten(n.children, depth + 1, out);
  }
  return out;
}

function emptyMessage() {
  if (B.searching) return '> SEARCHING...';
  if (B.query) return '> NO MATCHES';
  if (B.tab === 'starred') return '> NOTHING STARRED. PRESS * ON A ROW';
  if (B.tab === 'recent') return '> NOTHING ADDED FROM THE BROWSER YET';
  return '> ADD A FOLDER OF IMAGES';
}

function renderBrowser() {
  const ul = $('tree');
  const hadFocus = ul.contains(document.activeElement);
  ul.textContent = '';
  B.rows = flatten(topNodes(), 0, []);
  if (!B.rows.some((r) => r.n === B.sel)) B.sel = null;
  if (!B.rows.length) {
    const li = el('li', 'files-hint', emptyMessage());
    if (!B.query && B.tab === 'all') li.append(el('span', 'cursor', '_'));
    ul.append(li);
  }
  const showPath = B.query && B.tab === 'all';
  for (const { n, depth } of B.rows) {
    const li = el('li');
    if (n === B.sel) li.classList.add('selected');
    if (n.missing) li.classList.add('missing');
    const b = el('button', 'node' + (n.kind === 'dir' ? ' folder' : ''));
    b.style.paddingLeft = 10 + depth * 12 + 'px';
    b.tabIndex = n === B.sel || (!B.sel && depth === 0 && n === B.rows[0].n) ? 0 : -1;
    const tw = n.kind === 'dir' ? (n.loading ? '~' : n.open ? '-' : '+') : ' ';
    b.append(el('span', 'twisty', tw), el('span', 'files-name', n.kind === 'dir' ? n.name + '/' : n.name));
    if (n.isRoot && n.root.needsAccess) b.append(el('span', 'files-size', 'GRANT ACCESS'));
    if (n.missing) b.append(el('span', 'files-size', n.missing));
    if (showPath && n.parent) b.title = n.root.name + '/' + n.path;
    b.addEventListener('click', () => activateNode(n));
    if (n.kind === 'file' && !n.missing) {
      b.addEventListener('dblclick', () => addFromBrowser(n, false));
      b.draggable = true;
      b.addEventListener('dragstart', (e) => {
        B.drag = n;
        e.dataTransfer.setData(BROWSER_MIME, nodeKey(n));
        e.dataTransfer.effectAllowed = 'copy';
      });
      b.addEventListener('dragend', () => { B.drag = null; });
    }
    li.append(b);
    if (!n.isRoot || B.tab !== 'all') {
      const on = isStarred(n);
      const st = el('button', 'star' + (on ? ' on' : ''), '*');
      st.tabIndex = -1;
      st.setAttribute('aria-label', (on ? 'Unstar ' : 'Star ') + n.name);
      st.setAttribute('aria-pressed', String(on));
      st.addEventListener('click', () => toggleStar(n));
      li.append(st);
    }
    if (n.isRoot && B.tab === 'all' && !B.query) {
      const x = el('button', 'star', '[X]');
      x.tabIndex = -1;
      x.title = 'Remove from the browser (does not delete anything)';
      x.setAttribute('aria-label', 'Remove ' + n.name + ' from the browser');
      x.addEventListener('click', () => removeRoot(n.root));
      li.append(x);
    }
    ul.append(li);
  }
  $('browserCount').textContent = 'DIR:' + B.roots.length;
  for (const t of $('browserTabs').querySelectorAll('button')) t.classList.toggle('selected', t.dataset.tab === B.tab);
  if (hadFocus) (ul.querySelector('li.selected .node') || ul.querySelector('.node'))?.focus();
}

async function toggleNode(n, open = !n.open) {
  if (n.kind !== 'dir' || n.missing) return;
  if (n.isRoot && n.root.needsAccess) { await grantAccess(n.root); return; }
  if (open && !n.children) {
    n.loading = true;
    renderBrowser();
    await listDir(n);
    n.loading = false;
  }
  n.open = open;
  renderBrowser();
}

function selectNode(n) {
  B.sel = n;
  renderBrowser();
  if (n?.kind === 'file' && !n.missing) previewNode(n);
}

function activateNode(n) {
  selectNode(n);
  if (n.kind === 'dir') toggleNode(n);
}

function setTab(tab) {
  B.tab = tab;
  B.sel = null;
  rebuildTop().then(() => (B.query ? runSearch() : renderBrowser()));
}

/* ---------------- preview ---------------- */

async function previewNode(n) {
  const tok = ++B.previewTok;
  const img = $('previewImg');
  $('previewName').textContent = n.name;
  $('previewInfo').textContent = '...';
  try {
    const f = await getNodeFile(n);
    if (tok !== B.previewTok) return;
    if (B.previewUrl) URL.revokeObjectURL(B.previewUrl);
    B.previewUrl = URL.createObjectURL(f);
    img.src = B.previewUrl;
    await img.decode().catch(() => {});
    if (tok !== B.previewTok) return;
    img.hidden = false;
    $('previewEmpty').hidden = true;
    const ext = (n.name.match(/\.([^.]+)$/)?.[1] || '').toUpperCase();
    $('previewInfo').textContent = `${img.naturalWidth}x${img.naturalHeight} ${fmtSize(f.size)} ${ext}`;
    $('previewAdd').disabled = $('previewOpen').disabled = false;
  } catch (err) {
    console.error(err);
    if (tok === B.previewTok) $('previewInfo').textContent = '! COULD NOT READ';
  }
}

async function addFromBrowser(n, replace) {
  if (!n || n.kind !== 'file' || n.missing) return;
  try {
    const f = await getNodeFile(n);
    await loadFiles([f], replace);
    pushRecent(n);
    setStatus('> ' + (replace ? 'OPENED ' : 'ADDED ') + n.name);
  } catch (err) {
    console.error(err);
    setStatus('! COULD NOT READ ' + n.name.toUpperCase(), true);
  }
}

// Called by app.js when something dragged out of the browser is dropped.
function dropFromBrowser(e) {
  const n = B.drag;
  B.drag = null;
  if (!n || e.target.closest?.('#browserPane')) return;
  addFromBrowser(n, false);
}

/* ---------------- wiring ---------------- */

function setBrowserShown(on) {
  $('browserPane').hidden = !on;
  document.querySelector('.app').classList.toggle('browser-on', on);
  $('browserToggle').classList.toggle('active', on);
  try { localStorage.setItem('meowglitch.browser', on ? '1' : '0'); } catch { /* ignore */ }
}

(function initBrowser() {
  let shown = true;
  try { shown = localStorage.getItem('meowglitch.browser') !== '0'; } catch { /* ignore */ }
  setBrowserShown(shown);
  $('browserToggle').addEventListener('click', () => setBrowserShown($('browserPane').hidden));
  $('addFolder').addEventListener('click', addFolder);
  $('folderPick').addEventListener('change', (e) => { addFallbackFolder(e.target.files); e.target.value = ''; });
  for (const t of $('browserTabs').querySelectorAll('button')) t.addEventListener('click', () => setTab(t.dataset.tab));
  $('previewAdd').addEventListener('click', () => addFromBrowser(B.sel, false));
  $('previewOpen').addEventListener('click', () => addFromBrowser(B.sel, true));

  let searchTimer = 0;
  const search = $('browserSearch');
  search.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { B.query = search.value.trim(); B.sel = null; runSearch(); }, 150);
  });
  search.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { search.value = ''; B.query = ''; runSearch(); }
    if (e.key === 'ArrowDown' && B.rows.length) { e.preventDefault(); selectNode(B.rows[0].n); $('tree').querySelector('li.selected .node')?.focus(); }
  });

  // FL-style keys: arrows walk the tree, right/left open and close, Enter adds.
  $('tree').addEventListener('keydown', (e) => {
    const i = B.rows.findIndex((r) => r.n === B.sel);
    const cur = i >= 0 ? B.rows[i].n : null;
    const go = (j) => { const r = B.rows[clamp(j, 0, B.rows.length - 1)]; if (r) selectNode(r.n); };
    switch (e.key) {
      case 'ArrowDown': go(i + 1); break;
      case 'ArrowUp': go(i < 0 ? 0 : i - 1); break;
      case 'ArrowRight':
        if (cur?.kind === 'dir') { if (!cur.open) toggleNode(cur, true); else go(i + 1); }
        break;
      case 'ArrowLeft':
        if (cur?.kind === 'dir' && cur.open) toggleNode(cur, false);
        else if (cur?.parent && B.rows.some((r) => r.n === cur.parent)) selectNode(cur.parent);
        break;
      case 'Enter':
        if (cur?.kind === 'file') addFromBrowser(cur, e.shiftKey);
        else if (cur) toggleNode(cur);
        break;
      case '*':
        if (cur) toggleStar(cur);
        break;
      default:
        return;
    }
    e.preventDefault();
    e.stopPropagation();
  });

  renderBrowser();
  loadBrowserState();
})();
