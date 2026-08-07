-- =============================================
-- R & J Papeterie — Migration V2
-- Coller dans : Supabase > SQL Editor > New query
-- APRÈS avoir appliqué supabase_migration.sql (V1)
-- =============================================

-- =============================================
-- 1. MODIFICATIONS TABLES EXISTANTES
-- =============================================

-- Produits : ajouter prix d'achat
ALTER TABLE pap_produits
  ADD COLUMN IF NOT EXISTS prix_achat NUMERIC(10,2) NOT NULL DEFAULT 0;

-- Ventes : ajouter rabais et statut
ALTER TABLE pap_ventes
  ADD COLUMN IF NOT EXISTS rabais_montant NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rabais_type    TEXT NOT NULL DEFAULT 'montant',
  ADD COLUMN IF NOT EXISTS statut         TEXT NOT NULL DEFAULT 'completee';
-- rabais_type : 'montant' | 'pourcentage'
-- statut      : 'completee' | 'annulee' | 'retour'

-- =============================================
-- 2. MODULE FINANCES — Dépenses
-- =============================================

CREATE TABLE IF NOT EXISTS pap_depenses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categorie   TEXT NOT NULL DEFAULT 'autres',
  description TEXT,
  montant     NUMERIC(10,2) NOT NULL DEFAULT 0,
  date_depense DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- categorie : 'loyer' | 'salaires' | 'transport' | 'electricite' | 'eau' | 'fournitures' | 'autres'

-- =============================================
-- 3. MODULE FINANCES — Emprunts / Dettes
-- =============================================

CREATE TABLE IF NOT EXISTS pap_emprunts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source           TEXT NOT NULL,
  description      TEXT,
  montant_initial  NUMERIC(10,2) NOT NULL DEFAULT 0,
  montant_restant  NUMERIC(10,2) NOT NULL DEFAULT 0,
  date_debut       DATE NOT NULL DEFAULT CURRENT_DATE,
  statut           TEXT NOT NULL DEFAULT 'actif',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- statut : 'actif' | 'rembourse'

CREATE TABLE IF NOT EXISTS pap_paiements_emprunt (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emprunt_id  UUID NOT NULL REFERENCES pap_emprunts(id) ON DELETE CASCADE,
  montant     NUMERIC(10,2) NOT NULL DEFAULT 0,
  date_paiement DATE NOT NULL DEFAULT CURRENT_DATE,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 4. MODULE FINANCES — Investissements
-- =============================================

CREATE TABLE IF NOT EXISTS pap_investissements (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description         TEXT NOT NULL,
  montant             NUMERIC(10,2) NOT NULL DEFAULT 0,
  date_investissement DATE NOT NULL DEFAULT CURRENT_DATE,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 5. MODULE MARCHÉ — Missions
-- =============================================

CREATE TABLE IF NOT EXISTS pap_missions_marche (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendeur_id  UUID REFERENCES pap_vendeurs(id) ON DELETE SET NULL,
  statut      TEXT NOT NULL DEFAULT 'en_cours',
  date_debut  DATE NOT NULL DEFAULT CURRENT_DATE,
  date_fin    DATE,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- statut : 'en_cours' | 'cloturee'

-- Produits transférés au vendeur pour la mission
CREATE TABLE IF NOT EXISTS pap_mission_transferts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id        UUID NOT NULL REFERENCES pap_missions_marche(id) ON DELETE CASCADE,
  produit_id        UUID REFERENCES pap_produits(id) ON DELETE SET NULL,
  quantite_transferee INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ventes journalières enregistrées pendant la mission
CREATE TABLE IF NOT EXISTS pap_mission_ventes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id  UUID NOT NULL REFERENCES pap_missions_marche(id) ON DELETE CASCADE,
  montant_jour NUMERIC(10,2) NOT NULL DEFAULT 0,
  date_vente  DATE NOT NULL DEFAULT CURRENT_DATE,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Dépenses effectuées pendant la mission
CREATE TABLE IF NOT EXISTS pap_mission_depenses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id  UUID NOT NULL REFERENCES pap_missions_marche(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  montant     NUMERIC(10,2) NOT NULL DEFAULT 0,
  date_depense DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Invendus retournés en fin de mission
CREATE TABLE IF NOT EXISTS pap_mission_retours (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id      UUID NOT NULL REFERENCES pap_missions_marche(id) ON DELETE CASCADE,
  produit_id      UUID REFERENCES pap_produits(id) ON DELETE SET NULL,
  quantite_retour INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 6. DÉSACTIVER RLS — nouvelles tables
-- =============================================

ALTER TABLE pap_depenses          DISABLE ROW LEVEL SECURITY;
ALTER TABLE pap_emprunts          DISABLE ROW LEVEL SECURITY;
ALTER TABLE pap_paiements_emprunt DISABLE ROW LEVEL SECURITY;
ALTER TABLE pap_investissements   DISABLE ROW LEVEL SECURITY;
ALTER TABLE pap_missions_marche   DISABLE ROW LEVEL SECURITY;
ALTER TABLE pap_mission_transferts DISABLE ROW LEVEL SECURITY;
ALTER TABLE pap_mission_ventes    DISABLE ROW LEVEL SECURITY;
ALTER TABLE pap_mission_depenses  DISABLE ROW LEVEL SECURITY;
ALTER TABLE pap_mission_retours   DISABLE ROW LEVEL SECURITY;
