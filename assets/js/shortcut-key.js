// Search toggle - icon only, no keyboard shortcut display
document.addEventListener("readystatechange", () => {
  if (document.readyState === "interactive") {
    let shortcutKeyElement = document.querySelector("#search-toggle .nav-link");
    if (shortcutKeyElement) {
      // Set to icon only, regardless of platform
      shortcutKeyElement.innerHTML = '<i class="ti ti-search"></i>';
    }
  }
});
