/* ============================================================
   ARENA — single article page  (article.html?id=…)
   ============================================================ */

const articleId  = new URLSearchParams(location.search).get("id");
const articleBox = document.getElementById("articleBox");

const ARTICLE_WIDTHS = [640, 960, 1280];
const ARTICLE_SIZES  = "(max-width: 900px) 100vw, 860px";

/* Pictures inside the article text: resized, and loaded only when the
   reader scrolls down to them. A <template> keeps them from being
   downloaded while they are being rewritten. */
function contentHtml(html) {
  const box = document.createElement("template");
  box.innerHTML = html || "";

  box.content.querySelectorAll("img").forEach(img => {
    const url = img.getAttribute("src");
    img.loading  = "lazy";
    img.decoding = "async";
    if (!url || img.hasAttribute("srcset") || imgUrl(url, 640) === url) return;

    img.dataset.orig = url;
    img.src    = imgUrl(url, ARTICLE_WIDTHS[ARTICLE_WIDTHS.length - 1]);
    img.srcset = ARTICLE_WIDTHS.map(w => `${imgUrl(url, w)} ${w}w`).join(", ");
    img.sizes  = ARTICLE_SIZES;
    img.setAttribute("onerror", "imgFallback(this)");
  });

  return box.innerHTML;
}

async function renderArticle() {
  try {
    const article  = await API.getArticle(articleId);
    const category = article.categories;

    // The address bar always shows the article's current stamp (see
    // cardVersion in js/common.js), so a link copied from here is one
    // Facebook reads afresh after the picture has been changed.
    const stamped = new URL(location.href);
    if (typeof cardVersion === "function" &&
        stamped.searchParams.get("v") !== cardVersion(article)) {
      stamped.searchParams.set("v", cardVersion(article));
      history.replaceState(history.state, "", stamped);
    }

    document.title = `${article.title} — ARENA`;
    if (category) markActiveNav(category.name);

    // GTM / GA4 — "article_view", see js/analytics.js.
    // Fires once, with the data of the article on the screen.
    if (window.Analytics) Analytics.trackArticleView(article);

    articleBox.innerHTML = `
      <header class="article__head">
        ${category ? `<a href="category.html?name=${encodeURIComponent(category.name)}" class="badge">${esc(category.name)}</a>` : ""}
        <h1 class="article__title">${esc(article.title)}</h1>
        <div class="article__meta">
          <span>${formatDate(article.published_at)}</span>
          <span>${esc(article.read_time)} საკითხავი</span>
        </div>
      </header>

      ${article.image_url ? `
        <figure class="article__figure">
          <img ${imgAttrs(article.image_url, ARTICLE_WIDTHS, ARTICLE_SIZES)} alt="${esc(article.title)}"
               class="article__image ${article.image_fit === "contain" ? "article__image--contain" : ""}"
               fetchpriority="high"
               onerror="if(!imgFallback(this))this.closest('.article__figure').remove()" />
        </figure>` : ""}

      ${article.author ? `
        <p class="article__author">
          <span class="article__author-label">ავტორი:</span>
          <span class="article__author-name">${esc(article.author)}</span>
        </p>` : ""}

      ${article.excerpt ? `<p class="article__lead">${esc(article.excerpt)}</p>` : ""}

      <div class="article__content">${contentHtml(article.content)}</div>

      <a href="index.html" class="btn btn--outline article__back">← მთავარ გვერდზე</a>
    `;

    renderRelated(article);

  } catch (error) {
    articleBox.innerHTML = `<p class="notice">სტატია ვერ მოიძებნა.</p>
      <a href="index.html" class="btn btn--outline">← მთავარ გვერდზე</a>`;
  }
}

/* Three more articles from the same category. */
async function renderRelated(article) {
  const box  = document.getElementById("relatedBox");
  const grid = document.getElementById("relatedGrid");
  if (!article.category_id) return;

  try {
    const articles = (await API.getArticles({ categoryId: article.category_id, limit: 4 }))
      .filter(a => a.id !== article.id)
      .slice(0, 3);

    if (!articles.length) return;
    grid.innerHTML = articles.map(articleCard).join("");
    box.hidden = false;
  } catch (error) {
    console.error("მსგავსი სიახლეები ვერ ჩაიტვირთა:", error.message);
  }
}

if (requireDatabase(articleBox)) renderArticle();
