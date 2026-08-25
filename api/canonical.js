/* ============================================================
   GILULA SPORT — one address, not two
   ------------------------------------------------------------
   The site answers on its own name and on the Vercel one. That
   is one page living at two addresses, and it shows: Facebook
   keeps a separate memory per address, so an article shared from
   the Vercel one comes up on the card as "gilula.vercel.app".

   Everything that arrives on gilula.vercel.app is therefore sent
   on to gilula.ge — see vercel.json. `req.url` is the path
   together with everything after the question mark, so
   ?id=13 survives the trip untouched.

   Preview deployments have their own names (gilula-abc123…) and
   are left alone, so they keep working as before.
   ============================================================ */

const SITE_URL = (process.env.SITE_URL || "https://gilula.ge").replace(/\/+$/, "");

module.exports = (req, res) => {
  const path = String(req.url || "/");
  const target = SITE_URL + (path.startsWith("/") ? path : "/" + path);

  // 308 keeps the method and tells Facebook the move is permanent, so it
  // files the card under the new address instead of the old one.
  res.writeHead(308, {
    Location: target,
    "Cache-Control": "public, max-age=0, s-maxage=86400"
  });
  res.end();
};
