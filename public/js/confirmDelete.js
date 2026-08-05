// Listing delete confirmation
document.addEventListener("DOMContentLoaded", () => {
  const deleteListingForms = document.querySelectorAll(".delete-listing-form");

  deleteListingForms.forEach(form => {
    form.addEventListener("submit", (e) => {
      const confirmed = confirm("⚠️ Are you sure you want to delete this listing? This action cannot be undone.");

      if (!confirmed) {
        e.preventDefault();
      }
    });
  });
});

// Review delete confirmation
document.addEventListener("DOMContentLoaded", () => {
  const deleteReviewForms = document.querySelectorAll(".delete-review-form");

  deleteReviewForms.forEach(form => {
    form.addEventListener("submit", (e) => {
      const confirmed = confirm("Are you sure you want to delete this review?");

      if (!confirmed) {
        e.preventDefault(); // stop form submit
      }
    });
  });
});

// Booking cancel confirmation
document.addEventListener("DOMContentLoaded", () => {
  const cancelBookingForms = document.querySelectorAll(".cancel-booking-form");

  cancelBookingForms.forEach(form => {
    form.addEventListener("submit", (e) => {
      const confirmed = confirm("Are you sure you want to cancel this booking?");

      if (!confirmed) {
        e.preventDefault();
      }
    });
  });
});

