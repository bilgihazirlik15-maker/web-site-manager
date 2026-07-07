(function () {
  const storageKey = "site-manager-sites";
  const fallbackSites = [];

  const state = {
    sites: loadSites(),
    activeId: null,
    onlyFavorites: false,
    query: "",
    draggingId: null
  };

  const form = document.querySelector("#siteForm");
  const list = document.querySelector("#siteList");
  const frame = document.querySelector("#siteFrame");
  const emptyState = document.querySelector("#emptyState");
  const blockedState = document.querySelector("#blockedState");
  const blockedOpenButton = document.querySelector("#blockedOpenButton");
  const activeTitle = document.querySelector("#activeTitle");
  const activeUrl = document.querySelector("#activeUrl");
  const activeGroup = document.querySelector("#activeGroup");
  const openNewTabButton = document.querySelector("#openNewTabButton");
  const removeButton = document.querySelector("#removeButton");
  const activeFavoriteButton = document.querySelector("#activeFavoriteButton");
  const addSiteButton = document.querySelector("#addSiteButton");
  const importButton = document.querySelector("#importButton");
  const importFile = document.querySelector("#importFile");
  const exportButton = document.querySelector("#exportButton");
  const siteModal = document.querySelector("#siteModal");
  const closeModalButton = document.querySelector("#closeModalButton");
  const cancelModalButton = document.querySelector("#cancelModalButton");
  const searchInput = document.querySelector("#searchInput");
  const categoryOptions = document.querySelector("#categoryOptions");
  const allButton = document.querySelector("#allButton");
  const favoriteButton = document.querySelector("#favoriteButton");
  const hourHand = document.querySelector("#hourHand");
  const minuteHand = document.querySelector("#minuteHand");
  const secondHand = document.querySelector("#secondHand");

  form.addEventListener("submit", addSite);
  addSiteButton.addEventListener("click", openSiteModal);
  closeModalButton.addEventListener("click", closeSiteModal);
  cancelModalButton.addEventListener("click", closeSiteModal);
  siteModal.addEventListener("click", (event) => {
    if (event.target === siteModal) closeSiteModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && siteModal.classList.contains("open")) {
      closeSiteModal();
    }
  });
  openNewTabButton.addEventListener("click", openActiveSite);
  blockedOpenButton.addEventListener("click", openActiveSite);
  removeButton.addEventListener("click", removeActiveSite);
  activeFavoriteButton.addEventListener("click", toggleActiveFavorite);
  importButton.addEventListener("click", () => importFile.click());
  importFile.addEventListener("change", importSites);
  exportButton.addEventListener("click", exportSites);
  searchInput.addEventListener("input", () => {
    state.query = searchInput.value.trim().toLowerCase();
    renderList();
  });
  allButton.addEventListener("click", () => setFavoriteFilter(false));
  favoriteButton.addEventListener("click", () => setFavoriteFilter(true));

  updateClock();
  window.setInterval(updateClock, 1000);
  render();

  function loadSites() {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || "[]");
      if (!Array.isArray(stored)) return fallbackSites;
      return stored.filter((site) => site.name !== "BILGI Envanter Taslagi" || site.url !== "preview.html");
    } catch (error) {
      return fallbackSites;
    }
  }

  function saveSites() {
    localStorage.setItem(storageKey, JSON.stringify(state.sites));
  }

  function createId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return `site-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function addSite(event) {
    event.preventDefault();
    const formData = new FormData(form);
    const site = {
      id: createId(),
      name: String(formData.get("name")).trim(),
      url: normalizeUrl(String(formData.get("url")).trim()),
      group: String(formData.get("group")).trim() || "Genel",
      favorite: false,
      pinned: false,
      pinnedAt: 0,
      order: getNextOrder()
    };

    if (!site.name || !site.url) return;

    state.sites.unshift(site);
    normalizeSiteOrder();
    state.activeId = site.id;
    saveSites();
    form.reset();
    closeSiteModal();
    render();
  }

  function normalizeUrl(url) {
    const isLocal = url.endsWith(".html") || url.startsWith("./") || url.startsWith("/") || url.startsWith("localhost") || url.startsWith("127.0.0.1");
    const hasProtocol = /^[a-z]+:\/\//i.test(url);

    if (hasProtocol || isLocal) return url;
    return `https://${url}`;
  }

  function openSiteModal() {
    siteModal.classList.add("open");
    siteModal.setAttribute("aria-hidden", "false");
    document.querySelector("#siteName").focus();
  }

  function closeSiteModal() {
    siteModal.classList.remove("open");
    siteModal.setAttribute("aria-hidden", "true");
  }

  function render() {
    renderCategoryOptions();
    renderList();
    renderActiveSite();
  }

  function renderCategoryOptions() {
    const groups = [...new Set(state.sites.map((site) => site.group).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, "tr"));

    categoryOptions.innerHTML = "";
    groups.forEach((group) => {
      const option = document.createElement("option");
      option.value = group;
      categoryOptions.append(option);
    });
  }

  function renderList() {
    const sites = state.sites
      .filter((site) => {
        const haystack = `${site.name} ${site.url} ${site.group}`.toLowerCase();
        const matchesFavorite = !state.onlyFavorites || site.favorite;
        const matchesQuery = !state.query || haystack.includes(state.query);
        return matchesFavorite && matchesQuery;
      })
      .sort(compareSites);

    list.innerHTML = "";

    if (!sites.length) {
      const empty = document.createElement("p");
      empty.className = "site-url";
      empty.textContent = "Bu filtreye uyan site yok.";
      list.append(empty);
      return;
    }

    sites.forEach((site, index) => {
      const row = document.createElement("div");
      row.className = `site-row tone-${index % 8}${site.id === state.activeId ? " active" : ""}${site.pinned ? " pinned" : ""}`;
      row.role = "button";
      row.tabIndex = 0;
      row.draggable = true;
      row.dataset.siteId = site.id;
      row.setAttribute("aria-label", `${site.name} sitesini aç`);
      row.addEventListener("click", () => {
        state.activeId = site.id;
        render();
      });
      row.addEventListener("dragstart", (event) => startSiteDrag(event, site.id));
      row.addEventListener("dragover", (event) => moveSiteDrag(event, site.id));
      row.addEventListener("dragleave", () => row.classList.remove("drop-before", "drop-after"));
      row.addEventListener("drop", (event) => dropSite(event, site.id));
      row.addEventListener("dragend", endSiteDrag);
      row.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          state.activeId = site.id;
          render();
        }
      });

      const main = document.createElement("span");
      main.className = "site-main";

      const name = document.createElement("span");
      name.className = "site-name";
      name.textContent = site.name;

      const group = document.createElement("span");
      group.className = "site-group";
      group.textContent = site.pinned ? `${site.group} · Sabit` : site.group;

      const actions = document.createElement("span");
      actions.className = "site-actions";

      const pin = document.createElement("button");
      pin.type = "button";
      pin.className = `pin-button${site.pinned ? " on" : ""}`;
      pin.title = site.pinned ? "Sabitlemeyi kaldır" : "En üste sabitle";
      pin.setAttribute("aria-label", site.pinned ? "Sabitlemeyi kaldır" : "En üste sabitle");
      pin.textContent = "⌃";
      pin.addEventListener("click", (event) => {
        event.stopPropagation();
        site.pinned = !site.pinned;
        site.pinnedAt = site.pinned ? Date.now() : 0;
        site.order = getTopOrder(site.pinned);
        saveSites();
        render();
      });

      const favorite = document.createElement("button");
      favorite.type = "button";
      favorite.className = `favorite${site.favorite ? " on" : ""}`;
      favorite.title = site.favorite ? "Favorilerden çıkar" : "Favori yap";
      favorite.setAttribute("aria-label", site.favorite ? "Favorilerden çıkar" : "Favori yap");
      favorite.innerHTML = `<span aria-hidden="true">${site.favorite ? "★" : "☆"}</span><span class="favorite-label">Favori</span>`;
      favorite.addEventListener("click", (event) => {
        event.stopPropagation();
        site.favorite = !site.favorite;
        saveSites();
        renderList();
      });

      main.append(name, group);
      actions.append(pin, favorite);
      row.append(main, actions);
      list.append(row);
    });
  }

  function compareSites(a, b) {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return Number(a.order || 0) - Number(b.order || 0);
  }

  function startSiteDrag(event, siteId) {
    if (event.target instanceof Element && event.target.closest("button")) {
      event.preventDefault();
      return;
    }

    state.draggingId = siteId;
    event.currentTarget.classList.add("dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", siteId);
  }

  function moveSiteDrag(event, targetId) {
    if (!state.draggingId || state.draggingId === targetId) return;

    event.preventDefault();
    const targetRow = event.currentTarget;
    const position = getDropPosition(event, targetRow);
    targetRow.classList.toggle("drop-before", position === "before");
    targetRow.classList.toggle("drop-after", position === "after");
  }

  function dropSite(event, targetId) {
    event.preventDefault();
    clearDropMarkers();

    const draggedId = state.draggingId || event.dataTransfer.getData("text/plain");
    if (!draggedId || draggedId === targetId) return;

    const targetRow = event.currentTarget;
    const position = getDropPosition(event, targetRow);
    reorderSites(draggedId, targetId, position);
    state.draggingId = null;
    render();
  }

  function endSiteDrag(event) {
    event.currentTarget.classList.remove("dragging");
    state.draggingId = null;
    clearDropMarkers();
  }

  function getDropPosition(event, row) {
    const rect = row.getBoundingClientRect();
    return event.clientY < rect.top + rect.height / 2 ? "before" : "after";
  }

  function clearDropMarkers() {
    list.querySelectorAll(".drop-before, .drop-after, .dragging").forEach((row) => {
      row.classList.remove("drop-before", "drop-after", "dragging");
    });
  }

  function reorderSites(draggedId, targetId, position) {
    const ordered = [...state.sites].sort(compareSites);
    const dragged = ordered.find((site) => site.id === draggedId);
    const target = ordered.find((site) => site.id === targetId);
    if (!dragged || !target) return;

    dragged.pinned = target.pinned;
    if (!dragged.pinned) dragged.pinnedAt = 0;

    const withoutDragged = ordered.filter((site) => site.id !== draggedId);
    const targetIndex = withoutDragged.findIndex((site) => site.id === targetId);
    const insertIndex = position === "after" ? targetIndex + 1 : targetIndex;
    withoutDragged.splice(insertIndex, 0, dragged);

    withoutDragged.forEach((site, index) => {
      site.order = index;
      if (site.pinned && !site.pinnedAt) {
        site.pinnedAt = Date.now();
      }
    });

    state.sites = withoutDragged;
    saveSites();
  }

  function normalizeSiteOrder() {
    state.sites
      .sort(compareSites)
      .forEach((site, index) => {
        site.order = index;
      });
  }

  function getNextOrder() {
    return Math.min(0, ...state.sites.map((site) => Number(site.order || 0))) - 1;
  }

  function getTopOrder(pinned) {
    const matchingSites = state.sites.filter((site) => Boolean(site.pinned) === Boolean(pinned));
    return Math.min(0, ...matchingSites.map((site) => Number(site.order || 0))) - 1;
  }

  function renderActiveSite() {
    const activeSite = state.sites.find((site) => site.id === state.activeId);
    const hasSite = Boolean(activeSite);

    openNewTabButton.disabled = !hasSite;
    removeButton.disabled = !hasSite;
    activeFavoriteButton.disabled = !hasSite;
    frame.classList.toggle("loaded", hasSite);
    emptyState.classList.toggle("hidden", hasSite);
    blockedState.classList.add("hidden");

    if (!activeSite) {
      activeTitle.textContent = "Bir site seçin";
      activeUrl.textContent = "Soldaki listeden site açabilir veya yeni site ekleyebilirsiniz.";
      activeGroup.textContent = "Hazır";
      activeFavoriteButton.textContent = "Favori yap";
      activeFavoriteButton.classList.remove("on");
      frame.removeAttribute("src");
      return;
    }

    activeTitle.textContent = activeSite.name;
    activeUrl.textContent = activeSite.url;
    activeGroup.textContent = activeSite.group;
    activeFavoriteButton.textContent = activeSite.favorite ? "Favoride" : "Favori yap";
    activeFavoriteButton.classList.toggle("on", activeSite.favorite);

    if (isLikelyFrameBlocked(activeSite.url)) {
      frame.classList.remove("loaded");
      frame.removeAttribute("src");
      blockedState.classList.remove("hidden");
      return;
    }

    frame.src = activeSite.url;
  }

  function isLikelyFrameBlocked(url) {
    try {
      const hostname = new URL(url, window.location.href).hostname.replace(/^www\./, "");
      const blockedHosts = new Set([
        "instagram.com",
        "facebook.com",
        "threads.net",
        "x.com",
        "twitter.com"
      ]);
      return blockedHosts.has(hostname);
    } catch (error) {
      return false;
    }
  }

  function toggleActiveFavorite() {
    const activeSite = state.sites.find((site) => site.id === state.activeId);
    if (!activeSite) return;

    activeSite.favorite = !activeSite.favorite;
    saveSites();
    render();
  }

  function openActiveSite() {
    const activeSite = state.sites.find((site) => site.id === state.activeId);
    if (activeSite) {
      window.open(activeSite.url, "_blank", "noopener,noreferrer");
    }
  }

  function removeActiveSite() {
    const activeSite = state.sites.find((site) => site.id === state.activeId);
    if (!activeSite) return;

    const confirmed = window.confirm(`${activeSite.name} listesinden silinsin mi?`);
    if (!confirmed) return;

    state.sites = state.sites.filter((site) => site.id !== activeSite.id);
    state.activeId = null;
    saveSites();
    render();
  }

  function exportSites() {
    const blob = new Blob([JSON.stringify(state.sites, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "web-site-listesi.json";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function importSites(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      try {
        const imported = JSON.parse(String(reader.result || "[]"));
        if (!Array.isArray(imported)) throw new Error("Invalid site list");

        const normalizedSites = imported.map(normalizeImportedSite).filter(Boolean);
        const existingKeys = new Set(state.sites.map(createSiteKey));
        const newSites = normalizedSites.filter((site) => {
          const key = createSiteKey(site);
          if (existingKeys.has(key)) return false;
          existingKeys.add(key);
          return true;
        });

        state.sites = [...newSites, ...state.sites];
        state.activeId = newSites[0]?.id || state.activeId;
        saveSites();
        render();
        window.alert(`${newSites.length} site içe aktarıldı.`);
      } catch (error) {
        window.alert("Site listesi içe aktarılamadı. JSON dosyasını kontrol edin.");
      } finally {
        importFile.value = "";
      }
    });
    reader.readAsText(file);
  }

  function normalizeImportedSite(site) {
    if (!site || typeof site !== "object") return null;
    const name = String(site.name || "").trim();
    const url = String(site.url || "").trim();
    if (!name || !url) return null;

    return {
      id: createId(),
      name,
      url: normalizeUrl(url),
      group: String(site.group || "Genel").trim() || "Genel",
      favorite: Boolean(site.favorite),
      pinned: Boolean(site.pinned),
      pinnedAt: Number(site.pinnedAt || 0),
      order: Number(site.order || 0)
    };
  }

  function createSiteKey(site) {
    return `${site.name.trim().toLowerCase()}|${site.url.trim().toLowerCase()}`;
  }

  function setFavoriteFilter(enabled) {
    state.onlyFavorites = enabled;
    allButton.classList.toggle("active", !enabled);
    favoriteButton.classList.toggle("active", enabled);
    renderList();
  }

  function updateClock() {
    const now = new Date();
    const seconds = now.getSeconds();
    const minutes = now.getMinutes();
    const hours = now.getHours() % 12;

    secondHand.style.transform = `translateX(-50%) rotate(${seconds * 6}deg)`;
    minuteHand.style.transform = `translateX(-50%) rotate(${minutes * 6 + seconds * 0.1}deg)`;
    hourHand.style.transform = `translateX(-50%) rotate(${hours * 30 + minutes * 0.5}deg)`;
  }
})();
