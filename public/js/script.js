// Example starter JavaScript for disabling form submissions if there are invalid fields
// Bootstrap validation
(() => {
  'use strict';
  // Fetch all the forms we want to apply custom Bootstrap validation styles to
  const forms = document.querySelectorAll('.needs-validation');

  // Loop over them and prevent submission
  Array.from(forms).forEach(form => {
    form.addEventListener('submit', event => {
      if (!form.checkValidity()) {
        event.preventDefault();
        event.stopPropagation();
      }
      form.classList.add('was-validated');
    }, false);
  });

  // Image preview for edit page (safe check)
  const imageInput = document.getElementById("imageInput");
  const previewImage = document.getElementById("editImagePreview");

  if (imageInput && previewImage) {
    imageInput.addEventListener("change", () => {
      const file = imageInput.files[0];

      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          previewImage.src = e.target.result;
        };
        reader.readAsDataURL(file);
      }
    });
  }

})();
