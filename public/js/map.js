function initMap() {
  const mapDiv = document.getElementById("map");
  if (!mapDiv) return;

  let listingCoords;

  try {
    listingCoords = JSON.parse(mapDiv.dataset.coords);
  } catch {
    console.warn("Invalid coordinates");
    return;
  }

  if (
    !Array.isArray(listingCoords) ||
    listingCoords.length !== 2 ||
    typeof listingCoords[0] !== "number" ||
    typeof listingCoords[1] !== "number"
  ) {
    console.warn("Missing or invalid geometry");
    return;
  }

  const lng = listingCoords[0];
  const lat = listingCoords[1];

  const map = L.map("map").setView([lat, lng], 10);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
  }).addTo(map);

  L.marker([lat, lng])
    .addTo(map)
    .bindPopup(mapDiv.dataset.title)
    .openPopup();
}

document.addEventListener("DOMContentLoaded", initMap);
