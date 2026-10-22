drop policy if exists "Users can update their own profiles" on public.user_profiles;
create policy "Users can update their own profiles"
  on public.user_profiles for update to authenticated
  using (
    user_id = (select auth.uid())
    and email = (select auth.jwt() ->> 'email')
  )
  with check (
    user_id = (select auth.uid())
    and email = (select auth.jwt() ->> 'email')
    and role in ('manufacturer', 'retailer')
  );
