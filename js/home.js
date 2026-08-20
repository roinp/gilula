/* ============================================================
   GILULA SPORT — homepage

   The slider and the news grid come from the SAME list of
   articles, so content is entered only once in the admin panel:

     slider     = the first 7 articles of the "Latest News" order
     news grid  = the whole list

   Change the order under "მთავარი გვერდი" in the admin panel and
   both follow automatically.
   ============================================================ */

const SLIDER_COUNT = 7;

/* ---------- 1. Slider ---------- */

function renderSlider(articles) {
  const track   = document.getElementById("sliderTrack");
  const dotsBox = document.getElementById("sliderDots");
  const slider  = document.getElementById("slider");

  const slides = articles.slice(0, SLIDER_COUNT);
  if (!slides.length) { slider.hidden = true; return; }

  track.innerHTML = slides.map((article, i) => {
    const category = article.categories ? article.categories.name : "";
    const byline   = article.author
      ? `ავტორი: ${esc(article.author)}`
      : formatDate(article.published_at);

    return `
      <article class="slide slide--${(i % 5) + 1}">
        <div class="container slide__inner">
          <div class="slide__text">
            ${category ? `<span class="badge">${esc(category)}</span>` : ""}
            <h2 class="slide__title">${esc(article.title)}</h2>
            <p class="slide__role">${byline}</p>
            ${article.excerpt ? `<p class="slide__desc">${esc(article.excerpt)}</p>` : ""}
            <a href="article.html?id=${article.id}" class="btn">სრულად ნახვა</a>
          </div>
          <div class="slide__visual${article.image_url ? "" : " no-photo"}">
            ${article.image_url
              ? `<img src="${esc(article.image_url)}" alt="${esc(article.title)}"
                      class="slide__photo${article.image_fit === "contain" ? " slide__photo--contain" : ""}"
                      onerror="this.parentElement.classList.add('no-photo');this.remove()" />`
              : ""}
            <span class="slide__number">${i + 1}</span>
          </div>
        </div>
      </article>`;
  }).join("");

  /* --- slider behaviour --- */
  const total = slides.length;
  let current = 0;
  let timer   = null;
  const DELAY = 5000;

  dotsBox.innerHTML = slides.map((_, i) =>
    `<button class="dot" aria-label="სლაიდი ${i + 1}"></button>`).join("");
  const dots = dotsBox.querySelectorAll(".dot");
  dots.forEach((dot, i) => dot.addEventListener("click", () => { goTo(i); restartAuto(); }));

  function goTo(index) {
    current = (index + total) % total;
    track.style.transform = `translateX(-${current * 100}%)`;
    dots.forEach((dot, i) => dot.classList.toggle("is-active", i === current));
  }
  const next = () => goTo(current + 1);
  const prev = () => goTo(current - 1);

  const startAuto   = () => { if (total > 1) timer = setInterval(next, DELAY); };
  const stopAuto    = () => clearInterval(timer);
  const restartAuto = () => { stopAuto(); startAuto(); };

  document.getElementById("nextBtn").addEventListener("click", () => { next(); restartAuto(); });
  document.getElementById("prevBtn").addEventListener("click", () => { prev(); restartAuto(); });

  slider.addEventListener("mouseenter", stopAuto);
  slider.addEventListener("mouseleave", startAuto);

  // swipe on touch devices
  let touchStartX = 0;
  slider.addEventListener("touchstart", e => { touchStartX = e.touches[0].clientX; }, { passive: true });
  slider.addEventListener("touchend", e => {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) diff > 0 ? next() : prev();
    restartAuto();
  });

  goTo(0);
  startAuto();
}

/* ---------- 2. Latest news ---------- */

async function renderHomepage() {
  const grid   = document.getElementById("newsGrid");
  const slider = document.getElementById("slider");

  try {
    // one request feeds both the slider and the grid
    const articles = await API.getArticles({ homeOnly: true, limit: 12 });

    if (!articles.length) {
      slider.hidden = true;
      grid.innerHTML = `<p class="notice">სიახლეები ჯერ არ დამატებულა.</p>`;
      return;
    }

    renderSlider(articles);
    grid.innerHTML = articles.map(articleCard).join("");

  } catch (error) {
    slider.hidden = true;
    showNotice(grid, "სიახლეები ვერ ჩაიტვირთა: " + error.message);
  }
}

/* ---------- start ---------- */

if (requireDatabase(document.getElementById("newsGrid"))) {
  renderHomepage();
} else {
  document.getElementById("slider").hidden = true;
}
