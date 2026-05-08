CREATE TABLE IF NOT EXISTS puntos_aislamiento (
    id SERIAL PRIMARY KEY,
    id_visual VARCHAR(20) NOT NULL UNIQUE,
    descripcion TEXT NOT NULL,
    orden INTEGER NOT NULL,
    foto_url TEXT,
    blueprint_x INTEGER,
    blueprint_y INTEGER,
    color_hex VARCHAR(7) NOT NULL DEFAULT '#64748b'
);

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
    punto_id INTEGER NOT NULL REFERENCES puntos_aislamiento(id),
    check_id INTEGER NOT NULL REFERENCES tipos_check(id),
    valor BOOLEAN DEFAULT FALSE,
    op_numero VARCHAR(50),
    firma_operador VARCHAR(100),
    firma_supervisor VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (fecha, turno, punto_id, check_id)
);

CREATE INDEX IF NOT EXISTS idx_registros_fecha_turno
    ON registros_checklist (fecha, turno);
