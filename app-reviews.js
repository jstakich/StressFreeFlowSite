(function () {
  const APP_ID = "6757947997";
  const REVIEWS_FEED =
    "https://itunes.apple.com/us/rss/customerreviews/page=PAGE/id=" +
    APP_ID +
    "/sortby=mostrecent/json";
  const LOOKUP_URL = "https://itunes.apple.com/lookup?id=" + APP_ID;
  const APP_STORE_REVIEWS_URL =
    "https://apps.apple.com/us/app/id" + APP_ID + "?see-all=reviews";
  const LOOKUP_TIMEOUT_MS = 5000;
  const REVIEWS_TIMEOUT_MS = 4500;

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
    const title = escapeHtml(review.title && review.title.label ? review.title.label : "App Store review");
    const author = escapeHtml(
      review.author && review.author.name && review.author.name.label
        ? review.author.name.label
        : "App Store reviewer"
    );
    const rating = review["im:rating"] && review["im:rating"].label ? review["im:rating"].label : "5";
    const body = escapeHtml(cleanReviewBody(review.content && review.content.label ? review.content.label : ""));

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
      "<p>These written reviews are pulled live from Apple. Open the App Store to read every review and rating.</p>" +
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
    const updatedLine = feedUpdated
      ? "Updated " + escapeHtml(feedUpdated)
      : "Live from Apple when you open this page";

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
          "</p>"
        : "") +
      (starOnlyCount
        ? "<p><strong>" +
          starOnlyCount +
          "</strong> star-only rating" +
          (starOnlyCount === 1 ? "" : "s") +
          "</p>"
        : "") +
      '<p class="reviews-live-note">' +
      updatedLine +
      "</p>" +
      "</div></div></div>";
  }

  async function fetchReviewPage(page) {
    const response = await fetchWithTimeout(REVIEWS_FEED.replace("PAGE", String(page)), { cache: "no-store" }, 2500);
    if (!response.ok) {
      throw new Error("Review feed unavailable");
    }

    const data = await response.json();
    let entries = data.feed && data.feed.entry ? data.feed.entry : [];
    if (!Array.isArray(entries)) {
      entries = [entries];
    }

    return {
      reviews: entries.filter(function (entry) {
        return entry && entry["im:rating"];
      }),
      updated: data.feed && data.feed.updated && data.feed.updated.label ? data.feed.updated.label : "",
    };
  }

  function renderFootnote(totalRatings, writtenCount) {
    if (!footnote) {
      return;
    }

    const starOnlyCount = Math.max(0, totalRatings - writtenCount);
    let note = "Ratings and written reviews are pulled live from Apple.";

    if (starOnlyCount && writtenCount) {
      note +=
        " " +
        starOnlyCount +
        " rating" +
        (starOnlyCount === 1 ? " is" : "s are") +
        " stars only with no written text.";
    } else if (starOnlyCount && !writtenCount) {
      note += " Some App Store ratings may be stars only.";
    }

    footnote.innerHTML =
      note +
      ' <a href="' +
      APP_STORE_REVIEWS_URL +
      '" target="_blank" rel="noreferrer">See all on the App Store</a>';
  }

  function normalizeAppStoreReview(review) {
    return {
      title: { label: review.title || "App Store review" },
      author: { name: { label: review.reviewerName || "App Store reviewer" } },
      "im:rating": { label: String(review.rating || 5) },
      content: { label: review.contents || "" },
    };
  }

  function parseReviewsFromAppStoreHtml(html) {
    const match = String(html || "").match(
      /<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/
    );
    if (!match) {
      return [];
    }

    const payload = JSON.parse(match[1]);
    const shelf = payload.data && payload.data[0] && payload.data[0].data && payload.data[0].data.shelfMapping;
    if (!shelf) {
      return [];
    }

    const items = []
      .concat((shelf.allProductReviews && shelf.allProductReviews.items) || [])
      .concat((shelf.userProductReviews && shelf.userProductReviews.items) || []);

    const seen = new Set();
    const reviews = [];

    items.forEach(function (item) {
      const review = item && item.review;
      if (!review || !review.id || seen.has(review.id)) {
        return;
      }

      seen.add(review.id);

      const body = String(review.contents || "").trim();
      if (!body) {
        return;
      }

      reviews.push(normalizeAppStoreReview(review));
    });

    return reviews;
  }

  async function fetchAppStorePageReviewsFromProxy(proxyUrl) {
    const response = await fetchWithTimeout(proxyUrl, { cache: "no-store" }, REVIEWS_TIMEOUT_MS);
    if (!response.ok) {
      throw new Error("Proxy request failed");
    }

    const html =
      proxyUrl.indexOf("allorigins.win/get?") !== -1
        ? (await response.json()).contents
        : await response.text();
    const reviews = parseReviewsFromAppStoreHtml(html);
    if (!reviews.length) {
      throw new Error("No written reviews in App Store page");
    }

    return reviews;
  }

  async function fetchAppStorePageReviews() {
    const pageUrl = "https://apps.apple.com/us/app/id" + APP_ID + "?see-all=reviews";
    try {
      return await fetchAppStorePageReviewsFromProxy("https://proxy.cors.sh/" + pageUrl);
    } catch (primaryError) {
      return fetchAppStorePageReviewsFromProxy(
        "https://api.allorigins.win/raw?url=" + encodeURIComponent(pageUrl)
      );
    }
  }

  async function fetchWrittenReviewsLive() {
    const results = await Promise.all([
      fetchReviewPage(1).catch(function () {
        return { reviews: [], updated: "" };
      }),
      fetchAppStorePageReviews().catch(function () {
        return [];
      }),
    ]);

    const rssResult = results[0];
    const pageReviews = results[1];

    if (rssResult.reviews.length) {
      return {
        reviews: rssResult.reviews,
        updated: rssResult.updated,
      };
    }

    return {
      reviews: pageReviews,
      updated: "",
    };
  }

  function renderWrittenReviews(writtenReviews) {
    if (writtenReviews.length) {
      container.innerHTML =
        writtenReviews.map(renderWrittenReviewCard).join("") + renderAppStoreCta();
      container.classList.toggle("reviews-grid-single", writtenReviews.length === 1);
      if (summary) {
        summary.textContent =
          writtenReviews.length === 1
            ? "Latest written review from Apple’s App Store."
            : "Written reviews from Apple’s App Store.";
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
    container.innerHTML = '<p class="reviews-status">Loading written reviews from Apple…</p>';
    if (stats) {
      stats.innerHTML = '<p class="reviews-status">Loading live App Store ratings…</p>';
    }
    if (summary) {
      summary.textContent = "Loading live App Store reviews…";
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

      const writtenResult = await fetchWrittenReviewsLive();
      const lookup = await lookupPromise;
      const totalRatings = lookup ? getRatingCount(lookup) : writtenResult.reviews.length;

      if (lookup) {
        renderStatsPanel(lookup, writtenResult.reviews.length, writtenResult.updated);
      }
      renderFootnote(totalRatings, writtenResult.reviews.length);
      renderWrittenReviews(writtenResult.reviews);
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
