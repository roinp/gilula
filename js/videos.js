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

/* ---------- 3. Section ---------- */

async function renderVideos() {
  const section = document.getElementById("videos");
  const grid    = document.getElementById("videosGrid");
  if (!section || !grid) return;

  let videos;
  try {
    videos = await API.getVideos();
  } catch (error) {
    // the table is missing (supabase/004-videos.sql not run yet) —
    // the rest of the page must not suffer for it
    section.hidden = true;
    return;
  }

  // a row without a usable YouTube link cannot be played
  videos = videos.filter(video => YOUTUBE.embedFor(video));

  if (!videos.length) { section.hidden = true; return; }

  section.hidden = false;
  grid.innerHTML = videos.map(videoCard).join("");

  grid.addEventListener("click", event => {
    const card = event.target.closest(".video-card");
    if (card) openVideo(videos[Number(card.dataset.video)]);
  });
}

/* ---------- start ---------- */

if (window.API && API.configured) renderVideos();
else document.getElementById("videos").hidden = true;
