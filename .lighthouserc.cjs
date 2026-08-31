const allPaths = require("./.github/ci-paths.json").lighthouse_paths;
const selectedPaths = (process.env.LHCI_URL_PATHS || allPaths.join(",")).split(",").filter(Boolean);
const numberOfRuns = Number.parseInt(process.env.LHCI_NUMBER_OF_RUNS || "3", 10);

module.exports = {
  ci: {
    collect: {
      url: selectedPaths.map((path) => `http://127.0.0.1:4000${path}`),
      numberOfRuns,
      startServerCommand: "python3 -m http.server 4000 --bind 127.0.0.1 --directory _site",
      startServerReadyPattern: "Serving HTTP on",
      settings: {
        chromeFlags: "--no-sandbox --headless=new",
        blockedUrlPatterns: ["https://metrics-api.dimensions.ai/*", "https://www.googletagmanager.com/*"],
      },
    },
    assert: {
      assertions: {
        "categories:performance": ["error", { minScore: 0.7 }],
        "categories:accessibility": ["error", { minScore: 0.95 }],
        "categories:best-practices": ["error", { minScore: 0.9 }],
        "categories:seo": ["error", { minScore: 0.95 }],
        "largest-contentful-paint": ["error", { maxNumericValue: 6000 }],
        "resource-summary:total:size": ["error", { maxNumericValue: 2_000_000 }],
        "resource-summary:image:size": ["error", { maxNumericValue: 1_300_000 }],
        "resource-summary:script:size": ["error", { maxNumericValue: 300_000 }],
        "resource-summary:document:size": ["error", { maxNumericValue: 350_000 }],
        "resource-summary:stylesheet:size": ["error", { maxNumericValue: 160_000 }],
        "resource-summary:third-party:size": ["error", { maxNumericValue: 200_000 }],
        "resource-summary:total:count": ["error", { maxNumericValue: 60 }],
        "errors-in-console": "warn",
        "bf-cache": "off",
        "document-title": "error",
        "color-contrast": "error",
        "link-in-text-block": "error",
        "target-size": "error",
        "label-content-name-mismatch": "error",
      },
    },
    upload: {
      target: "filesystem",
      outputDir: "./lighthouse-results-ci",
    },
  },
};
