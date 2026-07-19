/**
 * Site analytics loader with internal-device exclusion.
 *
 * Opt out (once per browser):  https://stressfreeflow.com/?internal=1
 * Opt back in:                 https://stressfreeflow.com/?internal=0
 *
 * Sets a long-lived cookie so your desktop and phone stop sending GA hits
 * even when your IP changes. Revisit ?internal=1 after clearing site data.
 */
(function () {
  var MEASUREMENT_ID = "G-QWZ0DDV8Z8";
  var COOKIE = "sff_ga_exclude";
  var MAX_AGE_SECONDS = 60 * 60 * 24 * 400;

  function setCookie(name, value, maxAge) {
    document.cookie =
      name + "=" + value + ";path=/;max-age=" + maxAge + ";SameSite=Lax";
  }

  function getCookie(name) {
    var prefix = name + "=";
    var parts = document.cookie.split(";");
    for (var i = 0; i < parts.length; i++) {
      var c = parts[i].trim();
      if (c.indexOf(prefix) === 0) return c.slice(prefix.length);
    }
    return null;
  }

  try {
    var params = new URLSearchParams(window.location.search);
    if (params.get("internal") === "1" || params.get("ga_exclude") === "1") {
      setCookie(COOKIE, "1", MAX_AGE_SECONDS);
    }
    if (params.get("internal") === "0" || params.get("ga_exclude") === "0") {
      setCookie(COOKIE, "", 0);
    }
  } catch (e) {
    /* ignore */
  }

  if (getCookie(COOKIE) === "1") {
    window["ga-disable-" + MEASUREMENT_ID] = true;
    return;
  }

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    dataLayer.push(arguments);
  }
  window.gtag = gtag;

  function loadGa() {
    var script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + MEASUREMENT_ID;
    script.onload = function () {
      gtag("js", new Date());
      gtag("config", MEASUREMENT_ID);
    };
    document.head.appendChild(script);
  }

  var current = document.currentScript;
  var deferLoad = current && current.hasAttribute("data-defer-load");

  if (deferLoad) {
    if (document.readyState === "complete") loadGa();
    else window.addEventListener("load", loadGa);
  } else {
    loadGa();
  }
})();
