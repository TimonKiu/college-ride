-- Allow riders to delete their own passenger_requests (History / cancel request)

drop policy if exists "passenger_requests_delete_own" on public.passenger_requests;
create policy "passenger_requests_delete_own"
  on public.passenger_requests for delete
  to authenticated
  using (auth.uid() = rider_id);
