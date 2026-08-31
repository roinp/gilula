/* ============================================================
   GILULA SPORT — videos section

   Everything shown here comes from the `videos` table, which is
   filled from the admin panel („ვიდეოები“). Nothing is written
   in the code: adding, renaming, reordering or hiding a video in
   the panel is enough.

   A card only shows the picture and the title. The YouTube player
   is created when the visitor presses play, and destroyed again
   when the window is closed — so nothing keeps playing in the
   background and YouTube sets no cookie until it is asked to.

   Two pages use this file:
     index.html     a row of 4, the rest behind the arrows
     category.html  the „ვიდეო“ page — all of them in one grid
   ============================================================ */

/* ---------- 1. Cards ---------- */

const PLAY_ICON =
  `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5-11-6.5z"/></svg>`;

function videoCard(video, index) {
  return `
    <button type="button" class="video-card" data-video="${index}"
            aria-label="${esc(video.title)} — ვიდეოს ჩართვა">
      <span class="video-card__thumb">
        <img src="${imageOr(YOUTUBE.thumbnailFor(video))}" alt="${esc(video.title)}"
             class="video-card__img" loading="lazy"
             onerror="this.src='${PLACEHOLDER}'" />
        <span class="video-card__play">${PLAY_ICON}</span>
      </span>
      <span class="video-card__body">
        <span class="video-card__title">${esc(video.title)}</span>
        <span class="video-card__meta">${PLAY_ICON} YouTube</span>
      </span>
    </button>`;
}

/** Every video that can actually be played, in the admin's order. */
async function loadVideos() {
  let videos;
  try {
    videos = await API.getVideos();
  } catch (error) {
    // the table is missing (supabase/004-videos.sql not run yet) —
    // no page may break over it
    return [];
  }
  // a row without a usable YouTube link cannot be played
  return videos.filter(video => YOUTUBE.embedFor(video));
}

/** Fills a container with cards and makes each one open its own video. */
function fillVideos(container, videos) {
  container.innerHTML = videos.map(videoCard).join("");
  container.addEventListener("click", event => {
    const card = event.target.closest(".video-card");
    if (card) openVideo(videos[Number(card.dataset.video)]);
  });
}


/* ---------- 2. Player window ---------- */

const videoModal = document.getElementById("videoModal");

function openVideo(video) {
  const url = YOUTUBE.embedFor(video);
  if (!url) return;

  document.getElementById("videoModalTitle").textContent = video.title || "";
  document.getElementById("videoFrame").innerHTML = `
    <iframe src="${esc(url)}?autoplay=1&rel=0"
            title="${esc(video.title)}"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerpolicy="strict-origin-when-cross-origin"
            allowfullscreen></iframe>`;

  videoModal.hidden = false;
  document.body.style.overflow = "hidden";
  videoModal.querySelector(".vmodal__close").focus();
}

function closeVideo() {
  if (videoModal.hidden) return;
  // removing the iframe is what actually stops the sound
  document.getElementById("videoFrame").innerHTML = "";
  videoModal.hidden = true;
  document.body.style.overflow = "";
}

if (videoModal) {
  videoModal.addEventListener("click", event => {
    if (event.target.closest("[data-close]")) closeVideo();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeVideo();
  });
}

/* ---------- 3. The row of cards ---------- */
/* Four cards are visible at a time (see --per-view in style.css); the
   arrows move the row on by exactly one screenful. The row is a normal
   scrolling element, so a swipe or a trackpad works without any code. */

function wireCarousel(track, prev, next) {
  /* one step = everything currently on screen */
  const step = () => track.clientWidth;

  /* a scrollbar can land a pixel or two short of the end */
  const atStart = () => track.scrollLeft <= 1;
  const atEnd   = () => track.scrollLeft + track.clientWidth >= track.scrollWidth - 1;

  function update() {
    // nothing to scroll — the arrows would only be in the way
    const fits = track.scrollWidth <= track.clientWidth + 1;
    prev.hidden = next.hidden = fits;

    prev.disabled = atStart();
    next.disabled = atEnd();
  }

  prev.addEventListener("click", () => track.scrollBy({ left: -step(), behavior: "smooth" }));
  next.addEventListener("click", () => track.scrollBy({ left:  step(), behavior: "smooth" }));

  track.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);

  update();
}

async function renderVideos() {
  const section = document.getElementById("videos");
  const track   = document.getElementById("videosTrack");
  if (!section || !track) return;

  const videos = await loadVideos();
  if (!videos.length) { section.hidden = true; return; }

  section.hidden = false;
  fillVideos(track, videos);

  wireCarousel(track, document.getElementById("videosPrev"), document.getElementById("videosNext"));
}


/* ---------- 4. The „ვიდეო“ category page ---------- */

/**
 * Puts every video into a plain grid. There is no need to add a video to
 * the category by hand — the page simply shows the whole videos table.
 * Called by js/category.js; answers how many videos were shown.
 */
async function renderVideoGrid(container) {
  if (!container) return 0;

  const videos = await loadVideos();
  if (videos.length) fillVideos(container, videos);
  return videos.length;
}

/* ---------- start ---------- */
/* The homepage row starts itself; the category page calls
   renderVideoGrid() from js/category.js once it knows which
   category was opened. */

const videosSection = document.getElementById("videos");

if (videosSection) {
  if (window.API && API.configured) renderVideos();
  else videosSection.hidden = true;
}
