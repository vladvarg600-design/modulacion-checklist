INSERT INTO puntos_aislamiento (id_visual, descripcion, orden, foto_url, blueprint_x, blueprint_y, color_hex)
VALUES
    ('PM-DEPA-E1', 'Tablero electrico', 1, '', 83, 79, '#d62828'),
    ('PM-DEPA-N1', 'Ingreso de aire comprimido', 2, '', 64, 25, '#1d4ed8'),
    ('PM-DEPA-L1', 'Ingreso de agua para lubricacion', 3, '', 42, 46, '#16a34a'),
    ('PM-DEPA-E2', 'Run del HMI de la maquina', 4, '', 34, 60, '#ef4444')
ON CONFLICT (id_visual) DO UPDATE SET
    descripcion = EXCLUDED.descripcion,
    orden = EXCLUDED.orden,
    foto_url = EXCLUDED.foto_url,
    blueprint_x = EXCLUDED.blueprint_x,
    blueprint_y = EXCLUDED.blueprint_y,
    color_hex = EXCLUDED.color_hex;

INSERT INTO tipos_check (nombre, orden, grupo, descripcion_corta)
VALUES
    ('Modulacion Parada > 10 min Danos, EFC, CIP', 1, 'parada', 'Modulacion'),
    ('Fin de Produccion', 2, 'parada', 'Fin de Produccion'),
    ('Mantenimiento o Aseo', 3, 'parada', 'Mantenimiento o Aseo'),
    ('Arranque', 4, 'arranque', 'Arranque'),
    ('BrakeDown o CIP', 5, 'breakdown', 'BrakeDown o CIP')
ON CONFLICT DO NOTHING;
