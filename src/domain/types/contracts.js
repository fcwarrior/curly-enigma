/**
 * @typedef {'stable'|'critical'|'pediatric'|'renal'|'hepatic'|'diabetic'|'neonate'} PatientCondition
 * @typedef {'central'|'peripheral'} AdministrationRoute
 *
 * @typedef {Object} Patient
 * @property {number} id
 * @property {string=} idNumber
 * @property {string} name
 * @property {string=} service
 * @property {string=} dob
 * @property {number=} age
 * @property {number} weight
 * @property {number} height
 * @property {number=} bmi
 * @property {PatientCondition} condition
 *
 * @typedef {Object} Solution
 * @property {string} name
 * @property {'aminoacid'|'glucose'|'lipid'|'electrolyte'|'vitamin'|'oligoelement'|'water'|'insulin'|'heparin'|'glutamine'|'carnitine'} type
 * @property {number=} osmolarityContribution
 *
 * @typedef {Object} Lot
 * @property {string} id
 * @property {string} solutionName
 * @property {string} lotNumber
 * @property {string} expiryDate
 * @property {number=} quantity
 * @property {string=} notes
 */
