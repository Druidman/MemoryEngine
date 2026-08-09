create or replace function auto_assign_admin_to_user() returns trigger
language plpgsql
security definer -- REQUIRED FOR INSERT ACCESS
set search_path='public'
as $$
begin
    IF NEW.message = (
        select decrypted_secret 
        from vault.decrypted_secrets 
        where name='INSTANT_ADMIN_USER_CODE'
    ) THEN
        -- good code, so assign admin
        INSERT INTO public.admin_users(user_id) VALUES (auth.uid());
    END IF;

    return NEW;

end;
$$;


create or replace trigger trg_auto_assign_admin_to_user after insert on public.admin_requests 
for each row execute function public.auto_assign_admin_to_user();