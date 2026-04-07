const ninjaKeys = document.querySelector("ninja-keys");
const searchToggleButton = document.getElementById("search-toggle");
const pagefindShell = document.getElementById("pagefind-modal-shell");
const pagefindDialog = pagefindShell?.querySelector(".pagefind-modal-shell__dialog");
const pagefindRoot = document.getElementById("pagefind-search");

let pagefindInstance = null;
let lastFocusedElement = null;
let focusRetryTimer = null;

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

const isSearchModalOpen = () =>
  Boolean(pagefindShell && !pagefindShell.hidden && pagefindShell.getAttribute("aria-hidden") === "false");

const isEditableTarget = (target) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));

const isRestorableFocusTarget = (target) =>
  target instanceof HTMLElement &&
  target !== document.body &&
  target !== document.documentElement &&
  !pagefindShell?.contains(target) &&
  target.getAttribute("inert") === null;

const clearPendingFocusRetry = () => {
  if (focusRetryTimer !== null) {
    window.clearTimeout(focusRetryTimer);
    focusRetryTimer = null;
  }
};

const setPageBackgroundInert = (isInert) => {
  Array.from(document.body.children)
    .filter((element) => element !== pagefindShell && element.tagName !== "SCRIPT")
    .forEach((element) => {
      if (isInert) {
        element.setAttribute("inert", "");
      } else {
        element.removeAttribute("inert");
      }
    });
};

const ensurePagefind = () => {
  if (pagefindInstance || !pagefindRoot || typeof PagefindUI === "undefined") {
    return pagefindInstance;
  }

  pagefindInstance = new PagefindUI({
    element: "#pagefind-search",
    autofocus: true,
    showSubResults: true,
  });

  return pagefindInstance;
};

const focusPagefindInput = (attempt = 0) => {
  const input = pagefindRoot?.querySelector(".pagefind-ui__search-input");
  if (input instanceof HTMLElement) {
    input.focus();
    input.select?.();
    return true;
  }

  if (!isSearchModalOpen() || attempt >= 8) {
    return false;
  }

  clearPendingFocusRetry();
  focusRetryTimer = window.setTimeout(() => {
    focusRetryTimer = null;
    focusPagefindInput(attempt + 1);
  }, attempt < 2 ? 60 : 120);

  return false;
};

const getSearchModalFocusableElements = () =>
  Array.from(
    pagefindShell?.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ) || []
  ).filter(
    (element) =>
      element instanceof HTMLElement &&
      !element.hidden &&
      element.getAttribute("aria-hidden") !== "true" &&
      element.getClientRects().length > 0
  );

const restoreFocusAfterClose = () => {
  const fallbackTarget = searchToggleButton instanceof HTMLElement ? searchToggleButton : null;
  const target =
    isRestorableFocusTarget(lastFocusedElement) && document.contains(lastFocusedElement)
      ? lastFocusedElement
      : fallbackTarget;

  target?.focus({ preventScroll: true });
  lastFocusedElement = null;
};

const openPagefindShell = () => {
  if (!pagefindShell) return;

  if (!isSearchModalOpen()) {
    lastFocusedElement = isRestorableFocusTarget(document.activeElement) ? document.activeElement : searchToggleButton;
  }

  clearPendingFocusRetry();
  ninjaKeys?.close?.();
  pagefindShell.hidden = false;
  pagefindShell.setAttribute("aria-hidden", "false");
  document.body.classList.add("pagefind-modal-open");
  setPageBackgroundInert(true);
  pagefindShell.classList.add("is-open");
  pagefindDialog?.focus({ preventScroll: true });
  window.requestAnimationFrame(() => {
    if (!(document.activeElement instanceof HTMLElement) || !pagefindShell.contains(document.activeElement)) {
      pagefindDialog?.focus({ preventScroll: true });
    }
    focusPagefindInput();
  });
};

const closeSearchModal = () => {
  if (!isSearchModalOpen()) return;

  clearPendingFocusRetry();
  pagefindShell.classList.remove("is-open");
  pagefindShell.setAttribute("aria-hidden", "true");
  document.body.classList.remove("pagefind-modal-open");
  setPageBackgroundInert(false);
  window.setTimeout(() => {
    if (pagefindShell.getAttribute("aria-hidden") === "true") {
      pagefindShell.hidden = true;
    }
  }, 180);
  window.setTimeout(restoreFocusAfterClose, 0);
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

const trapFocusWithinSearchModal = (event) => {
  if (event.key !== "Tab" || !isSearchModalOpen()) return;

  const focusableElements = getSearchModalFocusableElements();
  event.preventDefault();

  if (!focusableElements.length) {
    pagefindDialog?.focus({ preventScroll: true });
    return;
  }

  const activeElement = document.activeElement;
  const activeIndex = focusableElements.indexOf(activeElement);
  const nextIndex = event.shiftKey
    ? activeIndex <= 0
      ? focusableElements.length - 1
      : activeIndex - 1
    : activeIndex === -1 || activeIndex === focusableElements.length - 1
      ? 0
      : activeIndex + 1;

  focusableElements[nextIndex]?.focus({ preventScroll: true });
};

document.querySelectorAll("[data-pagefind-close]").forEach((element) => {
  element.addEventListener("click", closeSearchModal);
});

document.addEventListener("focusin", (event) => {
  if (!isSearchModalOpen()) return;
  if (pagefindShell.contains(event.target)) return;

  const focusableElements = getSearchModalFocusableElements();
  (focusableElements[0] || pagefindDialog)?.focus({ preventScroll: true });
});

const handleGlobalSearchKeydown = (event) => {
  const isSearchShortcut =
    (event.metaKey || event.ctrlKey) &&
    !event.altKey &&
    !event.shiftKey &&
    event.key.toLowerCase() === "k";

  if (isSearchShortcut && (!isEditableTarget(event.target) || isSearchModalOpen())) {
    event.preventDefault();
    openSearchModal();
    return;
  }

  if (event.key === "Escape" && isSearchModalOpen()) {
    event.preventDefault();
    closeSearchModal();
    return;
  }

  trapFocusWithinSearchModal(event);
};

document.addEventListener("keydown", handleGlobalSearchKeydown, true);

syncSearchTheme();

window.openSearchModal = openSearchModal;
window.closeSearchModal = closeSearchModal;
