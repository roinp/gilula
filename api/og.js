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

/* The site's real address. Facebook keeps one card per URL, so a link
   shared as gilula.vercel.app and the same link shared as gilula.ge
   would otherwise become two separate cards with two separate caches.
   og:url points every share at this address instead. Change it here if
   the domain ever changes (or set SITE_URL in Vercel → Settings →
   Environment Variables). */
const SITE_URL = (process.env.SITE_URL || "https://gilula.ge").replace(/\/+$/, "");

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

/** If the article has no cover picture, borrow the first <img> that the
    text itself contains — still much better than the site logo. */
function firstImageIn(html) {
  const match = String(html || "").match(/<img[^>]+src\s*=\s*["']([^"']+)["']/i);
  return match ? match[1] : "";
}

/** The site's own address, as the visitor reached it. */
function originOf(req) {
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const proto = req.headers["x-forwarded-proto"] || "https";
  return `${proto}://${host}`;
}

/* ---------- picture size ----------
   Facebook draws the big card only when it already knows how large the
   picture is. On the very first share it has not downloaded the file
   yet, so without og:image:width / og:image:height the card often comes
   up with no picture at all until the link is shared a second time. So
   we read the size ourselves: width and height sit in the first bytes
   of every JPEG / PNG / GIF / WebP, so 32 KB is more than enough and
   the request stays fast. If anything goes wrong we simply leave the
   tags out — the card still works, it is just slower to appear. */

/** {width, height, type} of a picture, or null if it cannot be read. */
async function imageSize(url) {
  let bytes;
  try {
    const response = await fetch(url, {
      headers: { Range: "bytes=0-32767" },
      signal: AbortSignal.timeout(3000)
    });
    if (!response.ok) return null;
    bytes = Buffer.from(await response.arrayBuffer());
  } catch (error) {
    return null;
  }

  return readPng(bytes) || readGif(bytes) || readWebp(bytes) || readJpeg(bytes);
}

function readPng(b) {
  if (b.length < 24 || b.readUInt32BE(0) !== 0x89504e47) return null;
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20), type: "image/png" };
}

function readGif(b) {
  if (b.length < 10 || b.toString("ascii", 0, 3) !== "GIF") return null;
  return { width: b.readUInt16LE(6), height: b.readUInt16LE(8), type: "image/gif" };
}

function readWebp(b) {
  if (b.length < 30 || b.toString("ascii", 0, 4) !== "RIFF" ||
      b.toString("ascii", 8, 12) !== "WEBP") return null;

  const kind = b.toString("ascii", 12, 16);
  const type = "image/webp";

  // Extended, lossless and lossy WebP each keep the size in a different place.
  if (kind === "VP8X") {
    return {
      width: 1 + (b[24] | (b[25] << 8) | (b[26] << 16)),
      height: 1 + (b[27] | (b[28] << 8) | (b[29] << 16)),
      type
    };
  }
  if (kind === "VP8L") {
    const bits = b.readUInt32LE(21);
    return { width: 1 + (bits & 0x3fff), height: 1 + ((bits >>> 14) & 0x3fff), type };
  }
  if (kind === "VP8 ") {
    return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff, type };
  }
  return null;
}

function readJpeg(b) {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null;

  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) { i++; continue; }                 // step over padding
    const marker = b[i + 1];
    if (marker === 0xff || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
      i += 2;                                             // markers without a body
      continue;
    }
    // SOF0…SOF15 carry the size; DHT (c4), JPG (c8) and DAC (cc) do not.
    if (marker >= 0xc0 && marker <= 0xcf &&
        marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      if (i + 9 >= b.length) return null;
      return { width: b.readUInt16BE(i + 7), height: b.readUInt16BE(i + 5), type: "image/jpeg" };
    }
    i += 2 + b.readUInt16BE(i + 2);
  }
  return null;
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
${meta.imageWidth ? `<meta property="og:image:width" content="${esc(meta.imageWidth)}" />` : ""}
${meta.imageHeight ? `<meta property="og:image:height" content="${esc(meta.imageHeight)}" />` : ""}
${meta.imageType ? `<meta property="og:image:type" content="${esc(meta.imageType)}" />` : ""}
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
  // `origin` is the address the crawler actually used — it is what we read
  // js/config.js from, so preview deployments keep working. The card itself
  // always points at SITE_URL.
  const origin = originOf(req);
  const id = (req.query && req.query.id) || "";
  const url = id ? `${SITE_URL}/article.html?id=${encodeURIComponent(id)}` : SITE_URL + "/";

  const meta = {
    type: "website",
    url,
    title: FALLBACK_TITLE,       // browser tab
    cardTitle: FALLBACK_TITLE,   // the bold line on the Facebook card
    description: FALLBACK_DESC,
    image: `${SITE_URL}/logo.jpg`,
    imageWidth: "",
    imageHeight: "",
    imageType: "",
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
      meta.image =
        absolute(article.image_url, origin) ||
        absolute(firstImageIn(article.content), origin) ||
        meta.image;
      meta.publishedAt = article.published_at || "";
      meta.author = article.author || "";
    }
  } catch (error) {
    // The crawler still gets a valid card with the logo.
    console.error("og:", error.message);
  }

  const size = await imageSize(meta.image);
  if (size && size.width && size.height) {
    meta.imageWidth = String(size.width);
    meta.imageHeight = String(size.height);
    meta.imageType = size.type;
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader(
    "Cache-Control",
    "public, max-age=0, s-maxage=600, stale-while-revalidate=86400"
  );
  res.status(200).send(page(meta));
};
