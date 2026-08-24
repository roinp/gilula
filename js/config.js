/* ============================================================
   GILULA SPORT — database connection settings
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
  SUPABASE_ANON_KEY: "sb_publishable_Eu2YRP05ghaKV7fqu8hoxA_sBFZf2G3"
};
