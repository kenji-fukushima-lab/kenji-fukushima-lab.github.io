(() => {
  const dialog = document.getElementById("publication-access-dialog");
  const openButton = document.querySelector("[data-publication-access-open]");

  if (!(dialog instanceof HTMLDialogElement) || !(openButton instanceof HTMLButtonElement)) {
    return;
  }

  const closeButtons = dialog.querySelectorAll("[data-publication-access-close]");
  const form = dialog.querySelector("[data-publication-access-form]");
  const startedAtInput = dialog.querySelector("[data-publication-access-started-at]");

  openButton.addEventListener("click", () => {
    if (startedAtInput instanceof HTMLInputElement) {
      startedAtInput.value = String(Date.now());
    }
    dialog.showModal();
    const firstInput = dialog.querySelector('input[name="name"]');
    if (firstInput instanceof HTMLInputElement) {
      firstInput.focus();
    }
  });

  closeButtons.forEach((button) => {
    button.addEventListener("click", () => dialog.close());
  });

  dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) {
      return;
    }

    const bounds = dialog.getBoundingClientRect();
    const insideDialog =
      event.clientX >= bounds.left && event.clientX <= bounds.right && event.clientY >= bounds.top && event.clientY <= bounds.bottom;
    if (!insideDialog) {
      dialog.close();
    }
  });

  if (form instanceof HTMLFormElement) {
    form.addEventListener("submit", () => {
      window.setTimeout(() => dialog.close(), 0);
    });
  }
})();
