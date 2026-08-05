document.addEventListener("DOMContentLoaded", () => {
  const sidebar = document.getElementById("filterSidebar");
  const toggleBtn = document.getElementById("filterToggleBtn");
  const closeBtn = document.getElementById("filterCloseBtn");
  const overlay = document.getElementById("filterOverlay");
  const form = document.getElementById("filterForm");
  const clearBtn = document.getElementById("clearFiltersBtn");
  const grid = document.getElementById("listingsGrid");
  const countEl = document.getElementById("listingsCount");

  if (!form || !grid) return;

  function openSidebar() {
    sidebar.classList.add("open");
    overlay.classList.add("open");
  }

  function closeSidebar() {
    sidebar.classList.remove("open");
    overlay.classList.remove("open");
  }

  if (toggleBtn) toggleBtn.addEventListener("click", openSidebar);
  if (closeBtn) closeBtn.addEventListener("click", closeSidebar);
  if (overlay) overlay.addEventListener("click", closeSidebar);

  // Guards against out-of-order responses: e.g. picking a category then
  // immediately clicking "Clear" fires two overlapping requests, and
  // without this the category request can resolve after the clear
  // request and silently overwrite it.
  let latestRequestId = 0;

  async function applyFilters() {
    const requestId = ++latestRequestId;

    const params = new URLSearchParams(new FormData(form));
    for (const key of [...params.keys()]) {
      if (!params.get(key)) params.delete(key);
    }
    const qs = params.toString();

    let res;
    try {
      res = await fetch(`/listings/filter${qs ? "?" + qs : ""}`);
    } catch (err) {
      return; // filtering is a UX nicety - fail silently on network errors
    }
    if (!res.ok || requestId !== latestRequestId) return;

    const data = await res.json();
    if (requestId !== latestRequestId) return;

    grid.innerHTML = data.html;

    if (countEl) {
      countEl.textContent = `${data.count} listing${data.count === 1 ? "" : "s"}`;
    }

    window.history.pushState({}, "", `/listings${qs ? "?" + qs : ""}`);
    closeSidebar();
  }

  form.addEventListener("change", applyFilters);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    applyFilters();
  });

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      // Not form.reset(): that reverts to the form's baked-in defaults,
      // which are whatever filters were in the URL when the page was
      // rendered (e.g. after a refresh on a filtered link) - not empty.
      form.querySelectorAll("select").forEach((el) => {
        el.value = "";
      });
      form.querySelectorAll('input[type="number"]').forEach((el) => {
        el.value = "";
      });
      applyFilters();
    });
  }
});
