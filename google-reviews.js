(function () {
  const REVIEW_URL = "https://g.page/r/CTESlSaskrL4EBM/review";
  const MAPS_URL =
    "https://www.google.com/maps/search/?api=1&query=Stress%20Free%20Flow&query_place_id=ChIJAwQcAob5OGcRMRKVJqySsvg";
  const AVERAGE_RATING = 5.0;
  const TOTAL_RATINGS = 2;
  const WRITTEN_REVIEWS = [
    {
      title: "Helps my grandson and me",
      author: "Lacy Scoggins",
      rating: 5,
      body:
        "My autistic grandson and I love this app. For him, it really helps to reduce the Eeeee's (If you know you know)! He loves the sounds and of course the numbers! For me its like a reset. When I get overwhelmed at work or a stressful situation comes up at home I can sit down open this app and get away for a little bit. It helps reset your mind, slow your breathing and helps you relax so you can focus.i definitely recommend this app!",
    },
    {
      title: "A must try",
      author: "Connetria Allen",
      rating: 5,
      body: "Best stress free app. A must try!",
    },
  ];

  const container = document.getElementById("google-reviews");
  const summary = document.getElementById("google-reviews-summary");
  const stats = document.getElementById("google-reviews-stats");
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
    if (!average) {
      return "—";
    }
    if (average >= 4.95) {
      return "5.0";
    }
    return average.toFixed(1);
  }

  function renderStatsPanel() {
    if (!stats) {
      return;
    }

    const writtenCount = WRITTEN_REVIEWS.length;
    const averageLabel = formatAverage(AVERAGE_RATING);

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
      renderStars(AVERAGE_RATING, "review-stars-lg") +
      '<p class="reviews-hero-label">out of 5</p>' +
      "</div>" +
      '<div class="reviews-summary-details">' +
      "<p><strong>" +
      TOTAL_RATINGS +
      "</strong> rating" +
      (TOTAL_RATINGS === 1 ? "" : "s") +
      " on Google</p>" +
      "<p><strong>" +
      writtenCount +
      "</strong> written review" +
      (writtenCount === 1 ? "" : "s") +
      "</p>" +
      "</div></div></div>";
  }

  function renderWrittenReviewCard(review) {
    const title = escapeHtml(review.title || "Google review");
    const author = escapeHtml(review.author || "Google reviewer");
    const rating = review.rating || 5;
    const body = escapeHtml(review.body || "");

    return (
      '<article class="card review-card">' +
      '<div class="review-card-top">' +
      renderGoogleMark("Google review") +
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

  function renderGoogleCta() {
    return (
      '<article class="card reviews-app-store-cta reviews-google-cta">' +
      '<div class="section-icon reviews-google-icon-wrap" aria-hidden="true">' +
      '<img class="reviews-google-icon" src="./assets/google-g.svg" width="40" height="40" alt="" />' +
      "</div>" +
      "<h3>Leave a Google review</h3>" +
      "<p>These written reviews match Google. Open Google to read every review and leave yours.</p>" +
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

  function renderWrittenReviews() {
    container.innerHTML =
      WRITTEN_REVIEWS.map(renderWrittenReviewCard).join("") + renderGoogleCta();
    container.classList.toggle("reviews-grid-single", WRITTEN_REVIEWS.length === 1);
    if (summary) {
      summary.textContent = "";
    }
  }

  function renderFootnote() {
    if (!footnote) {
      return;
    }
    footnote.innerHTML =
      'These written reviews match Google Maps.' +
      ' <a href="' +
      MAPS_URL +
      '" target="_blank" rel="noopener noreferrer">See all on Google Maps</a>' +
      ' · <a href="' +
      REVIEW_URL +
      '" target="_blank" rel="noopener noreferrer">Write a review</a>';
  }

  function loadReviews() {
    renderStatsPanel();
    renderWrittenReviews();
    renderFootnote();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadReviews);
  } else {
    loadReviews();
  }
})();
