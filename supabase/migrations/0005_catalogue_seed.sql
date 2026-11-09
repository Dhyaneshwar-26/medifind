-- ============================================================================
-- Seeded shared medicine catalogue
--
-- These rows come from the app's existing MASTER_MEDICINE_CATALOG and are
-- marked `is_sample = true`: they are reference/sample data, not proof that a
-- pharmacy physically stocks the medicine. Pharmacy owners can add any of
-- these to their own inventory, or create custom medicines with is_sample=false.
-- ============================================================================

insert into public.medicines
  (name, generic_name, category, strength, dosage_form, prescription_required, default_price, is_sample)
values
  ('Paracetamol',            'Acetaminophen',                 'Pain Relief & Fever',      '650mg',    'Tablet',         false, '₹34',  true),
  ('Amoxicillin',            'Amoxicillin Trihydrate',        'Antibiotics',              '500mg',    'Capsule',        true,  '₹88',  true),
  ('Cetirizine',             'Cetirizine Hydrochloride',      'Allergy & Cold',           '10mg',     'Tablet',         false, '₹22',  true),
  ('Pantoprazole',           'Pantoprazole Sodium',           'Antacid & Digestion',      '40mg',     'Tablet',         false, '₹75',  true),
  ('Metformin',              'Metformin Hydrochloride',       'Diabetes Management',      '500mg',    'Tablet',         true,  '₹42',  true),
  ('Azithromycin',           'Azithromycin Dihydrate',        'Antibiotics',              '500mg',    'Tablet',         true,  '₹125', true),
  ('Atorvastatin',           'Atorvastatin Calcium',          'Cardiovascular Care',      '10mg',     'Tablet',         true,  '₹95',  true),
  ('Ibuprofen',              'Ibuprofen',                     'Anti-inflammatory',        '400mg',    'Tablet',         false, '₹28',  true),
  ('Montelukast',            'Montelukast + Levocetirizine',  'Respiratory & Allergy',    '10mg/5mg', 'Tablet',         true,  '₹110', true),
  ('Omeprazole',             'Omeprazole Delayed-Release',    'Antacid & Reflux',         '20mg',     'Capsule',        false, '₹48',  true),
  ('Vitamin D3',             'Cholecalciferol',               'Vitamins & Bone Health',   '60,000 IU','Capsule',        false, '₹98',  true),
  ('ORS Electrolyte Sachet', 'Oral Rehydration Salts',        'Hydration & Gut Care',     '21.8g',    'Powder Sachet',  false, '₹24',  true),
  ('Eye Lubricant Drops',    'Carboxymethylcellulose 0.5%',   'Eye Care',                 '0.5% w/v', 'Eye Drops',      false, '₹140', true),
  ('Antiseptic Solution',    'Povidone Iodine 5%',            'First Aid & Wound Care',   '5% w/v',   'Topical Liquid', false, '₹65',  true),
  ('Cough Syrup',            'Dextromethorphan HBr',          'Cough & Throat',           '10mg/5ml', 'Syrup',          false, '₹85',  true)
on conflict (catalog_key) do nothing;
