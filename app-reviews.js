(function () {
  const APP_ID = "6757947997";
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

  function renderStars(rating) {
    const count = Math.max(0, Math.min(5, Number(rating) || 0));
    let stars = "";

    for (let index = 0; index < 5; index += 1) {
      stars += '<span class="review-star' + (index < count ? " is-filled" : "") + '">★</span>';
    }

    return (
      '<div class="review-stars" aria-label="' +
      count +
      ' out of 5 stars">' +
      stars +
      "</div>"
    );
  }

  function renderReviewCard(review) {
    const title = escapeHtml(review.title?.label || "App Store review");
    const author = escapeHtml(review.author?.name?.label || "App Store reviewer");
    const rating = review["im:rating"]?.label || "5";
    const body = escapeHtml(cleanReviewBody(review.content?.label));

    return (
      '<article class="card review-card">' +
      renderStars(rating) +
      '<h3 class="review-title">' +
      title +
      "</h3>" +
      '<p class="review-body">' +
      body +
      "</p>" +
      '<p class="review-author">— ' +
      author +
      "</p>" +
      "</article>"
    );
  }

  function fetchLookupSummary() {
    return new Promise(function (resolve, reject) {
      const callbackName = "stressFreeFlowLookup_" + Date.now();

      window[callbackName] = function (data) {
        delete window[callbackName];
        script.remove();
        resolve(data?.results?.[0] || null);
      };

      const script = document.createElement("script");
      script.src = LOOKUP_URL + "&callback=" + callbackName;
      script.onerror = function () {
        delete window[callbackName];
        script.remove();
        reject(new Error("Lookup unavailable"));
      };
      document.body.appendChild(script);
    });
  }

  function renderStatsPanel(lookup, writtenReviews, feedUpdated) {
    if (!stats) {
      return;
    }

    const average = Number(lookup?.averageUserRating || 0);
    const totalRatings = Number(lookup?.userRatingCount || 0);
    const writtenFiveStarCount = writtenReviews.filter(function (review) {
      return Number(review["im:rating"]?.label) === 5;
    }).length;

    let fiveStarLine = "";
    if (totalRatings > 0 && average === 5) {
      fiveStarLine =
        '<p class="reviews-stat-line"><strong>' +
        totalRatings +
        "</strong> five-star App Store rating" +
        (totalRatings === 1 ? "" : "s") +
        "</p>";
    } else if (totalRatings > 0) {
      fiveStarLine =
        '<p class="reviews-stat-line"><strong>' +
        writtenFiveStarCount +
        "</strong> five-star written review" +
        (writtenFiveStarCount === 1 ? "" : "s") +
        " shown below</p>";
    }

    const updatedLine = feedUpdated
      ? '<p class="reviews-live-note">Live from Apple • feed updated ' + escapeHtml(feedUpdated) + "</p>"
      : '<p class="reviews-live-note">Live from Apple • refreshes every time you open this page</p>';

    stats.innerHTML =
      '<div class="reviews-stats-top">' +
      '<span class="live-badge">Live</span>' +
      renderStars(Math.round(average)) +
      '<div class="reviews-stat-copy">' +
      '<p class="reviews-stat-line"><strong>' +
      (average ? average.toFixed(1) : "—") +
      "</strong> average App Store rating</p>" +
      '<p class="reviews-stat-line"><strong>' +
      totalRatings +
      "</strong> total App Store rating" +
      (totalRatings === 1 ? "" : "s") +
      "</p>" +
      fiveStarLine +
      '<p class="reviews-stat-line"><strong>' +
      writtenReviews.length +
      "</strong> written review" +
      (writtenReviews.length === 1 ? "" : "s") +
      " with text on this page</p>" +
      updatedLine +
      "</div></div>";
  }

  async function fetchReviewPage(page) {
    const response = await fetch(REVIEWS_FEED.replace("PAGE", String(page)));
    if (!response.ok) {
      throw new Error("Review feed unavailable");
    }

    const data = await response.json();
    let entries = data?.feed?.entry || [];
    if (!Array.isArray(entries)) {
      entries = [entries];
    }

    return {
      reviews: entries.filter(function (entry) {
        return entry && entry["im:rating"];
      }),
      updated: data?.feed?.updated?.label || "",
    };
  }

  async function loadReviews() {
    container.innerHTML = '<p class="reviews-status">Loading App Store reviews…</p>';
    if (stats) {
      stats.innerHTML = '<p class="reviews-status">Loading live App Store ratings…</p>';
    }

    try {
      const lookup = await fetchLookupSummary();
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

      renderStatsPanel(lookup, reviews, feedUpdated);

      if (!reviews.length) {
        container.innerHTML =
          '<p class="reviews-status">No written reviews in Apple’s live feed yet. Star-only ratings still count on the App Store.</p>';
        if (summary) {
          summary.textContent =
            "Apple’s public feed only includes reviews with written text. Your live rating summary is above.";
        }
        return;
      }

      if (summary) {
        summary.textContent =
          "Written reviews pulled live from Apple. Star-only ratings are included in the totals above.";
      }

      container.innerHTML = reviews.map(renderReviewCard).join("");
    } catch (error) {
      if (stats) {
        stats.innerHTML =
          '<p class="reviews-status">Could not load live App Store ratings right now.</p>';
      }
      container.innerHTML =
        '<p class="reviews-status">Could not load live reviews right now. <a href="' +
        APP_STORE_REVIEWS_URL +
        '" target="_blank" rel="noreferrer">Read them on the App Store</a>.</p>';
    }
  }

  loadReviews();
})();
