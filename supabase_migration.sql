-- =============================================
-- R & J Papeterie — Migration initiale
-- Coller dans : Supabase > SQL Editor > New query
-- =============================================

-- Config (mots de passe)
CREATE TABLE IF NOT EXISTS pap_config (
  id TEXT PRIMARY KEY,
  valeur TEXT NOT NULL
);

-- Vendeurs
CREATE TABLE IF NOT EXISTS pap_vendeurs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  actif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Catégories produits
CREATE TABLE IF NOT EXISTS pap_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL
);

-- Produits
CREATE TABLE IF NOT EXISTS pap_produits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  categorie_id UUID REFERENCES pap_categories(id) ON DELETE SET NULL,
  prix NUMERIC(10,2) NOT NULL DEFAULT 0,
  quantite INTEGER NOT NULL DEFAULT 0,
  seuil_alerte INTEGER NOT NULL DEFAULT 5,
  actif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fournisseurs
CREATE TABLE IF NOT EXISTS pap_fournisseurs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  contact TEXT,
  telephone TEXT,
  email TEXT,
  actif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ventes
CREATE TABLE IF NOT EXISTS pap_ventes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendeur_id UUID REFERENCES pap_vendeurs(id) ON DELETE SET NULL,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lignes de vente
CREATE TABLE IF NOT EXISTS pap_ventes_lignes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vente_id UUID NOT NULL REFERENCES pap_ventes(id) ON DELETE CASCADE,
  produit_id UUID REFERENCES pap_produits(id) ON DELETE SET NULL,
  quantite INTEGER NOT NULL DEFAULT 1,
  prix_unitaire NUMERIC(10,2) NOT NULL DEFAULT 0,
  sous_total NUMERIC(10,2) NOT NULL DEFAULT 0
);

-- Achats fournisseurs
CREATE TABLE IF NOT EXISTS pap_achats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fournisseur_id UUID REFERENCES pap_fournisseurs(id) ON DELETE SET NULL,
  montant_total NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  date_achat DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lignes d'achat
CREATE TABLE IF NOT EXISTS pap_achats_lignes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  achat_id UUID NOT NULL REFERENCES pap_achats(id) ON DELETE CASCADE,
  produit_id UUID REFERENCES pap_produits(id) ON DELETE SET NULL,
  quantite INTEGER NOT NULL DEFAULT 1,
  prix_achat NUMERIC(10,2) NOT NULL DEFAULT 0,
  sous_total NUMERIC(10,2) NOT NULL DEFAULT 0
);

-- =============================================
-- Données initiales
-- =============================================

INSERT INTO pap_config (id, valeur) VALUES
  ('admin_password', 'rj2026'),
  ('vendeur_password', 'vendeur123')
ON CONFLICT (id) DO NOTHING;

INSERT INTO pap_categories (nom) VALUES
  ('Livres scolaires'),
  ('Cahiers'),
  ('Stylos & crayons'),
  ('Fournitures diverses')
ON CONFLICT DO NOTHING;

-- =============================================
-- Désactiver RLS (auth custom via pap_config)
-- =============================================

ALTER TABLE pap_config DISABLE ROW LEVEL SECURITY;
ALTER TABLE pap_vendeurs DISABLE ROW LEVEL SECURITY;
ALTER TABLE pap_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE pap_produits DISABLE ROW LEVEL SECURITY;
ALTER TABLE pap_fournisseurs DISABLE ROW LEVEL SECURITY;
ALTER TABLE pap_ventes DISABLE ROW LEVEL SECURITY;
ALTER TABLE pap_ventes_lignes DISABLE ROW LEVEL SECURITY;
ALTER TABLE pap_achats DISABLE ROW LEVEL SECURITY;
ALTER TABLE pap_achats_lignes DISABLE ROW LEVEL SECURITY;
