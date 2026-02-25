window.dataLayer = window.dataLayer || [];
window.gtag = window.gtag || function gtag() {
  window.dataLayer.push(arguments);
};

window.trackSiteEvent = function trackSiteEvent(eventName, params = {}) {
  if (!eventName) return;
  try {
    window.gtag("event", eventName, params);
  } catch (_error) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: eventName, ...params });
  }
};

window.gtag("js", new Date());
window.gtag("config", "G-19M9F0JMSS");
