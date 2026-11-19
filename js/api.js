/* ============================================================
   ARENA — data layer
   ------------------------------------------------------------
   One small wrapper around Supabase, shared by the public
   website and the admin panel, so both always read and write
   exactly the same data.

   Everything is exposed as  window.API
   ============================================================ */

(function () {

  const cfg = window.GILULA_CONFIG || {};

  // has the user filled in js/config.js yet?
  const configured =
    !!cfg.SUPABASE_URL &&
    !!cfg.SUPABASE_ANON_KEY &&
    !cfg.SUPABASE_URL.includes("YOUR-PROJECT") &&
    !cfg.SUPABASE_ANON_KEY.includes("YOUR-");

  // `supabase` is the global created by the CDN script tag
  const sb = configured
    ? supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY)
    : null;

  /* ---------- image delivery ----------
     Pictures in Supabase Storage are never shown at full size straight
     from Supabase — that is what used up the bandwidth. They go through
     Vercel's image optimizer instead (see "images" in vercel.json): it
     downloads the original ONCE, resizes it, turns it into WebP and
     keeps it on Vercel's CDN for a year. If the optimizer ever fails,
     imgFallback() quietly switches the picture back to the original. */

  const STORAGE = configured
    ? cfg.SUPABASE_URL.replace(/\/+$/, "") + "/storage/v1/object/public/"
    : "";
  const LOCAL = /^(localhost$|127\.|\[::1\]$|$)/.test(location.hostname);

  const attr = value => String(value == null ? "" : value).replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[ch]));

  function optimizable(url) {
    return !!STORAGE && !LOCAL && typeof url === "string" &&
      url.startsWith(STORAGE) && !/\.(svg|gif)(\?|$)/i.test(url);
  }

  /** The resized address of a picture. `width` must be listed in vercel.json. */
  function imgUrl(url, width) {
    return optimizable(url)
      ? `/_vercel/image?url=${encodeURIComponent(url)}&w=${width}&q=75`
      : url;
  }

  /** src / srcset / sizes for an <img>, ready to drop into HTML. */
  function imgAttrs(url, widths, sizes) {
    if (!optimizable(url)) return `src="${attr(url)}"`;
    const set = widths.map(w => `${imgUrl(url, w)} ${w}w`).join(", ");
    return `src="${imgUrl(url, widths[widths.length - 1])}" srcset="${set}" ` +
           `sizes="${attr(sizes)}" data-orig="${attr(url)}"`;
  }

  /** For onerror: go back to the original once. True if it did. */
  function imgFallback(el) {
    const original = el.dataset.orig;
    if (!original) return false;
    delete el.dataset.orig;
    el.removeAttribute("srcset");
    el.removeAttribute("sizes");
    el.src = original;
    return true;
  }

  window.imgUrl = imgUrl;
  window.imgAttrs = imgAttrs;
  window.imgFallback = imgFallback;

  /* Photos from a camera or phone are 3–10 MB and far larger than any
     screen shows them. Before upload they are scaled down to 1600 px and
     re-saved (JPEG, or PNG when the picture has transparency). */
  async function shrinkImage(file) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
    try {
      const MAX = 1600;
      const bitmap = await createImageBitmap(file);
      const scale  = Math.min(1, MAX / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width  = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      let type = "image/jpeg";
      if (file.type !== "image/jpeg") {
        const px = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        for (let i = 3; i < px.length; i += 4) {
          if (px[i] < 255) { type = "image/png"; break; }
        }
      }

      const blob = await new Promise(done => canvas.toBlob(done, type, 0.82));
      if (!blob || blob.size >= file.size) return file;

      const base = file.name.replace(/\.[^.]+$/, "") || "image";
      return new File([blob], base + (type === "image/png" ? ".png" : ".jpg"), { type });
    } catch (error) {
      return file;   // anything unusual — upload the file as it is
    }
  }

  /* Every Supabase call answers { data, error }. This unwraps it. */
  async function run(query) {
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data;
  }

  const API = {

    configured,
    sb,

    /* ---------- categories ---------- */

    getCategories() {
      return run(sb.from("categories").select("*").order("sort_order").order("id"));
    },

    createCategory(values) {
      return run(sb.from("categories").insert(values).select().single());
    },

    updateCategory(id, values) {
      return run(sb.from("categories").update(values).eq("id", id).select().single());
    },

    deleteCategory(id) {
      return run(sb.from("categories").delete().eq("id", id));
    },

    /* ---------- articles ---------- */

    /**
     * @param {object}  o
     * @param {number}  o.categoryId  only this category
     * @param {boolean} o.homeOnly    only "Latest News" articles, in their chosen order
     * @param {boolean} o.includeHidden  admin view — also return unpublished articles
     * @param {number}  o.limit
     */
    getArticles(o = {}) {
      let q = sb.from("articles").select("*, categories ( id, name )");

      if (!o.includeHidden) q = q.eq("published", true);
      if (o.categoryId) q = q.eq("category_id", o.categoryId);

      if (o.homeOnly) {
        q = q.eq("show_on_home", true)
             .order("home_order", { ascending: true })
             .order("published_at", { ascending: false });
      } else {
        q = q.order("published_at", { ascending: false }).order("id", { ascending: false });
      }

      if (o.limit) q = q.limit(o.limit);
      return run(q);
    },

    getArticle(id) {
      return run(sb.from("articles").select("*, categories ( id, name )").eq("id", id).single());
    },

    createArticle(values) {
      return run(sb.from("articles").insert(values).select().single());
    },

    updateArticle(id, values) {
      return run(sb.from("articles").update(values).eq("id", id).select().single());
    },

    deleteArticle(id) {
      return run(sb.from("articles").delete().eq("id", id));
    },

    /** True if a column exists. Lets the admin keep working while a
        database update is still pending. */
    async hasColumn(table, column) {
      const { error } = await sb.from(table).select(column).limit(1);
      return !error;
    },

    /* ---------- videos ---------- */

    /**
     * @param {object}  o
     * @param {boolean} o.includeHidden  admin view — also return disabled videos
     * @param {number}  o.limit
     */
    getVideos(o = {}) {
      let q = sb.from("videos").select("*");

      if (!o.includeHidden) q = q.eq("is_active", true);

      q = q.order("sort_order", { ascending: true }).order("id", { ascending: true });

      if (o.limit) q = q.limit(o.limit);
      return run(q);
    },

    createVideo(values) {
      return run(sb.from("videos").insert(values).select().single());
    },

    updateVideo(id, values) {
      return run(sb.from("videos").update(values).eq("id", id).select().single());
    },

    deleteVideo(id) {
      return run(sb.from("videos").delete().eq("id", id));
    },

    /* ---------- image upload ---------- */

    /** Uploads a file to the public "media" bucket and returns its URL. */
    async uploadImage(file) {
      file = await shrinkImage(file);
      const ext  = (file.name.split(".").pop() || "jpg").toLowerCase();
      const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { error } = await sb.storage.from("media").upload(name, file, {
        cacheControl: "31536000",
        upsert: false
      });
      if (error) throw new Error(error.message);

      return sb.storage.from("media").getPublicUrl(name).data.publicUrl;
    },

    /* ---------- admin login ---------- */

    async signIn(email, password) {
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      return data.user;
    },

    signOut() {
      return sb.auth.signOut();
    },

    async getUser() {
      const { data } = await sb.auth.getSession();
      return data.session ? data.session.user : null;
    },

    /* ---------- who is signed in ---------- */

    /**
     * The signed-in user's profile: { id, full_name, role }.
     * role is "admin" (everything) or "author" (own articles only).
     *
     * Returns null when nobody is signed in, or while
     * supabase/003-roles.sql has not been run yet — the admin panel
     * then keeps working exactly as it did before roles existed.
     */
    async getProfile() {
      const user = await API.getUser();
      if (!user) return null;

      const { data, error } = await sb
        .from("profiles")
        .select("id, full_name, role")
        .eq("id", user.id)
        .maybeSingle();

      if (error || !data) return null;
      return data;
    }
  };

  window.API = API;
})();
