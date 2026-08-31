/* ============================================================
   GILULA SPORT — YouTube helpers
   ------------------------------------------------------------
   Shared by the website and the admin panel, so both understand
   exactly the same set of links.

   The admin may type any of these — the result is the same:

     https://www.youtube.com/watch?v=VIDEO_ID
     https://youtu.be/VIDEO_ID
     https://www.youtube.com/shorts/VIDEO_ID
     https://www.youtube.com/embed/VIDEO_ID
     https://www.youtube-nocookie.com/embed/VIDEO_ID
     <iframe src="https://www.youtube.com/embed/VIDEO_ID" …>
     VIDEO_ID

   Everything is exposed as  window.YOUTUBE
   ============================================================ */

(function () {

  /* the privacy-enhanced domain — YouTube sets no cookie until the
     visitor actually presses play */
  const EMBED_BASE = "https://www.youtube-nocookie.com/embed/";

  /* a YouTube id is always 11 characters of [A-Za-z0-9_-] */
  const BARE_ID = /^[A-Za-z0-9_-]{11}$/;

  const IN_URL =
    /(?:youtu\.be\/|\/embed\/|\/shorts\/|\/live\/|\/v\/|[?&]v=)([A-Za-z0-9_-]{11})/;

  /** Pulls the video id out of anything the admin may have pasted. */
  function videoId(input) {
    const value = String(input ?? "").trim();
    if (!value) return "";
    if (BARE_ID.test(value)) return value;

    // a whole <iframe …> was pasted — look inside its src
    const iframe = value.match(/src\s*=\s*["']([^"']+)["']/i);
    const found = (iframe ? iframe[1] : value).match(IN_URL);

    return found ? found[1] : "";
  }

  /** The address that goes into the <iframe> on the website. */
  function embedUrl(input) {
    const id = videoId(input);
    return id ? EMBED_BASE + id : "";
  }

  /** YouTube's own picture — used when no thumbnail was uploaded. */
  function thumbnailUrl(input) {
    const id = videoId(input);
    return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : "";
  }

  /** The normal YouTube address — used by the admin panel's "open" link. */
  function watchUrl(input) {
    const id = videoId(input);
    return id ? "https://www.youtube.com/watch?v=" + id : "";
  }

  /** True when the picture is YouTube's automatic one, not an uploaded file. */
  function isAutoThumbnail(url) {
    return /^https:\/\/i\.ytimg\.com\/vi\//.test(String(url ?? "").trim());
  }

  /**
   * One video row → the address to put in the iframe.
   * embed_url is written when the video is saved; youtube_url is the
   * fallback, so a row added straight in the database still works.
   */
  function embedFor(video) {
    return embedUrl(video.embed_url) || embedUrl(video.youtube_url);
  }

  /** One video row → the picture to show on the card. */
  function thumbnailFor(video) {
    return (video.thumbnail_url || "").trim() || thumbnailUrl(embedFor(video));
  }

  window.YOUTUBE = {
    EMBED_BASE,
    videoId,
    embedUrl,
    thumbnailUrl,
    watchUrl,
    isAutoThumbnail,
    embedFor,
    thumbnailFor
  };
})();
