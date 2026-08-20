-- ============================================================
--  GILULA SPORT — database schema
--  Run this once in Supabase → SQL Editor → New query → Run
-- ============================================================


-- ------------------------------------------------------------
-- 1. TABLES
-- ------------------------------------------------------------

-- categories shown in the navbar (ფეხბურთი, კალათბურთი, ...)
create table if not exists categories (
  id          bigint generated always as identity primary key,
  name        text        not null unique,
  sort_order  int         not null default 0,
  created_at  timestamptz not null default now()
);

-- news articles
create table if not exists articles (
  id            bigint generated always as identity primary key,
  title         text        not null,
  excerpt       text        not null default '',
  content       text        not null default '',   -- HTML from the admin editor
  image_url     text        not null default '',   -- featured image
  image_fit     text        not null default 'cover', -- 'cover' | 'contain'
  category_id   bigint      references categories(id) on delete set null,
  published     boolean     not null default true, -- visible on the website?
  show_on_home  boolean     not null default true, -- part of "Latest News"?
  home_order    int         not null default 0,    -- order inside "Latest News"
  read_time     text        not null default '3 წთ',
  published_at  timestamptz not null default now(),
  created_at    timestamptz not null default now()
);

-- homepage slider items
create table if not exists slides (
  id          bigint generated always as identity primary key,
  badge       text        not null default '',   -- small green pill, e.g. "ფეხბურთი"
  title       text        not null,
  role        text        not null default '',   -- green sub-line
  description text        not null default '',
  image_url   text        not null default '',
  number      text        not null default '',   -- jersey number badge (optional)
  link_url    text        not null default '',   -- where the button points
  visible     boolean     not null default true,
  sort_order  int         not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists articles_category_idx  on articles (category_id);
create index if not exists articles_published_idx on articles (published, published_at desc);
create index if not exists slides_order_idx       on slides (visible, sort_order);


-- ------------------------------------------------------------
-- 2. ROW LEVEL SECURITY
--    Visitors may only read published content.
--    A logged-in admin may do everything.
-- ------------------------------------------------------------

alter table categories enable row level security;
alter table articles   enable row level security;
alter table slides     enable row level security;

-- categories: everyone reads, only admins write
drop policy if exists "categories read"  on categories;
drop policy if exists "categories write" on categories;
create policy "categories read"  on categories for select using (true);
create policy "categories write" on categories for all to authenticated using (true) with check (true);

-- articles: visitors see published ones, admins see all
drop policy if exists "articles read public" on articles;
drop policy if exists "articles read admin"  on articles;
drop policy if exists "articles write"       on articles;
create policy "articles read public" on articles for select to anon          using (published = true);
create policy "articles read admin"  on articles for select to authenticated using (true);
create policy "articles write"       on articles for all    to authenticated using (true) with check (true);

-- slides: visitors see visible ones, admins see all
drop policy if exists "slides read public" on slides;
drop policy if exists "slides read admin"  on slides;
drop policy if exists "slides write"       on slides;
create policy "slides read public" on slides for select to anon          using (visible = true);
create policy "slides read admin"  on slides for select to authenticated using (true);
create policy "slides write"       on slides for all    to authenticated using (true) with check (true);


-- ------------------------------------------------------------
-- 3. IMAGE STORAGE
--    A public bucket called "media" holds every uploaded image.
-- ------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do update set public = true;

drop policy if exists "media read"   on storage.objects;
drop policy if exists "media upload" on storage.objects;
drop policy if exists "media update" on storage.objects;
drop policy if exists "media delete" on storage.objects;
create policy "media read"   on storage.objects for select                        using (bucket_id = 'media');
create policy "media upload" on storage.objects for insert to authenticated with check (bucket_id = 'media');
create policy "media update" on storage.objects for update to authenticated using (bucket_id = 'media');
create policy "media delete" on storage.objects for delete to authenticated using (bucket_id = 'media');


-- ------------------------------------------------------------
-- 4. STARTER CONTENT
--    Exactly what the website shows today, so nothing looks empty.
--    Safe to delete later from the admin panel.
-- ------------------------------------------------------------

insert into categories (name, sort_order) values
  ('ქართული სპორტი', 1),
  ('ფეხბურთი',       2),
  ('კალათბურთი',     3),
  ('რაგბი',          4),
  ('ვიდეო',          5),
  ('MMA',            6),
  ('სხვა',           7)
on conflict (name) do nothing;

insert into slides (badge, title, role, description, image_url, number, sort_order)
select * from (values
  ('ფეხბურთი', 'ხვიჩა კვარაცხელია',  'ეროვნული ნაკრები · ნახევარმცველი', 'ქართული ფეხბურთის დღევანდელი სახე — მოთამაშე, რომელმაც საქართველო ევროპის ჩემპიონატზე გაიყვანა.', 'images/kvaratskhelia.png', '7',  1),
  ('ფეხბურთი', 'გიორგი მამარდაშვილი', 'ეროვნული ნაკრები · მეკარე',        '„ევროპის კედელი“ — მეკარე, რომლის სახელიც ევროპის ტოპ კლუბებთან იხსენიება.',                        'images/mamardashvili.jpg', '1',  2),
  ('ლეგენდა',  'კახა კალაძე',         'ეროვნული ნაკრები · მცველი',        'ორგზის ჩემპიონთა ლიგის მფლობელი და ქართული ფეხბურთის ერთ-ერთი უდიდესი სახელი.',                     'images/kaladze.png',       '4',  3),
  ('ლეგენდა',  'გიორგი კინკლაძე',     'ეროვნული ნაკრები · ნახევარმცველი', 'ტექნიკის ოსტატი, რომელიც ინგლისურ ფეხბურთში დღემდე კულტურულ ფიგურად რჩება.',                        'images/kinkladze.jpg',     '10', 4),
  ('ლეგენდა',  'შოთა არველაძე',       'ეროვნული ნაკრები · თავდამსხმელი',  'ეროვნული ნაკრების ისტორიის ერთ-ერთი საუკეთესო ბომბარდირი და მწვრთნელი.',                            'images/arveladze.png',     '9',  5)
) as v(badge, title, role, description, image_url, number, sort_order)
where not exists (select 1 from slides);

insert into articles (title, excerpt, content, image_url, image_fit, category_id, home_order, read_time, published_at)
select v.title, v.excerpt, '<p>' || v.excerpt || '</p>', v.image_url, v.image_fit,
       (select id from categories c where c.name = v.category),
       v.home_order, v.read_time, v.published_at::timestamptz
from (values
  ('ქართველი მოჭიდავეები ევროპის ჩემპიონატიდან ხუთი მედლით დაბრუნდნენ', 'ნაკრებმა ორი ოქრო, ერთი ვერცხლი და ორი ბრინჯაო მოიპოვა.',        'images/wrestling.jpg',      'cover',   'ქართული სპორტი', 1,  '3 წთ', '2025-08-19'),
  ('ხვიჩა კვარაცხელია სეზონის საუკეთესო მოთამაშის ნომინაციაში მოხვდა',  'ქართველი ნახევარმცველი ევროპის ტოპ ხუთეულშია.',                   'images/kvaratskhelia.png',  'cover',   'ფეხბურთი',       2,  '2 წთ', '2025-08-19'),
  ('საქართველოს ნაკრებმა საკვალიფიკაციო მატჩი დამაჯერებლად მოიგო',      'თბილისში გამართულ შეხვედრას სრული დარბაზი დაესწრო.',              'images/bitadze.jpg',        'cover',   'კალათბურთი',     3,  '4 წთ', '2025-08-18'),
  ('ბორჯღალოსნებმა ევროპის ჩემპიონობა კიდევ ერთხელ მოიპოვეს',           'ფინალურ მატჩში მოწინააღმდეგე მინიმალური სხვაობით დამარცხდა.',     'images/rugby.png',          'contain', 'რაგბი',          4,  '3 წთ', '2025-08-18'),
  ('ქართველი მებრძოლი UFC-ის ოქტაგონში დებიუტს აპირებს',                'ბრძოლა შემოდგომაზე, ლას-ვეგასში გაიმართება.',                     'images/mma.jpg',            'cover',   'MMA',            5,  '2 წთ', '2025-08-17'),
  ('ტოპ 10 გოლი ეროვნული ლიგის შემოდგომის ნაწილიდან',                   'შეარჩიეთ თქვენი ფავორიტი — ვიდეომიმოხილვა.',                      'images/arveladze.png',      'cover',   'ვიდეო',          6,  '5 წთ', '2025-08-17'),
  ('დინამო თბილისმა ევროპული ლიცენზია მიიღო',                           'კლუბი ევროპულ ტურნირში მონაწილეობას შეძლებს.',                    'images/kaladze.png',        'cover',   'ფეხბურთი',       7,  '3 წთ', '2025-08-16'),
  ('ქართველი მოჭადრაკე მსოფლიო თასზე ფინალში გავიდა',                   'ნახევარფინალში მსოფლიოს მე-3 ნომერი დაამარცხა.',                  'images/chess.jpg',          'cover',   'სხვა',           8,  '4 წთ', '2025-08-16'),
  ('ეროვნულმა ნაკრებმა შესარჩევი ეტაპის კალენდარი გაიგო',               'პირველი მატჩი სექტემბერში, მშობლიურ სტადიონზე იმართება.',         'images/mamardashvili.jpg',  'cover',   'ფეხბურთი',       9,  '2 წთ', '2025-08-15'),
  ('თორნიკე შენგელია კარიერის საუკეთესო მაჩვენებელს აუმჯობესებს',       'ბოლო ხუთ მატჩში საშუალოდ 19 ქულას აგროვებს.',                     'images/shengelia.jpg',      'cover',   'კალათბურთი',    10,  '3 წთ', '2025-08-15'),
  ('ჯუდოს ნაკრები ახალი ოლიმპიური ციკლისთვის ემზადება',                 'სასწავლო-საწვრთნელი შეკრება მთაში დაიწყო.',                       'images/judo.png',           'cover',   'ქართული სპორტი',11,  '3 წთ', '2025-08-14'),
  ('თბილისში თანამედროვე ოლიმპიური ცენტრი გაიხსნება',                   'ცენტრი ერთდროულად 12 სპორტის სახეობას მოემსახურება.',             'images/stadium.jpg',        'cover',   'სხვა',          12,  '4 წთ', '2025-08-14')
) as v(title, excerpt, image_url, image_fit, category, home_order, read_time, published_at)
where not exists (select 1 from articles);
