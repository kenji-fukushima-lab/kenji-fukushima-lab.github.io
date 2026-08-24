module.exports = {
  extends: "lighthouse:default",
  settings: {
    blockedUrlPatterns: ["https://metrics-api.dimensions.ai/*", "https://www.googletagmanager.com/*"],
  },
};
