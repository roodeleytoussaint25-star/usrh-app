export type Role = 'admin' | 'employe'

export interface Session {
  role: Role
  employeId?: string
  employeNom?: string
  succursaleId?: string
  succursaleNom?: string
}

export interface Employe {
  id: string
  nom: string
  email?: string
  mot_de_passe?: string
  succursale_id?: string
  succursale?: { id: string; nom: string }
  actif: boolean
  created_at: string
}

export interface Succursale {
  id: string
  nom: string
  ville: string
  actif: boolean
  created_at: string
}

export interface Categorie {
  id: string
  nom: string
}

export interface Produit {
  id: string
  nom: string
  categorie_id: string
  categorie?: { nom: string }
  prix: number
  prix_achat: number
  quantite: number
  seuil_alerte: number
  unite: string
  mode_cout: 'unitaire' | 'gros'
  prix_lot?: number | null
  unites_par_lot?: number | null
  actif: boolean
  created_at: string
}

export interface VenteLigne {
  produit_id: string
  produit?: Produit
  quantite: number
  prix_unitaire: number
  sous_total: number
}

export type VenteStatut = 'completee' | 'annulee' | 'retour' | 'credit'

export interface Vente {
  id: string
  employe_id: string
  employe?: { nom: string }
  succursale_id: string
  succursale?: { nom: string }
  total: number
  statut: VenteStatut
  notes?: string
  nom_client?: string
  telephone_client?: string
  montant_paye: number
  created_at: string
  mla_ventes_lignes?: VenteLigne[]
}

export interface CreditPaiement {
  id: string
  vente_id: string
  montant: number
  date_paiement: string
  notes?: string
  created_at: string
}

export interface Fournisseur {
  id: string
  nom: string
  contact?: string
  telephone?: string
  email?: string
  actif: boolean
  created_at: string
}

export interface Achat {
  id: string
  fournisseur_id: string
  fournisseur?: { nom: string }
  montant_total: number
  notes?: string
  statut_paiement: 'paye' | 'credit'
  date_achat: string
  created_at: string
}

// =============================================
// MODULE FINANCES
// =============================================

export type DepenseCategorie =
  | 'loyer' | 'salaires' | 'transport' | 'electricite' | 'eau' | 'stockage' | 'autres'

export interface Depense {
  id: string
  categorie: DepenseCategorie
  description?: string
  montant: number
  succursale_id?: string
  succursale?: { nom: string }
  date_depense: string
  created_at: string
}

export type EmpruntStatut = 'actif' | 'rembourse'

export interface Emprunt {
  id: string
  source: string
  description?: string
  montant_initial: number
  montant_restant: number
  date_debut: string
  statut: EmpruntStatut
  created_at: string
}

export interface PaiementEmprunt {
  id: string
  emprunt_id: string
  montant: number
  date_paiement: string
  notes?: string
  created_at: string
}

export interface Investissement {
  id: string
  description: string
  montant: number
  date_investissement: string
  notes?: string
  created_at: string
}
