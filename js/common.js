/* ============================================================
   GILULA SPORT — helpers shared by every public page
   1. Small utilities
   2. Mobile menu
   3. Navbar categories (loaded from the database)
   4. Footer year
   ============================================================ */

/* ---------- 1. Small utilities ---------- */

/** Escapes text before putting it inside HTML. */
function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[ch]));
}

/** "2025-08-19" → "19 აგვისტო" */
function formatDate(value) {
  const date = new Date(value);
  if (isNaN(date)) return "";
  return new Intl.DateTimeFormat("ka-GE", { day: "numeric", month: "long" }).format(date);
}

/* Green ball placeholder used whenever an image is missing.
   Quotes are percent-encoded so the value is safe inside HTML attributes. */
const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%2024%2024%22%20fill=%22none%22%20stroke=%22%2300e05a%22%20stroke-width=%22.7%22%3E%3Ccircle%20cx=%2212%22%20cy=%2212%22%20r=%2210%22/%3E%3Cpath%20d=%22M12%206.5l4.2%203-1.6%205h-5.2l-1.6-5z%22/%3E%3Cpath%20d=%22M12%202v4.5M2.4%209.2l5%201.3M21.6%209.2l-5%201.3M6%2021l3.4-6.5M18%2021l-3.4-6.5%22/%3E%3C/svg%3E";

function imageOr(url) {
  return url ? esc(url) : PLACEHOLDER;
}

/** Shows a friendly message inside a container instead of an empty page. */
function showNotice(container, text) {
  if (container) container.innerHTML = `<p class="notice">${esc(text)}</p>`;
}

/** True when js/config.js still holds the placeholder values. */
function requireDatabase(container) {
  if (window.API && API.configured) return true;
  showNotice(container, "ბაზა ჯერ არ არის დაკავშირებული — შეავსეთ js/config.js (იხ. SETUP.md).");
  return false;
}

/** One news card — used on the homepage and on category pages. */
function articleCard(article) {
  const category = article.categories ? article.categories.name : "";
  return `
    <a href="article.html?id=${article.id}" class="card">
      <div class="card__thumb">
        <img src="${imageOr(article.image_url)}" alt="${esc(article.title)}"
             class="card__img ${article.image_fit === "contain" ? "card__img--contain" : ""}"
             loading="lazy" onerror="this.src='${PLACEHOLDER}';this.classList.add('card__img--contain')" />
        ${category ? `<span class="card__badge">${esc(category)}</span>` : ""}
      </div>
      <div class="card__body">
        <h3 class="card__title">${esc(article.title)}</h3>
        <p class="card__excerpt">${esc(article.excerpt)}</p>
        <div class="card__meta">
          <span>${formatDate(article.published_at)}</span>
          <span>${esc(article.read_time)} საკითხავი</span>
        </div>
      </div>
    </a>`;
}

/* ---------- 2. Mobile menu ---------- */

const burger = document.getElementById("burger");
const nav    = document.getElementById("nav");

if (burger && nav) {
  burger.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    burger.classList.toggle("is-open", isOpen);
    burger.setAttribute("aria-expanded", isOpen);
  });

  // close the menu after a link is tapped
  nav.addEventListener("click", event => {
    if (event.target.closest(".nav__link")) {
      nav.classList.remove("is-open");
      burger.classList.remove("is-open");
    }
  });
}

/* ---------- 3. Navbar ---------- */
/* The menu itself is written by hand in the HTML of every page.
   This only paints the link of the category you are currently viewing. */

function markActiveNav(categoryName) {
  const current = categoryName || new URLSearchParams(location.search).get("name");
  if (!current) return;

  document.querySelectorAll(".nav__link").forEach(link => {
    const target = new URLSearchParams(link.search).get("name");
    link.classList.toggle("is-active", target === current);
  });
}

markActiveNav();

/* ---------- 4. Footer year ---------- */

const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();
