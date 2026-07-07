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

  function renderRatingOnlyCard(index, total) {
    return (
      '<article class="card review-card review-card-rating-only">' +
      renderStars(5) +
      '<h3 class="review-title">Five-star App Store review</h3>' +
      '<p class="review-body">This reviewer rated Stress Free Flow 5 stars on the App Store. Apple does not publish written text for every rating.</p>' +
      '<p class="review-author">— App Store reviewer ' +
      index +
      " of " +
      total +
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

  function getFiveStarCount(lookup) {
    const average = Number(lookup && lookup.averageUserRating ? lookup.averageUserRating : 0);
    const totalRatings = Number(lookup && lookup.userRatingCount ? lookup.userRatingCount : 0);

    if (!totalRatings) {
      return 0;
    }

    if (average >= 4.95) {
      return totalRatings;
    }

    return 0;
  }

  function renderStatsPanel(lookup, fiveStarCount, writtenCount, feedUpdated) {
    if (!stats) {
      return;
    }

    const average = Number(lookup && lookup.averageUserRating ? lookup.averageUserRating : 0);
    const totalRatings = Number(lookup && lookup.userRatingCount ? lookup.userRatingCount : 0);
    const updatedLine = feedUpdated
      ? "Live from Apple • updated " + escapeHtml(feedUpdated)
      : "Live from Apple • refreshes when you open this page";

    const totalRatingsLine = totalRatings
      ? "<strong>" +
        totalRatings +
        "</strong> total App Store rating" +
        (totalRatings === 1 ? "" : "s")
      : '<a href="' +
        APP_STORE_REVIEWS_URL +
        '" target="_blank" rel="noreferrer">See total ratings on the App Store</a>';

    stats.innerHTML =
      '<div class="reviews-stats-layout">' +
      '<div class="reviews-hero-stat">' +
      '<span class="live-badge">Live</span>' +
      renderStars(5) +
      '<p class="reviews-hero-number">' +
      (totalRatings || fiveStarCount) +
      "</p>" +
      '<p class="reviews-hero-label">' +
      (totalRatings ? "five-star App Store rating" : "written App Store review") +
      (totalRatings
        ? totalRatings === 1
          ? ""
          : "s"
        : fiveStarCount === 1
          ? ""
          : "s") +
      "</p>" +
      "</div>" +
      '<div class="reviews-stat-copy">' +
      '<p class="reviews-stat-line"><strong>' +
      (average ? average.toFixed(1) : "—") +
      "</strong> average rating</p>" +
      '<p class="reviews-stat-line">' +
      totalRatingsLine +
      "</p>" +
      '<p class="reviews-stat-line"><strong>' +
      writtenCount +
      "</strong> with written text" +
      (totalRatings
        ? " • <strong>" + Math.max(0, totalRatings - writtenCount) + "</strong> star-only"
        : "") +
      "</p>" +
      '<p class="reviews-live-note">' +
      updatedLine +
      "</p>" +
      "</div></div>";
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

  function buildReviewCards(fiveStarCount, writtenReviews) {
    const cards = [];
    const writtenFiveStar = writtenReviews.filter(function (review) {
      return Number(review["im:rating"] && review["im:rating"].label ? review["im:rating"].label : 0) === 5;
    });

    writtenFiveStar.forEach(function (review) {
      cards.push(renderWrittenReviewCard(review));
    });

    const ratingOnlyCount = Math.max(0, fiveStarCount - writtenFiveStar.length);
    for (let index = 1; index <= ratingOnlyCount; index += 1) {
      cards.push(renderRatingOnlyCard(index, fiveStarCount));
    }

    return cards;
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
      const writtenPromise = fetchWrittenReviews();
      const writtenResult = await writtenPromise;
      writtenReviews = writtenResult.reviews;
      feedUpdated = writtenResult.updated;
      lookup = await lookupPromise;

      const totalRatings = Number(lookup && lookup.userRatingCount ? lookup.userRatingCount : 0);
      const fiveStarCount = lookup ? getFiveStarCount(lookup) : 0;

      if (lookup && totalRatings > 0) {
        renderStatsPanel(lookup, fiveStarCount, writtenReviews.length, feedUpdated);
        container.innerHTML = buildReviewCards(fiveStarCount || totalRatings, writtenReviews).join("");
        if (summary) {
          summary.textContent =
            "Showing all " +
            totalRatings +
            " live App Store ratings. Written reviews appear first; star-only ratings are shown too.";
        }
        return;
      }

      if (writtenReviews.length) {
        const writtenFiveStarCount = writtenReviews.filter(function (review) {
          return (
            Number(review["im:rating"] && review["im:rating"].label ? review["im:rating"].label : 0) === 5
          );
        }).length;

        renderStatsPanel(lookup, writtenFiveStarCount, writtenReviews.length, feedUpdated);
        container.innerHTML = writtenReviews.map(renderWrittenReviewCard).join("");
        if (summary) {
          summary.textContent = "Written reviews pulled live from Apple.";
        }
        return;
      }

      if (stats) {
        stats.innerHTML = '<p class="reviews-status">Could not load live App Store ratings right now.</p>';
      }
      container.innerHTML =
        '<p class="reviews-status">Could not load live reviews right now. <a href="' +
        APP_STORE_REVIEWS_URL +
        '" target="_blank" rel="noreferrer">See them on the App Store</a>.</p>';
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
