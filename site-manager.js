(function () {
  const storageKey = "site-manager-sites";
  const state = { sites: loadSites(), selectedId: null, onlyFavorites: false, query: "", draggingId: null, suppressOpen: false, editingId: null };
  const $ = (selector) => document.querySelector(selector);
  const form = $("#siteForm");
  const list = $("#siteList");
  const modal = $("#siteModal");
  const importFile = $("#importFile");
  const searchInput = $("#searchInput");

  form.addEventListener("submit", saveSiteFromForm);
  $("#addSiteButton").addEventListener("click", openAddModal);
  $("#closeModalButton").addEventListener("click", closeModal);
  $("#cancelModalButton").addEventListener("click", closeModal);
  $("#importButton").addEventListener("click", () => importFile.click());
  $("#exportButton").addEventListener("click", exportSites);
  importFile.addEventListener("change", importSites);
  modal.addEventListener("click", (event) => { if (event.target === modal) closeModal(); });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeModal(); });
  searchInput.addEventListener("input", () => { state.query = searchInput.value.trim().toLowerCase(); renderList(); });
  $("#allButton").addEventListener("click", () => setFavoriteFilter(false));
  $("#favoriteButton").addEventListener("click", () => setFavoriteFilter(true));
  $("#selectedPinButton").addEventListener("click", toggleSelectedPin);
  $("#selectedFavoriteButton").addEventListener("click", toggleSelectedFavorite);
  $("#selectedEditButton").addEventListener("click", editSelectedSite);
  $("#selectedRemoveButton").addEventListener("click", removeSelectedSite);

  updateClock();
  setInterval(updateClock, 1000);
  render();

  function loadSites() {
    try {
      const sites = JSON.parse(localStorage.getItem(storageKey) || "[]");
      return Array.isArray(sites) ? sites.filter((site) => site.name !== "BILGI Envanter Taslagi" || site.url !== "preview.html") : [];
    } catch (error) { return []; }
  }

  function saveSites() { localStorage.setItem(storageKey, JSON.stringify(state.sites)); }
  function createId() { return crypto.randomUUID?.() || `site-${Date.now()}-${Math.random().toString(16).slice(2)}`; }
  function normalizeUrl(url) {
    const local = url.endsWith(".html") || /^(\.\/|\/|localhost|127\.0\.0\.1)/.test(url);
    return /^[a-z]+:\/\//i.test(url) || local ? url : `https://${url}`;
  }

  function saveSiteFromForm(event) {
    event.preventDefault();
    const data = new FormData(form);
    const values = {
      name: String(data.get("name")).trim(),
      url: normalizeUrl(String(data.get("url")).trim()),
      group: String(data.get("group")).trim() || "Genel"
    };
    if (!values.name || !values.url) return;
    const edited = state.sites.find((site) => site.id === state.editingId);
    if (edited) Object.assign(edited, values);
    else state.sites.unshift({ id: createId(), ...values, favorite: false, pinned: false, pinnedAt: 0, order: topOrder(false) });
    normalizeOrder(); saveSites(); closeModal(); render();
  }

  function openAddModal() {
    state.editingId = null; form.reset();
    $("#modalEyebrow").textContent = "Yeni kayıt";
    $("#modalTitle").textContent = "Web sitesi ekle";
    $("#submitSiteButton").textContent = "Site ekle";
    openModal();
  }

  function openEditModal(site) {
    state.editingId = site.id;
    form.elements.name.value = site.name; form.elements.url.value = site.url; form.elements.group.value = site.group;
    $("#modalEyebrow").textContent = "Kayıt düzenle";
    $("#modalTitle").textContent = "Web sitesini düzenle";
    $("#submitSiteButton").textContent = "Değişiklikleri kaydet";
    openModal();
  }

  function openModal() { modal.classList.add("open"); modal.setAttribute("aria-hidden", "false"); $("#siteName").focus(); }
  function closeModal() { state.editingId = null; form.reset(); modal.classList.remove("open"); modal.setAttribute("aria-hidden", "true"); }
  function render() { renderCategories(); renderList(); renderSelectionPanel(); }

  function renderCategories() {
    const datalist = $("#categoryOptions"); datalist.innerHTML = "";
    [...new Set(state.sites.map((site) => site.group).filter(Boolean))].sort((a, b) => a.localeCompare(b, "tr")).forEach((group) => {
      const option = document.createElement("option"); option.value = group; datalist.append(option);
    });
  }

  function renderList() {
    const sites = state.sites.filter((site) => {
      const text = `${site.name} ${site.url} ${site.group}`.toLowerCase();
      return (!state.onlyFavorites || site.favorite) && (!state.query || text.includes(state.query));
    }).sort(compareSites);
    list.innerHTML = "";
    if (!sites.length) {
      const empty = document.createElement("div"); empty.className = "grid-empty";
      empty.innerHTML = "<strong>Gösterilecek site yok.</strong><span>Filtreyi değiştirin veya yeni bir site ekleyin.</span>";
      list.append(empty); return;
    }
    sites.forEach((site, index) => list.append(createCard(site, index)));
  }

  function createCard(site, index) {
    const card = document.createElement("article");
    card.className = `site-card tone-${index % 8}${site.pinned ? " pinned" : ""}${site.id === state.selectedId ? " selected" : ""}`;
    card.tabIndex = 0; card.draggable = true; card.dataset.siteId = site.id;
    card.setAttribute("aria-label", `${site.name} sitesini yeni sekmede aç`);
    card.addEventListener("click", () => selectAndOpenSite(site));
    card.addEventListener("keydown", (event) => { if (["Enter", " "].includes(event.key)) { event.preventDefault(); selectAndOpenSite(site); } });
    card.addEventListener("dragstart", (event) => startDrag(event, site.id));
    card.addEventListener("dragover", (event) => { if (state.draggingId && state.draggingId !== site.id) { event.preventDefault(); card.classList.add("drop-target"); } });
    card.addEventListener("dragleave", () => card.classList.remove("drop-target"));
    card.addEventListener("drop", (event) => dropCard(event, site.id));
    card.addEventListener("dragend", clearDrag);

    const top = document.createElement("div"); top.className = "card-top";
    const groupWrap = document.createElement("span"); groupWrap.className = "group-wrap";
    const grip = document.createElement("span"); grip.className = "drag-grip"; grip.textContent = "⠿"; grip.title = "Sıralamak için sürükleyin"; grip.setAttribute("aria-hidden", "true");
    const group = document.createElement("span"); group.className = "site-group"; group.textContent = site.pinned ? `${site.group} · Sabit` : site.group;
    groupWrap.append(grip, group);
    const launch = document.createElement("span"); launch.className = "launch-mark"; launch.textContent = "↗"; launch.setAttribute("aria-hidden", "true");
    top.append(groupWrap, launch);
    const name = document.createElement("h3"); name.className = "site-name"; name.textContent = site.name;
    const url = document.createElement("p"); url.className = "site-url"; url.textContent = site.url;
    card.append(top, name, url); return card;
  }

  function selectAndOpenSite(site) {
    if (state.suppressOpen) return;
    state.selectedId = site.id;
    renderList();
    renderSelectionPanel();
    window.open(site.url, "_blank", "noopener,noreferrer");
  }

  function getSelectedSite() { return state.sites.find((site) => site.id === state.selectedId); }
  function renderSelectionPanel() {
    const site = getSelectedSite();
    const buttons = [$("#selectedPinButton"), $("#selectedFavoriteButton"), $("#selectedEditButton"), $("#selectedRemoveButton")];
    buttons.forEach((button) => { button.disabled = !site; });
    $("#selectedSiteLabel").textContent = site ? `Seçili: ${site.name}` : "İşlem yapmak için bir kart seçin.";
    $("#selectedPinButton").textContent = site?.pinned ? "Sabitlemeyi kaldır" : "Sabitle";
    $("#selectedFavoriteButton").textContent = site?.favorite ? "Favoriden çıkar" : "Favori";
    $("#selectedPinButton").classList.toggle("on", Boolean(site?.pinned));
    $("#selectedFavoriteButton").classList.toggle("on", Boolean(site?.favorite));
  }
  function toggleSelectedPin() {
    const site = getSelectedSite(); if (!site) return;
    site.pinned = !site.pinned; site.pinnedAt = site.pinned ? Date.now() : 0; site.order = topOrder(site.pinned); saveSites(); render();
  }
  function toggleSelectedFavorite() {
    const site = getSelectedSite(); if (!site) return;
    site.favorite = !site.favorite; saveSites(); render();
  }
  function editSelectedSite() { const site = getSelectedSite(); if (site) openEditModal(site); }
  function removeSelectedSite() {
    const site = getSelectedSite(); if (!site || !confirm(`${site.name} listesinden silinsin mi?`)) return;
    state.sites = state.sites.filter((item) => item.id !== site.id); state.selectedId = null; saveSites(); render();
  }
  function compareSites(a, b) { return a.pinned !== b.pinned ? (a.pinned ? -1 : 1) : Number(a.order || 0) - Number(b.order || 0); }
  function topOrder(pinned) { return Math.min(0, ...state.sites.filter((site) => Boolean(site.pinned) === Boolean(pinned)).map((site) => Number(site.order || 0))) - 1; }
  function normalizeOrder() { state.sites.sort(compareSites).forEach((site, index) => { site.order = index; }); }

  function startDrag(event, id) {
    if (event.target.closest("button")) { event.preventDefault(); return; }
    state.draggingId = id; state.suppressOpen = true; event.currentTarget.classList.add("dragging"); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", id);
  }
  function dropCard(event, targetId) {
    event.preventDefault(); const draggedId = state.draggingId || event.dataTransfer.getData("text/plain"); clearDrag();
    if (!draggedId || draggedId === targetId) return;
    const ordered = [...state.sites].sort(compareSites); const dragged = ordered.find((site) => site.id === draggedId); const target = ordered.find((site) => site.id === targetId);
    if (!dragged || !target) return; dragged.pinned = target.pinned; if (!dragged.pinned) dragged.pinnedAt = 0;
    const remaining = ordered.filter((site) => site.id !== draggedId); remaining.splice(remaining.findIndex((site) => site.id === targetId), 0, dragged);
    state.sites = remaining; normalizeOrder(); saveSites(); render();
  }
  function clearDrag() {
    state.draggingId = null;
    list.querySelectorAll(".dragging,.drop-target").forEach((card) => card.classList.remove("dragging", "drop-target"));
    window.setTimeout(() => { state.suppressOpen = false; }, 180);
  }

  function exportSites() {
    const blob = new Blob([JSON.stringify(state.sites, null, 2)], { type: "application/json" }); const link = document.createElement("a");
    link.href = URL.createObjectURL(blob); link.download = "web-site-listesi.json"; link.click(); URL.revokeObjectURL(link.href);
  }
  function importSites(event) {
    const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader();
    reader.addEventListener("load", () => {
      try {
        const data = JSON.parse(String(reader.result || "[]")); if (!Array.isArray(data)) throw new Error();
        const existing = new Set(state.sites.map(siteKey));
        const incoming = data.map(normalizeImported).filter(Boolean).filter((site) => { const key = siteKey(site); if (existing.has(key)) return false; existing.add(key); return true; });
        state.sites = [...incoming, ...state.sites]; normalizeOrder(); saveSites(); render(); alert(`${incoming.length} site içe aktarıldı.`);
      } catch (error) { alert("Site listesi içe aktarılamadı. JSON dosyasını kontrol edin."); } finally { importFile.value = ""; }
    }); reader.readAsText(file);
  }
  function normalizeImported(site) {
    if (!site || typeof site !== "object") return null; const name = String(site.name || "").trim(); const url = String(site.url || "").trim(); if (!name || !url) return null;
    return { id: createId(), name, url: normalizeUrl(url), group: String(site.group || "Genel").trim() || "Genel", favorite: Boolean(site.favorite), pinned: Boolean(site.pinned), pinnedAt: Number(site.pinnedAt || 0), order: Number(site.order || 0) };
  }
  function siteKey(site) { return `${site.name.trim().toLowerCase()}|${site.url.trim().toLowerCase()}`; }
  function setFavoriteFilter(enabled) { state.onlyFavorites = enabled; $("#allButton").classList.toggle("active", !enabled); $("#favoriteButton").classList.toggle("active", enabled); renderList(); }
  function updateClock() {
    const now = new Date(), seconds = now.getSeconds(), minutes = now.getMinutes(), hours = now.getHours() % 12;
    $("#secondHand").style.transform = `translateX(-50%) rotate(${seconds * 6}deg)`;
    $("#minuteHand").style.transform = `translateX(-50%) rotate(${minutes * 6 + seconds * 0.1}deg)`;
    $("#hourHand").style.transform = `translateX(-50%) rotate(${hours * 30 + minutes * 0.5}deg)`;
  }
})();
