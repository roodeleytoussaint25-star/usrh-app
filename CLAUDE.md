# USRH — Unité Spéciale Rapprochée d'Haïti

Stack : React + Vite + Supabase + Vercel + BluetoothPrint
Client : Lylinca Osna — École sécurité rapprochée, tablette Android
Fiche client : ~/OS_Roodeley/01_Projets/Projet_AppsPME_Haiti/Clients/CLIENT_Lylinca-Osna-USRH.md

## Supabase
URL : https://ofrybimftwriaxhfuljt.supabase.co
Préfixe tables : `usr_`
Compte : nouveau compte Supabase (pas le compte principal)
Migration : supabase_migration_usrh.sql

## Couleurs brand (extraites du logo USRH)
- Bleu royal : #1B2A8A (sidebar, header, boutons secondaires)
- Cramoisi : #A01020 (CTA, boutons primaires, accent)
- Background : #F0F2F5

## Pages
1. Dashboard — CA jour, dettes frais, actions rapides
2. Étudiants — inscription, suivi frais participation + graduation
3. Ventes — articles + panier + historique (liées à un étudiant)
4. Stock — articles + entrées de stock + modification prix
5. Rapports — CA, frais perçus vs dus (admin only)
6. Paramètres — employés CRUD, mot de passe, infos (admin only)

## Tables
- usr_config (key, value)
- usr_employes (nom, mot_de_passe, role, actif)
- usr_etudiants (nom, contact, frais_participation, frais_participation_paye, frais_graduation, frais_graduation_paye, actif)
- usr_paiements (etudiant_id, employe_id, type_frais, montant, note)
- usr_articles (nom, prix, stock, actif)
- usr_ventes (etudiant_id, employe_id, total, mode_paiement, montant_paye, note)
- usr_ventes_lignes (vente_id, article_id, article_nom, quantite, prix_unitaire, total)
- usr_stock_entrees (article_id, quantite, note)

## Auth
Login par nom + mot de passe (pas email)
Admin : nom="Admin" / mdp=usrh2026
Employé : nom="Employe" / mdp=employe123
LocalStorage key : usr_session

## Lancer l'app
npm run dev → http://localhost:5173

## URL Production
https://usrh-app.vercel.app

## Livraison : 24 août 2026
Déployé : 17 août 2026
