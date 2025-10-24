-- Newsletter subscription table
CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    email TEXT NOT NULL,
    
    -- Dati utente raccolti al momento dell'iscrizione
    nome TEXT,
    cognome TEXT,
    classe TEXT,
    anno_scolastico TEXT,
    scuola TEXT,
    materie_interesse TEXT[], -- Array di materie di interesse
    
    -- Preferenze newsletter
    frequenza TEXT DEFAULT 'weekly' CHECK (frequenza IN ('daily', 'weekly', 'monthly')),
    tipo_contenuti TEXT[] DEFAULT ARRAY['lezioni', 'esercizi'], -- Tipi di contenuti desiderati
    
    -- Metadata
    subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    unsubscribed_at TIMESTAMP WITH TIME ZONE NULL,
    is_active BOOLEAN DEFAULT true,
    
    -- Tracking
    source TEXT DEFAULT 'profile', -- Da dove si è iscritto (profile, popup, footer, etc.)
    user_agent TEXT,
    ip_address INET,
    
    -- Constraints
    UNIQUE(user_id),
    UNIQUE(email)
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_newsletter_user_id ON newsletter_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_email ON newsletter_subscriptions(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_active ON newsletter_subscriptions(is_active);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribed_at ON newsletter_subscriptions(subscribed_at);

-- RLS (Row Level Security)
ALTER TABLE newsletter_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: gli utenti possono vedere e modificare solo i propri dati
CREATE POLICY "Users can view own newsletter subscription" ON newsletter_subscriptions
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own newsletter subscription" ON newsletter_subscriptions
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own newsletter subscription" ON newsletter_subscriptions
    FOR UPDATE USING (auth.uid()::text = user_id);

-- Policy per admin (opzionale)
CREATE POLICY "Admin can view all newsletter subscriptions" ON newsletter_subscriptions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.email = 'luigi@theoremz.com'
        )
    );

-- Funzione per gestire unsubscribe automatico
CREATE OR REPLACE FUNCTION handle_newsletter_unsubscribe()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_active = false AND OLD.is_active = true THEN
        NEW.unsubscribed_at = CURRENT_TIMESTAMP;
    ELSIF NEW.is_active = true AND OLD.is_active = false THEN
        NEW.unsubscribed_at = NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger per unsubscribe
CREATE TRIGGER newsletter_unsubscribe_trigger
    BEFORE UPDATE ON newsletter_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION handle_newsletter_unsubscribe();

-- Commenti per documentazione
COMMENT ON TABLE newsletter_subscriptions IS 'Gestisce le iscrizioni alla newsletter con dati demografici degli utenti';
COMMENT ON COLUMN newsletter_subscriptions.materie_interesse IS 'Array di materie di interesse: matematica, fisica, chimica, etc.';
COMMENT ON COLUMN newsletter_subscriptions.tipo_contenuti IS 'Tipi di contenuti desiderati: lezioni, esercizi, news, tips';
COMMENT ON COLUMN newsletter_subscriptions.source IS 'Sorgente iscrizione: profile, popup, footer, landing, etc.';