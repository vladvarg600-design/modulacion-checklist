CREATE TABLE IF NOT EXISTS maquinas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL UNIQUE,
    linea VARCHAR(10) NOT NULL,
    mapa_url TEXT,
    orden INTEGER NOT NULL,
    UNIQUE (linea, orden)
);

ALTER TABLE maquinas
    ADD COLUMN IF NOT EXISTS mapa_url TEXT;

CREATE TABLE IF NOT EXISTS puntos_aislamiento (
    id SERIAL PRIMARY KEY,
    maquina_id INTEGER REFERENCES maquinas(id),
    id_visual VARCHAR(40) NOT NULL,
    descripcion TEXT NOT NULL,
    orden INTEGER NOT NULL,
    foto_url TEXT,
    blueprint_x INTEGER,
    blueprint_y INTEGER,
    color_hex VARCHAR(7) NOT NULL DEFAULT '#64748b'
);

ALTER TABLE puntos_aislamiento
    ADD COLUMN IF NOT EXISTS maquina_id INTEGER REFERENCES maquinas(id);

ALTER TABLE puntos_aislamiento
    ALTER COLUMN id_visual TYPE VARCHAR(40);

ALTER TABLE puntos_aislamiento
    DROP CONSTRAINT IF EXISTS puntos_aislamiento_id_visual_key;

ALTER TABLE puntos_aislamiento
    DROP CONSTRAINT IF EXISTS puntos_aislamiento_maquina_id_id_visual_key;

ALTER TABLE puntos_aislamiento
    ADD CONSTRAINT puntos_aislamiento_maquina_id_id_visual_key UNIQUE (maquina_id, id_visual);

CREATE TABLE IF NOT EXISTS tipos_check (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    orden INTEGER NOT NULL,
    grupo VARCHAR(40) NOT NULL,
    descripcion_corta VARCHAR(100) NOT NULL,
    UNIQUE (grupo, orden)
);

CREATE TABLE IF NOT EXISTS responsables_sharp (
    numero_sharp BIGINT PRIMARY KEY,
    apellido VARCHAR(120),
    nombre VARCHAR(120),
    nombre_completo VARCHAR(240),
    equipo VARCHAR(100),
    linea VARCHAR(20),
    lider_nombre VARCHAR(240),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE responsables_sharp
    ALTER COLUMN numero_sharp TYPE BIGINT USING numero_sharp::BIGINT;

ALTER TABLE responsables_sharp
    ADD COLUMN IF NOT EXISTS apellido VARCHAR(120);

ALTER TABLE responsables_sharp
    ADD COLUMN IF NOT EXISTS nombre VARCHAR(120);

ALTER TABLE responsables_sharp
    ADD COLUMN IF NOT EXISTS nombre_completo VARCHAR(240);

ALTER TABLE responsables_sharp
    ADD COLUMN IF NOT EXISTS equipo VARCHAR(100);

ALTER TABLE responsables_sharp
    ADD COLUMN IF NOT EXISTS linea VARCHAR(20);

ALTER TABLE responsables_sharp
    ADD COLUMN IF NOT EXISTS lider_nombre VARCHAR(240);

ALTER TABLE responsables_sharp
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE responsables_sharp
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

UPDATE responsables_sharp
SET
    nombre_completo = COALESCE(NULLIF(nombre_completo, ''), firma_operador),
    lider_nombre = COALESCE(NULLIF(lider_nombre, ''), firma_supervisor),
    updated_at = NOW()
WHERE
    (nombre_completo IS NULL OR nombre_completo = '')
    OR (lider_nombre IS NULL OR lider_nombre = '');

ALTER TABLE responsables_sharp
    DROP COLUMN IF EXISTS firma_operador;

ALTER TABLE responsables_sharp
    DROP COLUMN IF EXISTS firma_supervisor;

CREATE TABLE IF NOT EXISTS registros_checklist (
    id SERIAL PRIMARY KEY,
    fecha DATE DEFAULT CURRENT_DATE,
    turno VARCHAR(10) NOT NULL,
    modo VARCHAR(20) NOT NULL DEFAULT 'parada',
    maquina_id INTEGER REFERENCES maquinas(id),
    punto_id INTEGER NOT NULL REFERENCES puntos_aislamiento(id),
    check_id INTEGER NOT NULL REFERENCES tipos_check(id),
    valor BOOLEAN DEFAULT FALSE,
    numero_sharp INTEGER,
    op_numero VARCHAR(50),
    firma_operador VARCHAR(100),
    firma_supervisor VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (fecha, turno, modo, maquina_id, punto_id, check_id)
);

ALTER TABLE registros_checklist
    ADD COLUMN IF NOT EXISTS maquina_id INTEGER REFERENCES maquinas(id);

ALTER TABLE registros_checklist
    ADD COLUMN IF NOT EXISTS modo VARCHAR(20) NOT NULL DEFAULT 'parada';

ALTER TABLE registros_checklist
    ADD COLUMN IF NOT EXISTS numero_sharp INTEGER;

ALTER TABLE registros_checklist
    ALTER COLUMN numero_sharp TYPE BIGINT USING numero_sharp::BIGINT;

ALTER TABLE registros_checklist
    DROP CONSTRAINT IF EXISTS registros_checklist_fecha_turno_punto_id_check_id_key;

ALTER TABLE registros_checklist
    DROP CONSTRAINT IF EXISTS registros_checklist_fecha_turno_maquina_id_punto_id_check_id_key;

ALTER TABLE registros_checklist
    DROP CONSTRAINT IF EXISTS registros_checklist_fecha_turno_modo_maquina_id_punto_id_check_key;

ALTER TABLE registros_checklist
    ADD CONSTRAINT registros_checklist_fecha_turno_modo_maquina_id_punto_id_check_key
    UNIQUE (fecha, turno, modo, maquina_id, punto_id, check_id);

DROP INDEX IF EXISTS idx_registros_fecha_turno;

CREATE INDEX IF NOT EXISTS idx_registros_fecha_turno_maquina
    ON registros_checklist (fecha, turno, modo, maquina_id);

CREATE INDEX IF NOT EXISTS idx_puntos_maquina_orden
    ON puntos_aislamiento (maquina_id, orden);
