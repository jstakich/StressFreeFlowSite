(function () {
  const APP_ID = "6757947997";
  const APPLE_LOGO = "./assets/apple-logo.svg";
  const REVIEWS_FEED =
    "https://itunes.apple.com/us/rss/customerreviews/page=PAGE/id=" +
    APP_ID +
    "/sortby=mostrecent/json";
  const LOOKUP_URL = "https://itunes.apple.com/lookup?id=" + APP_ID;
  const APP_STORE_REVIEWS_URL =
    "https://apps.apple.com/us/app/id" + APP_ID + "?see-all=reviews";

  const container = document.getElementById("app-reviews");
  const summary = document.getElementById("reviews-summary");
  const stats = document.getElementById("reviews-stats");

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

  function renderAppleMark(label) {
    return (
      '<span class="app-store-mark">' +
      '<img class="app-store-mark-icon" src="' +
      APPLE_LOGO +
      '" alt="" width="16" height="16" decoding="async" />' +
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

  async function fetchLookupDirect() {
    const response = await fetch(LOOKUP_URL);
    if (!response.ok) {
      throw new Error("Lookup unavailable");
    }

    const data = await response.json();
    if (!data.results || !data.results[0]) {
      throw new Error("No lookup results");
    }

    return data.results[0];
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
      }, 5000);

      document.head.appendChild(script);
    });
  }

  async function fetchLookupProxy() {
    const proxyUrl =
      "https://api.allorigins.win/get?url=" + encodeURIComponent(LOOKUP_URL);
    const response = await fetch(proxyUrl);
    if (!response.ok) {
      throw new Error("Proxy lookup failed");
    }

    const wrapper = await response.json();
    const data = JSON.parse(wrapper.contents);
    if (!data.results || !data.results[0]) {
      throw new Error("No lookup results");
    }

    return data.results[0];
  }

  async function fetchLookupSummary() {
    try {
      return await fetchLookupDirect();
    } catch (directError) {
      try {
        return await fetchLookupJsonp();
      } catch (jsonpError) {
        return fetchLookupProxy();
      }
    }
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
    const response = await fetch(REVIEWS_FEED.replace("PAGE", String(page)));
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

  async function fetchWrittenReviews() {
    const reviews = [];
    let feedUpdated = "";
    let page = 1;

    while (page <= 5) {
      const pageResult = await fetchReviewPage(page);
      if (!feedUpdated && pageResult.updated) {
        feedUpdated = pageResult.updated;
      }
      if (!pageResult.reviews.length) {
        break;
      }
      reviews.push.apply(reviews, pageResult.reviews);
      page += 1;
    }

    return {
      reviews: reviews,
      updated: feedUpdated,
    };
  }

  async function loadReviews() {
    container.innerHTML = '<p class="reviews-status">Loading App Store reviews…</p>';
    if (stats) {
      stats.innerHTML = '<p class="reviews-status">Loading live App Store ratings…</p>';
    }

    let lookup = null;
    let writtenReviews = [];
    let feedUpdated = "";

    try {
      const lookupPromise = fetchLookupSummary().catch(function () {
        return null;
      });
      const writtenResult = await fetchWrittenReviews();
      writtenReviews = writtenResult.reviews;
      feedUpdated = writtenResult.updated;
      lookup = await lookupPromise;

      renderStatsPanel(lookup, writtenReviews.length, feedUpdated);

      if (writtenReviews.length) {
        container.innerHTML = writtenReviews.map(renderWrittenReviewCard).join("");
        container.classList.toggle("reviews-grid-single", writtenReviews.length === 1);
        if (summary) {
          summary.textContent = "Written reviews from Apple’s public App Store feed.";
        }
        return;
      }

      container.classList.remove("reviews-grid-single");
      container.innerHTML =
        '<p class="reviews-status">No written reviews in Apple’s feed yet. Star ratings still count toward your App Store score.</p>';
      if (summary) {
        summary.textContent = "";
      }
    } catch (error) {
      if (stats) {
        stats.innerHTML = '<p class="reviews-status">Could not load live App Store ratings right now.</p>';
      }
      container.innerHTML =
        '<p class="reviews-status">Could not load live reviews right now. <a href="' +
        APP_STORE_REVIEWS_URL +
        '" target="_blank" rel="noreferrer">See them on the App Store</a>.</p>';
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadReviews);
  } else {
    loadReviews();
  }
})();
