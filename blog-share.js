(function () {
  var ICON_FACEBOOK =
    '<svg class="blog-share-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M14 8h2.5V4.8c-.4-.1-1.5-.2-2.8-.2-2.8 0-4.7 1.7-4.7 4.8V12H7v3.5h2V22h3.5v-6.5H15l.5-3.5h-3V10c0-1 .3-1.9 1.5-1.9z"/></svg>';
  var ICON_SHARE =
    '<svg class="blog-share-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M12 3v10"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M8 7l4-4 4 4"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>';
  var ICON_COPY =
    '<svg class="blog-share-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="9" y="9" width="11" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M5 15V5a2 2 0 0 1 2-2h9"/></svg>';

  function isMobile() {
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent || "");
  }

  function fallbackCopy(text, onSuccess, onFail) {
    try {
      var input = document.createElement("textarea");
      input.value = text;
      input.setAttribute("readonly", "");
      input.style.position = "fixed";
      input.style.left = "-9999px";
      document.body.appendChild(input);
      input.select();
      var ok = document.execCommand("copy");
      document.body.removeChild(input);
      if (ok) {
        onSuccess();
      } else if (onFail) {
        onFail();
      }
    } catch (err) {
      if (onFail) {
        onFail();
      }
    }
  }

  function copyText(text) {
    return new Promise(function (resolve) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(resolve).catch(function () {
          fallbackCopy(text, resolve, resolve);
        });
      } else {
        fallbackCopy(text, resolve, resolve);
      }
    });
  }

  function facebookSharerUrl(shareUrl) {
    var encoded = encodeURIComponent(shareUrl);
    // Mobile web sharer is usually lighter than www
    if (isMobile()) {
      return "https://m.facebook.com/sharer.php?u=" + encoded;
    }
    return "https://www.facebook.com/sharer/sharer.php?u=" + encoded;
  }

  function openFacebookShare(shareUrl) {
    var href = facebookSharerUrl(shareUrl);
    var popup = window.open(
      href,
      "sff_fb_share",
      "noopener,noreferrer,width=640,height=720,scrollbars=yes"
    );
    if (!popup) {
      window.location.href = href;
    }
  }

  function buildBar(options) {
    var shareUrl = options.url;
    var shareTitle = options.title;
    var label = options.label;

    var wrap = document.createElement("div");
    wrap.className = "blog-share" + (options.extraClass ? " " + options.extraClass : "");
    wrap.setAttribute("role", "region");
    wrap.setAttribute("aria-label", label);
    wrap.innerHTML =
      '<p class="blog-share-label">' +
      label +
      "</p>" +
      '<div class="blog-share-actions">' +
      '<button type="button" class="blog-share-btn blog-share-facebook">' +
      ICON_FACEBOOK +
      "<span>Facebook</span></button>" +
      '<button type="button" class="blog-share-btn blog-share-native" hidden>' +
      ICON_SHARE +
      "<span>Share</span></button>" +
      '<button type="button" class="blog-share-btn blog-share-copy">' +
      ICON_COPY +
      "<span>Copy link</span></button>" +
      "</div>" +
      '<p class="blog-share-status" aria-live="polite" hidden></p>';

    var status = wrap.querySelector(".blog-share-status");
    var copyBtn = wrap.querySelector(".blog-share-copy");
    var nativeBtn = wrap.querySelector(".blog-share-native");
    var facebookBtn = wrap.querySelector(".blog-share-facebook");

    function setStatus(message, holdMs) {
      status.hidden = !message;
      status.textContent = message || "";
      if (message) {
        window.clearTimeout(setStatus._timer);
        setStatus._timer = window.setTimeout(function () {
          status.hidden = true;
          status.textContent = "";
        }, holdMs || 2800);
      }
    }

    copyBtn.addEventListener("click", function () {
      copyText(shareUrl).then(function () {
        setStatus("Link copied");
      });
    });

    facebookBtn.addEventListener("click", function () {
      // Copy first so a slow Facebook window never blocks sharing
      copyText(shareUrl).then(function () {
        setStatus("Link copied — opening Facebook. If it stalls, paste into a new post.", 5000);

        // On phones, system share sheet is much faster than Facebook’s web sharer
        if (isMobile() && typeof navigator.share === "function") {
          navigator
            .share({ title: shareTitle, url: shareUrl, text: shareTitle })
            .then(function () {
              setStatus("Shared");
            })
            .catch(function () {
              openFacebookShare(shareUrl);
            });
          return;
        }

        openFacebookShare(shareUrl);
      });
    });

    if (typeof navigator.share === "function") {
      nativeBtn.hidden = false;
      nativeBtn.addEventListener("click", function () {
        navigator
          .share({ title: shareTitle, url: shareUrl, text: shareTitle })
          .catch(function () {
            /* user canceled or share failed — stay quiet */
          });
      });
    }

    return wrap;
  }

  function pageShareUrl() {
    var canonical = document.querySelector('link[rel="canonical"]');
    return (canonical && canonical.href) || window.location.href.split("#")[0].split("?")[0];
  }

  function pageShareTitle() {
    var titleEl = document.querySelector("h1");
    return (titleEl && titleEl.textContent.trim()) || document.title;
  }

  document.querySelectorAll("[data-site-share]").forEach(function (mount) {
    if (mount.dataset.shareReady === "1") {
      return;
    }
    var url = mount.getAttribute("data-share-url") || pageShareUrl();
    var title = mount.getAttribute("data-share-title") || pageShareTitle();
    var label = mount.getAttribute("data-share-label") || "Share this page";
    mount.appendChild(
      buildBar({
        url: url,
        title: title,
        label: label,
        extraClass: "blog-share-site",
      })
    );
    mount.dataset.shareReady = "1";
  });

  var article = document.querySelector(".blog-post-page article");
  if (!article || article.dataset.shareReady === "1") {
    return;
  }

  var shareUrl = pageShareUrl();
  var shareTitle = pageShareTitle();
  var label = "Share this article";

  var topBar = buildBar({ url: shareUrl, title: shareTitle, label: label });
  var meta = article.querySelector(".blog-post-meta");
  if (meta && meta.parentNode) {
    meta.insertAdjacentElement("afterend", topBar);
  } else {
    var content = article.querySelector(".blog-post-content");
    if (content) {
      content.insertAdjacentElement("beforebegin", topBar);
    }
  }

  var bottomBar = buildBar({
    url: shareUrl,
    title: shareTitle,
    label: label,
    extraClass: "blog-share-bottom",
  });
  var related = article.querySelector(".blog-related");
  var cta = article.querySelector(".blog-cta");
  if (related) {
    related.insertAdjacentElement("beforebegin", bottomBar);
  } else if (cta) {
    cta.insertAdjacentElement("beforebegin", bottomBar);
  }

  article.dataset.shareReady = "1";
})();
