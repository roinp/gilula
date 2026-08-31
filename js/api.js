/* ============================================================
   GILULA SPORT — data layer
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
