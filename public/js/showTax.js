const taxSwitch = document.getElementById("switchCheckChecked");

  taxSwitch.addEventListener("change", () => {
    const priceElements = document.querySelectorAll(".price");
    const taxLabels = document.querySelectorAll(".tax-label");

    priceElements.forEach((el, index) => {
      const basePrice = Number(el.dataset.basePrice);

      if (taxSwitch.checked) {
        const total = Math.round(basePrice * 1.18);
        el.innerHTML = `&#8377;${total.toLocaleString("en-IN")}`;
        taxLabels[index].style.display = "inline";
      } else {
        el.innerHTML = `&#8377;${basePrice.toLocaleString("en-IN")}`;
        taxLabels[index].style.display = "none";
      }
    });
  });