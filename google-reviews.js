(function () {
  const FEED_URL = "./google-reviews.json";
  const REVIEW_URL = "https://g.page/r/CTESlSaskrL4EBM/review";
  const MAPS_URL =
    "https://www.google.com/maps/search/?api=1&query=Google&query_place_id=ChIJAwQcAob5OGcRMRKVJqySsvg";

  const stats = document.getElementById("google-reviews-stats");
  const summary = document.getElementById("google-reviews-summary");
  const container = document.getElementById("google-reviews");
  const footnote = document.getElementById("google-reviews-footnote");

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

  function renderGoogleMark(label) {
    return (
      '<span class="app-store-mark google-mark">' +
      '<img class="google-mark-icon" src="./assets/google-g.svg" width="16" height="16" alt="" aria-hidden="true" />' +
      "<span>" +
      escapeHtml(label || "Google") +
      "</span></span>"
    );
  }

  function renderStars(rating, sizeClass) {
    const count = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
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

  function formatAverage(average) {
    if (average == null || average === "") {
      return "—";
    }
    const value = Number(average);
    if (!value) {
      return "—";
    }
    if (value >= 4.95) {
      return "5.0";
    }
    return value.toFixed(1);
  }

  function renderStatsPanel(data) {
    if (!stats) {
      return;
    }

    const average = data.rating;
    const totalRatings = Number(data.userRatingsTotal || 0);
    const writtenCount = Array.isArray(data.reviews) ? data.reviews.length : 0;
    const averageLabel = formatAverage(average);

    if (!totalRatings && !writtenCount && average == null) {
      stats.innerHTML = "";
      return;
    }

    stats.innerHTML =
      '<div class="reviews-summary-card">' +
      '<div class="reviews-summary-brand">' +
      renderGoogleMark("Google") +
      '<span class="live-badge">Google</span>' +
      "</div>" +
      '<div class="reviews-summary-main">' +
      '<div class="reviews-summary-score">' +
      '<p class="reviews-hero-number">' +
      escapeHtml(averageLabel) +
      "</p>" +
      renderStars(average, "review-stars-lg") +
      '<p class="reviews-hero-label">out of 5</p>' +
      "</div>" +
      '<div class="reviews-summary-details">' +
      (totalRatings
        ? "<p><strong>" +
          totalRatings +
          "</strong> rating" +
          (totalRatings === 1 ? "" : "s") +
          " on Google</p>"
        : "") +
      (writtenCount
        ? "<p><strong>" +
          writtenCount +
          "</strong> recent written review" +
          (writtenCount === 1 ? "" : "s") +
          " shown below</p>"
        : "<p>Open Google to read every review and leave yours.</p>") +
      "</div></div></div>";
  }

  function renderReviewCard(review) {
    const author = escapeHtml(review.author || "Google reviewer");
    const rating = review.rating || 5;
    const body = escapeHtml(review.text || "");
    const relativeTime = escapeHtml(review.relativeTime || "");

    return (
      '<article class="card review-card">' +
      '<div class="review-card-top">' +
      renderGoogleMark("Google review") +
      renderStars(rating) +
      "</div>" +
      '<p class="review-body">' +
      body +
      "</p>" +
      '<p class="review-author">' +
      author +
      (relativeTime ? " · " + relativeTime : "") +
      "</p>" +
      "</article>"
    );
  }

  function renderGoogleCta() {
    return (
      '<article class="card reviews-app-store-cta reviews-google-cta">' +
      '<div class="section-icon reviews-google-icon-wrap" aria-hidden="true">' +
      '<img class="reviews-google-icon" src="./assets/google-g.svg" width="40" height="40" alt="" />' +
      "</div>" +
      "<h3>Leave a Google review</h3>" +
      "<p>Scan the code or tap the button to open Google and share your experience.</p>" +
      '<a class="reviews-google-qr-link" href="' +
      REVIEW_URL +
      '" target="_blank" rel="noopener noreferrer">' +
      '<img class="reviews-google-qr" src="./assets/google-review-qr.png?v=2" width="280" height="280" alt="QR code with Google icon to leave a review for Stress Free Flow" />' +
      "</a>" +
      '<a class="button button-secondary reviews-app-store-button" href="' +
      REVIEW_URL +
      '" target="_blank" rel="noopener noreferrer">Write a Google review</a>' +
      "</article>"
    );
  }

  function renderReviews(data) {
    const reviews = Array.isArray(data.reviews) ? data.reviews.filter(function (item) {
      return item && item.text;
    }) : [];

    if (reviews.length) {
      container.innerHTML = reviews.map(renderReviewCard).join("") + renderGoogleCta();
      container.classList.toggle("reviews-grid-single", reviews.length === 1);
      if (summary) {
        summary.textContent = "";
      }
      return;
    }

    container.classList.add("reviews-grid-single");
    container.innerHTML = renderGoogleCta();
    if (summary) {
      summary.textContent =
        data.userRatingsTotal > 0
          ? "Ratings above. Read full reviews on Google, or leave one of your own."
          : "Be one of the first to leave a Google review for Stress Free Flow.";
    }
  }

  function renderFootnote(data) {
    if (!footnote) {
      return;
    }
    const mapsUrl = data.mapsUrl || MAPS_URL;
    const parts = [];
    if (data.updatedAt) {
      parts.push("Synced from Google Places on " + escapeHtml(data.updatedAt) + ".");
    } else {
      parts.push("Google ratings and reviews appear here when available.");
    }
    footnote.innerHTML =
      parts.join(" ") +
      ' <a href="' +
      escapeHtml(mapsUrl) +
      '" target="_blank" rel="noopener noreferrer">See on Google Maps</a>' +
      ' · <a href="' +
      REVIEW_URL +
      '" target="_blank" rel="noopener noreferrer">Write a review</a>';
  }

  async function loadGoogleReviews() {
    container.innerHTML = '<p class="reviews-status">Loading Google reviews…</p>';
    if (stats) {
      stats.innerHTML = '<p class="reviews-status">Loading Google ratings…</p>';
    }
    if (summary) {
      summary.textContent = "Loading Google ratings and reviews…";
    }

    try {
      const response = await fetch(FEED_URL + "?v=2", {
        cache: "no-cache",
      });
      if (!response.ok) {
        throw new Error("Feed unavailable");
      }
      const data = await response.json();
      renderStatsPanel(data);
      renderReviews(data);
      renderFootnote(data);
    } catch (error) {
      if (stats) {
        stats.innerHTML = "";
      }
      container.classList.add("reviews-grid-single");
      container.innerHTML = renderGoogleCta();
      if (summary) {
        summary.textContent = "Leave a Google review — it helps others find Stress Free Flow.";
      }
      if (footnote) {
        footnote.innerHTML =
          '<a href="' +
          REVIEW_URL +
          '" target="_blank" rel="noopener noreferrer">Write a Google review</a>';
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadGoogleReviews);
  } else {
    loadGoogleReviews();
  }
})();
