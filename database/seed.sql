INSERT INTO maquinas (nombre, linea, orden)
VALUES
    ('DESPALETIZADORA L1', 'L1', 1),
    ('TRANSPORTADOR DE PALETAS L1', 'L1', 2),
    ('PALETIZADORA L1', 'L1', 3),
    ('LAVADORA DE CAJAS L1', 'L1', 4),
    ('TRANSPORTADORES DE CAJAS L1', 'L1', 5),
    ('DESENCAJONADORA L1', 'L1', 6),
    ('ENCAJONADORA L1', 'L1', 7),
    ('LAVADORA DE BOTELLAS L1', 'L1', 8),
    ('INSPECTOR DE BOTELLAS VACIAS L1', 'L1', 9),
    ('LLENADORA L1', 'L1', 10),
    ('ETIQUETADORA L1', 'L1', 11),
    ('DESPALETIZADORA L2', 'L2', 12),
    ('TRANSPORTADOR DE PALETAS L2', 'L2', 13),
    ('PALETIZADORA L2', 'L2', 14),
    ('LAVADORA DE CAJAS L2', 'L2', 15),
    ('TRANSPORTADORES DE CAJAS L2', 'L2', 16),
    ('DESENCAJONADORA L2', 'L2', 17),
    ('ENCAJONADORA L2', 'L2', 18),
    ('LAVADORA DE BOTELLAS L2', 'L2', 19),
    ('INSPECTOR DE BOTELLAS VACIAS L2', 'L2', 20),
    ('LLENADORA L2', 'L2', 21),
    ('ETIQUETADORA L2', 'L2', 22)
ON CONFLICT (nombre) DO UPDATE SET
    linea = EXCLUDED.linea,
    orden = EXCLUDED.orden;

UPDATE puntos_aislamiento AS pa
SET maquina_id = m.id
FROM maquinas AS m
WHERE pa.maquina_id IS NULL
  AND m.nombre = 'DESPALETIZADORA L1'
  AND pa.id_visual IN ('PM-DEPA-E1', 'PM-DEPA-N1', 'PM-DEPA-L1', 'PM-DEPA-E2');

INSERT INTO puntos_aislamiento (maquina_id, id_visual, descripcion, orden, foto_url, blueprint_x, blueprint_y, color_hex)
SELECT m.id, v.id_visual, v.descripcion, v.orden, v.foto_url, v.blueprint_x, v.blueprint_y, v.color_hex
FROM (
    VALUES
        ('DESPALETIZADORA L1', 'PM-DEPA-E1', 'Tablero electrico', 1, '', 83, 79, '#d62828'),
        ('DESPALETIZADORA L1', 'PM-DEPA-N1', 'Ingreso de aire comprimido', 2, '', 64, 25, '#1d4ed8'),
        ('DESPALETIZADORA L1', 'PM-DEPA-L1', 'Ingreso de agua para lubricacion', 3, '', 42, 46, '#16a34a'),
        ('DESPALETIZADORA L1', 'PM-DEPA-E2', 'RUN del HMI de la maquina', 4, '', 34, 60, '#ef4444'),
        ('TRANSPORTADOR DE PALETAS L1', 'PM-TP-E1', 'Tablero electrico', 1, '', NULL, NULL, '#d62828'),
        ('TRANSPORTADOR DE PALETAS L1', 'PM-TP-A1', 'Ingreso de aire comprimido a la unidad de mantenimiento', 2, '', NULL, NULL, '#1d4ed8'),
        ('TRANSPORTADOR DE PALETAS L1', 'PM-TP-A2', 'Ingreso de aire comprimido al centrador de paletas', 3, '', NULL, NULL, '#1d4ed8'),
        ('PALETIZADORA L1', 'PM-PALE-E1', 'Tablero electrico', 1, '', NULL, NULL, '#d62828'),
        ('PALETIZADORA L1', 'PM-PALE-A1', 'Ingreso de aire comprimido', 2, '', NULL, NULL, '#1d4ed8'),
        ('PALETIZADORA L1', 'PM-PALE-L1', 'Ingreso de agua para lubricacion', 3, '', NULL, NULL, '#16a34a'),
        ('LAVADORA DE CAJAS L1', 'LAVADORA DE CAJAS', 'Tablero electrico', 1, '', NULL, NULL, '#64748b'),
        ('LAVADORA DE CAJAS L1', 'PM-LC-A1', 'Ingreso de aire comprimido a la unidad de mantenimiento', 2, '', NULL, NULL, '#1d4ed8'),
        ('LAVADORA DE CAJAS L1', 'PM-LC-AG1', 'Ingreso de agua general', 3, '', NULL, NULL, '#16a34a'),
        ('LAVADORA DE CAJAS L1', 'PM-LC-AN1', 'Ingreso de agua nanofiltrada', 4, '', NULL, NULL, '#2563eb'),
        ('LAVADORA DE CAJAS L1', 'HMI-LC', 'Encendido de lavadora de cajas', 5, '', NULL, NULL, '#16a34a'),
        ('TRANSPORTADORES DE CAJAS L1', 'PM-TC-E1', 'Tablero electrico', 1, '', NULL, NULL, '#d62828'),
        ('TRANSPORTADORES DE CAJAS L1', 'PM-TC-A1', 'Ingreso de aire comprimido a la unidad de mantenimiento', 2, '', NULL, NULL, '#1d4ed8'),
        ('TRANSPORTADORES DE CAJAS L1', 'PM-TC-L1', 'Ingreso de agua para lubricacion', 3, '', NULL, NULL, '#16a34a'),
        ('DESENCAJONADORA L1', 'PM-DES-E1', 'Tablero electrico', 1, '', NULL, NULL, '#d62828'),
        ('DESENCAJONADORA L1', 'PM-DES-A1', 'Ingreso de aire comprimido a la unidad de mantenimiento', 2, '', NULL, NULL, '#1d4ed8'),
        ('DESENCAJONADORA L1', 'PM-DES-L1', 'Ingreso de agua para lubricacion', 3, '', NULL, NULL, '#16a34a'),
        ('DESENCAJONADORA L1', 'PM-DES-L2', 'Ingreso de agua para lubricacion desencajonadora - mesa de carga', 4, '', NULL, NULL, '#16a34a'),
        ('ENCAJONADORA L1', 'PM-ENC-E1', 'Tablero electrico', 1, '', NULL, NULL, '#d62828'),
        ('ENCAJONADORA L1', 'PM-ENC-A1', 'Ingreso de aire comprimido a la unidad de mantenimiento', 2, '', NULL, NULL, '#1d4ed8'),
        ('ENCAJONADORA L1', 'PM-ENC-L1', 'Ingreso de agua para lubricacion', 3, '', NULL, NULL, '#16a34a'),
        ('LAVADORA DE BOTELLAS L1', 'PM-LB-E1', 'Tablero electrico', 1, '', NULL, NULL, '#16a34a'),
        ('LAVADORA DE BOTELLAS L1', 'PM-LB-A1', 'Ingreso de aire comprimido a la unidad de mantenimiento', 2, '', NULL, NULL, '#1d4ed8'),
        ('LAVADORA DE BOTELLAS L1', 'PM-LB-L1', 'Ingreso de agua para lubricacion', 3, '', NULL, NULL, '#16a34a'),
        ('LAVADORA DE BOTELLAS L1', 'PM-LB-SC1', 'Ingreso de soda caustica', 4, '', NULL, NULL, '#16a34a'),
        ('LAVADORA DE BOTELLAS L1', 'PM-LB-DC1', 'Ingreso de dioxido de cloro', 5, '', NULL, NULL, '#ea580c'),
        ('LAVADORA DE BOTELLAS L1', 'PM-LB-AB1', 'Ingreso de agua ablandada', 6, '', NULL, NULL, '#7c3aed'),
        ('LAVADORA DE BOTELLAS L1', 'PM-LB-V1', 'Ingreso vapor de agua', 7, '', NULL, NULL, '#16a34a'),
        ('LAVADORA DE BOTELLAS L1', 'HMI-LB', 'HMI de control de calentamiento de lavadora', 8, '', NULL, NULL, '#16a34a'),
        ('INSPECTOR DE BOTELLAS VACIAS L1', 'PM-IBV-E1', 'Tablero electrico', 1, '', NULL, NULL, '#d62828'),
        ('INSPECTOR DE BOTELLAS VACIAS L1', 'PM-IBV-A1', 'Ingreso de aire comprimido a la unidad de mantenimiento', 2, '', NULL, NULL, '#1d4ed8'),
        ('INSPECTOR DE BOTELLAS VACIAS L1', 'PM-IBV-L1', 'Ingreso de agua para lubricacion', 3, '', NULL, NULL, '#16a34a'),
        ('INSPECTOR DE BOTELLAS VACIAS L1', 'PM-IBV-AB1', 'Ingreso de agua para duchas de pico', 4, '', NULL, NULL, '#7c3aed'),
        ('INSPECTOR DE BOTELLAS VACIAS L1', 'PM-IBV-AB2', 'Ingreso de agua para duchas del alineador', 5, '', NULL, NULL, '#7c3aed'),
        ('INSPECTOR DE BOTELLAS VACIAS L1', 'PM-IBV-E2', 'Estractores', 6, '', NULL, NULL, '#d62828'),
        ('INSPECTOR DE BOTELLAS VACIAS L1', 'HMI-IBV', 'Tranportadores de botellas', 7, '', NULL, NULL, '#d62828'),
        ('LLENADORA L1', 'PM-LLEN-E1', 'Tablero electrico', 1, '', NULL, NULL, '#16a34a'),
        ('LLENADORA L1', 'PM-LLEN-A1', 'Ingreso de aire comprimido a la unidad de mantenimiento', 2, '', NULL, NULL, '#1d4ed8'),
        ('LLENADORA L1', 'PM-LLEN-AB1', 'Ingreso de agua Ablandada para el proceso', 3, '', NULL, NULL, '#7c3aed'),
        ('LLENADORA L1', 'PM-LLEN-CO2-1', 'Ingreso de C02', 4, '', NULL, NULL, '#0ea5e9'),
        ('LLENADORA L1', 'PM-LLEN-V1', 'Ingreso de vapor de agua', 5, '', NULL, NULL, '#16a34a'),
        ('ETIQUETADORA L1', 'PM-ETIQ-E1', 'Tablero electrico', 1, '', NULL, NULL, '#d62828'),
        ('ETIQUETADORA L1', 'PM-ETIQ-A1', 'Ingreso de aire comprimido a la unidad de mantenimiento', 2, '', NULL, NULL, '#1d4ed8'),
        ('ETIQUETADORA L1', 'PM-ETIQ-L1', 'Ingreso de agua para lubricacion', 3, '', NULL, NULL, '#16a34a'),
        ('ETIQUETADORA L1', 'HMI-ETIQ', 'Transportadores de entra y salida de etiquetadora', 4, '', NULL, NULL, '#d62828'),
        ('DESPALETIZADORA L2', 'PM-DEPA-E1', 'Tablero electrico', 1, '', NULL, NULL, '#d62828'),
        ('DESPALETIZADORA L2', 'PM-DEPA-E2', 'Tablero electrico', 2, '', NULL, NULL, '#d62828'),
        ('DESPALETIZADORA L2', 'PM-DEPA-E3', 'Paro de Maquina desde el HMI', 3, '', NULL, NULL, '#d62828'),
        ('DESPALETIZADORA L2', 'PM-DEPA-N1', 'Ingreso de aire comprimido', 4, '', NULL, NULL, '#64748b'),
        ('DESPALETIZADORA L2', 'PM-DEPA-L1', 'Ingreso de agua para lubricacion', 5, '', NULL, NULL, '#16a34a'),
        ('TRANSPORTADOR DE PALETAS L2', 'PM-TP-E1', 'Tablero electrico', 1, '', NULL, NULL, '#d62828'),
        ('TRANSPORTADOR DE PALETAS L2', 'PM-TP-N1', 'Ingreso de aire comprimido a la unidad de mantenimiento', 2, '', NULL, NULL, '#64748b'),
        ('TRANSPORTADOR DE PALETAS L2', 'PM-TP-N2', 'Ingreso de aire comprimido al centrador de paletas', 3, '', NULL, NULL, '#64748b'),
        ('PALETIZADORA L2', 'PM-PALE-E1', 'Tablero electrico', 1, '', NULL, NULL, '#d62828'),
        ('PALETIZADORA L2', 'PM-PALE-E2', 'Paro de Maquina desde el HMI', 2, '', NULL, NULL, '#d62828'),
        ('PALETIZADORA L2', 'PM-PALE-N1', 'Ingreso de aire comprimido', 3, '', NULL, NULL, '#64748b'),
        ('PALETIZADORA L2', 'PM-PALE-L1', 'Ingreso de agua para lubricacion', 4, '', NULL, NULL, '#16a34a'),
        ('PALETIZADORA L2', 'HMI-TC-E2', 'Arranque-Parada de Transportadores de cajas', 5, '', NULL, NULL, '#d62828'),
        ('LAVADORA DE CAJAS L2', 'PM-LC-E1', 'Tablero electrico', 1, '', NULL, NULL, '#16a34a'),
        ('LAVADORA DE CAJAS L2', 'PM-LC-E2', 'Paro de Maquina desde el HMI', 2, '', NULL, NULL, '#16a34a'),
        ('LAVADORA DE CAJAS L2', 'PM-LC-N1', 'Ingreso de aire comprimido a la unidad de mantenimiento', 3, '', NULL, NULL, '#16a34a'),
        ('LAVADORA DE CAJAS L2', 'PM-LC-AG1', 'Ingreso de agua general', 4, '', NULL, NULL, '#16a34a'),
        ('LAVADORA DE CAJAS L2', 'PM-LC-AN1', 'Ingreso de agua nanofiltrada', 5, '', NULL, NULL, '#2563eb'),
        ('LAVADORA DE CAJAS L2', 'PM-LC-L1', 'Sistema de dosificacion de lubricante zona gris', 6, '', NULL, NULL, '#16a34a'),
        ('TRANSPORTADORES DE CAJAS L2', 'PM-TC-E1', 'Tablero electrico', 1, '', NULL, NULL, '#d62828'),
        ('TRANSPORTADORES DE CAJAS L2', 'HMI-TC-E2', 'Arranque-Parada de Transportadores de cajas', 2, '', NULL, NULL, '#d62828'),
        ('TRANSPORTADORES DE CAJAS L2', 'PM-TC-N1', 'Ingreso de aire comprimido a la unidad de mantenimiento', 3, '', NULL, NULL, '#64748b'),
        ('TRANSPORTADORES DE CAJAS L2', 'PM-TC-N2', 'Ingreso de aire comprimido a la unidad de mantenimiento', 4, '', NULL, NULL, '#64748b'),
        ('TRANSPORTADORES DE CAJAS L2', 'PM-TC-N3', 'Ingreso de aire comprimido a la unidad de mantenimiento', 5, '', NULL, NULL, '#64748b'),
        ('TRANSPORTADORES DE CAJAS L2', 'PM-TC-L1', 'Ingreso de agua para lubricacion', 6, '', NULL, NULL, '#16a34a'),
        ('DESENCAJONADORA L2', 'PM-DES-E1', 'Tablero electrico', 1, '', NULL, NULL, '#d62828'),
        ('DESENCAJONADORA L2', 'PM-DES-E2', 'Tablero electrico', 2, '', NULL, NULL, '#d62828'),
        ('DESENCAJONADORA L2', 'PM-DES-E3', 'Paro de Maquina desde el HMI', 3, '', NULL, NULL, '#d62828'),
        ('DESENCAJONADORA L2', 'PM-DES-N1', 'Ingreso de aire comprimido a la unidad de mantenimiento', 4, '', NULL, NULL, '#64748b'),
        ('DESENCAJONADORA L2', 'PM-DES-L1', 'Ingreso de agua para lubricacion', 5, '', NULL, NULL, '#16a34a'),
        ('ENCAJONADORA L2', 'PM-ENC-E1', 'Tablero electrico', 1, '', NULL, NULL, '#d62828'),
        ('ENCAJONADORA L2', 'PM-ENC-E2', 'Tablero electrico', 2, '', NULL, NULL, '#d62828'),
        ('ENCAJONADORA L2', 'PM-ENC-E3', 'Paro de Maquina desde el HMI', 3, '', NULL, NULL, '#d62828'),
        ('ENCAJONADORA L2', 'PM-ENC-N1', 'Ingreso de aire comprimido a la unidad de mantenimiento', 4, '', NULL, NULL, '#d62828'),
        ('ENCAJONADORA L2', 'PM-ENC-L1', 'Ingreso de agua para lubricacion', 5, '', NULL, NULL, '#16a34a'),
        ('LAVADORA DE BOTELLAS L2', 'PM-LB-E1', 'Tablero electrico', 1, '', NULL, NULL, '#16a34a'),
        ('LAVADORA DE BOTELLAS L2', 'PM-LB-E2', 'Paro de Maquina desde el HMI', 2, '', NULL, NULL, '#16a34a'),
        ('LAVADORA DE BOTELLAS L2', 'PM-LB-N1', 'Ingreso de aire comprimido a la unidad de mantenimiento - descarga', 3, '', NULL, NULL, '#16a34a'),
        ('LAVADORA DE BOTELLAS L2', 'PM-LB-N2', 'Ingreso de aire comprimido a la unidad de mantenimiento - intercambiadores', 4, '', NULL, NULL, '#16a34a'),
        ('LAVADORA DE BOTELLAS L2', 'PM-LB-N3', 'Ingreso de aire comprimido a la unidad de mantenimiento - duchas pre lavado', 5, '', NULL, NULL, '#16a34a'),
        ('LAVADORA DE BOTELLAS L2', 'PM-LB-S1', 'Ingreso de soda caustica', 6, '', NULL, NULL, '#16a34a'),
        ('LAVADORA DE BOTELLAS L2', 'PM-LB-DC1', 'Ingreso de dioxido de cloro', 7, '', NULL, NULL, '#ea580c'),
        ('LAVADORA DE BOTELLAS L2', 'PM-LB-AB1', 'Ingreso de agua ablandada', 8, '', NULL, NULL, '#7c3aed'),
        ('LAVADORA DE BOTELLAS L2', 'PM-LB-V1', 'Ingreso vapor de agua', 9, '', NULL, NULL, '#16a34a'),
        ('INSPECTOR DE BOTELLAS VACIAS L2', 'PM-IBV-E1', 'Tablero electrico', 1, '', NULL, NULL, '#d62828'),
        ('INSPECTOR DE BOTELLAS VACIAS L2', 'PM-IBV-E2', 'Tablero electrico', 2, '', NULL, NULL, '#d62828'),
        ('INSPECTOR DE BOTELLAS VACIAS L2', 'PM-IBV-E3', 'HMI - Arranque/Parada transportadores de botellas', 3, '', NULL, NULL, '#d62828'),
        ('INSPECTOR DE BOTELLAS VACIAS L2', 'PM-IBV-N1', 'Ingreso de aire comprimido a la unidad de mantenimiento', 4, '', NULL, NULL, '#64748b'),
        ('INSPECTOR DE BOTELLAS VACIAS L2', 'PM-IBV-AB1', 'Ingreso de agua para lubricacion de guias alineador', 5, '', NULL, NULL, '#7c3aed'),
        ('LLENADORA L2', 'PM-LLEN-E1', 'Tablero electrico', 1, '', NULL, NULL, '#16a34a'),
        ('LLENADORA L2', 'PM-LLEN-E2', 'Tablero electrico', 2, '', NULL, NULL, '#16a34a'),
        ('LLENADORA L2', 'PM-LLEN-E3', 'Paro de Maquina desde el HMI', 3, '', NULL, NULL, '#16a34a'),
        ('LLENADORA L2', 'PM-LLEN-N1', 'Ingreso de aire comprimido a la unidad de mantenimiento', 4, '', NULL, NULL, '#16a34a'),
        ('LLENADORA L2', 'PM-LLEN-AB1', 'Ingreso de agua ablandada lubricacion', 5, '', NULL, NULL, '#7c3aed'),
        ('LLENADORA L2', 'PM-LLEN-CO2-1', 'Ingreso de C02', 6, '', NULL, NULL, '#0ea5e9'),
        ('LLENADORA L2', 'PM-LLEN-V1', 'Ingreso de vapor de agua', 7, '', NULL, NULL, '#16a34a'),
        ('ETIQUETADORA L2', 'PM-ETIQ-E1', 'Tablero electrico', 1, '', NULL, NULL, '#d62828'),
        ('ETIQUETADORA L2', 'PM-ETIQ-E2', 'Tablero electrico', 2, '', NULL, NULL, '#d62828'),
        ('ETIQUETADORA L2', 'PM-ETIQ-E3', 'Paro de Maquina desde el HMI', 3, '', NULL, NULL, '#d62828'),
        ('ETIQUETADORA L2', 'PM-ETIQ-AB1', 'Ingreso de agua para lubricacion', 4, '', NULL, NULL, '#7c3aed'),
        ('ETIQUETADORA L2', 'PM-ETIQ-N1', 'Ingreso de aire comprimido a la unidad de mantenimiento', 5, '', NULL, NULL, '#d62828')
) AS v(maquina_nombre, id_visual, descripcion, orden, foto_url, blueprint_x, blueprint_y, color_hex)
JOIN maquinas AS m ON m.nombre = v.maquina_nombre
ON CONFLICT (maquina_id, id_visual) DO UPDATE SET
    descripcion = EXCLUDED.descripcion,
    orden = EXCLUDED.orden,
    foto_url = EXCLUDED.foto_url,
    blueprint_x = EXCLUDED.blueprint_x,
    blueprint_y = EXCLUDED.blueprint_y,
    color_hex = EXCLUDED.color_hex;

UPDATE registros_checklist AS rc
SET maquina_id = pa.maquina_id
FROM puntos_aislamiento AS pa
WHERE rc.maquina_id IS NULL
  AND rc.punto_id = pa.id
  AND pa.maquina_id IS NOT NULL;

INSERT INTO tipos_check (nombre, orden, grupo, descripcion_corta)
VALUES
    ('Modulacion Parada > 10 min Danos, EFC, CIP', 1, 'parada', 'Modulacion'),
    ('Fin de Produccion', 2, 'parada', 'Fin de Produccion'),
    ('Mantenimiento o Aseo', 3, 'parada', 'Mantenimiento o Aseo'),
    ('Arranque', 4, 'arranque', 'Arranque'),
    ('BrakeDown o CIP', 5, 'breakdown', 'BrakeDown o CIP')
ON CONFLICT DO NOTHING;
INSERT INTO responsables_sharp (numero_sharp, firma_operador, firma_supervisor)
VALUES
    (1250, 'Operador Demo', 'Supervisor Demo'),
    (1502, 'Ozum', 'Vladimir'),
    (2008, 'Vladzum', 'Vladmimir')
ON CONFLICT (numero_sharp) DO UPDATE SET
    firma_operador = EXCLUDED.firma_operador,
    firma_supervisor = EXCLUDED.firma_supervisor;
