/* ============================================================
   GILULA SPORT — single article page  (article.html?id=…)
   ============================================================ */

const articleId  = new URLSearchParams(location.search).get("id");
const articleBox = document.getElementById("articleBox");

async function renderArticle() {
  try {
    const article  = await API.getArticle(articleId);
    const category = article.categories;

    document.title = `${article.title} — GILULA SPORT`;
    if (category) markActiveNav(category.name);

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
          <img src="${esc(article.image_url)}" alt="${esc(article.title)}"
               class="article__image ${article.image_fit === "contain" ? "article__image--contain" : ""}"
               onerror="this.closest('.article__figure').remove()" />
        </figure>` : ""}

      ${article.author ? `
        <p class="article__author">
          <span class="article__author-label">ავტორი:</span>
          <span class="article__author-name">${esc(article.author)}</span>
        </p>` : ""}

      ${article.excerpt ? `<p class="article__lead">${esc(article.excerpt)}</p>` : ""}

      <div class="article__content">${article.content || ""}</div>

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
