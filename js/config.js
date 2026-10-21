/* ============================================================
   ARENA — database connection settings
   ------------------------------------------------------------
   Both values come from your Supabase project:
   Supabase → Project Settings → API

   SUPABASE_URL       "Project URL",  e.g. https://abcdefgh.supabase.co
   SUPABASE_ANON_KEY  the public key — either the new
                      "sb_publishable_…" one or the older "eyJ…" one

   This is the ONLY file you have to edit. The website, the admin
   panel and api/og.js (the Facebook link preview) all read it.

   The key is safe to keep in the code — the database rules
   (see supabase/schema.sql) only let visitors READ published
   content. Writing always requires the admin login.
   ============================================================ */

window.GILULA_CONFIG = {
  SUPABASE_URL: "https://nsyvkietzqurythnxurs.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_Eu2YRP05ghaKV7fqu8hoxA_sBFZf2G3",

  /* Side banners in the empty space left and right of the content.
     Image size: 160 × 600 px (upload it at 320 × 1200 so it stays sharp
     on retina screens). They only show on screens 1180 px wide or more.
     Leave "image" empty to hide a banner. */
  SIDE_ADS: {
    left:  { image: "ads/160x600.png", link: "https://www.facebook.com/profile.php?id=61580060656040" },
    right: { image: "ads/160x600.png", link: "https://www.facebook.com/profile.php?id=61580060656040" }
  },

  /* Banner under the homepage slider, shown on phones and tablets only
     (900 px wide or less). Image size: 320 × 100 px (upload it at
     640 × 200). Leave "image" empty to hide it. */
  MOBILE_AD: { image: "ads/320x100.png", link: "https://www.facebook.com/profile.php?id=61580060656040" }
};
