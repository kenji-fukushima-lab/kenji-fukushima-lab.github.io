const ninjaKeys = document.querySelector("ninja-keys");
const pagefindShell = document.getElementById("pagefind-modal-shell");
const pagefindRoot = document.getElementById("pagefind-search");

let pagefindInstance = null;

const syncSearchTheme = () => {
  const theme = determineComputedTheme();

  if (typeof setSearchTheme === "function") {
    setSearchTheme(theme);
    return;
  }

  if (!ninjaKeys) return;

  if (theme === "dark") {
    ninjaKeys.classList.add("dark");
  } else {
    ninjaKeys.classList.remove("dark");
  }
};

const collapseNavbarIfNeeded = () => {
  const $navbarNav = $("#navbarNav");
  if ($navbarNav.hasClass("show")) {
    $navbarNav.collapse("hide");
  }
};

const ensurePagefind = () => {
  if (pagefindInstance || !pagefindRoot || typeof PagefindUI === "undefined") {
    return pagefindInstance;
  }

  pagefindInstance = new PagefindUI({
    element: "#pagefind-search",
    showSubResults: true,
  });

  return pagefindInstance;
};

const focusPagefindInput = () => {
  const input = pagefindRoot?.querySelector(".pagefind-ui__search-input");
  if (!input) return;

  input.focus();
  input.select?.();
};

const openPagefindShell = () => {
  if (!pagefindShell) return;

  pagefindShell.hidden = false;
  pagefindShell.setAttribute("aria-hidden", "false");
  document.body.classList.add("pagefind-modal-open");
  window.requestAnimationFrame(() => {
    pagefindShell.classList.add("is-open");
  });
  window.setTimeout(focusPagefindInput, 0);
  window.setTimeout(focusPagefindInput, 120);
};

const closeSearchModal = () => {
  if (!pagefindShell || pagefindShell.hidden) return;

  pagefindShell.classList.remove("is-open");
  pagefindShell.setAttribute("aria-hidden", "true");
  document.body.classList.remove("pagefind-modal-open");
  window.setTimeout(() => {
    if (pagefindShell.getAttribute("aria-hidden") === "true") {
      pagefindShell.hidden = true;
    }
  }, 180);
};

const openSearchModal = () => {
  collapseNavbarIfNeeded();
  syncSearchTheme();

  if (ensurePagefind() && pagefindShell) {
    openPagefindShell();
    return;
  }

  ninjaKeys?.open();
};

document.querySelectorAll("[data-pagefind-close]").forEach((element) => {
  element.addEventListener("click", closeSearchModal);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeSearchModal();
  }
});

syncSearchTheme();

window.openSearchModal = openSearchModal;
window.closeSearchModal = closeSearchModal;
