// Delegated on document (not queried at load time) so heart buttons inside
// listing cards swapped in later by the filter sidebar's AJAX still work
// without needing to be rebound.
document.addEventListener("click", async (e) => {
  const btn = e.target.closest(".wishlist-heart-btn");
  if (!btn) return;

  e.preventDefault();
  e.stopPropagation();

  const listingId = btn.dataset.listingId;

  try {
    const res = await fetch(`/listings/${listingId}/wishlist/toggle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();
    if (!data.success) return;

    const icon = btn.querySelector("i");
    if (data.wishlisted) {
      btn.classList.add("active");
      icon.classList.remove("fa-regular");
      icon.classList.add("fa-solid");
    } else {
      btn.classList.remove("active");
      icon.classList.remove("fa-solid");
      icon.classList.add("fa-regular");
    }
  } catch (err) {
    // non-critical UI action - fail silently
  }
});
