-- Test helpers for the replayed/ tests, applied after the migrations so no
-- migration can see or collide with them. Same contract as ../_bootstrap.sql.

-- Act as a user for the rest of the transaction, the way PostgREST does: the
-- full claims JSON (which auth.uid(), auth.jwt() and auth.role() read) and the
-- API role. NULL acts as anon.
CREATE FUNCTION public.test_act_as(uid uuid) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claims',
    CASE WHEN uid IS NULL THEN '{"role": "anon"}'
         ELSE json_build_object('sub', uid, 'role', 'authenticated',
                                'email', (SELECT email FROM auth.users WHERE id = uid),
                                'app_metadata', json_build_object('provider', 'email'))::text END, true);
  EXECUTE 'SET LOCAL ROLE ' || CASE WHEN uid IS NULL THEN 'anon' ELSE 'authenticated' END;
END $$;

-- Fail the file with a readable message.
CREATE FUNCTION public.test_assert(ok boolean, msg text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF ok IS NOT TRUE THEN RAISE EXCEPTION 'ASSERTION FAILED: %', msg; END IF;
  RAISE NOTICE 'ok - %', msg;
END $$;
