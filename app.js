/* ============================================
   ASEAN Data Governance Explorer — Application
   ============================================ */

const state = { controls: null, domains: null, requirements: {}, evidence: null, crossRefs: {}, route: { view: 'overview' } };
const cache = new Map();

function escHtml(str) { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }

async function fetchJSON(path) {
  if (cache.has(path)) return cache.get(path);
  try { const r = await fetch(path); if (!r.ok) throw new Error(`HTTP ${r.status}`); const d = await r.json(); cache.set(path, d); return d; }
  catch (e) { console.error(`Failed: ${path}`, e); return null; }
}

function parseHash() {
  const h = location.hash.slice(1);
  if (!h) return { view: 'overview' };
  if (h === 'controls') return { view: 'controls' };
  if (h.startsWith('control/')) return { view: 'control-detail', slug: h.slice(8) };
  if (h === 'requirements') return { view: 'requirements' };
  if (h === 'reference') return { view: 'reference' };
  if (h.startsWith('search/')) return { view: 'search', query: decodeURIComponent(h.slice(7)) };
  return { view: 'overview' };
}

function navigate(hash) { location.hash = hash; }

const DOMAINS = ['data-classification', 'cross-border-transfers', 'model-contractual-clauses', 'data-protection-standards', 'regulatory-harmonization'];
const DOMAIN_NAMES = { 'data-classification': 'Data Classification', 'cross-border-transfers': 'Cross-Border Transfers', 'model-contractual-clauses': 'Model Contractual Clauses', 'data-protection-standards': 'Data Protection Standards', 'regulatory-harmonization': 'Regulatory Harmonization' };
const DOMAIN_COLORS = { 'data-classification': '#2563EB', 'cross-border-transfers': '#7C3AED', 'model-contractual-clauses': '#D97706', 'data-protection-standards': '#059669', 'regulatory-harmonization': '#DC2626' };

async function loadData() {
  const [controls, domains, evidence, pdpaMap] = await Promise.all([
    fetchJSON('controls/library.json'), fetchJSON('controls/domains.json'),
    fetchJSON('evidence/index.json'), fetchJSON('cross-references/pdpa-mapping.json')
  ]);
  state.controls = controls; state.domains = domains; state.evidence = evidence;
  state.crossRefs = { pdpa: pdpaMap };
  const reqResults = await Promise.all(DOMAINS.map(d => fetchJSON(`requirements/by-domain/${d}.json`)));
  DOMAINS.forEach((d, i) => { state.requirements[d] = reqResults[i]; });
}

function getAllControls() {
  if (!state.controls) return [];
  const all = [];
  DOMAINS.forEach(domain => { (state.controls[domain] || []).forEach(c => all.push({ ...c, domain })); });
  return all;
}

function renderDomainBadge(domain) {
  return `<span class="badge badge-domain" style="--domain-color:${DOMAIN_COLORS[domain]}">${DOMAIN_NAMES[domain]}</span>`;
}
function renderTypeBadge(type) {
  const cls = { preventive: 'badge-type-preventive', detective: 'badge-type-detective', corrective: 'badge-type-corrective' };
  return `<span class="badge ${cls[type] || 'badge-category'}">${type}</span>`;
}

function renderOverview() {
  const all = getAllControls();
  const domains = state.controls ? state.controls.domains : [];
  return `<div class="main">
    <div class="disclaimer"><strong>Constructed-Indicative Content.</strong> This explorer contains indicative content illustrating ASEAN data governance compliance patterns. It is not a substitute for official ASEAN framework documents or national data protection laws.</div>
    <div class="stats-banner">
      <div class="stat"><div class="stat-value">${all.length}</div><div class="stat-label">Controls</div></div>
      <div class="stat"><div class="stat-value">5</div><div class="stat-label">Domains</div></div>
      <div class="stat"><div class="stat-value">${state.evidence ? state.evidence.evidence.length : 0}</div><div class="stat-label">Evidence Items</div></div>
    </div>
    <h2 style="margin-bottom:1rem">Governance Domains</h2>
    <div class="control-grid">${domains.map(d => `
      <div class="control-card" onclick="navigate('controls')">
        <div class="control-card-header">${renderDomainBadge(d.slug)}</div>
        <div class="control-card-title">${escHtml(d.name)}</div>
        <div class="control-card-desc">${escHtml(d.description)}</div>
        <div class="control-card-meta"><span class="badge badge-category">${(state.controls[d.slug] || []).length} controls</span></div>
      </div>`).join('')}</div>
  </div>`;
}

function renderControls() {
  const all = getAllControls();
  let active = 'all';
  function render(domain) {
    const filtered = domain === 'all' ? all : all.filter(c => c.domain === domain);
    return `<div class="main">
      <h2 style="margin-bottom:1rem">Controls (${filtered.length})</h2>
      <div class="domain-filter">
        <button class="domain-pill ${domain === 'all' ? 'active' : ''}" onclick="window._fd('all')">All (${all.length})</button>
        ${DOMAINS.map(d => `<button class="domain-pill ${domain === d ? 'active' : ''}" onclick="window._fd('${d}')">${DOMAIN_NAMES[d]} (${all.filter(c => c.domain === d).length})</button>`).join('')}
      </div>
      <div class="control-grid">${filtered.map(c => `
        <div class="control-card" onclick="navigate('control/${c.slug}')">
          <div class="control-card-header"><span class="control-id">${escHtml(c.id)}</span>${renderDomainBadge(c.domain)}</div>
          <div class="control-card-title">${escHtml(c.name)}</div>
          <div class="control-card-desc">${escHtml(c.description)}</div>
          <div class="control-card-meta">${renderTypeBadge(c.type)}</div>
        </div>`).join('')}</div>
    </div>`;
  }
  window._fd = d => { active = d; document.getElementById('app').innerHTML = render(d); };
  return render(active);
}

function renderControlDetail(slug) {
  const all = getAllControls();
  const ctrl = all.find(c => c.slug === slug);
  if (!ctrl) return '<div class="main"><div class="error-state"><h2>Control not found</h2></div></div>';
  const ev = state.evidence ? state.evidence.evidence.filter(e => e.controlRef === ctrl.id) : [];
  return `<div class="main">
    <nav class="breadcrumbs"><a href="#controls">Controls</a><span class="sep">›</span><span class="current">${escHtml(ctrl.id)} ${escHtml(ctrl.name)}</span></nav>
    <div class="control-detail">
      <div class="control-detail-header">
        <div class="control-detail-id-row"><span class="control-id" style="font-size:1rem">${escHtml(ctrl.id)}</span>${renderDomainBadge(ctrl.domain)}${renderTypeBadge(ctrl.type)}</div>
        <h2 class="control-detail-title">${escHtml(ctrl.name)}</h2>
        <p class="control-detail-desc">${escHtml(ctrl.description)}</p>
      </div>
      ${ctrl.keyActivities ? `<div class="detail-section"><h3 class="detail-section-title">Key Activities</h3><ul class="activity-list">${ctrl.keyActivities.map(a => `<li>${escHtml(a)}</li>`).join('')}</ul></div>` : ''}
      ${ev.length ? `<div class="detail-section"><h3 class="detail-section-title">Evidence Items</h3>${ev.map(e => `
        <div class="evidence-item">
          <div class="evidence-item-header"><span class="evidence-id">${escHtml(e.id)}</span><span class="evidence-item-name">${escHtml(e.name)}</span></div>
          <p class="evidence-item-desc">${escHtml(e.description)}</p>
          <div class="evidence-item-meta"><span><strong>Format:</strong> ${escHtml(e.format)}</span><span><strong>Frequency:</strong> ${escHtml(e.frequency)}</span><span><strong>Owner:</strong> ${escHtml(e.owner)}</span></div>
        </div>`).join('')}</div>` : ''}
    </div>
  </div>`;
}

function renderRequirements() {
  return `<div class="main"><h2 style="margin-bottom:1rem">Requirements by Domain</h2>
    ${DOMAINS.map(d => { const req = state.requirements[d]; if (!req) return '';
      return `<div class="detail-section"><h3 class="detail-section-title">${DOMAIN_NAMES[d]} (${req.requirements.length})</h3>
        ${req.requirements.map(r => `<div class="artifact-card">
          <div class="artifact-card-header"><span class="artifact-card-name">${escHtml(r.id)}</span><span class="badge ${r.priority === 'critical' ? 'badge-mandatory' : r.priority === 'high' ? 'badge-type-corrective' : 'badge-category'}">${r.priority}</span></div>
          <p class="artifact-card-desc">${escHtml(r.requirement)}</p>
          <div class="artifact-card-meta"><span class="meta-item"><strong>Control:</strong> ${escHtml(r.controlRef)}</span><span class="meta-item"><strong>Owner:</strong> ${escHtml(r.owner)}</span></div>
        </div>`).join('')}</div>`; }).join('')}
  </div>`;
}

function renderReference() {
  return `<div class="main"><h2 style="margin-bottom:1rem">Cross-References</h2>
    ${state.crossRefs.pdpa ? `<div class="detail-section"><h3 class="detail-section-title">ASEAN DG → Malaysia PDPA (${state.crossRefs.pdpa.mappings.length} mappings)</h3>
      <p style="color:var(--text-secondary);margin-bottom:1rem">${escHtml(state.crossRefs.pdpa.description)}</p>
      <div class="fw-mappings">${state.crossRefs.pdpa.mappings.map(m => `
        <div class="xref-card">
          <span class="xref-source">${escHtml(m.aseanControl)}</span>
          <span class="badge badge-category">${escHtml(m.relationship)}</span>
          <span class="xref-target">${escHtml(m.pdpaSection)} — ${escHtml(m.pdpaDescription)}</span>
        </div>`).join('')}</div></div>` : ''}
  </div>`;
}

function renderSearch(query) {
  const q = query.toLowerCase();
  const results = getAllControls().filter(c => c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q) || c.id.toLowerCase().includes(q));
  return `<div class="main"><p class="search-results-header">${results.length} results for "${escHtml(query)}"</p>
    <div class="control-grid">${results.map(c => `<div class="control-card" onclick="navigate('control/${c.slug}')"><div class="control-card-header"><span class="control-id">${escHtml(c.id)}</span>${renderDomainBadge(c.domain)}</div><div class="control-card-title">${escHtml(c.name)}</div><div class="control-card-desc">${escHtml(c.description)}</div></div>`).join('')}</div>
  </div>`;
}

function exportToCSV() {
  const rows = [['ID', 'Name', 'Domain', 'Type', 'Description']];
  getAllControls().forEach(c => rows.push([c.id, c.name, c.domain, c.type, c.description.replace(/"/g, '""')]));
  const csv = rows.map(r => r.map(f => `"${f}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'asean-dg-controls.csv'; a.click();
}

async function render() {
  const app = document.getElementById('app');
  const route = parseHash(); state.route = route;
  document.querySelectorAll('.nav-link').forEach(l => l.classList.toggle('active', l.dataset.view === route.view));
  switch (route.view) {
    case 'overview': app.innerHTML = renderOverview(); break;
    case 'controls': app.innerHTML = renderControls(); break;
    case 'control-detail': app.innerHTML = renderControlDetail(route.slug); break;
    case 'requirements': app.innerHTML = renderRequirements(); break;
    case 'reference': app.innerHTML = renderReference(); break;
    case 'search': app.innerHTML = renderSearch(route.query); break;
    default: app.innerHTML = renderOverview();
  }
}

async function init() {
  await loadData(); render(); window.addEventListener('hashchange', render);
  const si = document.getElementById('search-input');
  if (si) si.addEventListener('keydown', e => { if (e.key === 'Enter' && si.value.trim()) navigate('search/' + encodeURIComponent(si.value.trim())); });
}
init();
