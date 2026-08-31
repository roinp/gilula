/* ============================================================
   GILULA SPORT — category page

   The menu links here by name:   category.html?name=ფეხბურთი
   so the navbar stays plain HTML and never depends on database ids.
   ============================================================ */

/* The menu item that shows the videos. Videos have their own table
   (admin panel → „ვიდეოები“), so this page simply shows all of them —
   nothing has to be tagged video by video. Rename it here if you ever
   rename the menu item. */
const VIDEO_CATEGORY = "ვიდეო";

const params          = new URLSearchParams(location.search);
const wantedName      = params.get("name");
const wantedId        = params.get("id");        // still works for older links
const categoryGrid    = document.getElementById("categoryGrid");
const categoryTitle   = document.getElementById("categoryTitle");
const categorySubtitle = document.getElementById("categorySubtitle");
const categoryVideos  = document.getElementById("categoryVideos");

async function renderCategory() {
  try {
    const categories = await API.getCategories();
    const category = wantedName
      ? categories.find(c => c.name === wantedName)
      : categories.find(c => c.id === Number(wantedId));

    /* the video page works even if nobody added a „ვიდეო“ category —
       the videos do not depend on the categories table at all */
    const name        = category ? category.name : wantedName;
    const isVideoPage = name === VIDEO_CATEGORY;

    if (!category && !isVideoPage) {
      categoryTitle.textContent = "კატეგორია ვერ მოიძებნა";
      showNotice(categoryGrid,
        `„${wantedName || wantedId}“ ჯერ არ არის დამატებული ადმინ პანელში.`);
      return;
    }

    document.title = `${name} — GILULA SPORT`;
    categoryTitle.innerHTML = `<span class="accent">${esc(name)}</span>`;
    markActiveNav(name);

    /* every video the admin added shows up here on its own */
    const videoCount = isVideoPage ? await renderVideoGrid(document.getElementById("categoryVideoGrid")) : 0;
    categoryVideos.hidden = !videoCount;
    if (videoCount) categorySubtitle.textContent = "";

    const articles = category ? await API.getArticles({ categoryId: category.id }) : [];

    categoryGrid.innerHTML = articles.length
      ? articles.map(articleCard).join("")
      /* with the videos already filling the page there is nothing missing */
      : (videoCount ? "" : `<p class="notice">ამ კატეგორიაში სიახლეები ჯერ არ არის.</p>`);

  } catch (error) {
    showNotice(categoryGrid, "ჩატვირთვა ვერ მოხერხდა: " + error.message);
  }
}

if (requireDatabase(categoryGrid)) renderCategory();
