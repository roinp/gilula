/* ============================================================
   GILULA SPORT — GTM / GA4 tracking
   ------------------------------------------------------------
   Pushes the "article_view" event into window.dataLayer on every
   article page, so Google Tag Manager can forward the article
   metadata to GA4.

   The website NEVER sends a GA4 event itself — it only fills the
   dataLayer. GA4 is configured inside GTM.

   How new articles are covered automatically
   ------------------------------------------
   Every article on the site is rendered by js/article.js, and that
   file calls Analytics.trackArticleView(article) with the row that
   came out of the database. So each new article you add from the
   admin panel is tracked the moment it is opened — nothing to
   change here.

   For a hand-written / future article page that does not use
   js/article.js, just add the data to the page and this file will
   find it on its own:

     <script type="application/json" id="article-data">
       { "id": 87421, "title": "…", "category": "ფეხბურთი",
         "author": "…", "published_at": "2026-08-24" }
     </script>

   Exposed as  window.Analytics
   ============================================================ */

(function () {

  window.dataLayer = window.dataLayer || [];

  /* Already pushed for this article id — protects against
     rerenders, double script loads and back/forward navigation. */
  let lastTrackedId = null;

  /* ---------- category / subcategory names → GA-friendly slugs ---------- */

  /* The categories that exist today. Anything else is transliterated
     by slugify() below, so a new category keeps working. */
  const CATEGORY_SLUGS = {
    "ქართული სპორტი": "georgian-sport",
    "ფეხბურთი":       "football",
    "კალათბურთი":     "basketball",
    "რაგბი":          "rugby",
    "ვიდეო":          "video",
    "MMA":            "mma",
    "სხვა":           "other"
  };

  const GEORGIAN_LATIN = {
    "ა":"a","ბ":"b","გ":"g","დ":"d","ე":"e","ვ":"v","ზ":"z","თ":"t","ი":"i",
    "კ":"k","ლ":"l","მ":"m","ნ":"n","ო":"o","პ":"p","ჟ":"zh","რ":"r","ს":"s",
    "ტ":"t","უ":"u","ფ":"p","ქ":"k","ღ":"gh","ყ":"q","შ":"sh","ჩ":"ch",
    "ც":"ts","ძ":"dz","წ":"ts","ჭ":"ch","ხ":"kh","ჯ":"j","ჰ":"h"
  };

  /** "ქართული სპორტი" → "kartuli-sporti",  "Champions League" → "champions-league" */
  function slugify(value) {
    return String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/[Ⴀ-ჿ]/g, ch => GEORGIAN_LATIN[ch] || "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function categorySlug(name) {
    if (!name) return "";
    return CATEGORY_SLUGS[String(name).trim()] || slugify(name);
  }

  /* ---------- publication date → YYYY-MM-DD ---------- */

  function publishDate(value) {
    if (!value) return "";

    // Supabase sends "2026-08-24T18:30:00+00:00" — the first 10
    // characters are already the date the editor entered.
    const text = String(value);
    const direct = text.match(/^(\d{4}-\d{2}-\d{2})/);
    if (direct) return direct[1];

    const date = new Date(text);
    if (isNaN(date)) return "";

    const pad = n => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  /* ---------- article row → dataLayer object ---------- */

  /* "ვიდეო" articles are video content, everything else is news.
     If a `type` column is ever added to the database it wins. */
  function articleType(article, category) {
    if (article.article_type) return String(article.article_type);
    if (article.type)         return String(article.type);
    return category === "video" ? "video" : "news";
  }

  function buildEvent(article) {
    const categoryName =
      (article.categories && article.categories.name) ||
      article.category_name ||
      article.category ||
      "";

    const category    = categorySlug(categoryName);
    const subcategory = categorySlug(article.subcategory || article.article_subcategory);
    const author      = String(article.author ?? "").trim();
    const date        = publishDate(article.published_at || article.publish_date);

    const payload = {
      event: "article_view",
      article_id: String(article.id ?? "")
    };

    // Empty strings are not allowed — a missing value is left out.
    if (article.title) payload.article_title = String(article.title);
    if (category)      payload.article_category = category;
    if (subcategory)   payload.article_subcategory = subcategory;
    if (author)        payload.article_author = author;
    if (date)          payload.article_publish_date = date;

    payload.article_type = articleType(article, category);

    return payload;
  }

  /* ---------- public API ---------- */

  const Analytics = {

    slugify,

    /**
     * Pushes "article_view" for the article the visitor is looking at.
     * Safe to call more than once — the same article is pushed only once.
     *
     * @param {object} article  the row from the database
     * @returns {object|null}   what was pushed, or null when skipped
     */
    trackArticleView(article) {
      if (!article || article.id === undefined || article.id === null) return null;

      const id = String(article.id);
      if (id === lastTrackedId) return null;   // rerender / repeated call
      lastTrackedId = id;

      const payload = buildEvent(article);
      window.dataLayer.push(payload);
      return payload;
    },

    /** Lets client-side navigation report a new article again. */
    reset() {
      lastTrackedId = null;
    }
  };

  window.Analytics = Analytics;

  /* ---------- automatic pick-up for pages without js/article.js ---------- */

  /* Reads <script type="application/json" id="article-data"> if the page
     has one. Used by future, hand-written article pages. */
  function articleFromPage() {
    const tag = document.getElementById("article-data");
    if (!tag) return null;
    try {
      return JSON.parse(tag.textContent);
    } catch (error) {
      console.warn("article-data is not valid JSON:", error.message);
      return null;
    }
  }

  function trackFromPage() {
    const article = articleFromPage();
    if (article) Analytics.trackArticleView(article);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", trackFromPage);
  } else {
    trackFromPage();
  }

  /* ---------- client-side navigation ---------- */

  /* Today every article opens with a full page load, so this does
     nothing. It is here so that the event keeps firing correctly if
     the site later moves to a router (React / Next.js / Vue …):
     when the URL changes, the previous article is forgotten, and the
     next trackArticleView() call is allowed through again. */

  let lastUrl = location.href;

  function onUrlChange() {
    if (location.href === lastUrl) return;
    lastUrl = location.href;
    Analytics.reset();
    trackFromPage();
  }

  ["pushState", "replaceState"].forEach(method => {
    const original = history[method];
    history[method] = function () {
      const result = original.apply(this, arguments);
      onUrlChange();
      return result;
    };
  });

  window.addEventListener("popstate", onUrlChange);

})();
