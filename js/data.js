/* =========================================================
  VIDEO DATA — only add videos that are verified and appropriately attributed.

   Each item:
     title     name shown on the card
     category  must match one of the names in "categories" below
     ratio     "16/9" (normal) or "9/16" (reel / short)
     preview   SHORT looping clip that plays inside the grid  (path in assets/videos/)
               -> keep it small: 5-10 sec, 720p or less, under ~3 MB (see README for the ffmpeg command)
     youtube   (optional) YouTube video ID for the FULL video, e.g. "abc123XYZ_-"
               -> opens in the popup player. YouTube is free + unlimited, so use it for long videos.
     full      (optional) path to a full mp4 instead of YouTube
     poster    (optional) image shown before the preview loads
     desc      (optional) one line shown in the popup

   If an item has "youtube" but no "preview", the YouTube thumbnail is shown instead.
   ========================================================= */
window.DATA = {

  categories: ["Reels & Shorts", "YouTube", "Long Form Videos", "Talking Head", "Podcast",],

  /* Kept empty: no completed client projects have been confirmed for display. */
  works: [],

  /* Add only verified references. Include creator credit and original source link;
     use a preview only when its use is appropriate and authorized. */
  references: []
};
