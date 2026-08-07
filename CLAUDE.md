# Manno Lavi Agrikol — App de gestion

Stack : React + Vite + Supabase + Vercel
Client : Emmanuel, Les Genres du Nord — Intrants agricoles, 2 succursales (Hinche + Saint-Raphaël)
Fiche client : ~/OS_Roodeley/01_Projets/Projet_AppsPME_Haiti/Prospects/PROSPECT_Emmanuel-LesGenresDuNord.md

## Supabase

- URL : https://tzgssgfbbumvmzkaefnk.supabase.co
- Préfixe tables : `mla_`
- Migration : `supabase_migration_mla.sql`

## Spec

Commerce d'intrants agricoles (semences, engrais, pesticides, herbicides, matériel).
2 succursales : Hinche (principale) + Saint-Raphaël.
Stock unifié — pas de stock séparé par succursale. Les ventes indiquent la succursale d'où elles viennent.
Employé à venir. Auth : admin (Emmanuel) + login employé avec sélection nom + succursale active.

## Pages

1. **Dashboard** — CA jour (total + par succursale), alertes stock bas, 5 dernières ventes
2. **Ventes** — sélecteur succursale en haut, employé actif, sélection produit + quantité, historique jour
3. **Stock** — liste unifiée avec seuil alerte, badge rouge si rupture, catégories, unité (sac/litre/kg/unité)
4. **Fournisseurs** — achats entrants, mise à jour stock
5. **Rapports** (admin only) — CA jour/semaine/mois filtrable par succursale, top produits, marge brute
6. **Finances** (admin only) — Dépenses / Emprunts / Investissements

## Règles

- Mobile Android priorité (Hinche — réseau variable)
- Langue française
- Sélecteur succursale persistant dans session (employé choisit en se connectant)
- Vendeur/employé voit uniquement Ventes + Stock
- Admin voit tout
- Pas d'imprimante thermique pour V1

## Mots de passe

- Admin : `manno2026`
- Employé : `agrikol123`

## LocalStorage key

`mla_session` (pas pap_session)

## État du build

### ✅ Fait
- Discovery complète (2026-07-05, Emmanuel)
- Supabase créé, migration prête
- Base de code copiée depuis papeterie-app + adaptée

### 🔄 En cours
- Refactoring complet pap_ → mla_ + ajout succursale

### ⏳ À faire
- Appliquer migration SQL sur Supabase
- Adapter AuthContext + types + toutes les pages
- Tester login admin + employé
- Déploiement Vercel

## Lancer l'app

```bash
cd /home/user/manno-lavi-agrikol
npm run dev
# → http://localhost:5173
```

## Journal des sessions

### Session 2 — 2026-08-05 (suite)
- Migration appliquée sur Supabase (14 tables, RLS désactivé, passwords + succursales + 6 catégories seedées)
- Couleurs brand : #4DD119 (lime) / #F5C518 (jaune) / #1C2B6E (marine) — appliquées partout
- Onglet Finances supprimé (hors scope V1)
- 4 nouvelles catégories : Produits vétérinaires, Insecticides, Fongicides, Foliaires
- 49 produits importés (liste officielle Emmanuel) + nettoyage 11 placeholders
- Unités ajoutées : lbs, ml, gr
- Autocomplete produits dans Ventes et Achats (ProductSearch.tsx)
- Mode de saisie du coût : unitaire OU achat en gros (lot) avec calcul auto
- Page Paramètres : gestion employés + mots de passe + guide aide
- Build : 0 erreurs TypeScript

### ⏳ À faire (session suivante)
- Design details / polish UI
- Tester login admin + employé en conditions réelles
- Ajouter un employé test dans mla_employes
- Déploiement Vercel
- **DEADLINE livraison : 12 août 2026**

### Session 1 — 2026-08-05
- Projet initialisé depuis papeterie-app
- Supabase URL + key configurés
- Migration SQL mla_ créée (14 tables + seed)
- CLAUDE.md réécrit pour le contexte agrikol
