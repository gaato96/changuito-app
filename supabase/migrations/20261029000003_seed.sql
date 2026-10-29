-- Changuito: datos fijos (cadenas, zonas, tiendas virtuales y categorías)
-- El mapeo de categorías (category_map) se carga desde data/categorias.json con scripts/migrate.ts.
-- Las sucursales de SEPA las da de alta la ingesta a partir de sucursales.csv.

insert into chains (id, slug, name, display_name, source, base_url, color, has_promos, sort_order) values
  (1, 'carrefour',  'Carrefour',  'Carrefour',                         'vtex', 'https://www.carrefour.com.ar',     '#4E6A8C', true,  1),
  (2, 'changomas',  'ChangoMás',  'ChangoMás (Hiper Camino del Perú)', 'vtex', 'https://www.masonline.com.ar',     '#B07D2B', true,  2),
  (3, 'comodin',    'Comodín',    'Comodín',                           'vtex', 'https://www.comodinencasa.com.ar', '#85587F', true,  3),
  (4, 'vea',        'Vea',        'Vea',                               'sepa', null,                               '#B4604A', false, 4),
  (5, 'jumbo',      'Jumbo',      'Jumbo',                             'sepa', null,                               '#5A5E9A', false, 5),
  (6, 'la-anonima', 'La Anónima', 'La Anónima',                        'sepa', null,                               '#7D6B5A', true,  6);

insert into price_zones (id, chain_id, slug, name) values
  (1, 1, 'carrefour-tucuman',  'Carrefour Tucumán (web)'),
  (2, 2, 'changomas-tucuman',  'ChangoMás Tucumán (web, Hiper Camino del Perú)'),
  (3, 3, 'comodin-tucuman',    'Comodín Tucumán (web)'),
  (4, 4, 'vea-gran-smt',       'Vea Gran San Miguel de Tucumán'),
  (5, 5, 'jumbo-gran-smt',     'Jumbo Yerba Buena'),
  (6, 6, 'la-anonima-gran-smt','La Anónima Gran San Miguel de Tucumán');

insert into stores (chain_id, zone_id, external_id, name, address, locality, lat, lng, is_virtual) values
  (1, 1, 'web', 'Carrefour Tucumán (tienda online)', null, 'San Miguel de Tucumán', null, null, true),
  (2, 2, 'web', 'HiperChangomas Tucumán (tienda online)', 'Av. Camino del Perú 950', 'San Miguel de Tucumán', -26.804676, -65.26001, true),
  (3, 3, 'web', 'Comodín Tucumán (tienda online)', null, 'San Miguel de Tucumán', null, null, true);

insert into categories (id, slug, name, icon, sort_order, sector_order) values
  (1,  'almacen',        'Almacén',          'kitchen',           1,  3),
  (2,  'lacteos',        'Lácteos',          'water_full',        2,  5),
  (3,  'carnes',         'Carnes',           'set_meal',          3,  7),
  (4,  'verduleria',     'Verdulería',       'nutrition',         4,  1),
  (5,  'fiambreria',     'Fiambrería',       'lunch_dining',      5,  6),
  (6,  'panaderia',      'Panadería',        'bakery_dining',     6,  2),
  (7,  'bebidas',        'Bebidas',          'local_bar',         7,  4),
  (8,  'limpieza',       'Limpieza',         'cleaning_services', 8,  8),
  (9,  'perfumeria',     'Perfumería',       'spa',               9,  9),
  (10, 'bebes-mascotas', 'Bebés y Mascotas', 'pets',              10, 10);
