import { CatalogMedicineOption } from '../types/pharmacy';

export const INITIAL_TAMIL_NADU_CENTER = {
  lat: 13.0827,
  lng: 80.2707,
  name: 'Chennai Central, Tamil Nadu',
  district: 'Chennai',
  isLive: false,
};

export const INITIAL_CHENNAI_CENTER = INITIAL_TAMIL_NADU_CENTER;

export const MASTER_MEDICINE_CATALOG: CatalogMedicineOption[] = [
  { name: 'Paracetamol', genericName: 'Acetaminophen', category: 'Pain Relief & Fever', strength: '650mg', dosageForm: 'Tablet', defaultDosage: '650mg tablet', prescriptionRequired: false, defaultPrice: 'â‚¹34' },
  { name: 'Amoxicillin', genericName: 'Amoxicillin Trihydrate', category: 'Antibiotics', strength: '500mg', dosageForm: 'Capsule', defaultDosage: '500mg capsule', prescriptionRequired: true, defaultPrice: 'â‚¹88' },
  { name: 'Cetirizine', genericName: 'Cetirizine Hydrochloride', category: 'Allergy & Cold', strength: '10mg', dosageForm: 'Tablet', defaultDosage: '10mg tablet', prescriptionRequired: false, defaultPrice: 'â‚¹22' },
  { name: 'Pantoprazole', genericName: 'Pantoprazole Sodium', category: 'Antacid & Digestion', strength: '40mg', dosageForm: 'Tablet', defaultDosage: '40mg tablet', prescriptionRequired: false, defaultPrice: 'â‚¹75' },
  { name: 'Metformin', genericName: 'Metformin Hydrochloride', category: 'Diabetes Management', strength: '500mg', dosageForm: 'Tablet', defaultDosage: '500mg tablet', prescriptionRequired: true, defaultPrice: 'â‚¹42' },
  { name: 'Azithromycin', genericName: 'Azithromycin Dihydrate', category: 'Antibiotics', strength: '500mg', dosageForm: 'Tablet', defaultDosage: '500mg tablet', prescriptionRequired: true, defaultPrice: 'â‚¹125' },
  { name: 'Atorvastatin', genericName: 'Atorvastatin Calcium', category: 'Cardiovascular Care', strength: '10mg', dosageForm: 'Tablet', defaultDosage: '10mg tablet', prescriptionRequired: true, defaultPrice: 'â‚¹95' },
  { name: 'Ibuprofen', genericName: 'Ibuprofen', category: 'Anti-inflammatory', strength: '400mg', dosageForm: 'Tablet', defaultDosage: '400mg tablet', prescriptionRequired: false, defaultPrice: 'â‚¹28' },
  { name: 'Montelukast', genericName: 'Montelukast + Levocetirizine', category: 'Respiratory & Allergy', strength: '10mg/5mg', dosageForm: 'Tablet', defaultDosage: '10mg/5mg tablet', prescriptionRequired: true, defaultPrice: 'â‚¹110' },
  { name: 'Omeprazole', genericName: 'Omeprazole Delayed-Release', category: 'Antacid & Reflux', strength: '20mg', dosageForm: 'Capsule', defaultDosage: '20mg capsule', prescriptionRequired: false, defaultPrice: 'â‚¹48' },
  { name: 'Vitamin D3', genericName: 'Cholecalciferol', category: 'Vitamins & Bone Health', strength: '60,000 IU', dosageForm: 'Capsule', defaultDosage: '60,000 IU capsule', prescriptionRequired: false, defaultPrice: 'â‚¹98' },
  { name: 'ORS Electrolyte Sachet', genericName: 'Oral Rehydration Salts', category: 'Hydration & Gut Care', strength: '21.8g', dosageForm: 'Powder Sachet', defaultDosage: '21.8g powder', prescriptionRequired: false, defaultPrice: 'â‚¹24' },
  { name: 'Eye Lubricant Drops', genericName: 'Carboxymethylcellulose 0.5%', category: 'Eye Care', strength: '0.5% w/v', dosageForm: 'Eye Drops', defaultDosage: '10ml bottle', prescriptionRequired: false, defaultPrice: 'â‚¹140' },
  { name: 'Antiseptic Solution', genericName: 'Povidone Iodine 5%', category: 'First Aid & Wound Care', strength: '5% w/v', dosageForm: 'Topical Liquid', defaultDosage: '100ml liquid', prescriptionRequired: false, defaultPrice: 'â‚¹65' },
  { name: 'Cough Syrup', genericName: 'Dextromethorphan HBr', category: 'Cough & Throat', strength: '10mg/5ml', dosageForm: 'Syrup', defaultDosage: '100ml bottle', prescriptionRequired: false, defaultPrice: 'â‚¹85' },
];


export const POPULAR_SEARCH_SUGGESTIONS = [
  'Paracetamol',
  'Amoxicillin',
  'Cetirizine',
  'Metformin',
  'Pantoprazole',
  'Azithromycin',
  'Atorvastatin',
  'Ibuprofen',
];
