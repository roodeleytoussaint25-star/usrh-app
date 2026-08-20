export type Role = 'admin' | 'employe'
export type TypeFrais = 'inscription' | 'formation_v1' | 'formation_v2' | 'graduation'

export interface Session {
  role: Role
  employeId?: number
  employeNom?: string
}

export interface Employe {
  id: number
  nom: string
  mot_de_passe?: string
  role: Role
  actif: boolean
  created_at: string
}

export interface Cours {
  id: number
  nom: string
  horaire?: string
  duree?: string
  professeur?: string
  actif: boolean
  created_at: string
}

export interface Etudiant {
  id: number
  nom: string
  contact?: string
  email?: string
  date_naissance?: string
  sexe?: 'M' | 'F'
  adresse?: string
  contact_urgence?: string
  notes?: string
  frais_inscription: number
  frais_inscription_paye: number
  frais_formation_v1: number
  frais_formation_v1_paye: number
  frais_formation_v2: number
  frais_formation_v2_paye: number
  frais_graduation: number
  frais_graduation_paye: number
  actif: boolean
  created_at: string
}

export interface Article {
  id: number
  nom: string
  prix: number
  prix_achat: number
  type_achat: 'unitaire' | 'gros'
  unites_par_lot: number
  prix_lot: number
  stock: number
  actif: boolean
  created_at: string
}

export interface VenteLigne {
  article_id: number
  article_nom: string
  quantite: number
  prix_unitaire: number
  total: number
}

export interface Vente {
  id: number
  etudiant_id?: number
  etudiant?: { nom: string }
  employe_id?: number
  total: number
  mode_paiement: 'cash' | 'credit'
  montant_paye: number
  note?: string
  created_at: string
  usr_ventes_lignes?: VenteLigne[]
}

export interface Paiement {
  id: number
  etudiant_id: number
  etudiant?: { nom: string }
  employe_id?: number
  type_frais: TypeFrais
  montant: number
  note?: string
  created_at: string
}

export interface StockEntree {
  id: number
  article_id: number
  article?: { nom: string }
  quantite: number
  note?: string
  created_at: string
}
