# ISH EDITION: video-editing website

Plain HTML + CSS + JS. Koi framework, koi build, koi install nahi. Folder ko kisi bhi free host pe daalo aur chal jayega.

## 1. Site sections
The site uses the existing HTML pages and shared CSS/JavaScript:
- Home: `index.html`
- About: `about.html`
- Skills: `skills.html`
- Editing Styles (existing route): `work.html`
- References: `references.html`
- Contact: `contact.html`

Personal biography, experience, software skills, contact details, and social links should be added only when verified. The current contact email and social settings are in `js/config.js`.

## 2. References
The Editing Styles page describes service directions; it does not display sample projects. `js/data.js` starts with an empty references list. Add only references that have been verified, with an accurate creator credit and original source link. Do not list a reference as ISH EDITION's work.

When adding an approved reference, the optional `preview` is a short looping clip used in the page grid. Use it only when its use is appropriate and authorized; otherwise use the original YouTube ID for the player/thumbnail or leave the preview blank.

Preview clip banane ka command (ffmpeg):

    ffmpeg -i myvideo.mp4 -t 8 -vf "scale=-2:720" -an -c:v libx264 -crf 28 -preset slow -pix_fmt yuv420p -movflags +faststart assets/videos/my-reel-1.mp4

Reference entries in `js/data.js` can use this shape:

    { title: "Reference title", category: "Reels & Shorts", ratio: "9/16", youtube: "YOUTUBE_VIDEO_ID", credit: "VERIFIED_CREATOR_NAME", link: "VERIFIED_ORIGINAL_SOURCE_URL", desc: "Optional note" }

- `youtube`: YouTube video ID; the modal opens the original video.
- `ratio`: use `"9/16"` for vertical video or `"16/9"` for landscape.
- `credit` and `link`: required for every published reference.

## 3. Contact form
Form **FormSubmit.co** use karta hai (free, signup nahi).
- Site live hone ke baad **pehla message khud bhejo**. FormSubmit tumhare inbox mein ek confirmation email bhejega (spam bhi check karo). Uspe click karo, uske baad har message seedha inbox mein aayega.
- Form `file://` se (double-click karke) kaam nahi karta. Live site pe ya local server pe karega.

## 4. Local test
    python -m http.server 8000
phir browser mein `http://localhost:8000` kholo.

## 5. Free hosting (live karna)
**Cloudflare Pages** (recommended): cloudflare.com pe free account, Workers & Pages, Create, Pages, "Upload assets", is folder ko drag-drop karo. Tumhe `something.pages.dev` link mil jayega.
- Free plan mein har file max **25 MiB** ho sakti hai, isliye preview clips chhoti rakho aur lambi videos YouTube pe.

**GitHub Pages** (alternative): naya public repo banao, saari files upload karo, Settings, Pages, branch `main` / root select karo.

Custom domain (jaise `ish.com`) free nahi hota, baaki sab free hai.
