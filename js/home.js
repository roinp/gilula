/* ============================================================
   GILULA SPORT — homepage
   1. Slider  (from the "slides" table)
   2. Latest news  (from the "articles" table)
   ============================================================ */

/* ---------- 1. Slider ---------- */

async function renderSlider() {
  const track    = document.getElementById("sliderTrack");
  const dotsBox  = document.getElementById("sliderDots");
  const slider   = document.getElementById("slider");
  if (!track) return;

  let slides = [];
  try {
    slides = await API.getSlides();
  } catch (error) {
    console.error("სლაიდერი ვერ ჩაიტვირთა:", error.message);
  }

  if (!slides.length) { slider.hidden = true; return; }

  track.innerHTML = slides.map((slide, i) => `
    <article class="slide slide--${(i % 5) + 1}">
      <div class="container slide__inner">
        <div class="slide__text">
          ${slide.badge ? `<span class="badge">${esc(slide.badge)}</span>` : ""}
          <h2 class="slide__title">${esc(slide.title)}</h2>
          ${slide.role ? `<p class="slide__role">${esc(slide.role)}</p>` : ""}
          ${slide.description ? `<p class="slide__desc">${esc(slide.description)}</p>` : ""}
          <a href="${esc(slide.link_url || "#news")}" class="btn">სრულად ნახვა</a>
        </div>
        <div class="slide__visual${slide.image_url ? "" : " no-photo"}">
          ${slide.image_url
            ? `<img src="${esc(slide.image_url)}" alt="${esc(slide.title)}" class="slide__photo"
                    onerror="this.parentElement.classList.add('no-photo');this.remove()" />`
            : ""}
          ${slide.number ? `<span class="slide__number">${esc(slide.number)}</span>` : ""}
        </div>
      </div>
    </article>`).join("");

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

async function renderLatestNews() {
  const grid = document.getElementById("newsGrid");

  try {
    const articles = await API.getArticles({ homeOnly: true, limit: 12 });
    grid.innerHTML = articles.length
      ? articles.map(articleCard).join("")
      : `<p class="notice">სიახლეები ჯერ არ დამატებულა.</p>`;
  } catch (error) {
    showNotice(grid, "სიახლეები ვერ ჩაიტვირთა: " + error.message);
  }
}

/* ---------- start ---------- */

if (requireDatabase(document.getElementById("newsGrid"))) {
  renderSlider();
  renderLatestNews();
} else {
  document.getElementById("slider").hidden = true;
}
