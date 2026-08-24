/* ============================================================
   GILULA SPORT — Open Graph for social networks
   ------------------------------------------------------------
   Facebook, Twitter/X, WhatsApp, Telegram, LinkedIn … do NOT
   run JavaScript. They only read the raw HTML that the server
   sends back. article.html is an empty shell — the title and
   the picture are added later by js/article.js — so a shared
   link had no picture and no title.

   vercel.json sends ONLY those crawlers to this function
   (real visitors keep getting the plain static article.html).
   Here we look the article up in Supabase on the server and
   answer with a small HTML page that carries the og: tags.

   Nothing to configure: the database address and the public
   key are read from js/config.js, exactly like the website.
   ============================================================ */

const FALLBACK_TITLE = "GILULA SPORT";
const FALLBACK_DESC =
  "ქართული და მსოფლიო სპორტის უახლესი სიახლეები: ფეხბურთი, კალათბურთი, რაგბი, MMA და სხვა.";

/* ---------- small helpers ---------- */

/** Escapes text so it is safe inside an HTML attribute. */
function esc(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** HTML → plain text, collapsed and cut to `max` characters. */
function plain(html, max) {
  const text = String(html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

  return text.length > max ? text.slice(0, max - 1).trimEnd() + "…" : text;
}

/** Relative image paths ("images/x.jpg") become full https addresses —
    social networks refuse anything that is not absolute. */
function absolute(url, origin) {
  const value = String(url || "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("//")) return "https:" + value;
  return origin + "/" + value.replace(/^\/+/, "");
}

/** The site's own address, as the visitor reached it. */
function originOf(req) {
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const proto = req.headers["x-forwarded-proto"] || "https";
  return `${proto}://${host}`;
}

/* ---------- database ---------- */

/** Reads SUPABASE_URL / SUPABASE_ANON_KEY out of js/config.js, so that
    file stays the only place you ever edit. */
async function readConfig(origin) {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    return {
      url: process.env.SUPABASE_URL,
      key: process.env.SUPABASE_ANON_KEY
    };
  }

  const response = await fetch(`${origin}/js/config.js`);
  if (!response.ok) throw new Error("js/config.js is not reachable");

  const source = await response.text();
  const url = source.match(/SUPABASE_URL\s*:\s*["']([^"']+)["']/);
  const key = source.match(/SUPABASE_ANON_KEY\s*:\s*["']([^"']+)["']/);
  if (!url || !key) throw new Error("js/config.js could not be read");

  return { url: url[1], key: key[1] };
}

/** One published article, or null. */
async function fetchArticle(id, origin) {
  const { url, key } = await readConfig(origin);

  const query =
    `${url.replace(/\/+$/, "")}/rest/v1/articles` +
    `?id=eq.${encodeURIComponent(id)}` +
    `&published=eq.true` +
    `&select=id,title,excerpt,content,image_url,published_at,author` +
    `&limit=1`;

  const response = await fetch(query, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  });
  if (!response.ok) throw new Error(`Supabase answered ${response.status}`);

  const rows = await response.json();
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

/* ---------- the page the crawler receives ---------- */

function page(meta) {
  return `<!DOCTYPE html>
<html lang="ka">
<head>
<meta charset="UTF-8" />
<title>${esc(meta.title)}</title>
<link rel="canonical" href="${esc(meta.url)}" />
<meta name="description" content="${esc(meta.description)}" />

<meta property="og:type" content="${esc(meta.type)}" />
<meta property="og:site_name" content="GILULA SPORT" />
<meta property="og:locale" content="ka_GE" />
<meta property="og:url" content="${esc(meta.url)}" />
<meta property="og:title" content="${esc(meta.cardTitle)}" />
<meta property="og:description" content="${esc(meta.description)}" />
<meta property="og:image" content="${esc(meta.image)}" />
<meta property="og:image:secure_url" content="${esc(meta.image)}" />
<meta property="og:image:alt" content="${esc(meta.cardTitle)}" />
${meta.publishedAt ? `<meta property="article:published_time" content="${esc(meta.publishedAt)}" />` : ""}
${meta.author ? `<meta property="article:author" content="${esc(meta.author)}" />` : ""}

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(meta.cardTitle)}" />
<meta name="twitter:description" content="${esc(meta.description)}" />
<meta name="twitter:image" content="${esc(meta.image)}" />

<script>location.replace(${JSON.stringify(meta.url)});</script>
</head>
<body>
<h1>${esc(meta.title)}</h1>
<p>${esc(meta.description)}</p>
<p><a href="${esc(meta.url)}">${esc(meta.title)}</a></p>
</body>
</html>`;
}

/* ---------- handler ---------- */

module.exports = async (req, res) => {
  const origin = originOf(req);
  const id = (req.query && req.query.id) || "";
  const url = id ? `${origin}/article.html?id=${encodeURIComponent(id)}` : origin + "/";

  const meta = {
    type: "website",
    url,
    title: FALLBACK_TITLE,       // browser tab
    cardTitle: FALLBACK_TITLE,   // the bold line on the Facebook card
    description: FALLBACK_DESC,
    image: `${origin}/logo.jpg`,
    publishedAt: "",
    author: ""
  };

  try {
    const article = id ? await fetchArticle(id, origin) : null;

    if (article) {
      meta.type = "article";
      meta.title = `${article.title} — GILULA SPORT`;
      // og:site_name already says GILULA SPORT, so the card keeps the plain title
      meta.cardTitle = article.title;
      meta.description =
        plain(article.excerpt, 300) || plain(article.content, 300) || FALLBACK_DESC;
      meta.image = absolute(article.image_url, origin) || meta.image;
      meta.publishedAt = article.published_at || "";
      meta.author = article.author || "";
    }
  } catch (error) {
    // The crawler still gets a valid card with the logo.
    console.error("og:", error.message);
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader(
    "Cache-Control",
    "public, max-age=0, s-maxage=600, stale-while-revalidate=86400"
  );
  res.status(200).send(page(meta));
};
