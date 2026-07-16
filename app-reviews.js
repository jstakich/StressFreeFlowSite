(function () {
  const APP_ID = "6757947997";
  const LOOKUP_URL = "https://itunes.apple.com/lookup?id=" + APP_ID;
  const APP_STORE_REVIEWS_URL =
    "https://apps.apple.com/us/app/id" + APP_ID + "?see-all=reviews";
  const LOOKUP_TIMEOUT_MS = 5000;
  const DOWNLOAD_COUNT = 37;
  const WRITTEN_REVIEWS = [
    {
      title: "Stress free flow",
      author: "beachball20",
      rating: 5,
      body:
        "I can’t recommend this app enough. This app means so much to me because I’ve seen firsthand how much it’s helped both me and my son. As a mom of an autistic son, there are moments when emotions can become overwhelming for both of us. Having this app has given us something we can turn to when we need to slow down, breathe, and find our way back to a calmer place. The breath reset has been life-changing for me. When my anxiety starts to take over and I feel like I can’t catch my breath or my mind won’t stop racing, I open the app and follow along. Within just a few minutes, I can feel my body begin to relax, my breathing steady, and my thoughts become clearer. It’s become one of the first things I reach for when I feel overwhelmed. Watching my son use it has been just as emotional. Seeing him calm himself through the breathing exercises instead of feeling completely consumed by his emotions has been something I can’t put into words. As a parent, that’s an incredible feeling. I highly recommend trying this app.",
    },
    {
      title: "Relaxing",
      author: "rezbusha",
      rating: 5,
      body:
        "Great for just wanting to relax before bed or just even for a five a minute destress from work or school",
    },
  ];

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
    const rating = review.rating || 5;
    const body = escapeHtml(review.body || "");

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
      "<h3>See all App Store reviews</h3>" +
      "<p>These written reviews match the App Store. Open Apple to read every review and rating.</p>" +
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

  function renderStatsPanel(lookup, writtenCount, feedUpdated) {
    if (!stats) {
      return;
    }

    const average = getAverageRating(lookup);
    const totalRatings = getRatingCount(lookup);
    const starOnlyCount = Math.max(0, totalRatings - writtenCount);
    const averageLabel = formatAverage(average);
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
      '<p><strong>' +
      DOWNLOAD_COUNT +
      "</strong> app downloads</p>" +
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
          "</p>"
        : "") +
      (starOnlyCount
        ? "<p><strong>" +
          starOnlyCount +
          "</strong> star-only rating" +
          (starOnlyCount === 1 ? "" : "s") +
          "</p>"
        : "") +
      "</div></div></div>";
  }

  function renderFootnote(totalRatings, writtenCount) {
    if (!footnote) {
      return;
    }
    footnote.textContent = "";
  }

  function renderWrittenReviews(writtenReviews) {
    if (writtenReviews.length) {
      container.innerHTML =
        writtenReviews.map(renderWrittenReviewCard).join("") + renderAppStoreCta();
      container.classList.toggle("reviews-grid-single", writtenReviews.length === 1);
      if (summary) {
        summary.textContent = "";
      }
      return;
    }

    container.classList.remove("reviews-grid-single");
    container.innerHTML = renderAppStoreCta();
    if (summary) {
      summary.textContent = "Live ratings above. Read full reviews on the App Store.";
    }
  }

  async function loadReviews() {
    container.innerHTML = '<p class="reviews-status">Loading App Store reviews…</p>';
    if (stats) {
      stats.innerHTML = '<p class="reviews-status">Loading live App Store ratings…</p>';
    }
    if (summary) {
      summary.textContent = "Loading App Store ratings and reviews…";
    }

    try {
      const lookupPromise = fetchLookupJsonp().catch(function () {
        return null;
      });
      lookupPromise.then(function (lookup) {
        if (!lookup) {
          return;
        }
        renderStatsPanel(lookup, 0, "");
      });
      const lookup = await lookupPromise;
      const totalRatings = lookup ? getRatingCount(lookup) : WRITTEN_REVIEWS.length;
      const writtenCount = WRITTEN_REVIEWS.length;

      if (lookup) {
        renderStatsPanel(lookup, writtenCount, "");
      }
      renderFootnote(totalRatings, writtenCount);
      renderWrittenReviews(WRITTEN_REVIEWS);
    } catch (error) {
      if (stats) {
        stats.innerHTML = '<p class="reviews-status">Could not load live App Store ratings right now.</p>';
      }
      renderWrittenReviews(WRITTEN_REVIEWS);
      if (summary) {
        summary.textContent = "App Store written reviews below. Ratings may load separately.";
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadReviews);
  } else {
    loadReviews();
  }
})();
