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

## 3. Create your admin login

1. Left menu → **Authentication** → **Users** → **Add user** → *Create new user*.
2. Enter your email and a password, and switch **Auto Confirm User** on.
3. Click **Create user**.

This is the email and password you will use to sign in to the admin panel.
Repeat the step any time you want to give someone else access.

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

## Using the admin panel

Sign in at `/admin/` with the email and password from step 3.

| Section | What you can do |
|---|---|
| **დაფა** (Dashboard) | Counters and the most recently added articles |
| **სიახლეები** (Articles) | Add, edit, delete, search and filter articles; publish/unpublish; put an article on the homepage |
| **მთავარი გვერდი** (Homepage) | Choose the order of the “Latest News” articles, or remove one from the homepage |
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
js/home.js            homepage
js/article.js         article page
js/category.js        category page

admin/index.html      admin panel
admin/admin.css       admin styles
admin/admin.js        admin logic

supabase/schema.sql   run once to create the database
images/               the original photos shipped with the site
```

## Troubleshooting

**The site says “ბაზა ჯერ არ არის დაკავშირებული”** — `js/config.js` still has the
placeholder values. Redo step 4.

**Login fails** — the user was not created, or *Auto Confirm User* was left off.
Redo step 3.

**Image upload fails** — re-run `supabase/schema.sql`; it creates the `media`
storage bucket and its permissions.

**Nothing loads and the browser console shows a CORS error** — you opened the file
directly with `file://`. Use a local server as shown in step 5.
