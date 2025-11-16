// Thumbnails do YouTube 
const ytThumbHD = (id) => `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
const ytThumbFallback = (id) => `https://img.youtube.com/vi/${id}/hqdefault.jpg`;

// Base da API 
const API_ROOT = "http://localhost:3000";
const API_URL = `${API_ROOT}/conteudos`;

// Fetch helper com tratamento simples
async function apiRequest(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`Erro HTTP ${res.status} - ${msg}`);
  }
  try { return await res.json(); } catch { return null; }
}

// CRUD 
const api = {
  list: async (query = {}) => apiRequest(`${API_URL}?${new URLSearchParams(query).toString()}`),
  get: async (id) => apiRequest(`${API_URL}/${id}`),
  create: async (data) => apiRequest(API_URL, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data)
  }),
  update: async (id, data) => apiRequest(`${API_URL}/${id}`, {
    method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data)
  }),
  remove: async (id) => apiRequest(`${API_URL}/${id}`, { method: "DELETE" })
};

const state = { itens: [], filtroCategoria: "Todas" };

/*  HOME   */
async function renderCarousel() {
  const track = document.querySelector("#fwc-track");
  const dots = document.querySelector("#fwc-dots");
  if (!track || !dots) return;

  const destaques = state.itens.filter(a => !!a.destaque);
  track.innerHTML = destaques.map((a, i) => `
    <li class="fwc-slide">
      <a href="detalhes.html?id=${a.id}" aria-label="${a.titulo}">
        <img class="fwc-media" loading="${i === 0 ? 'eager' : 'lazy'}"
             src="${ytThumbHD(a.videoId)}"
             onerror="this.onerror=null;this.src='${ytThumbFallback(a.videoId)}'"
             alt="${a.titulo}">
      </a>
    </li>
  `).join("");
  track.style.width = `${destaques.length * 100}%`;
  track.style.setProperty('--slides', destaques.length);

  const dotsHtml = destaques.map((_, i) =>
    `<button class="fwc-dot" data-idx="${i}" aria-label="Ir para slide ${i + 1}"></button>`).join("");
  dots.innerHTML = dotsHtml;

  let idx = 0;
  const slides = Array.from(track.querySelectorAll(".fwc-slide"));
  const dotEls = Array.from(dots.querySelectorAll(".fwc-dot"));

  const setActive = (i) => {
    idx = (i + slides.length) % slides.length;
    const shift = -(idx * (100 / slides.length));
    track.style.transition = "";
    track.style.transform = `translateX(${shift}%)`;
    dotEls.forEach((d, k) => d.setAttribute("aria-current", k === idx ? "true" : "false"));
  };
  setActive(0);

  document.querySelector(".fwc-nav.prev")?.addEventListener("click", () => setActive(idx - 1));
  document.querySelector(".fwc-nav.next")?.addEventListener("click", () => setActive(idx + 1));
  dotEls.forEach(d => d.addEventListener("click", e => setActive(+e.currentTarget.dataset.idx)));

  let timer = setInterval(() => setActive(idx + 1), 6000);
  const stop = () => clearInterval(timer);
  const start = () => timer = setInterval(() => setActive(idx + 1), 6000);
  track.addEventListener("mouseenter", stop); track.addEventListener("mouseleave", start);
  dots.addEventListener("mouseenter", stop); dots.addEventListener("mouseleave", start);
}

function renderTilesHome() {
  const grid = document.querySelector("#tiles-grid");
  if (!grid) return;
  grid.innerHTML = state.itens.map(a => `
    <li class="tile">
      <a class="tile-link" href="detalhes.html?id=${a.id}" aria-label="${a.titulo}">
        <img class="tile-cover" loading="lazy"
             src="${ytThumbHD(a.videoId)}"
             onerror="this.onerror=null;this.src='${ytThumbFallback(a.videoId)}'"
             alt="${a.titulo}">
        <div class="tile-body">
          <p class="tile-title">${a.titulo}</p>
          <p class="tile-desc">${a.resumo}</p>
          <div class="tile-line"></div>
        </div>
      </a>
      <div class="tile-actions">
        <button class="btn btn-danger btn-small js-del" data-id="${a.id}">Excluir</button>
      </div>
    </li>
  `).join("");

  grid.addEventListener("click", async (e) => {
    const btn = e.target.closest(".js-del");
    if (!btn) return;
    e.preventDefault();
    const id = btn.dataset.id;
    if (!confirm("Excluir este conteúdo?")) return;
    try {
      await api.remove(id);
      state.itens = state.itens.filter(x => String(x.id) !== String(id));
      renderTilesHome();
    } catch (err) {
      alert("Falha ao excluir: " + err.message);
    }
  });
}

/*  CONTEÚDOS */
function initConteudosPage() {
  const filterBar = document.getElementById("filterBar");
  const grid = document.getElementById("grid");
  if (!filterBar || !grid) return;

  const categorias = Array.from(new Set(state.itens.map(a => a.categoria))).sort();
  let catAtual = new URLSearchParams(location.search).get("cat") || "Todas";

  const renderPills = () => {
    const todas = ["Todas", ...categorias];
    filterBar.innerHTML = todas.map(c => `
      <button class="btn btn-outline btn-small" data-cat="${c}" aria-current="${c === catAtual}">
        ${c}
      </button>
    `).join("");
    filterBar.querySelectorAll("button").forEach(btn => {
      btn.addEventListener("click", () => {
        catAtual = btn.dataset.cat;
        filterBar.querySelectorAll("button").forEach(p => p.setAttribute("aria-current", p.dataset.cat === catAtual));
        const p = new URLSearchParams(location.search);
        if (catAtual === "Todas") p.delete("cat"); else p.set("cat", catAtual);
        history.replaceState({}, "", `?${p}`);
        renderGrid();
      });
    });
  };

  const renderGrid = () => {
    const base = catAtual === "Todas" ? state.itens : state.itens.filter(a => a.categoria === catAtual);
    grid.innerHTML = base.map(a => `
      <li class="tile">
        <a class="tile-link" href="detalhes.html?id=${a.id}" aria-label="${a.titulo}">
          <img class="tile-cover"
               src="${ytThumbHD(a.videoId)}"
               onerror="this.onerror=null;this.src='${ytThumbFallback(a.videoId)}'"
               alt="${a.titulo}">
          <div class="tile-body">
            <p class="tile-title">${a.titulo}</p>
            <p class="tile-desc">${a.resumo}</p>
            <div class="tile-line"></div>
          </div>
        </a>
        <div class="tile-actions">
          <button class="btn btn-danger btn-small js-del" data-id="${a.id}">Excluir</button>
        </div>
      </li>
    `).join("");
  };

  renderPills();
  renderGrid();

  grid.addEventListener("click", async (e) => {
    const btn = e.target.closest(".js-del");
    if (!btn) return;
    e.preventDefault();
    const id = btn.dataset.id;
    if (!confirm("Excluir este conteúdo?")) return;
    try {
      await api.remove(id);
      state.itens = state.itens.filter(x => String(x.id) !== String(id));
      renderGrid();
    } catch (err) {
      alert("Falha ao excluir: " + err.message);
    }
  });
}

/*  CATEGORIAS  */
function initCategoriasPage() {
  const wrap = document.getElementById("catsWrap");
  if (!wrap) return;

  const grupos = state.itens.reduce((acc, a) => {
    (acc[a.categoria] ||= []).push(a);
    return acc;
  }, {});
  const ordem = Object.keys(grupos).sort();

  wrap.innerHTML = ordem.map(cat => `
    <section class="cat-section" aria-labelledby="ttl-${cat}">
      <h2 id="ttl-${cat}" class="cat-title">${cat}</h2>
      <ul class="tiles-grid">
        ${grupos[cat].map(a => `
          <li class="tile">
            <a class="tile-link" href="detalhes.html?id=${a.id}">
              <img class="tile-cover"
                   src="${ytThumbHD(a.videoId)}"
                   onerror="this.onerror=null;this.src='${ytThumbFallback(a.videoId)}'"
                   alt="${a.titulo}">
              <div class="tile-body">
                <p class="tile-title">${a.titulo}</p>
                <p class="tile-desc">${a.resumo}</p>
                <div class="tile-line"></div>
              </div>
            </a>
          </li>
        `).join("")}
      </ul>
    </section>
  `).join("");
}

/*  DETALHES  */
async function initDetalhesPage() {
  const wrap = document.getElementById("detalhe");
  if (!wrap) return;

  const id = Number(new URLSearchParams(location.search).get("id"));
  let item;
  try { item = await api.get(id); }
  catch (err) { wrap.innerHTML = `<p>Erro ao carregar: ${err.message}</p>`; return; }
  if (!item?.id) { wrap.innerHTML = "<p>Item não encontrado.</p>"; return; }

  wrap.innerHTML = `
    <header class="featured" style="text-align:center">
      <h1>${item.titulo}</h1>
      <p class="site-quote"><small>Categoria: ${item.categoria} • ${item.data} • ${item.autor}</small></p>
    </header>

    <div style="max-width:960px;margin:12px auto;aspect-ratio:16/9;background:#000;border-radius:12px;overflow:hidden">
      <iframe width="100%" height="100%" src="https://www.youtube.com/embed/${item.videoId}"
        title="YouTube video player" frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
    </div>

    <section class="card-body" style="max-width:960px;margin:0 auto;">
      <p>${item.resumo}</p>
      <ul>
        <li><strong>Categoria:</strong> ${item.categoria}</li>
        <li><strong>Autor:</strong> ${item.autor}</li>
        <li><strong>Data:</strong> ${item.data}</li>
        <li><strong>Destaque:</strong> ${item.destaque ? "Sim" : "Não"}</li>
      </ul>
      <div class="form-actions">
        <a class="btn btn-outline" href="index.html">← Voltar</a>
        <button id="btnEditar"  class="btn btn-primary">Editar</button>
        <button id="btnExcluir" class="btn btn-danger">Excluir</button>
      </div>
      <hr style="margin: 16px 0; border-color: rgba(255,255,255,.12)">
      <form id="formEdicao" class="form-grid" style="display:none" novalidate>
        <label>Título <input required name="titulo" value="${item.titulo}"></label>
        <label>Resumo <textarea required name="resumo">${item.resumo}</textarea></label>
        <label>Categoria
          <select name="categoria" required>
            ${Array.from(new Set(state.itens.map(a => a.categoria))).sort().map(cat =>
    `<option ${cat === item.categoria ? 'selected' : ''}>${cat}</option>`).join("")}
          </select>
        </label>
        <label>Autor <input required name="autor" value="${item.autor}"></label>
        <label>Data <input required type="date" name="data" value="${item.data}"></label>
        <label>Video ID (YouTube) <input required name="videoId" value="${item.videoId}"></label>
        <label>
          Destaque?
          <select name="destaque">
            <option value="false" ${!item.destaque ? 'selected' : ''}>Não</option>
            <option value="true"  ${item.destaque ? 'selected' : ''}>Sim</option>
          </select>
        </label>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">Salvar alterações</button>
          <button type="button" id="btnCancelar" class="btn btn-outline">Cancelar</button>
        </div>
      </form>
    </section>
  `;

  const form = wrap.querySelector("#formEdicao");
  wrap.querySelector("#btnEditar").addEventListener("click", () => {
    form.style.display = form.style.display === "none" ? "grid" : "none";
    form.scrollIntoView({ behavior: "smooth", block: "center" });
  });
  wrap.querySelector("#btnCancelar").addEventListener("click", () => { form.reset(); form.style.display = "none"; });

  wrap.querySelector("#btnExcluir").addEventListener("click", async () => {
    if (!confirm("Tem certeza que deseja excluir este conteúdo?")) return;
    try { await api.remove(item.id); location.href = "index.html"; }
    catch (err) { alert("Falha ao excluir: " + err.message); }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const atualizado = {
      id: item.id,
      titulo: String(fd.get("titulo")).trim(),
      resumo: String(fd.get("resumo")).trim(),
      categoria: String(fd.get("categoria")).trim(),
      autor: String(fd.get("autor")).trim(),
      data: String(fd.get("data")).trim(),
      videoId: String(fd.get("videoId")).trim(),
      destaque: String(fd.get("destaque")) === "true"
    };
    try { await api.update(item.id, atualizado); alert("Atualizado com sucesso!"); location.reload(); }
    catch (err) { alert("Falha ao atualizar: " + err.message); }
  });
}

/*  CHARTS */
function initChartsPage() {
  const canCat = document.getElementById("chartCategorias");
  const canMon = document.getElementById("chartMensal");
  if (!canCat || !canMon) return; // não é a página de análises

  // Agregações 
  const byCategory = state.itens.reduce((acc, it) => (acc[it.categoria] = (acc[it.categoria] || 0) + 1, acc), {});
  const catLabels = Object.keys(byCategory).sort();
  const catCounts = catLabels.map(k => byCategory[k]);

  const byMonth = state.itens.reduce((acc, it) => {
    const ym = (it.data || "").slice(0, 7); if (!ym) return acc;
    acc[ym] = (acc[ym] || 0) + 1; return acc;
  }, {});
  const monLabels = Object.keys(byMonth).sort();
  const monCounts = monLabels.map(k => byMonth[k]);

  const smallLegend = {
    position: "bottom",
    labels: { boxWidth: 10, padding: 12, font: { size: 12 } } 
  };

  //  Gráfico de Pizza por Categoria 
  const catChart = new Chart(canCat.getContext("2d"), {
    type: "pie",
    data: { labels: catLabels, datasets: [{ data: catCounts }] },
    options: {
      responsive: true,
      maintainAspectRatio: true,  
      aspectRatio: 1.2,            
      plugins: { legend: smallLegend, title: { display: false } },
      layout: { padding: { top: 6, bottom: 6, left: 6, right: 6 } }
    }
  });

  //  Gráfico de Barras por Mês 
  const monChart = new Chart(canMon.getContext("2d"), {
    type: "bar",
    data: { labels: monLabels, datasets: [{ label: "Publicações", data: monCounts }] },
    options: {
      responsive: true,
      maintainAspectRatio: true, 
      aspectRatio: 1.25,         
      plugins: { legend: smallLegend, title: { display: false } },
      layout: { padding: { top: 6, bottom: 6, left: 6, right: 6 } },
      scales: {
        y: { beginAtZero: true, ticks: { precision: 0, font: { size: 11 } } },
        x: { ticks: { font: { size: 11 } } }                                  
      }
    }
  });

  // Botão de atualização 
  document.getElementById("btnRefreshCharts")?.addEventListener("click", async () => {
    try { state.itens = await api.list({ _sort: "id", _order: "desc" }); }
    catch (err) { alert("Falha ao atualizar dados: " + err.message); return; }

    const byCategory2 = state.itens.reduce((acc, it) => (acc[it.categoria] = (acc[it.categoria] || 0) + 1, acc), {});
    const labels2 = Object.keys(byCategory2).sort();
    const counts2 = labels2.map(k => byCategory2[k]);

    const byMonth2 = state.itens.reduce((acc, it) => (acc[(it.data || "").slice(0, 7)] = (acc[(it.data || "").slice(0, 7)] || 0) + 1, acc), {});
    const mLabels2 = Object.keys(byMonth2).sort();
    const mCounts2 = mLabels2.map(k => byMonth2[k]);

    catChart.data.labels = labels2;
    catChart.data.datasets[0].data = counts2;
    catChart.update();

    monChart.data.labels = mLabels2;
    monChart.data.datasets[0].data = mCounts2;
    monChart.update();
  });
}

/*  BOOT  */
async function boot() {
  try { state.itens = await api.list({ _sort: "id", _order: "desc" }); }
  catch (err) {
    console.error(err);
    alert("Falha ao carregar dados da API. Verifique se o JSON Server está rodando (npm start).");
    return;
  }
  if (document.getElementById("fwc-track")) { await renderCarousel(); renderTilesHome(); }
  if (document.getElementById("grid")) { initConteudosPage(); }
  if (document.getElementById("catsWrap")) { initCategoriasPage(); }
  if (document.getElementById("detalhe")) { initDetalhesPage(); }
  if (document.getElementById("chartCategorias") && document.getElementById("chartMensal")) {
    initChartsPage();
  }
}

/* Menu mobile */
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('mainNav');
  if (!toggle || !nav) return;

  const close = () => { nav.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); document.body.style.overflow = ''; document.body.classList.remove('menu-open'); };
  const open = () => { nav.classList.add('open'); toggle.setAttribute('aria-expanded', 'true'); document.body.style.overflow = 'hidden'; document.body.classList.add('menu-open'); };

  toggle.addEventListener('click', () => nav.classList.contains('open') ? close() : open());
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', close));
  window.addEventListener('resize', () => { if (window.innerWidth > 860) close(); });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  document.addEventListener('click', (e) => {
    if (nav.classList.contains('open') && !nav.contains(e.target) && !toggle.contains(e.target)) close();
  });
});

document.addEventListener("DOMContentLoaded", boot);
