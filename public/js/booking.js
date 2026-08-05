document.addEventListener("DOMContentLoaded", () => {
  const widget = document.querySelector(".booking-widget[data-price]");
  if (!widget) return;

  const pricePerNight = Number(widget.dataset.price);
  const checkInInput = document.getElementById("checkIn");
  const checkOutInput = document.getElementById("checkOut");
  const breakdown = document.getElementById("bookingPriceBreakdown");

  const todayStr = new Date().toISOString().slice(0, 10);
  checkInInput.min = todayStr;
  checkOutInput.min = todayStr;

  function updateCheckOutMin() {
    if (!checkInInput.value) return;

    const nextDay = new Date(checkInInput.value);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    checkOutInput.min = nextDay.toISOString().slice(0, 10);

    if (checkOutInput.value && checkOutInput.value <= checkInInput.value) {
      checkOutInput.value = "";
    }
  }

  function updateBreakdown() {
    if (!checkInInput.value || !checkOutInput.value) {
      breakdown.innerHTML = '<p class="text-muted mb-0">Select dates to see the price</p>';
      return;
    }

    const checkIn = new Date(checkInInput.value);
    const checkOut = new Date(checkOutInput.value);
    const nights = Math.round((checkOut - checkIn) / (1000 * 60 * 60 * 24));

    if (nights <= 0) {
      breakdown.innerHTML = '<p class="text-danger mb-0">Check-out must be after check-in</p>';
      return;
    }

    const subtotal = nights * pricePerNight;
    const taxes = Math.round(subtotal * 0.18);
    const total = subtotal + taxes;

    breakdown.innerHTML = `
      <div class="d-flex justify-content-between">
        <span>&#8377;${pricePerNight.toLocaleString("en-IN")} x ${nights} night${nights > 1 ? "s" : ""}</span>
        <span>&#8377;${subtotal.toLocaleString("en-IN")}</span>
      </div>
      <div class="d-flex justify-content-between">
        <span>Taxes (18%)</span>
        <span>&#8377;${taxes.toLocaleString("en-IN")}</span>
      </div>
      <hr class="my-2">
      <div class="d-flex justify-content-between fw-bold">
        <span>Total</span>
        <span>&#8377;${total.toLocaleString("en-IN")}</span>
      </div>
    `;
  }

  checkInInput.addEventListener("change", () => {
    updateCheckOutMin();
    updateBreakdown();
  });
  checkOutInput.addEventListener("change", updateBreakdown);
});
