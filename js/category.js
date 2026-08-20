/* ============================================================
   GILULA SPORT — category page

   The menu links here by name:   category.html?name=ფეხბურთი
   so the navbar stays plain HTML and never depends on database ids.
   ============================================================ */

const params        = new URLSearchParams(location.search);
const wantedName    = params.get("name");
const wantedId      = params.get("id");        // still works for older links
const categoryGrid  = document.getElementById("categoryGrid");
const categoryTitle = document.getElementById("categoryTitle");

async function renderCategory() {
  try {
    const categories = await API.getCategories();
    const category = wantedName
      ? categories.find(c => c.name === wantedName)
      : categories.find(c => c.id === Number(wantedId));

    if (!category) {
      categoryTitle.textContent = "კატეგორია ვერ მოიძებნა";
      showNotice(categoryGrid,
        `„${wantedName || wantedId}“ ჯერ არ არის დამატებული ადმინ პანელში.`);
      return;
    }

    document.title = `${category.name} — GILULA SPORT`;
    categoryTitle.innerHTML = `<span class="accent">${esc(category.name)}</span>`;
    markActiveNav(category.name);

    const articles = await API.getArticles({ categoryId: category.id });
    categoryGrid.innerHTML = articles.length
      ? articles.map(articleCard).join("")
      : `<p class="notice">ამ კატეგორიაში სიახლეები ჯერ არ არის.</p>`;

  } catch (error) {
    showNotice(categoryGrid, "ჩატვირთვა ვერ მოხერხდა: " + error.message);
  }
}

if (requireDatabase(categoryGrid)) renderCategory();
