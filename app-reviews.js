(function () {
  const APP_ID = "6757947997";
  const LOOKUP_URL = "https://itunes.apple.com/lookup?id=" + APP_ID;
  const APP_STORE_REVIEWS_URL =
    "https://apps.apple.com/us/app/id" + APP_ID + "?see-all=reviews";
  const LOOKUP_TIMEOUT_MS = 5000;
  const SYNC_TIMEOUT_MS = 2500;

  const container = document.getElementById("app-reviews");
  const summary = document.getElementById("reviews-summary");
  const stats = document.getElementById("reviews-stats");
  const footnote = document.getElementById("reviews-footnote");

  if (!container) {
    return;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function cleanReviewBody(content) {
    return String(content || "")
      .split("\n")
      .map(function (line) {
        return line.trim();
      })
      .filter(function (line) {
        return line && !/^Version\s+\d/i.test(line);
      })
      .join(" ")
      .trim();
  }

  function fetchWithTimeout(url, options, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(function () {
      controller.abort();
    }, timeoutMs);

    return fetch(url, Object.assign({}, options || {}, { signal: controller.signal })).finally(
      function () {
        clearTimeout(timer);
      }
    );
  }

  function renderAppleMark(label) {
    return (
      '<span class="app-store-mark">' +
      '<svg class="app-store-mark-icon" viewBox="0 0 814 1000" width="11" height="14" aria-hidden="true">' +
      '<use href="#icon-apple"></use>' +
      "</svg>" +
      "<span>" +
      escapeHtml(label || "App Store") +
      "</span></span>"
    );
  }

  function renderStars(rating, sizeClass) {
    const count = Math.max(0, Math.min(5, Number(rating) || 0));
    let stars = "";

    for (let index = 0; index < 5; index += 1) {
      stars += '<span class="review-star' + (index < count ? " is-filled" : "") + '">★</span>';
    }

    return (
      '<div class="review-stars' +
      (sizeClass ? " " + sizeClass : "") +
      '" aria-label="' +
      count +
      ' out of 5 stars">' +
      stars +
      "</div>"
    );
  }

  function renderWrittenReviewCard(review) {
    const title = escapeHtml(review.title || "App Store review");
    const author = escapeHtml(review.author || "App Store reviewer");
    const rating = String(review.rating || 5);
    const body = escapeHtml(cleanReviewBody(review.body || ""));

    return (
      '<article class="card review-card">' +
      '<div class="review-card-top">' +
      renderAppleMark("App Store review") +
      renderStars(rating) +
      "</div>" +
      '<h3 class="review-title">' +
      title +
      "</h3>" +
      '<p class="review-body">' +
      body +
      "</p>" +
      '<p class="review-author">' +
      author +
      "</p>" +
      "</article>"
    );
  }

  function renderAppStoreCta() {
    return (
      '<article class="card reviews-app-store-cta">' +
      '<div class="section-icon" aria-hidden="true">' +
      '<svg viewBox="0 0 24 24"><use href="#icon-apple"></use></svg>' +
      "</div>" +
      "<h3>Read reviews on the App Store</h3>" +
      "<p>Apple hosts the full written reviews and star ratings. Tap through to read them directly from Apple.</p>" +
      '<a class="button button-secondary reviews-app-store-button" href="' +
      APP_STORE_REVIEWS_URL +
      '" target="_blank" rel="noreferrer">View App Store reviews</a>' +
      "</article>"
    );
  }

  function fetchLookupJsonp() {
    return new Promise(function (resolve, reject) {
      const callbackName = "stressFreeFlowLookup_" + Date.now();
      let finished = false;
      let script = null;

      function finish(error, data) {
        if (finished) {
          return;
        }
        finished = true;
        clearTimeout(timeoutId);
        try {
          delete window[callbackName];
        } catch (ignore) {}
        if (script && script.parentNode) {
          script.parentNode.removeChild(script);
        }
        if (error) {
          reject(error);
          return;
        }
        resolve(data && data.results && data.results[0] ? data.results[0] : null);
      }

      window[callbackName] = function (data) {
        finish(null, data);
      };

      script = document.createElement("script");
      script.src = LOOKUP_URL + "&callback=" + callbackName;
      script.onerror = function () {
        finish(new Error("Lookup unavailable"));
      };

      const timeoutId = setTimeout(function () {
        finish(new Error("Lookup timed out"));
      }, LOOKUP_TIMEOUT_MS);

      document.head.appendChild(script);
    });
  }

  function getRatingCount(lookup) {
    const total = Number(lookup && lookup.userRatingCount ? lookup.userRatingCount : 0);
    const current = Number(
      lookup && lookup.userRatingCountForCurrentVersion ? lookup.userRatingCountForCurrentVersion : 0
    );

    return Math.max(total, current);
  }

  function getAverageRating(lookup) {
    const average = Number(lookup && lookup.averageUserRating ? lookup.averageUserRating : 0);
    const current = Number(
      lookup && lookup.averageUserRatingForCurrentVersion ? lookup.averageUserRatingForCurrentVersion : 0
    );

    return average || current;
  }

  function formatAverage(average) {
    if (!average) {
      return "—";
    }

    if (average >= 4.95) {
      return "5.0";
    }

    return average.toFixed(1);
  }

  function formatSyncedDate(isoDate) {
    if (!isoDate) {
      return "";
    }

    try {
      return new Date(isoDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch (error) {
      return "";
    }
  }

  function renderStatsPanel(lookup, writtenCount, syncedAt) {
    if (!stats) {
      return;
    }

    const average = getAverageRating(lookup);
    const totalRatings = getRatingCount(lookup);
    const averageLabel = formatAverage(average);
    const syncedLabel = formatSyncedDate(syncedAt);
    const updatedLine = syncedLabel
      ? "Written reviews synced from App Store on " + escapeHtml(syncedLabel)
      : "Live App Store ratings";

    stats.innerHTML =
      '<div class="reviews-summary-card">' +
      '<div class="reviews-summary-brand">' +
      renderAppleMark("App Store") +
      '<span class="live-badge">Live</span>' +
      "</div>" +
      '<div class="reviews-summary-main">' +
      '<div class="reviews-summary-score">' +
      '<p class="reviews-hero-number">' +
      escapeHtml(averageLabel) +
      "</p>" +
      renderStars(Math.round(average), "review-stars-lg") +
      '<p class="reviews-hero-label">out of 5</p>' +
      "</div>" +
      '<div class="reviews-summary-details">' +
      (totalRatings
        ? '<p><strong>' +
          totalRatings +
          "</strong> rating" +
          (totalRatings === 1 ? "" : "s") +
          " on the App Store</p>"
        : "") +
      (writtenCount
        ? "<p><strong>" +
          writtenCount +
          "</strong> written review" +
          (writtenCount === 1 ? "" : "s") +
          " shown below</p>"
        : "") +
      '<p class="reviews-live-note">' +
      updatedLine +
      "</p>" +
      "</div></div></div>";
  }

  function renderFootnote(totalRatings) {
    if (!footnote) {
      return;
    }

    let note = "Ratings are pulled live from Apple. ";
    if (totalRatings > 0) {
      note += "Some App Store ratings are stars only and do not include written text on Apple’s listing.";
    }

    footnote.innerHTML =
      note +
      ' <a href="' +
      APP_STORE_REVIEWS_URL +
      '" target="_blank" rel="noreferrer">See all on the App Store</a>';
  }

  async function fetchSyncedReviews() {
    const response = await fetchWithTimeout("./reviews-live.json", { cache: "no-store" }, SYNC_TIMEOUT_MS);
    if (!response.ok) {
      return { reviews: [], syncedAt: "" };
    }

    const data = await response.json();
    const reviews = Array.isArray(data.reviews) ? data.reviews : [];
    return {
      reviews: reviews.filter(function (review) {
        return cleanReviewBody(review.body || "");
      }),
      syncedAt: data.syncedAt || "",
    };
  }

  function renderWrittenReviews(writtenReviews, syncedAt) {
    if (writtenReviews.length) {
      container.innerHTML = writtenReviews.map(renderWrittenReviewCard).join("");
      container.classList.toggle("reviews-grid-single", writtenReviews.length === 1);
      if (summary) {
        summary.textContent = syncedAt
          ? "Written reviews synced from Apple’s App Store."
          : "Written reviews from Apple’s App Store.";
      }
      return;
    }

    container.classList.remove("reviews-grid-single");
    container.innerHTML = renderAppStoreCta();
    if (summary) {
      summary.textContent =
        "Live ratings above. Read full written reviews directly on the App Store.";
    }
  }

  async function loadReviews() {
    container.innerHTML = renderAppStoreCta();
    if (stats) {
      stats.innerHTML = '<p class="reviews-status">Loading live App Store ratings…</p>';
    }
    if (summary) {
      summary.textContent = "Loading live App Store ratings…";
    }

    try {
      const lookup = await fetchLookupJsonp();
      const totalRatings = getRatingCount(lookup);
      renderStatsPanel(lookup, 0, "");
      renderFootnote(totalRatings);

      const syncedResult = await fetchSyncedReviews().catch(function () {
        return { reviews: [], syncedAt: "" };
      });

      renderStatsPanel(lookup, syncedResult.reviews.length, syncedResult.syncedAt);
      renderWrittenReviews(syncedResult.reviews, syncedResult.syncedAt);
    } catch (error) {
      if (stats) {
        stats.innerHTML = '<p class="reviews-status">Could not load live App Store ratings right now.</p>';
      }
      container.innerHTML = renderAppStoreCta();
      if (summary) {
        summary.textContent = "Read reviews directly on the App Store.";
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadReviews);
  } else {
    loadReviews();
  }
})();
