-- ============================================================
--  GILULA SPORT — განახლება #3: ავტორები და უფლებები
--  გაუშვი Supabase → SQL Editor → New query → Run
--
--  ორი როლი ჩნდება:
--    admin   — ყველაფერი (როგორც დღემდე)
--    author  — ამატებს სტატიას და არედაქტირებს მხოლოდ თავისას
--
--  ავტორს ასევე შეუძლია:
--    • სხვისი სტატიების ნახვა (მხოლოდ კითხვა)
--    • კატეგორიის დამატება და გადარქმევა (წაშლა — არა)
--    • საკუთარი სტატიის წაშლა
--    • სურათის ატვირთვა
--  ავტორს არ შეუძლია: მთავარი გვერდის/სლაიდერის თანმიმდევრობა,
--  სხვისი სტატიის შეცვლა ან წაშლა, კატეგორიის წაშლა, როლების მართვა.
--
--  ⚠ ეს ფაილი ვარაუდობს, რომ schema.sql უკვე გაშვებულია.
--    ყველა არსებული მომხმარებელი ავტომატურად ხდება admin.
-- ============================================================


-- ------------------------------------------------------------
-- 1. პროფილები — აქ ინახება ვინ რომელი როლისაა
-- ------------------------------------------------------------

create table if not exists profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text        not null default '',
  role       text        not null default 'author' check (role in ('admin', 'author')),
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

-- security definer — ასე ფუნქცია თვითონ არ ებმება profiles-ის RLS-ს
-- (სხვა შემთხვევაში წესი საკუთარ თავს დაუძახებდა და ჩაიკეტებოდა)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

drop policy if exists "profiles read"  on profiles;
drop policy if exists "profiles write" on profiles;

-- თითოეული ხედავს თავის პროფილს, ადმინი — ყველას
create policy "profiles read" on profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

-- როლს მხოლოდ ადმინი ცვლის
create policy "profiles write" on profiles
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());


-- ------------------------------------------------------------
-- 2. ახალ მომხმარებელს პროფილი ავტომატურად ეძლევა (როლი: author)
-- ------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), 'author')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- დღეს არსებული მომხმარებლები (ანუ შენ) — admin
insert into public.profiles (id, full_name, role)
select u.id, coalesce(u.raw_user_meta_data->>'full_name', ''), 'admin'
from auth.users u
on conflict (id) do nothing;


-- ------------------------------------------------------------
-- 3. სტატიას ემატება მფლობელი
-- ------------------------------------------------------------

alter table articles add column if not exists author_id uuid references auth.users(id) on delete set null;

-- ახალი ჩანაწერი ავტომატურად იმას მიეწერება, ვინც დალოგინებულია
alter table articles alter column author_id set default auth.uid();

create index if not exists articles_author_idx on articles (author_id);

-- ძველი სტატიები პირველ (უძველეს) მომხმარებელს — ანუ შენ
update articles
set author_id = (select u.id from auth.users u order by u.created_at limit 1)
where author_id is null;


-- ------------------------------------------------------------
-- 4. სტატიების წესები
-- ------------------------------------------------------------

drop policy if exists "articles read public" on articles;
drop policy if exists "articles read admin"  on articles;
drop policy if exists "articles read auth"   on articles;
drop policy if exists "articles write"       on articles;
drop policy if exists "articles insert"      on articles;
drop policy if exists "articles update"      on articles;
drop policy if exists "articles delete"      on articles;

-- სტუმარი ხედავს მხოლოდ გამოქვეყნებულს
create policy "articles read public" on articles
  for select to anon
  using (published = true);

-- დალოგინებული ხედავს ყველაფერს (ავტორისთვის სხვისი — მხოლოდ საკითხავად)
create policy "articles read auth" on articles
  for select to authenticated
  using (true);

-- დამატება: ავტორი მხოლოდ თავის სახელზე ამატებს
create policy "articles insert" on articles
  for insert to authenticated
  with check (public.is_admin() or author_id = auth.uid());

-- რედაქტირება: მხოლოდ საკუთარი (ან ადმინი — ყველა)
-- with check ასევე კრძალავს სტატიის სხვისთვის „გადაწერას“
create policy "articles update" on articles
  for update to authenticated
  using      (public.is_admin() or author_id = auth.uid())
  with check (public.is_admin() or author_id = auth.uid());

-- წაშლა: მხოლოდ საკუთარი (ან ადმინი — ყველა)
create policy "articles delete" on articles
  for delete to authenticated
  using (public.is_admin() or author_id = auth.uid());


-- ------------------------------------------------------------
-- 5. კატეგორიების წესები — დამატება/რედაქტირება ყველას, წაშლა ადმინს
-- ------------------------------------------------------------

drop policy if exists "categories read"   on categories;
drop policy if exists "categories write"  on categories;
drop policy if exists "categories insert" on categories;
drop policy if exists "categories update" on categories;
drop policy if exists "categories delete" on categories;

create policy "categories read"   on categories for select using (true);
create policy "categories insert" on categories for insert to authenticated with check (true);
create policy "categories update" on categories for update to authenticated using (true) with check (true);
create policy "categories delete" on categories for delete to authenticated using (public.is_admin());


-- ------------------------------------------------------------
-- 6. სურათები — ატვირთვა ყველას, წაშლა ადმინს
-- ------------------------------------------------------------

drop policy if exists "media read"   on storage.objects;
drop policy if exists "media upload" on storage.objects;
drop policy if exists "media update" on storage.objects;
drop policy if exists "media delete" on storage.objects;

-- ატვირთვა ორივე როლს სჭირდება; წაშლა/გადაწერა პანელს არსად აქვს,
-- ამიტომ ის მხოლოდ ადმინს რჩება
create policy "media read"   on storage.objects for select                        using (bucket_id = 'media');
create policy "media upload" on storage.objects for insert to authenticated with check (bucket_id = 'media');
create policy "media update" on storage.objects for update to authenticated using (bucket_id = 'media' and public.is_admin());
create policy "media delete" on storage.objects for delete to authenticated using (bucket_id = 'media' and public.is_admin());


-- ============================================================
--  როლების მართვა — გაუშვი მაშინ, როცა დაგჭირდება
-- ============================================================
--
-- ვინ რა როლისაა:
--   select p.role, p.full_name, u.email
--   from profiles p join auth.users u on u.id = p.id
--   order by p.role, u.email;
--
-- ახალ ავტორს სახელი მიაწერე (გამოჩნდება სტატიის ფორმაში ავტომატურად):
--   update profiles set full_name = 'სახელი გვარი'
--   where id = (select id from auth.users where email = 'avtori@example.com');
--
-- ავტორის ადმინად დაწინაურება:
--   update profiles set role = 'admin'
--   where id = (select id from auth.users where email = 'avtori@example.com');
--
-- უკან ავტორად ჩამოყვანა:
--   update profiles set role = 'author'
--   where id = (select id from auth.users where email = 'avtori@example.com');
