-- =============================================
-- Manno Lavi Agrikol — Migration complète
-- Supabase > SQL Editor > New query
-- =============================================

-- Config (mots de passe)
CREATE TABLE IF NOT EXISTS mla_config (
  id TEXT PRIMARY KEY,
  valeur TEXT NOT NULL
);

-- Succursales
CREATE TABLE IF NOT EXISTS mla_succursales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  ville TEXT NOT NULL,
  actif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Employés
CREATE TABLE IF NOT EXISTS mla_employes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  actif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Catégories produits
CREATE TABLE IF NOT EXISTS mla_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL
);

-- Produits — stock unifié (pas par succursale)
CREATE TABLE IF NOT EXISTS mla_produits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  categorie_id UUID REFERENCES mla_categories(id) ON DELETE SET NULL,
  prix NUMERIC(10,2) NOT NULL DEFAULT 0,
  prix_achat NUMERIC(10,2) NOT NULL DEFAULT 0,
  quantite INTEGER NOT NULL DEFAULT 0,
  seuil_alerte INTEGER NOT NULL DEFAULT 5,
  unite TEXT NOT NULL DEFAULT 'unité',
  actif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- unite : 'unité' | 'sac' | 'litre' | 'kg' | 'boîte' | 'gallon'

-- Fournisseurs
CREATE TABLE IF NOT EXISTS mla_fournisseurs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  contact TEXT,
  telephone TEXT,
  email TEXT,
  actif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ventes — avec succursale et rabais
CREATE TABLE IF NOT EXISTS mla_ventes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employe_id UUID REFERENCES mla_employes(id) ON DELETE SET NULL,
  succursale_id UUID REFERENCES mla_succursales(id) ON DELETE SET NULL,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  rabais_montant NUMERIC(10,2) NOT NULL DEFAULT 0,
  rabais_type TEXT NOT NULL DEFAULT 'montant',
  statut TEXT NOT NULL DEFAULT 'completee',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- rabais_type : 'montant' | 'pourcentage'
-- statut      : 'completee' | 'annulee' | 'retour'

-- Lignes de vente
CREATE TABLE IF NOT EXISTS mla_ventes_lignes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vente_id UUID NOT NULL REFERENCES mla_ventes(id) ON DELETE CASCADE,
  produit_id UUID REFERENCES mla_produits(id) ON DELETE SET NULL,
  quantite INTEGER NOT NULL DEFAULT 1,
  prix_unitaire NUMERIC(10,2) NOT NULL DEFAULT 0,
  sous_total NUMERIC(10,2) NOT NULL DEFAULT 0
);

-- Achats fournisseurs
CREATE TABLE IF NOT EXISTS mla_achats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fournisseur_id UUID REFERENCES mla_fournisseurs(id) ON DELETE SET NULL,
  montant_total NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  date_achat DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lignes d'achat (met à jour le stock unifié)
CREATE TABLE IF NOT EXISTS mla_achats_lignes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  achat_id UUID NOT NULL REFERENCES mla_achats(id) ON DELETE CASCADE,
  produit_id UUID REFERENCES mla_produits(id) ON DELETE SET NULL,
  quantite INTEGER NOT NULL DEFAULT 1,
  prix_achat NUMERIC(10,2) NOT NULL DEFAULT 0,
  sous_total NUMERIC(10,2) NOT NULL DEFAULT 0
);

-- Dépenses
CREATE TABLE IF NOT EXISTS mla_depenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categorie TEXT NOT NULL DEFAULT 'autres',
  description TEXT,
  montant NUMERIC(10,2) NOT NULL DEFAULT 0,
  succursale_id UUID REFERENCES mla_succursales(id) ON DELETE SET NULL,
  date_depense DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- categorie : 'loyer' | 'salaires' | 'transport' | 'electricite' | 'eau' | 'stockage' | 'autres'

-- Emprunts / Dettes
CREATE TABLE IF NOT EXISTS mla_emprunts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  description TEXT,
  montant_initial NUMERIC(10,2) NOT NULL DEFAULT 0,
  montant_restant NUMERIC(10,2) NOT NULL DEFAULT 0,
  date_debut DATE NOT NULL DEFAULT CURRENT_DATE,
  statut TEXT NOT NULL DEFAULT 'actif',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mla_paiements_emprunt (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emprunt_id UUID NOT NULL REFERENCES mla_emprunts(id) ON DELETE CASCADE,
  montant NUMERIC(10,2) NOT NULL DEFAULT 0,
  date_paiement DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Investissements
CREATE TABLE IF NOT EXISTS mla_investissements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT NOT NULL,
  montant NUMERIC(10,2) NOT NULL DEFAULT 0,
  date_investissement DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- Données initiales
-- =============================================

INSERT INTO mla_config (id, valeur) VALUES
  ('admin_password', 'manno2026'),
  ('employe_password', 'agrikol123')
ON CONFLICT (id) DO NOTHING;

INSERT INTO mla_succursales (nom, ville) VALUES
  ('Hinche', 'Hinche'),
  ('Saint-Raphaël', 'Saint-Raphaël')
ON CONFLICT DO NOTHING;

INSERT INTO mla_categories (nom) VALUES
  ('Semences'),
  ('Engrais'),
  ('Pesticides'),
  ('Herbicides'),
  ('Matériel agricole'),
  ('Autres intrants')
ON CONFLICT DO NOTHING;

-- =============================================
-- Désactiver RLS
-- =============================================

ALTER TABLE mla_config              DISABLE ROW LEVEL SECURITY;
ALTER TABLE mla_succursales         DISABLE ROW LEVEL SECURITY;
ALTER TABLE mla_employes            DISABLE ROW LEVEL SECURITY;
ALTER TABLE mla_categories          DISABLE ROW LEVEL SECURITY;
ALTER TABLE mla_produits            DISABLE ROW LEVEL SECURITY;
ALTER TABLE mla_fournisseurs        DISABLE ROW LEVEL SECURITY;
ALTER TABLE mla_ventes              DISABLE ROW LEVEL SECURITY;
ALTER TABLE mla_ventes_lignes       DISABLE ROW LEVEL SECURITY;
ALTER TABLE mla_achats              DISABLE ROW LEVEL SECURITY;
ALTER TABLE mla_achats_lignes       DISABLE ROW LEVEL SECURITY;
ALTER TABLE mla_depenses            DISABLE ROW LEVEL SECURITY;
ALTER TABLE mla_emprunts            DISABLE ROW LEVEL SECURITY;
ALTER TABLE mla_paiements_emprunt   DISABLE ROW LEVEL SECURITY;
ALTER TABLE mla_investissements     DISABLE ROW LEVEL SECURITY;
