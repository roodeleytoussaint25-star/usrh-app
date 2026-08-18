-- ============================================================
-- USRH — Unité Spéciale Rapprochée d'Haïti
-- Migration v1 — 2026-08-17
-- Préfixe : usr_
-- ============================================================

-- Config app
CREATE TABLE IF NOT EXISTS usr_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Employés / utilisateurs
CREATE TABLE IF NOT EXISTS usr_employes (
  id SERIAL PRIMARY KEY,
  nom TEXT NOT NULL,
  mot_de_passe TEXT NOT NULL,
  role TEXT DEFAULT 'employe',
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Étudiants
CREATE TABLE IF NOT EXISTS usr_etudiants (
  id SERIAL PRIMARY KEY,
  nom TEXT NOT NULL,
  contact TEXT,
  frais_participation NUMERIC DEFAULT 0,
  frais_participation_paye NUMERIC DEFAULT 0,
  frais_graduation NUMERIC DEFAULT 0,
  frais_graduation_paye NUMERIC DEFAULT 0,
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Paiements frais étudiants
CREATE TABLE IF NOT EXISTS usr_paiements (
  id SERIAL PRIMARY KEY,
  etudiant_id INTEGER REFERENCES usr_etudiants(id),
  employe_id INTEGER,
  type_frais TEXT NOT NULL,
  montant NUMERIC NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Articles vendus (maillot, badge, col séminaire, documents)
CREATE TABLE IF NOT EXISTS usr_articles (
  id SERIAL PRIMARY KEY,
  nom TEXT NOT NULL,
  prix NUMERIC DEFAULT 0,
  stock INTEGER DEFAULT 0,
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Ventes d'articles
CREATE TABLE IF NOT EXISTS usr_ventes (
  id SERIAL PRIMARY KEY,
  etudiant_id INTEGER REFERENCES usr_etudiants(id),
  employe_id INTEGER,
  total NUMERIC DEFAULT 0,
  mode_paiement TEXT DEFAULT 'cash',
  montant_paye NUMERIC DEFAULT 0,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Lignes de vente
CREATE TABLE IF NOT EXISTS usr_ventes_lignes (
  id SERIAL PRIMARY KEY,
  vente_id INTEGER REFERENCES usr_ventes(id) ON DELETE CASCADE,
  article_id INTEGER REFERENCES usr_articles(id),
  article_nom TEXT NOT NULL,
  quantite INTEGER NOT NULL,
  prix_unitaire NUMERIC NOT NULL,
  total NUMERIC NOT NULL
);

-- Entrées de stock
CREATE TABLE IF NOT EXISTS usr_stock_entrees (
  id SERIAL PRIMARY KEY,
  article_id INTEGER REFERENCES usr_articles(id),
  quantite INTEGER NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- SEED
-- ============================================================

INSERT INTO usr_config (key, value) VALUES
  ('nom_business', 'USRH'),
  ('admin_password', 'usrh2026'),
  ('app_active', 'true')
ON CONFLICT (key) DO NOTHING;

INSERT INTO usr_employes (nom, mot_de_passe, role) VALUES
  ('Admin', 'usrh2026', 'admin'),
  ('Employe', 'employe123', 'employe')
ON CONFLICT DO NOTHING;

INSERT INTO usr_articles (nom, prix, stock) VALUES
  ('Maillot', 0, 0),
  ('Badge', 0, 0),
  ('Col séminaire', 0, 0),
  ('Documents', 0, 0)
ON CONFLICT DO NOTHING;

-- RLS désactivé pour toutes les tables
ALTER TABLE usr_config DISABLE ROW LEVEL SECURITY;
ALTER TABLE usr_employes DISABLE ROW LEVEL SECURITY;
ALTER TABLE usr_etudiants DISABLE ROW LEVEL SECURITY;
ALTER TABLE usr_paiements DISABLE ROW LEVEL SECURITY;
ALTER TABLE usr_articles DISABLE ROW LEVEL SECURITY;
ALTER TABLE usr_ventes DISABLE ROW LEVEL SECURITY;
ALTER TABLE usr_ventes_lignes DISABLE ROW LEVEL SECURITY;
ALTER TABLE usr_stock_entrees DISABLE ROW LEVEL SECURITY;
