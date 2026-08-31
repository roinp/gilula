-- ============================================================
--  GILULA SPORT — განახლება #4: ვიდეოები
--  გაუშვი Supabase → SQL Editor → New query → Run
--
--  ჩნდება ცხრილი `videos` — მთავარი გვერდის ვიდეო სექცია.
--  ვიდეოს ამატებ, არედაქტირებ, ალაგებ და მალავ ადმინ პანელიდან
--  („ვიდეოები“) — კოდში აღარაფრის შეცვლა არ არის საჭირო.
--
--  ვიდეო YouTube-იდან ჩნდება iframe-ით (youtube-nocookie.com),
--  ამიტომ ბაზაში ინახება ორივე: ადმინის ჩაწერილი ბმული
--  (youtube_url) და მისგან აწყობილი ჩასაშენებელი მისამართი
--  (embed_url).
--
--  ⚠ ეს ფაილი ვარაუდობს, რომ schema.sql უკვე გაშვებულია.
--    003-roles.sql სავალდებულო არ არის — თუ გაშვებულია,
--    ვიდეოებს მხოლოდ ადმინი მართავს, თუ არა — ყველა დალოგინებული.
-- ============================================================


-- ------------------------------------------------------------
-- 1. ცხრილი
-- ------------------------------------------------------------

create table if not exists videos (
  id            bigint      generated always as identity primary key,
  title         text        not null default '',
  youtube_url   text        not null default '',   -- რაც ადმინმა ჩაწერა
  embed_url     text        not null default '',   -- https://www.youtube-nocookie.com/embed/ID
  thumbnail_url text        not null default '',   -- ცარიელი = YouTube-ის ავტომატური სურათი
  sort_order    int         not null default 0,    -- თანმიმდევრობა საიტზე
  is_active     boolean     not null default true, -- ჩანს თუ არა საიტზე
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists videos_active_idx on videos (is_active, sort_order);


-- ------------------------------------------------------------
-- 2. updated_at ავტომატურად ახლდება
-- ------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists videos_touch_updated_at on videos;
create trigger videos_touch_updated_at
  before update on videos
  for each row execute function public.touch_updated_at();


-- ------------------------------------------------------------
-- 3. წესები — სტუმარი ხედავს ჩართულებს, ადმინი მართავს ყველაფერს
-- ------------------------------------------------------------

alter table videos enable row level security;

drop policy if exists "videos read public" on videos;
drop policy if exists "videos read auth"   on videos;
drop policy if exists "videos write"       on videos;

-- სტუმარი ხედავს მხოლოდ ჩართულ ვიდეოებს
create policy "videos read public" on videos
  for select to anon
  using (is_active = true);

-- დალოგინებული ხედავს ყველას (ადმინ პანელს გამორთულებიც სჭირდება)
create policy "videos read auth" on videos
  for select to authenticated
  using (true);

-- ჩაწერა: თუ 003-roles.sql გაშვებულია — მხოლოდ ადმინი,
-- თუ არა — ყველა დალოგინებული (როგორც კატეგორიებში schema.sql-ში)
do $$
begin
  if to_regprocedure('public.is_admin()') is not null then
    execute $p$
      create policy "videos write" on videos
        for all to authenticated
        using (public.is_admin())
        with check (public.is_admin())
    $p$;
  else
    execute $p$
      create policy "videos write" on videos
        for all to authenticated
        using (true)
        with check (true)
    $p$;
  end if;
end $$;


-- ------------------------------------------------------------
-- 4. სურათები
-- ------------------------------------------------------------
-- ვიდეოს სურათი იმავე "media" ბაქეთში იტვირთება, რომელსაც
-- სიახლეები იყენებენ — schema.sql-ს უკვე შექმნილი აქვს,
-- აქ დამატებით არაფერია გასაკეთებელი.
--
-- თუ სურათს საერთოდ არ ჩასვამ, საიტი YouTube-ის საკუთარ
-- სურათს აჩვენებს: https://i.ytimg.com/vi/VIDEO_ID/hqdefault.jpg
