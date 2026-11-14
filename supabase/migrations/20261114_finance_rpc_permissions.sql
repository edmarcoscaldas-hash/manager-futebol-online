-- MFO: limitar as RPCs financeiras a usuários autenticados.
-- Acesso interno continua permitido às funções SECURITY DEFINER chamadas por triggers.

revoke all on function public.mfo_user_can_manage_club(uuid) from public, anon;
revoke all on function public.set_club_ticket_price(uuid,numeric) from public, anon;
revoke all on function public.get_financial_summary(uuid) from public, anon;
revoke all on function public.start_stadium_upgrade(uuid) from public, anon;
revoke all on function public.register_financial_transaction(text,text,text,numeric) from public, anon;
revoke all on function public.ensure_sponsorship_offers(uuid) from public, anon;
revoke all on function public.accept_sponsorship_offer(uuid) from public, anon;
revoke all on function public.submit_player_offer(uuid,text,numeric,integer) from public, anon;

grant execute on function public.mfo_user_can_manage_club(uuid) to authenticated;
grant execute on function public.set_club_ticket_price(uuid,numeric) to authenticated;
grant execute on function public.get_financial_summary(uuid) to authenticated;
grant execute on function public.start_stadium_upgrade(uuid) to authenticated;
grant execute on function public.register_financial_transaction(text,text,text,numeric) to authenticated;
grant execute on function public.ensure_sponsorship_offers(uuid) to authenticated;
grant execute on function public.accept_sponsorship_offer(uuid) to authenticated;
grant execute on function public.submit_player_offer(uuid,text,numeric,integer) to authenticated;
