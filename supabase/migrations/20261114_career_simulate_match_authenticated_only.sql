REVOKE EXECUTE ON FUNCTION public.simulate_match(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.simulate_match(uuid) TO authenticated;
