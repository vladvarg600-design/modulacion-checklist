CREATE TABLE IF NOT EXISTS maquinas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL UNIQUE,
    linea VARCHAR(10) NOT NULL,
    orden INTEGER NOT NULL,
    UNIQUE (linea, orden)
);

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

CREATE TABLE IF NOT EXISTS registros_checklist (
    id SERIAL PRIMARY KEY,
    fecha DATE DEFAULT CURRENT_DATE,
    turno VARCHAR(10) NOT NULL,
    maquina_id INTEGER REFERENCES maquinas(id),
    punto_id INTEGER NOT NULL REFERENCES puntos_aislamiento(id),
    check_id INTEGER NOT NULL REFERENCES tipos_check(id),
    valor BOOLEAN DEFAULT FALSE,
    op_numero VARCHAR(50),
    firma_operador VARCHAR(100),
    firma_supervisor VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (fecha, turno, maquina_id, punto_id, check_id)
);

ALTER TABLE registros_checklist
    ADD COLUMN IF NOT EXISTS maquina_id INTEGER REFERENCES maquinas(id);

ALTER TABLE registros_checklist
    DROP CONSTRAINT IF EXISTS registros_checklist_fecha_turno_punto_id_check_id_key;

ALTER TABLE registros_checklist
    DROP CONSTRAINT IF EXISTS registros_checklist_fecha_turno_maquina_id_punto_id_check_id_key;

ALTER TABLE registros_checklist
    ADD CONSTRAINT registros_checklist_fecha_turno_maquina_id_punto_id_check_id_key
    UNIQUE (fecha, turno, maquina_id, punto_id, check_id);

DROP INDEX IF EXISTS idx_registros_fecha_turno;

CREATE INDEX IF NOT EXISTS idx_registros_fecha_turno_maquina
    ON registros_checklist (fecha, turno, maquina_id);

CREATE INDEX IF NOT EXISTS idx_puntos_maquina_orden
    ON puntos_aislamiento (maquina_id, orden);
