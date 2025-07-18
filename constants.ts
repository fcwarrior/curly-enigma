import { Doente, FormularyItem } from './types';

// Based on the `initSolutions` function in the provided script.js
export const formulary: FormularyItem[] = [
    { id: 'AMINOVEN 10%', name: 'AMINOVEN 10%', type: 'aminoacid', nitrogen_concentration: 16, protein_concentration: 100, osmolarityContribution: 900 },
    { id: 'VAMINOLACT', name: 'VAMINOLACT', type: 'aminoacid', nitrogen_concentration: 7.6, protein_concentration: 47.5, osmolarityContribution: 800 },
    { id: 'DIPEPTIVEN 200mg/ml', name: 'DIPEPTIVEN 200mg/ml', type: 'glutamine', glutamine_concentration: 200, nitrogen_concentration: 32.6, osmolarityContribution: 900 },
    { id: 'GLUCOSE 50%', name: 'GLUCOSE 50%', type: 'glucose', glucose_concentration: 500, osmolarityContribution: 2775 },
    { id: 'SMOFLIPID 200mg/ml', name: 'SMOFLIPID 200mg/ml', type: 'lipid', lipid_concentration: 200, osmolarityContribution: 320 },
    { id: 'CLORETO SÓDIO 20%', name: 'CLORETO SÓDIO 20%', type: 'electrolyte', sodium_concentration: 3400, osmolarityContribution: 6840 },
    { id: 'CLORETO POTÁSSIO 7,5%', name: 'CLORETO POTÁSSIO 7,5%', type: 'electrolyte', potassium_concentration: 1000, osmolarityContribution: 2000 },
    { id: 'SULFATO MAGNÉSIO 20%', name: 'SULFATO MAGNÉSIO 20%', type: 'electrolyte', magnesium_concentration: 1600, osmolarityContribution: 1600 },
    { id: 'GLUCONATO CÁLCIO 10%', name: 'GLUCONATO CÁLCIO 10%', type: 'electrolyte', calcium_concentration: 465, osmolarityContribution: 680 },
    { id: 'GLICEROFOSFATO SÓDIO', name: 'GLICEROFOSFATO SÓDIO', type: 'electrolyte', phosphorus_concentration: 1000, sodium_concentration: 2000, osmolarityContribution: 4000 },
    { id: 'INSULINA ACTRAPID 100UI/ml', name: 'INSULINA ACTRAPID 100UI/ml', type: 'insulin', insulin_concentration: 100, osmolarityContribution: 10 },
    { id: 'HEPARINA (5000UI/ml)', name: 'HEPARINA (5000UI/ml)', type: 'heparin', heparin_concentration: 5000, osmolarityContribution: 5 },
    { id: 'CARNITINA (1g/5ml)', name: 'CARNITINA (1g/5ml)', type: 'carnitine', carnitine_concentration: 200, osmolarityContribution: 1240 },
    { id: 'ADDAVEN', name: 'ADDAVEN', type: 'oligoelement', osmolarityContribution: 2900 },
    { id: 'TRACUTIL', name: 'TRACUTIL', type: 'oligoelement', osmolarityContribution: 500 },
    { id: 'PEDITRACE', name: 'PEDITRACE', type: 'oligoelement', osmolarityContribution: 3000 },
    { id: 'SOLUVIT N', name: 'SOLUVIT N', type: 'vitamin', osmolarityContribution: 500 },
    { id: 'VITALIPID ADULTO', name: 'VITALIPID ADULTO', type: 'vitamin', osmolarityContribution: 20 },
    { id: 'VITALIPID INFANTIL', name: 'VITALIPID INFANTIL', type: 'vitamin', osmolarityContribution: 15 },
    { id: 'ÁGUA DESTILADA', name: 'ÁGUA DESTILADA', type: 'water', osmolarityContribution: 0 }
];

export const initialDoentes: Doente[] = [
  {
    id: '1',
    mrn: 'MRN001',
    name: 'João Silva',
    dob: '1985-05-15',
    gender: 'Masculino',
    weightKg: 75,
    heightCm: 180,
    unit: 'UTI Adultos',
    allergies: ['Penicilina'],
    conditions: ['Insuficiência Renal'],
    prescriptions: []
  },
  {
    id: '2',
    mrn: 'MRN002',
    name: 'Maria Santos',
    dob: '2023-10-01',
    gender: 'Feminino',
    weightKg: 4.5,
    heightCm: 55,
    unit: 'Neonatologia',
    allergies: [],
    conditions: ['Prematuridade', 'Colestase'],
    prescriptions: []
  },
  {
    id: '3',
    mrn: 'MRN003',
    name: 'Carlos Pereira',
    dob: '1960-02-20',
    gender: 'Masculino',
    weightKg: 68,
    heightCm: 172,
    unit: 'Medicina Interna',
    allergies: [],
    conditions: ['Fístula Gastrointestinal'],
    prescriptions: []
  }
];

// Clinical constants based on the provided script
export const MAX_PERIPHERAL_OSMOLARITY = 900;
export const CA_P_SUM_WARNING = 30; // mEq/L + mmol/L
export const CA_P_SUM_CRITICAL = 45; // mEq/L + mmol/L