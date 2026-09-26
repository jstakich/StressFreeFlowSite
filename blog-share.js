(function () {
  function fallbackCopy(text, onSuccess, setStatus) {
    try {
      const input = document.createElement("textarea");
      input.value = text;
      input.setAttribute("readonly", "");
      input.style.position = "fixed";
      input.style.left = "-9999px";
      document.body.appendChild(input);
      input.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(input);
      if (ok) {
        onSuccess();
      } else {
        setStatus("Copy failed — select the URL in the address bar");
      }
    } catch (err) {
      setStatus("Copy failed — select the URL in the address bar");
    }
  }

  function buildBar(options) {
    const shareUrl = options.url;
    const shareTitle = options.title;
    const label = options.label;
    const fbUrl =
      "https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(shareUrl);

    const wrap = document.createElement("div");
    wrap.className = "blog-share" + (options.extraClass ? " " + options.extraClass : "");
    wrap.setAttribute("role", "region");
    wrap.setAttribute("aria-label", label);
    wrap.innerHTML =
      '<p class="blog-share-label">' +
      label +
      "</p>" +
      '<div class="blog-share-actions">' +
      '<a class="blog-share-btn blog-share-facebook" href="' +
      fbUrl +
      '" target="_blank" rel="noopener noreferrer">Facebook</a>' +
      '<button type="button" class="blog-share-btn blog-share-native" hidden>Share</button>' +
      '<button type="button" class="blog-share-btn blog-share-copy">Copy link</button>' +
      "</div>" +
      '<p class="blog-share-status" aria-live="polite" hidden></p>';

    const status = wrap.querySelector(".blog-share-status");
    const copyBtn = wrap.querySelector(".blog-share-copy");
    const nativeBtn = wrap.querySelector(".blog-share-native");

    function setStatus(message) {
      status.hidden = !message;
      status.textContent = message || "";
      if (message) {
        window.clearTimeout(setStatus._timer);
        setStatus._timer = window.setTimeout(function () {
          status.hidden = true;
          status.textContent = "";
        }, 2200);
      }
    }

    copyBtn.addEventListener("click", function () {
      const done = function () {
        setStatus("Link copied");
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(shareUrl).then(done).catch(function () {
          fallbackCopy(shareUrl, done, setStatus);
        });
      } else {
        fallbackCopy(shareUrl, done, setStatus);
      }
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
    const canonical = document.querySelector('link[rel="canonical"]');
    return (canonical && canonical.href) || window.location.href.split("#")[0].split("?")[0];
  }

  function pageShareTitle() {
    const titleEl = document.querySelector("h1");
    return (titleEl && titleEl.textContent.trim()) || document.title;
  }

  // Explicit mounts (homepage / other pages)
  document.querySelectorAll("[data-site-share]").forEach(function (mount) {
    if (mount.dataset.shareReady === "1") {
      return;
    }
    const url = mount.getAttribute("data-share-url") || pageShareUrl();
    const title = mount.getAttribute("data-share-title") || pageShareTitle();
    const label = mount.getAttribute("data-share-label") || "Share this page";
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

  // Blog posts: top under byline + bottom before related/CTA
  const article = document.querySelector(".blog-post-page article");
  if (!article || article.dataset.shareReady === "1") {
    return;
  }

  const shareUrl = pageShareUrl();
  const shareTitle = pageShareTitle();
  const label = "Share this article";

  const topBar = buildBar({ url: shareUrl, title: shareTitle, label: label });
  const meta = article.querySelector(".blog-post-meta");
  if (meta && meta.parentNode) {
    meta.insertAdjacentElement("afterend", topBar);
  } else {
    const content = article.querySelector(".blog-post-content");
    if (content) {
      content.insertAdjacentElement("beforebegin", topBar);
    }
  }

  const bottomBar = buildBar({
    url: shareUrl,
    title: shareTitle,
    label: label,
    extraClass: "blog-share-bottom",
  });
  const related = article.querySelector(".blog-related");
  const cta = article.querySelector(".blog-cta");
  if (related) {
    related.insertAdjacentElement("beforebegin", bottomBar);
  } else if (cta) {
    cta.insertAdjacentElement("beforebegin", bottomBar);
  }

  article.dataset.shareReady = "1";
})();
