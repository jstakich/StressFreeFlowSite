#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const APP_ID = "6757947997";
const PAGE_URL = `https://apps.apple.com/us/app/id${APP_ID}?see-all=reviews`;
const OUTPUT = path.join(__dirname, "..", "reviews-live.json");

function normalizeReview(review) {
  return {
    id: String(review.id || ""),
    title: review.title || "App Store review",
    author: review.reviewerName || "App Store reviewer",
    rating: Number(review.rating || 5),
    body: String(review.contents || "").trim(),
    date: review.date || "",
  };
}

function parseReviewsFromHtml(html) {
  const match = String(html || "").match(
    /<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/
  );
  if (!match) {
    return [];
  }

  const payload = JSON.parse(match[1]);
  const shelf = payload?.data?.[0]?.data?.shelfMapping;
  if (!shelf) {
    return [];
  }

  const items = []
    .concat(shelf.allProductReviews?.items || [])
    .concat(shelf.userProductReviews?.items || []);

  const seen = new Set();
  const reviews = [];

  for (const item of items) {
    const review = item?.review;
    if (!review?.id || seen.has(review.id)) {
      continue;
    }
    seen.add(review.id);
    const normalized = normalizeReview(review);
    if (normalized.body) {
      reviews.push(normalized);
    }
  }

  return reviews;
}

async function loadHtml() {
  const htmlPath = process.env.REVIEW_HTML_PATH;
  if (htmlPath) {
    return fs.readFileSync(htmlPath, "utf8");
  }

  const response = await fetch(PAGE_URL, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });

  if (!response.ok) {
    throw new Error(`App Store request failed: ${response.status}`);
  }

  return response.text();
}

async function main() {
  const html = await loadHtml();
  const reviews = parseReviewsFromHtml(html);
  const payload = {
    source: "App Store",
    syncedAt: new Date().toISOString(),
    appId: APP_ID,
    reviews,
  };

  fs.writeFileSync(OUTPUT, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`Wrote ${reviews.length} review(s) to ${OUTPUT}`);
}

main().catch(function (error) {
  console.error(error);
  process.exit(1);
});
