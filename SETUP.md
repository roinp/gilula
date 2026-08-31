# GILULA SPORT — setup guide

The website and the admin panel share one free **Supabase** database
(free forever tier: 500 MB database + 1 GB image storage + login system).
No server to run, no monthly cost.

Setup takes about 10 minutes and you only ever do it once.

---

## 1. Create the database

1. Go to **https://supabase.com** → *Start your project* → sign in with GitHub or email.
2. Click **New project**.
   - **Name:** `gilula`
   - **Database password:** pick any password and save it somewhere (you will not need it day to day).
   - **Region:** `Central EU (Frankfurt)` — closest to Georgia.
3. Wait ~2 minutes while the project is created.

## 2. Create the tables

1. In the left menu open **SQL Editor** → **New query**.
2. Open the file `supabase/schema.sql` from this project, copy **everything**, paste it in.
3. Press **Run**.

That creates the three tables (`categories`, `articles`, `slides`), the security
rules, the image storage bucket, and fills them with the content the site
shows today — so nothing looks empty on the first run.

Then repeat the same steps with `supabase/004-videos.sql`. That adds the
`videos` table behind the **ვიდეოები** section of the admin panel and the
“ვიდეო გალერეა” block on the homepage. Until you run it the panel simply says
so and everything else keeps working.

## 3. Create your admin login

1. Left menu → **Authentication** → **Users** → **Add user** → *Create new user*.
2. Enter your email and a password, and switch **Auto Confirm User** on.
3. Click **Create user**.

This is the email and password you will use to sign in to the admin panel.
To give somebody else access, see **Giving someone else access** below — new
users become **authors** and may only touch their own articles.

## 4. Connect the website to the database

1. Left menu → **Project Settings** → **API**.
2. Copy the two values:
   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - the **public key** — newer projects call it *publishable* and it starts with
     `sb_publishable_…`; older ones call it *anon public* and it starts with `eyJ…`.
     Either one works.
3. Open **`js/config.js`** in this project and paste them in:

```js
window.GILULA_CONFIG = {
  SUPABASE_URL: "https://abcdefgh.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOi…"
};
```

That is the only file you ever edit. The website and the admin panel both read it.

> The anon key is meant to be public. The security rules from step 2 let visitors
> **read published content only** — creating, editing and deleting always requires
> the admin login.

## 5. Open it

Because the pages load data over the network, open them through a small local
web server rather than double-clicking the files:

```bash
# from the project folder
npx serve .
```

Then open:

- Website: <http://localhost:3000/index.html>
- Admin panel: <http://localhost:3000/admin/>

When you publish the site (GitHub Pages, Netlify, Vercel, or normal hosting),
just upload the whole folder — everything is plain HTML, CSS and JavaScript.

---

## Giving someone else access

There are two roles:

| | **admin** (you) | **author** |
|---|---|---|
| Add an article | ✅ | ✅ |
| Edit / delete **own** article | ✅ | ✅ |
| Edit / delete **someone else's** article | ✅ | ❌ (read only) |
| Publish own article | ✅ | ✅ — instantly, no approval needed |
| **მთავარი გვერდი** — homepage & slider order | ✅ | ❌ (section is hidden) |
| Add / rename a category | ✅ | ✅ |
| Delete a category | ✅ | ❌ |
| Upload images | ✅ | ✅ |
| Change roles | ✅ (SQL) | ❌ |

### One-time: turn roles on

SQL Editor → New query → paste **`supabase/003-roles.sql`** → **Run**.

Every user that exists at that moment (i.e. you) becomes **admin**.
Every user created afterwards becomes an **author** automatically.
All existing articles are assigned to the oldest account — yours.

> Until you run this file the panel behaves exactly as before: everyone who can
> sign in is a full admin.

### Every new person

1. **Authentication** → **Users** → **Add user** → *Create new user*.
2. Their email + a password, **Auto Confirm User** on → **Create user**.
3. Optional, but nice — write their name, so it is pre-filled in the article
   form (SQL Editor):

```sql
update profiles set full_name = 'სახელი გვარი'
where id = (select id from auth.users where email = 'avtori@example.com');
```

Send them the address `/admin/` plus the email and password. That is all.

### Checking or changing roles

```sql
-- who is who
select p.role, p.full_name, u.email
from profiles p join auth.users u on u.id = p.id
order by p.role, u.email;

-- promote to full admin
update profiles set role = 'admin'
where id = (select id from auth.users where email = 'avtori@example.com');

-- back down to author
update profiles set role = 'author'
where id = (select id from auth.users where email = 'avtori@example.com');
```

To take access away completely: **Authentication** → **Users** → the three dots
next to the person → **Delete user**. Their articles stay on the site; they just
lose their owner (and from then on only an admin can edit them).

The rules live in the database, not in the JavaScript — hiding a button is only
cosmetic, the actual "not your article" refusal comes from Supabase itself.

An author's new article does land in **Latest News** (and therefore in the
slider) like any other, they simply cannot reorder or remove it — that stays
your job in **მთავარი გვერდი**.

---

## Using the admin panel

Sign in at `/admin/` with the email and password from step 3.

| Section | What you can do |
|---|---|
| **დაფა** (Dashboard) | Counters and the most recently added articles |
| **სიახლეები** (Articles) | Add, edit, delete, search and filter articles; publish/unpublish; put an article on the homepage |
| **მთავარი გვერდი** (Homepage) | Choose the order of the “Latest News” articles, or remove one from the homepage |
| **ვიდეოები** (Videos) | Add, edit, delete, reorder and hide the YouTube videos shown on the homepage |
| **კატეგორიები** (Categories) | Add, rename, reorder, delete categories (the top menu is static HTML — see below) |
| **სლაიდერი** (Slider) | Add, edit, delete, reorder and hide slider items |

### Adding an article

1. **სიახლეები** → **+ ახალი სიახლე**
2. Fill in the title, pick a category, write a short description and the full text.
3. For the featured image either press **ფაილის ატვირთვა** to upload a picture,
   or paste an image address into the field next to it.
4. **გამოქვეყნებული** on = visible on the website.
   **მთავარ გვერდზე** on = it also appears in the “Latest News” block.
5. **შენახვა**.

The article shows up instantly in its category page and, if you chose so, on the
homepage. Nothing in the code has to change.

### Adding a video

**ვიდეოები** → **+ ახალი ვიდეო**

1. Type the title.
2. Paste the YouTube link. Any of these work — the panel reads the video out of
   all of them and shows you underneath which one it recognised:

   ```
   https://www.youtube.com/watch?v=VIDEO_ID
   https://youtu.be/VIDEO_ID
   https://www.youtube.com/shorts/VIDEO_ID
   https://www.youtube.com/embed/VIDEO_ID
   <iframe src="https://www.youtube.com/embed/VIDEO_ID" …></iframe>
   ```

   On the website the video is embedded as
   `https://www.youtube-nocookie.com/embed/VIDEO_ID` — the privacy-enhanced
   YouTube domain, which sets no cookie until the visitor presses play. You
   never write iframe code yourself.
3. The **thumbnail** fills itself in with YouTube's own picture. To use your
   own instead, press **ფაილის ატვირთვა** or paste an image address — an
   uploaded picture is never overwritten when you change the link afterwards.
4. **თანმიმდევრობა** is the position in the row; ↑ ↓ in the list change it too.
   The homepage shows **four videos at a time** — the first four of this order.
5. **აქტიური** on = the video is visible on the website. Switch it off to hide
   a video without deleting it.
6. **შენახვა**.

The video appears on the homepage straight away, under “ვიდეო გალერეა”.
Visitors see the picture and the title; pressing the card opens the player.

You can add as many videos as you like: four are visible at a time and the
arrows on either side move the row on by four more (on a phone the row is
swiped instead, and the arrows are hidden). With four videos or fewer the
arrows do not appear at all, and when no video is active the whole section
disappears by itself.

**The „ვიდეო“ menu item shows the same videos**, all of them at once, on
`category.html?name=ვიდეო`. You never tag a video with a category — the page
simply lists the whole videos table, so anything you add here appears there
too. Articles you put in the “ვიდეო” category still show underneath.
If you rename that menu item, change `VIDEO_CATEGORY` at the top of
`js/category.js` to match.

### Adding a category

**კატეგორიები** → **+ ახალი კატეგორია** → type the name → save.

It becomes selectable straight away when writing an article, and its page works
immediately at `category.html?name=<the name>`.

**The top menu is plain HTML**, so it does not change by itself. To put a new
category into the menu, add one line to the `<ul class="nav__list">` block in
**`index.html`**, **`article.html`** and **`category.html`**:

```html
<li><a href="category.html?name=ცურვა" class="nav__link">ცურვა</a></li>
```

The name in the link must match the category name in the admin panel exactly.

### Managing the slider

**სლაიდერი** → **+ ახალი სლაიდი**. Each slide has a small green label, a title,
a sub-line, a text, an image, an optional number badge, and a button link.
Use ↑ ↓ to reorder and the **ჩანს** switch to hide a slide without deleting it.

---

## Project structure

```
index.html            homepage — slider + latest news
article.html          one article
category.html         all articles of one category
style.css             website styles

js/config.js          ← the only file you edit (database address + key)
js/api.js             all database calls, shared by site and admin
js/common.js          shared helpers: mobile menu, news card
js/youtube.js         reads a YouTube link → embed address + picture
js/home.js            homepage
js/videos.js          the "ვიდეო გალერეა" row (4 at a time) + the player window
js/article.js         article page
js/category.js        category page (the "ვიდეო" one also lists every video)
js/analytics.js       GTM / GA4 — the "article_view" event

admin/index.html      admin panel
admin/admin.css       admin styles
admin/admin.js        admin logic

supabase/schema.sql   run once to create the database
supabase/003-roles.sql  run once to turn on admin / author roles
supabase/004-videos.sql run once to create the videos table
images/               the original photos shipped with the site

api/og.js             the picture + title Facebook shows for a shared link
api/canonical.js      sends gilula.vercel.app on to gilula.ge
vercel.json           sends every /article.html request to api/og.js
```

---

## Google Tag Manager / GA4

Google Tag Manager (container `GTM-T66C6SVC`) is already on every page.
The website itself never sends anything to GA4 — it only writes the article
information into `window.dataLayer`, and GTM decides what to do with it.

**`js/analytics.js`** pushes one event, `article_view`, on the article page:

```js
window.dataLayer.push({
  event: "article_view",
  article_id: "87421",
  article_title: "დინამო თბილისმა მნიშვნელოვანი გამარჯვება მოიპოვა",
  article_category: "football",
  article_subcategory: "georgian-football",
  article_author: "Nika Example",
  article_publish_date: "2026-08-24",
  article_type: "news"
});
```

Where the values come from:

| Parameter | Source |
|---|---|
| `article_id` | the article's database id |
| `article_title` | `title` |
| `article_category` | the category name as a latin slug (ფეხბურთი → `football`) |
| `article_subcategory` | only if an article ever gets a `subcategory` field — otherwise the parameter is left out |
| `article_author` | `author` (left out while it is empty) |
| `article_publish_date` | `published_at`, as `YYYY-MM-DD` |
| `article_type` | `video` for the ვიდეო category, otherwise `news` |

**New articles need nothing.** Every article is drawn by `js/article.js`, and
that file reports the article it has just loaded. Whatever you publish from the
admin panel from now on is tracked the moment somebody opens it.

The event fires **once** per article — a rerender or a repeated call does not
add a second entry. If the site is ever rewritten with a router (React,
Next.js, Vue …), `js/analytics.js` also notices the URL change and lets the
next article report itself.

### Checking it works

Open an article, press `F12` → **Console**, and type:

```js
window.dataLayer
```

One `{ event: "article_view", … }` entry with the right article should be
there. GTM's own **Preview** mode shows the same event.

### In GTM

Create a **Custom Event** trigger with the event name `article_view`, a
**Data Layer Variable** for each parameter above, and one **GA4 Event** tag
that sends them. Nothing has to change in the website for that.

---

## Sharing a link on Facebook

Facebook, WhatsApp, Telegram, LinkedIn and the rest do **not** run JavaScript.
They only read the HTML the server sends back — and `article.html` is an empty
shell, the title and the picture arrive afterwards from the database. That is
why a shared article used to appear without a picture.

`api/og.js` fixes it. `vercel.json` sends **every** `/article.html` request to
that function. It looks the article up in Supabase on the server, takes the
ordinary `article.html`, and writes the title and the `og:` tags (title,
description, featured image) into its `<head>` before answering.

Everyone — visitor and crawler alike — gets exactly the same page: the normal
website, with the sharing card already inside it. Earlier the crawler was
recognised by its user-agent and only it was sent to the function; that kept
breaking, because Messenger and the other apps keep changing their name, and
because Vercel's cache could hand one answer to the wrong side — both live at
the very same address.

The untouched `article.html` is published once more under `/_shell/article`;
that is where the function reads it from. Do not remove that line from
`vercel.json`.

Nothing to configure: the function reads the database address and the public key
straight from `js/config.js`, so that file stays the only one you edit. (If you
would rather keep them in Vercel → *Settings* → *Environment Variables* as
`SUPABASE_URL` and `SUPABASE_ANON_KEY`, the function prefers those.)

> **This only works on Vercel.** On GitHub Pages or plain file hosting there is
> no server to run `api/og.js`, so the picture would be missing again.

### After you publish a change

Facebook remembers the first thing it saw about a link, sometimes for weeks. To
force a fresh look:

1. Open <https://developers.facebook.com/tools/debug/>
2. Paste the article address (`https://your-site/article.html?id=15`)
3. Press **Scrape Again** — the picture appears.

You only need this for links Facebook has already seen. Messenger shows the very
same card, out of the very same memory, so a link that was shared before the fix
keeps looking empty in Messenger too until you scrape it again here.

### The picture itself

Facebook wants at least **200 × 200 px**, and shows the big card only from about
**600 × 315 px**. `1200 × 630` is the safest size. A picture smaller than that
still shares, it just gets the small square card. Articles with no featured
image fall back to `logo.jpg`.

**Upload pictures at least 1200 px wide.** Everything else is handled for you —
`api/og.js` asks Supabase for a 1200 px copy — but nothing can enlarge a picture
that was small to begin with, and one under 600 px wide gets the small card.

**WebP.** Facebook and Messenger cannot draw a WebP picture; the card comes up
with an empty box. `api/og.js` gets around it by asking Supabase's
`render/image` address for the same file, which hands it over as a JPEG. It
happens by itself — you can keep uploading WebP.

### Two addresses, one site

The site answers both on `gilula.ge` and on `gilula.vercel.app`. Facebook keeps
a separate memory per address, so an article shared from the Vercel one used to
show `gilula.vercel.app` on the card. `vercel.json` now sends everything that
arrives on `gilula.vercel.app` to `api/canonical.js`, which forwards it to
`gilula.ge` — the part after the question mark included. Preview deployments
have their own names and are untouched.

Cards that were already filed under the Vercel address keep showing it until you
scrape them again (see above).

### The tab icon

`logo.jpg` is the picture in the browser tab, wired up in the `<head>` of every
page. If you replace the file, keep the name.

## Troubleshooting

**The site says “ბაზა ჯერ არ არის დაკავშირებული”** — `js/config.js` still has the
placeholder values. Redo step 4.

**Login fails** — the user was not created, or *Auto Confirm User* was left off.
Redo step 3.

**Image upload fails** — re-run `supabase/schema.sql`; it creates the `media`
storage bucket and its permissions.

**Nothing loads and the browser console shows a CORS error** — you opened the file
directly with `file://`. Use a local server as shown in step 5.

**Vercel deployment fails with `Invalid vercel.json`** — `vercel.json` is checked
against a strict schema that rejects any unknown top-level key. JSON has no
comments, and `$comment` is *not* an allowed key, so notes must live here in
`SETUP.md` and not in `vercel.json`. Only `$schema` and real settings
(`routes`, `headers`, `rewrites`, …) belong in that file.
