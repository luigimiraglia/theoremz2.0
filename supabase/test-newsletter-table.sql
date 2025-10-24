-- Test query per verificare che la tabella sia stata creata correttamente

-- 1. Verifica struttura tabella
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'newsletter_subscriptions' 
ORDER BY ordinal_position;

-- 2. Verifica indici
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'newsletter_subscriptions';

-- 3. Verifica policies RLS
SELECT policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'newsletter_subscriptions';

-- 4. Test inserimento di prova (rimuovi dopo il test)
-- INSERT INTO newsletter_subscriptions (user_id, email, nome) 
-- VALUES ('test_user', 'test@example.com', 'Test User');

-- 5. Verifica che sia vuota
SELECT COUNT(*) as total_subscriptions FROM newsletter_subscriptions;