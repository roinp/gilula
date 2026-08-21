/* ============================================================
   GILULA SPORT — admin panel
    1. Helpers
    2. Login
    3. Loading & navigation
    4. Dashboard
    5. Articles
    6. Latest news (homepage order + slider)
    7. Categories
    8. Form pieces (image picker, text editor)
    9. Drawer
   ============================================================ */

/* ------------------------------------------------------------
   1. Helpers
   ------------------------------------------------------------ */

const $ = id => document.getElementById(id);

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[ch]));
}

/* quotes are percent-encoded so the value is safe inside HTML attributes */
const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%2024%2024%22%20fill=%22none%22%20stroke=%22%2300e05a%22%20stroke-width=%22.7%22%3E%3Ccircle%20cx=%2212%22%20cy=%2212%22%20r=%2210%22/%3E%3Cpath%20d=%22M12%206.5l4.2%203-1.6%205h-5.2l-1.6-5z%22/%3E%3Cpath%20d=%22M12%202v4.5M2.4%209.2l5%201.3M21.6%209.2l-5%201.3M6%2021l3.4-6.5M18%2021l-3.4-6.5%22/%3E%3C/svg%3E";

/** The admin lives in /admin/, so site-relative paths need one level up. */
function previewSrc(url) {
  if (!url) return PLACEHOLDER;
  if (/^(https?:)?\/\//i.test(url) || url.startsWith("data:")) return url;
  return "../" + url.replace(/^\.?\//, "");
}

function formatDate(value) {
  const date = new Date(value);
  return isNaN(date) ? "" : new Intl.DateTimeFormat("ka-GE", { dateStyle: "medium" }).format(date);
}

/** "2025-08-19T…" → "2025-08-19" for <input type="date"> */
function dateInputValue(value) {
  const date = value ? new Date(value) : new Date();
  return isNaN(date) ? "" : date.toISOString().slice(0, 10);
}

let toastTimer = null;
function toast(message, isError = false) {
  const box = $("toast");
  box.textContent = message;
  box.classList.toggle("toast--error", isError);
  box.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { box.hidden = true; }, 3000);
}

/** Runs a database call and reports the result to the user. */
async function save(action, successMessage) {
  try {
    await action();
    if (successMessage) toast(successMessage);
    await loadAll();
    render();
    return true;
  } catch (error) {
    toast(error.message, true);
    return false;
  }
}

const switchHTML = (label, checked, attrs = "") => `
  <label class="switch">
    <input type="checkbox" ${checked ? "checked" : ""} ${attrs} />
    <span class="switch__track"></span>
    <span>${label}</span>
  </label>`;

const ICON = {
  edit:  `<svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.8 9.94l-3.75-3.75L3 17.25zM20.7 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>`,
  trash: `<svg viewBox="0 0 24 24"><path d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>`,
  up:    `<svg viewBox="0 0 24 24"><path d="m12 8-6 6h12l-6-6z"/></svg>`,
  down:  `<svg viewBox="0 0 24 24"><path d="m12 16 6-6H6l6 6z"/></svg>`
};


/* ------------------------------------------------------------
   2. Login
   ------------------------------------------------------------ */

if (!API.configured) {
  document.body.innerHTML =
    `<div class="login"><div class="login__box">
       <h1 class="login__title">კონფიგურაცია საჭიროა</h1>
       <p class="login__sub">გახსენით <b>js/config.js</b> და ჩასვით თქვენი Supabase-ის მისამართი და გასაღები.<br>
       დეტალები: <b>SETUP.md</b></p>
     </div></div>`;
  throw new Error("Supabase is not configured");
}

$("loginForm").addEventListener("submit", async event => {
  event.preventDefault();
  const button = $("loginBtn");
  const error  = $("loginError");

  button.disabled = true;
  button.textContent = "შესვლა…";
  error.hidden = true;

  try {
    await API.signIn($("loginEmail").value.trim(), $("loginPassword").value);
    await start();
  } catch (err) {
    error.textContent = "შესვლა ვერ მოხერხდა — შეამოწმეთ ელფოსტა და პაროლი.";
    error.hidden = false;
  } finally {
    button.disabled = false;
    button.textContent = "შესვლა";
  }
});

$("logoutBtn").addEventListener("click", async () => {
  await API.signOut();
  location.reload();
});


/* ------------------------------------------------------------
   3. Loading & navigation
   ------------------------------------------------------------ */

const state = { categories: [], articles: [], hasAuthor: true, view: "dashboard" };

/** Shown while the "author" column is still missing from the database. */
const AUTHOR_MISSING_HINT = `
  <p class="hint hint--warn">ავტორის ველი ჯერ არ არის ბაზაში.
    გაუშვით <code>supabase/002-author-and-slider.sql</code>
    (Supabase → SQL Editor). მანამდე დანარჩენი ყველაფერი ჩვეულებრივ მუშაობს.</p>`;

/** How many of the homepage articles also appear in the slider. */
const SLIDER_COUNT = 7;

async function loadAll() {
  const [categories, articles, hasAuthor] = await Promise.all([
    API.getCategories(),
    API.getArticles({ includeHidden: true }),
    API.hasColumn("articles", "author")
  ]);
  state.categories = categories;
  state.articles   = articles;
  state.hasAuthor  = hasAuthor;   // false until 002-author-and-slider.sql is run
}

async function start() {
  $("loginScreen").hidden = true;
  $("app").hidden = false;
  try {
    await loadAll();
    switchView(state.view);
  } catch (error) {
    toast("მონაცემები ვერ ჩაიტვირთა: " + error.message, true);
  }
}

const VIEW_TITLES = {
  dashboard:  "დაფა",
  articles:   "სიახლეები",
  home:       "მთავარი გვერდი",
  categories: "კატეგორიები"
};

const ADD_LABELS = {
  articles:   "+ ახალი სიახლე",
  categories: "+ ახალი კატეგორია"
};

function switchView(view) {
  state.view = view;

  document.querySelectorAll(".sidebar__link")
    .forEach(link => link.classList.toggle("is-active", link.dataset.view === view));
  document.querySelectorAll(".view")
    .forEach(section => section.classList.toggle("is-active", section.dataset.view === view));

  $("viewTitle").textContent = VIEW_TITLES[view];

  const addBtn = $("topAddBtn");
  addBtn.hidden = !ADD_LABELS[view];
  if (ADD_LABELS[view]) addBtn.textContent = ADD_LABELS[view];

  closeSidebar();
  render();
}

document.querySelectorAll(".sidebar__link")
  .forEach(link => link.addEventListener("click", () => switchView(link.dataset.view)));

$("topAddBtn").addEventListener("click", () => {
  if (state.view === "articles")   openArticleForm(null);
  if (state.view === "categories") openCategoryForm(null);
});

/* mobile sidebar */
const sidebar = $("sidebar");
const openSidebar  = () => sidebar.classList.add("is-open");
const closeSidebar = () => sidebar.classList.remove("is-open");
$("menuBtn").addEventListener("click", openSidebar);
$("sidebarBackdrop").addEventListener("click", closeSidebar);

/** Redraws whichever view is currently open. */
function render() {
  if (state.view === "dashboard")  renderDashboard();
  if (state.view === "articles")   renderArticles();
  if (state.view === "home")       renderHome();
  if (state.view === "categories") renderCategories();
}


/* ------------------------------------------------------------
   4. Dashboard
   ------------------------------------------------------------ */

function renderDashboard() {
  const published = state.articles.filter(a => a.published).length;

  $("stats").innerHTML = [
    ["სულ სიახლე",        state.articles.length],
    ["გამოქვეყნებული",    published],
    ["დამალული",          state.articles.length - published],
    ["მთავარ გვერდზე",    state.articles.filter(a => a.show_on_home && a.published).length],
    ["სლაიდერში",         Math.min(SLIDER_COUNT, homeArticles().filter(a => a.published).length)],
    ["კატეგორია",         state.categories.length]
  ].map(([label, value]) => `
    <div class="stat">
      <div class="stat__value">${value}</div>
      <div class="stat__label">${label}</div>
    </div>`).join("");

  const recent = state.articles.slice(0, 6);
  $("recentList").innerHTML = recent.length
    ? recent.map(article => `
        <div class="row">
          <img class="row__thumb" src="${previewSrc(article.image_url)}" alt=""
               onerror="this.src='${PLACEHOLDER}'" />
          <div class="row__main">
            <div class="row__title">${esc(article.title)}</div>
            <div class="row__sub">
              <span class="tag ${article.published ? "tag--green" : "tag--muted"}">
                ${article.published ? "გამოქვეყნებული" : "დამალული"}</span>
              <span>${esc(article.categories ? article.categories.name : "კატეგორიის გარეშე")}</span>
              <span>${formatDate(article.published_at)}</span>
            </div>
          </div>
          <div class="row__actions">
            <button class="icon-btn" title="რედაქტირება"
                    onclick="openArticleForm(${article.id})">${ICON.edit}</button>
          </div>
        </div>`).join("")
    : `<p class="empty">სიახლეები ჯერ არ დაგიმატებიათ.</p>`;
}


/* ------------------------------------------------------------
   5. Articles
   ------------------------------------------------------------ */

$("articleSearch").addEventListener("input", renderArticles);
$("articleFilter").addEventListener("change", renderArticles);

function renderArticles() {
  /* keep the category filter in sync with the categories table */
  const filter = $("articleFilter");
  const chosen = filter.value;
  filter.innerHTML = `<option value="">ყველა კატეგორია</option>` +
    state.categories.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join("");
  filter.value = chosen;

  const term = $("articleSearch").value.trim().toLowerCase();
  const list = state.articles.filter(article =>
    (!term || article.title.toLowerCase().includes(term)) &&
    (!filter.value || article.category_id === Number(filter.value))
  );

  $("articleList").innerHTML = list.length
    ? list.map(article => `
        <div class="row">
          <img class="row__thumb" src="${previewSrc(article.image_url)}" alt=""
               onerror="this.src='${PLACEHOLDER}'" />

          <div class="row__main">
            <div class="row__title">${esc(article.title)}</div>
            <div class="row__sub">
              <span class="tag">${esc(article.categories ? article.categories.name : "კატეგორიის გარეშე")}</span>
              ${state.hasAuthor ? `<span>${esc(article.author || "ავტორის გარეშე")}</span>` : ""}
              <span>${formatDate(article.published_at)}</span>
            </div>
          </div>

          <div class="row__switches">
            ${switchHTML("გამოქვეყნებული", article.published,
              `onchange="toggleArticle(${article.id}, 'published', this.checked)"`)}
            ${switchHTML("მთავარ გვერდზე", article.show_on_home,
              `onchange="toggleArticle(${article.id}, 'show_on_home', this.checked)"`)}
          </div>

          <div class="row__actions">
            <button class="icon-btn" title="რედაქტირება"
                    onclick="openArticleForm(${article.id})">${ICON.edit}</button>
            <button class="icon-btn icon-btn--danger" title="წაშლა"
                    onclick="removeArticle(${article.id})">${ICON.trash}</button>
          </div>
        </div>`).join("")
    : `<p class="empty">${state.articles.length ? "ვერაფერი მოიძებნა." : "სიახლეები ჯერ არ დაგიმატებიათ."}</p>`;
}

function toggleArticle(id, field, value) {
  save(() => API.updateArticle(id, { [field]: value }), "შენახულია");
}

function removeArticle(id) {
  const article = state.articles.find(a => a.id === id);
  if (!confirm(`წავშალოთ „${article.title}“?\nმოქმედება შეუქცევადია.`)) return;
  save(() => API.deleteArticle(id), "სიახლე წაიშალა");
}


/* ------------------------------------------------------------
   6. Latest news — which articles show on the homepage, and in
      which order.
   ------------------------------------------------------------ */

function homeArticles() {
  return state.articles
    .filter(a => a.show_on_home)
    .sort((a, b) => a.home_order - b.home_order || new Date(b.published_at) - new Date(a.published_at));
}

function renderHome() {
  const list = homeArticles();

  $("homeList").innerHTML = list.length
    ? list.map((article, index) => `
        <div class="row${index === SLIDER_COUNT - 1 ? " row--slider-edge" : ""}">
          <img class="row__thumb" src="${previewSrc(article.image_url)}" alt=""
               onerror="this.src='${PLACEHOLDER}'" />

          <div class="row__main">
            <div class="row__title">${index + 1}. ${esc(article.title)}</div>
            <div class="row__sub">
              ${index < SLIDER_COUNT ? `<span class="tag tag--green">სლაიდერში</span>` : ""}
              <span class="tag ${article.published ? "tag--muted" : "tag--yellow"}">
                ${article.published ? "ჩანს საიტზე" : "დამალულია — არ ჩანს"}</span>
              ${state.hasAuthor ? `<span>${esc(article.author || "ავტორის გარეშე")}</span>` : ""}
            </div>
          </div>

          <div class="row__actions">
            <button class="icon-btn" title="ზემოთ" ${index === 0 ? "disabled" : ""}
                    onclick="moveHome(${article.id}, -1)">${ICON.up}</button>
            <button class="icon-btn" title="ქვემოთ" ${index === list.length - 1 ? "disabled" : ""}
                    onclick="moveHome(${article.id}, 1)">${ICON.down}</button>
            <button class="icon-btn" title="რედაქტირება"
                    onclick="openArticleForm(${article.id})">${ICON.edit}</button>
            <button class="icon-btn icon-btn--danger" title="მთავარი გვერდიდან მოხსნა"
                    onclick="toggleArticle(${article.id}, 'show_on_home', false)">${ICON.trash}</button>
          </div>
        </div>`).join("")
    : `<p class="empty">მთავარ გვერდზე სიახლეები არ არის არჩეული.<br>
         ჩართეთ გადამრთველი „მთავარ გვერდზე“ სიახლეების სიაში.</p>`;
}

function moveHome(id, direction) {
  reorder(homeArticles(), id, direction, (article, index) =>
    API.updateArticle(article.id, { home_order: index + 1 }));
}

/** Moves one item up/down and writes the new order for the whole list. */
function reorder(list, id, direction, updateOne) {
  const from = list.findIndex(item => item.id === id);
  const to   = from + direction;
  if (from < 0 || to < 0 || to >= list.length) return;

  [list[from], list[to]] = [list[to], list[from]];
  save(() => Promise.all(list.map(updateOne)), "თანმიმდევრობა შენახულია");
}


/* ------------------------------------------------------------
   7. Categories
   ------------------------------------------------------------ */

function renderCategories() {
  const list = state.categories;

  $("categoryList").innerHTML = list.length
    ? list.map((category, index) => {
        const count = state.articles.filter(a => a.category_id === category.id).length;
        return `
          <div class="row">
            <div class="row__main">
              <div class="row__title">${esc(category.name)}</div>
              <div class="row__sub"><span>${count} სიახლე</span></div>
            </div>
            <div class="row__actions">
              <button class="icon-btn" title="ზემოთ" ${index === 0 ? "disabled" : ""}
                      onclick="moveCategory(${category.id}, -1)">${ICON.up}</button>
              <button class="icon-btn" title="ქვემოთ" ${index === list.length - 1 ? "disabled" : ""}
                      onclick="moveCategory(${category.id}, 1)">${ICON.down}</button>
              <button class="icon-btn" title="რედაქტირება"
                      onclick="openCategoryForm(${category.id})">${ICON.edit}</button>
              <button class="icon-btn icon-btn--danger" title="წაშლა"
                      onclick="removeCategory(${category.id})">${ICON.trash}</button>
            </div>
          </div>`;
      }).join("")
    : `<p class="empty">კატეგორიები ჯერ არ დაგიმატებიათ.</p>`;
}

function moveCategory(id, direction) {
  reorder([...state.categories], id, direction, (category, index) =>
    API.updateCategory(category.id, { sort_order: index + 1 }));
}

function removeCategory(id) {
  const category = state.categories.find(c => c.id === id);
  const count = state.articles.filter(a => a.category_id === id).length;
  const extra = count ? `\n${count} სიახლე დარჩება, მაგრამ კატეგორიის გარეშე.` : "";
  if (!confirm(`წავშალოთ კატეგორია „${category.name}“?${extra}`)) return;
  save(() => API.deleteCategory(id), "კატეგორია წაიშალა");
}


/* ------------------------------------------------------------
   9. Form pieces
   ------------------------------------------------------------ */

/** Image field: type a URL, or upload a file to the database storage. */
function pickerHTML(name, url) {
  return `
    <div class="picker" data-picker>
      <img class="picker__preview" src="${previewSrc(url)}" alt=""
           onerror="this.src='${PLACEHOLDER}'" />
      <div class="picker__side">
        <input type="url" class="picker__url" name="${name}" value="${esc(url || "")}"
               placeholder="https://…  ან  images/photo.jpg" />
        <div class="picker__actions">
          <input type="file" accept="image/*" hidden />
          <button type="button" class="btn btn--sm btn--ghost">ფაილის ატვირთვა</button>
          <span class="picker__note">JPG / PNG / WebP</span>
        </div>
      </div>
    </div>`;
}

function wirePickers(root) {
  root.querySelectorAll("[data-picker]").forEach(picker => {
    const preview = picker.querySelector(".picker__preview");
    const urlBox  = picker.querySelector(".picker__url");
    const file    = picker.querySelector('input[type="file"]');
    const button  = picker.querySelector("button");
    const note    = picker.querySelector(".picker__note");

    urlBox.addEventListener("input", () => { preview.src = previewSrc(urlBox.value.trim()); });
    button.addEventListener("click", () => file.click());

    file.addEventListener("change", async () => {
      if (!file.files[0]) return;
      button.disabled = true;
      note.textContent = "იტვირთება…";
      try {
        const url = await API.uploadImage(file.files[0]);
        urlBox.value = url;
        preview.src  = url;
        note.textContent = "ატვირთულია ✓";
      } catch (error) {
        note.textContent = "ატვირთვა ვერ მოხერხდა";
        toast(error.message, true);
      } finally {
        button.disabled = false;
        file.value = "";
      }
    });
  });
}

/** Small rich-text editor for the article body. */
function editorHTML(html) {
  const tools = [
    ["bold",        "<b>B</b>",        "მუქი"],
    ["italic",      "<i>I</i>",        "დახრილი"],
    ["h2",          "H2",              "სათაური"],
    ["h3",          "H3",              "ქვესათაური"],
    ["p",           "¶",               "აბზაცი"],
    ["ul",          "• სია",           "სია"],
    ["ol",          "1. სია",          "დანომრილი სია"],
    ["quote",       "❝",               "ციტატა"],
    ["link",        "🔗",              "ბმული"],
    ["clean",       "✕",               "ფორმატის მოხსნა"]
  ];

  return `
    <div class="editor">
      <div class="editor__tools">
        ${tools.map(([cmd, label, title]) =>
          `<button type="button" class="editor__tool" data-cmd="${cmd}" title="${title}">${label}</button>`).join("")}
      </div>
      <div class="editor__area" contenteditable="true"
           data-placeholder="დაწერეთ სიახლის სრული ტექსტი…">${html || ""}</div>
    </div>`;
}

function wireEditor(root) {
  const editor = root.querySelector(".editor");
  if (!editor) return;
  const area = editor.querySelector(".editor__area");

  editor.querySelectorAll(".editor__tool").forEach(tool => {
    tool.addEventListener("click", () => {
      area.focus();
      const cmd = tool.dataset.cmd;

      if (cmd === "bold" || cmd === "italic") document.execCommand(cmd);
      else if (cmd === "h2")    document.execCommand("formatBlock", false, "h2");
      else if (cmd === "h3")    document.execCommand("formatBlock", false, "h3");
      else if (cmd === "p")     document.execCommand("formatBlock", false, "p");
      else if (cmd === "quote") document.execCommand("formatBlock", false, "blockquote");
      else if (cmd === "ul")    document.execCommand("insertUnorderedList");
      else if (cmd === "ol")    document.execCommand("insertOrderedList");
      else if (cmd === "clean") document.execCommand("removeFormat");
      else if (cmd === "link") {
        const url = prompt("ბმულის მისამართი:", "https://");
        if (url) document.execCommand("createLink", false, url);
      }
    });
  });

  // paste as plain text so copied styles never leak into the site
  area.addEventListener("paste", event => {
    event.preventDefault();
    const text = (event.clipboardData || window.clipboardData).getData("text/plain");
    document.execCommand("insertText", false, text);
  });
}


/* ------------------------------------------------------------
   10. Drawer  (the add / edit form)
   ------------------------------------------------------------ */

const drawer = $("drawer");
let onSubmit = null;   // set by whichever form is open

function openDrawer(title, bodyHTML, handler) {
  $("drawerTitle").textContent = title;
  $("drawerBody").innerHTML = bodyHTML;
  onSubmit = handler;

  wirePickers($("drawerBody"));
  wireEditor($("drawerBody"));

  drawer.hidden = false;
  document.body.style.overflow = "hidden";
  const first = $("drawerBody").querySelector("input, textarea, select");
  if (first) first.focus();
}

function closeDrawer() {
  drawer.hidden = true;
  onSubmit = null;
  document.body.style.overflow = "";
}

drawer.addEventListener("click", event => {
  if (event.target.hasAttribute("data-close")) closeDrawer();
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !drawer.hidden) closeDrawer();
});

$("drawerForm").addEventListener("submit", async event => {
  event.preventDefault();
  if (!onSubmit) return;

  const button = $("drawerSave");
  button.disabled = true;
  button.textContent = "ინახება…";

  const ok = await onSubmit(new FormData(event.target), $("drawerBody"));

  button.disabled = false;
  button.textContent = "შენახვა";
  if (ok) closeDrawer();
});

/* ---------- article form ---------- */

function openArticleForm(id) {
  const article = state.articles.find(a => a.id === id) || {};
  const isNew   = !id;

  const body = `
    <label class="field">
      <span class="field__label">სათაური *</span>
      <input type="text" name="title" required value="${esc(article.title || "")}" />
    </label>

    ${state.hasAuthor ? `
      <label class="field">
        <span class="field__label">ავტორი</span>
        <input type="text" name="author" value="${esc(article.author || "")}"
               placeholder="სახელი გვარი" />
      </label>` : AUTHOR_MISSING_HINT}

    <div class="field-row">
      <label class="field">
        <span class="field__label">კატეგორია</span>
        <select name="category_id">
          <option value="">— კატეგორიის გარეშე —</option>
          ${state.categories.map(c => `
            <option value="${c.id}" ${c.id === article.category_id ? "selected" : ""}>${esc(c.name)}</option>
          `).join("")}
        </select>
      </label>

      <label class="field">
        <span class="field__label">თარიღი</span>
        <input type="date" name="published_at" value="${dateInputValue(article.published_at)}" />
      </label>
    </div>

    <label class="field">
      <span class="field__label">მოკლე აღწერა (ჩანს ბარათზე)</span>
      <textarea name="excerpt" rows="2">${esc(article.excerpt || "")}</textarea>
    </label>

    <div class="field">
      <span class="field__label">მთავარი სურათი</span>
      ${pickerHTML("image_url", article.image_url)}
    </div>

    <div class="field-row">
      <label class="field">
        <span class="field__label">სურათის ჩვენება</span>
        <select name="image_fit">
          <option value="cover"   ${article.image_fit !== "contain" ? "selected" : ""}>სრულად შევსება</option>
          <option value="contain" ${article.image_fit === "contain" ? "selected" : ""}>მთლიანად ჩატევა</option>
        </select>
      </label>

      <label class="field">
        <span class="field__label">კითხვის დრო</span>
        <input type="text" name="read_time" value="${esc(article.read_time || "3 წთ")}" />
      </label>
    </div>

    <div class="field">
      <span class="field__label">სიახლის ტექსტი</span>
      ${editorHTML(article.content)}
    </div>

    <div class="field" style="display:flex; gap:24px; flex-wrap:wrap;">
      ${switchHTML("გამოქვეყნებული", isNew ? true : article.published, 'name="published"')}
      ${switchHTML("მთავარ გვერდზე", isNew ? true : article.show_on_home, 'name="show_on_home"')}
    </div>`;

  openDrawer(isNew ? "ახალი სიახლე" : "სიახლის რედაქტირება", body, (data, root) => {
    const values = {
      title:        data.get("title").trim(),
      excerpt:      data.get("excerpt").trim(),
      content:      root.querySelector(".editor__area").innerHTML.trim(),
      image_url:    data.get("image_url").trim(),
      image_fit:    data.get("image_fit"),
      category_id:  data.get("category_id") ? Number(data.get("category_id")) : null,
      read_time:    data.get("read_time").trim() || "3 წთ",
      published_at: new Date(data.get("published_at") || Date.now()).toISOString(),
      published:    data.get("published") === "on",
      show_on_home: data.get("show_on_home") === "on"
    };

    // only send the column if the database already has it
    if (state.hasAuthor) values.author = data.get("author").trim();

    if (isNew) {
      // new homepage articles go to the top of "Latest News"
      const lowest = Math.min(0, ...state.articles.map(a => a.home_order));
      values.home_order = lowest - 1;
      return save(() => API.createArticle(values), "სიახლე დაემატა");
    }
    return save(() => API.updateArticle(id, values), "ცვლილებები შენახულია");
  });
}

/* ---------- category form ---------- */

function openCategoryForm(id) {
  const category = state.categories.find(c => c.id === id) || {};
  const isNew = !id;

  const body = `
    <label class="field">
      <span class="field__label">დასახელება *</span>
      <input type="text" name="name" required value="${esc(category.name || "")}"
             placeholder="მაგ. ფეხბურთი" />
    </label>
    <p class="hint">დასახელება ზუსტად უნდა დაემთხვეს მენიუში ჩაწერილ სახელს,
      რომ ბმულმა იმუშაოს (მაგ. მენიუშია „ფეხბურთი“ — აქაც „ფეხბურთი“).</p>`;

  openDrawer(isNew ? "ახალი კატეგორია" : "კატეგორიის რედაქტირება", body, data => {
    const values = { name: data.get("name").trim() };

    if (isNew) {
      values.sort_order = state.categories.length + 1;
      return save(() => API.createCategory(values), "კატეგორია დაემატა");
    }
    return save(() => API.updateCategory(id, values), "ცვლილებები შენახულია");
  });
}

/* ------------------------------------------------------------
   Boot — skip the login screen if the session is still valid.
   ------------------------------------------------------------ */

API.getUser().then(user => { if (user) start(); });
