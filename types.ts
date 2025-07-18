export enum UserRole {
  Pharmacist = "Farmacêutico",
  Technician = "Técnico",
  Doctor = "Médico",
  Nutritionist = "Nutricionista"
}

export type View =
  | { name: 'dashboard' }
  | { name: 'patientDetails', doenteId: string }
  | { name: 'newPrescription', doenteId: string, editingPrescriptionId?: string }
  | { name: 'formulary' };

export interface Doente {
  id: string;
  mrn: string;
  name: string;
  dob: string;
  gender: 'Masculino' | 'Feminino';
  weightKg: number;
  heightCm: number;
  unit: string;
  allergies: string[];
  conditions: string[];
  prescriptions: PNPrescription[];
}

// Represents a single calculated component in the formulation
export interface FormulationComponent {
  required: number; // g, mEq, mmol, UI, mg, etc.
  recommended?: number;
  solution: string; // Name of the formulary item used
  volume: number; // in mL
  error?: string | null;
  // Specific properties
  nitrogen?: number; // in g
  fromPhosphorus?: number; // for sodium from phosphate solution
}

// Represents the full calculated formulation
export interface Formulation {
  patient: Doente;
  protocolId: string;
  prescribedVolumeMl: number; // Volume the user wants to prescribe
  calculatedVolumeMl: number; // Sum of all component volumes
  route: 'central' | 'peripheral';
  
  proteins: FormulationComponent;
  glutamine: FormulationComponent;
  glucose: FormulationComponent;
  lipids: FormulationComponent;
  electrolytes: Record<string, FormulationComponent>;
  additives: Record<string, FormulationComponent>;
  water: FormulationComponent;

  osmolarity: number;
  caP_Sum: number; // In (mEq/L + mmol/L)
  warnings: string[];
  errors: string[];
}

// This is the data structure for a saved prescription
export interface PNPrescription {
  id: string;
  preparationNumber: number;
  date: string;
  status: 'Pendente' | 'Verificada' | 'Preparada' | 'Cancelada';
  verifiedBy?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  
  // The full input form state and calculated results are saved
  inputs: PNPrescriptionInput;
  formulation: Formulation;
  preparationMap: string;
}

// This represents the state of the NewPrescription form
export interface PNPrescriptionInput {
  // Total daily needs
  proteinNeeds_g: number;
  glutamineNeeds_g: number;
  lipidNeeds_g: number;
  glucoseNeeds_g: number;
  
  // Total daily electrolyte needs
  sodium_mEq: number;
  potassium_mEq: number;
  magnesium_mEq: number;
  calcium_mEq: number;
  phosphorus_mmol: number;
  
  // Additive needs/volumes
  oligoelements_ml: number;
  waterSolubleVitamins_ml: number;
  fatSolubleVitamins_ml: number;
  carnitine_mg: number;

  // Ratios
  insulin_UI_g_glucose: number;
  heparin_UI_ml_total: number;
  
  // Solution choices
  solutions: {
      aminoAcid: string;
      glutamine: string;
      glucose: string;
      lipid: string;
      sodium: string;
      potassium: string;
      magnesium: string;
      calcium: string;
      phosphorus: string;
  }

  // General
  totalVolumeMl: number;
  administrationRoute: 'central' | 'peripheral';
}


export interface FormularyItem {
    id: string;
    name: string;
    type: 'aminoacid' | 'glutamine' | 'glucose' | 'lipid' | 'electrolyte' | 'vitamin' | 'oligoelement' | 'insulin' | 'heparin' | 'carnitine' | 'water';
    osmolarityContribution: number; // mOsm/L of the solution itself
    // Concentrations are per Liter for liquids, or per mL for some additives
    nitrogen_concentration?: number; // g/L
    protein_concentration?: number; // g/L
    glutamine_concentration?: number; // mg/ml
    glucose_concentration?: number; // g/L
    lipid_concentration?: number; // mg/ml
    sodium_concentration?: number; // mEq/L
    potassium_concentration?: number; // mEq/L
    magnesium_concentration?: number; // mEq/L
    calcium_concentration?: number; // mEq/L
    phosphorus_concentration?: number; // mmol/L
    insulin_concentration?: number; // UI/ml
    heparin_concentration?: number; // UI/ml
    carnitine_concentration?: number; // mg/ml
}

export interface CalculationResult {
    formulation: Formulation;
    isValid: boolean;
}