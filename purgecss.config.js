module.exports = {
  content: ["_site/**/*.html", "_site/**/*.js"],
  css: ["_site/assets/css/*.css"],
  output: "_site/assets/css/",
  skippedContentGlobs: ["_site/assets/**/*.html"],
  safelist: ["show", "fade", "collapsing", "modal-open", "active", "disabled", "focus", "focus-visible"],
};
