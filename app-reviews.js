(function () {
  const APP_ID = "6757947997";
  const REVIEWS_FEED =
    "https://itunes.apple.com/us/rss/customerreviews/page=PAGE/id=" +
    APP_ID +
    "/sortby=mostrecent/json";
  const APP_STORE_REVIEWS_URL =
    "https://apps.apple.com/us/app/id" + APP_ID + "?see-all=reviews";

  const container = document.getElementById("app-reviews");
  const summary = document.getElementById("reviews-summary");

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

    return entries.filter(function (entry) {
      return entry && entry["im:rating"];
    });
  }

  async function loadReviews() {
    container.innerHTML = '<p class="reviews-status">Loading App Store reviews…</p>';

    try {
      const reviews = [];
      let page = 1;

      while (page <= 3) {
        const pageReviews = await fetchReviewPage(page);
        if (!pageReviews.length) {
          break;
        }
        reviews.push.apply(reviews, pageReviews);
        page += 1;
      }

      if (!reviews.length) {
        container.innerHTML =
          '<p class="reviews-status">Live App Store reviews will appear here as they come in.</p>';
        if (summary) {
          summary.textContent = "Pulled live from the App Store.";
        }
        return;
      }

      if (summary) {
        summary.textContent =
          reviews.length +
          " live App Store review" +
          (reviews.length === 1 ? "" : "s") +
          " • updated when you open the page";
      }

      container.innerHTML = reviews.map(renderReviewCard).join("");
    } catch (error) {
      container.innerHTML =
        '<p class="reviews-status">Could not load live reviews right now. <a href="' +
        APP_STORE_REVIEWS_URL +
        '" target="_blank" rel="noreferrer">Read them on the App Store</a>.</p>';
    }
  }

  loadReviews();
})();
