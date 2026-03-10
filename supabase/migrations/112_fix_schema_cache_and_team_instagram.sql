-- 1. Rename twitter_url to instagram_url for semantic clarity
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='team_members' AND column_name='twitter_url') THEN
        ALTER TABLE public.team_members RENAME COLUMN twitter_url TO instagram_url;
    END IF;
END $$;

-- 2. Force Refresh Schema Cache
NOTIFY pgrst, 'reload schema';

-- 3. Re-grant permissions just in case
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;
