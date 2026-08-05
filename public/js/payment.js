document.addEventListener("DOMContentLoaded", () => {
  const widget = document.getElementById("payWidget");
  if (!widget) return;

  const bookingId = widget.dataset.bookingId;
  const payBtn = document.getElementById("payNowBtn");
  const statusEl = document.getElementById("payStatus");

  function loadRazorpayScript() {
    return new Promise((resolve, reject) => {
      if (window.Razorpay) return resolve();
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Could not load Razorpay checkout"));
      document.body.appendChild(script);
    });
  }

  payBtn.addEventListener("click", async () => {
    payBtn.disabled = true;
    statusEl.textContent = "Starting payment...";

    try {
      await loadRazorpayScript();

      const orderRes = await fetch(`/bookings/${bookingId}/pay/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const orderData = await orderRes.json();

      if (!orderData.success) {
        statusEl.textContent = orderData.message || "Could not start payment.";
        payBtn.disabled = false;
        return;
      }

      const rzp = new Razorpay({
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        order_id: orderData.order_id,
        name: "WanderLust",
        description: "Booking payment",
        prefill: orderData.prefill,
        handler: async function (response) {
          statusEl.textContent = "Verifying payment...";

          try {
            const verifyRes = await fetch(`/bookings/${bookingId}/pay/verify`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            const verifyData = await verifyRes.json();

            if (verifyData.success) {
              window.location.href = "/trips";
            } else {
              statusEl.textContent = verifyData.message || "Payment verification failed.";
              payBtn.disabled = false;
            }
          } catch (err) {
            statusEl.textContent = "Could not verify payment. Please check My trips.";
            payBtn.disabled = false;
          }
        },
        modal: {
          ondismiss: function () {
            statusEl.textContent = "Payment cancelled.";
            payBtn.disabled = false;
          },
        },
      });

      rzp.on("payment.failed", function () {
        statusEl.textContent = "Payment failed. Please try again.";
        payBtn.disabled = false;
      });

      rzp.open();
    } catch (err) {
      statusEl.textContent = "Something went wrong. Please try again.";
      payBtn.disabled = false;
    }
  });
});
