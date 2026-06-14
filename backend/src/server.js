import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import multer from 'multer';
import pg from 'pg';

const { Pool } = pg;

const app = express();
const port = Number(process.env.PORT || 3001);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (_request, file, callback) => {
    const allowedTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);

    if (!allowedTypes.has(file.mimetype)) {
      callback(new Error('Solo se permiten imagenes PNG, JPG o WebP'));
      return;
    }

    callback(null, true);
  },
});
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('render.com')
    ? { rejectUnauthorized: false }
    : false,
});

app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(',').map((origin) => origin.trim()) || '*',
  }),
);
app.use(express.json({ limit: '1mb' }));

app.use((error, _request, response, next) => {
  if (!error) {
    next();
    return;
  }

  if (error instanceof multer.MulterError) {
    const message = error.code === 'LIMIT_FILE_SIZE'
      ? 'La imagen supera el limite de 4 MB'
      : error.message;

    response.status(400).json({ message });
    return;
  }

  if (error.message?.includes('Solo se permiten imagenes')) {
    response.status(400).json({ message: error.message });
    return;
  }

  next(error);
});

app.get('/api/health', async (_request, response) => {
  try {
    await pool.query('SELECT 1');
    response.json({ ok: true });
  } catch (error) {
    response.status(500).json({ ok: false, message: error.message });
  }
});

app.get('/api/config', async (_request, response) => {
  try {
    const [machinesResult, pointsResult, checksResult] = await Promise.all([
      pool.query(
        `
          SELECT id, nombre, linea, mapa_url, orden
          FROM maquinas
          ORDER BY linea ASC, orden ASC
        `,
      ),
      pool.query(
        `
          SELECT
            pa.id,
            pa.maquina_id,
            pa.id_visual,
            pa.descripcion,
            pa.orden,
            pa.foto_url,
            pa.blueprint_x,
            pa.blueprint_y,
            pa.color_hex,
            m.nombre AS maquina_nombre,
            m.linea
          FROM puntos_aislamiento pa
          JOIN maquinas m ON m.id = pa.maquina_id
          ORDER BY m.linea ASC, m.orden ASC, pa.orden ASC
        `,
      ),
      pool.query(
        `
          SELECT id, nombre, orden, grupo, descripcion_corta
          FROM tipos_check
          ORDER BY orden ASC
        `,
      ),
    ]);

    response.json({
      lineas: [...new Set(machinesResult.rows.map((machine) => machine.linea))],
      maquinas: machinesResult.rows,
      puntos: pointsResult.rows,
      checks: checksResult.rows,
    });
  } catch (error) {
    response.status(500).json({ message: error.message });
  }
});

app.get('/api/sessions', async (request, response) => {
  const { fecha, turno, modo, maquinaId } = request.query;
  const resolvedMachineId = Number(maquinaId);

  if (!fecha || !turno || !modo || !Number.isInteger(resolvedMachineId) || resolvedMachineId <= 0) {
    response.status(400).json({ message: 'fecha, turno, modo y maquinaId son obligatorios' });
    return;
  }

  try {
    const result = await pool.query(
      `
        SELECT session_id, MIN(created_at) as created_at, MAX(firma_operador) as firma_operador
        FROM registros_checklist
        WHERE fecha = $1 AND turno = $2 AND modo = $3 AND maquina_id = $4 AND session_id IS NOT NULL
        GROUP BY session_id
        ORDER BY created_at DESC
      `,
      [fecha, turno, modo, resolvedMachineId]
    );
    response.json({ sessions: result.rows });
  } catch (error) {
    response.status(500).json({ message: error.message });
  }
});

app.get('/api/checklist', async (request, response) => {
  const { sessionId, maquinaId } = request.query;
  const resolvedMachineId = Number(maquinaId);

  if (!sessionId || !Number.isInteger(resolvedMachineId) || resolvedMachineId <= 0) {
    response.json({
      metadata: { numeroSharp: '', opNumero: '', firmaOperador: '', firmaSupervisor: '' },
      registros: [],
    });
    return;
  }

  try {
    const result = await pool.query(
      `
        SELECT
          rc.fecha,
          rc.turno,
          rc.modo,
          rc.maquina_id,
          rc.punto_id,
          rc.check_id,
          rc.valor,
          rc.numero_sharp,
          rc.op_numero,
          COALESCE(rs.nombre_completo, rc.firma_operador) AS firma_operador,
          COALESCE(rs.lider_nombre, rc.firma_supervisor) AS firma_supervisor,
          pa.id_visual,
          tc.descripcion_corta
        FROM registros_checklist rc
        JOIN puntos_aislamiento pa ON pa.id = rc.punto_id
        JOIN tipos_check tc ON tc.id = rc.check_id
        LEFT JOIN responsables_sharp rs ON rs.numero_sharp = rc.numero_sharp
        WHERE rc.session_id = $1 AND rc.maquina_id = $2
        ORDER BY pa.orden ASC, tc.orden ASC
      `,
      [sessionId, resolvedMachineId],
    );

    const metadataSource = result.rows[0] || null;

    response.json({
      fecha: metadataSource?.fecha || '',
      turno: metadataSource?.turno || '',
      modo: metadataSource?.modo || '',
      metadata: metadataSource
        ? {
            numeroSharp: metadataSource.numero_sharp ?? '',
            opNumero: metadataSource.op_numero || '',
            firmaOperador: metadataSource.firma_operador || '',
            firmaSupervisor: metadataSource.firma_supervisor || '',
          }
        : {
            numeroSharp: '',
            opNumero: '',
            firmaOperador: '',
            firmaSupervisor: '',
          },
      registros: result.rows,
    });
  } catch (error) {
    response.status(500).json({ message: error.message });
  }
});

app.get('/api/sharp/:numeroSharp', async (request, response) => {
  const numeroSharp = Number(request.params.numeroSharp);

  if (!Number.isInteger(numeroSharp) || numeroSharp < 0) {
    response.status(400).json({ message: 'numeroSharp debe ser un entero positivo' });
    return;
  }

  try {
    const result = await pool.query(
      `
        SELECT numero_sharp, apellido, nombre, nombre_completo, equipo, linea, lider_nombre
        FROM responsables_sharp
        WHERE numero_sharp = $1
      `,
      [numeroSharp],
    );

    const sharpOwner = result.rows[0];

    if (!sharpOwner) {
      response.status(404).json({ message: 'No existe un responsable asociado a ese Numero Sharp' });
      return;
    }

    response.json({
      numeroSharp: sharpOwner.numero_sharp,
      apellido: sharpOwner.apellido,
      nombre: sharpOwner.nombre,
      nombreCompleto: sharpOwner.nombre_completo,
      equipo: sharpOwner.equipo,
      linea: sharpOwner.linea,
      firmaOperador: sharpOwner.nombre_completo,
      firmaSupervisor: sharpOwner.lider_nombre,
    });
  } catch (error) {
    response.status(500).json({ message: error.message });
  }
});

app.post('/api/checklist', async (request, response) => {
  const { fecha, turno, modo, maquinaId, numeroSharp, opNumero, sessionId, rows } = request.body;
  const resolvedMachineId = Number(maquinaId);
  const resolvedNumeroSharp =
    numeroSharp === '' || numeroSharp === null || numeroSharp === undefined
      ? null
      : Number(numeroSharp);

  if (!fecha || !turno || !modo || !Number.isInteger(resolvedMachineId) || resolvedMachineId <= 0 || !Array.isArray(rows) || rows.length === 0) {
    response.status(400).json({ message: 'fecha, turno, modo, maquinaId y rows son obligatorios' });
    return;
  }

  if (!sessionId) {
    response.status(400).json({ message: 'sessionId es obligatorio' });
    return;
  }

  if (resolvedNumeroSharp === null) {
    response.status(400).json({ message: 'numeroSharp es obligatorio' });
    return;
  }

  if (resolvedNumeroSharp !== null && (!Number.isInteger(resolvedNumeroSharp) || resolvedNumeroSharp < 0)) {
    response.status(400).json({ message: 'numeroSharp debe ser un entero positivo' });
    return;
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const sharpLookupResult = await client.query(
      `
        SELECT nombre_completo, lider_nombre
        FROM responsables_sharp
        WHERE numero_sharp = $1
      `,
      [resolvedNumeroSharp],
    );

    const sharpOwner = sharpLookupResult.rows[0];

    if (!sharpOwner) {
      await client.query('ROLLBACK');
      response.status(400).json({ message: 'No existe un responsable asociado a ese Numero Sharp' });
      return;
    }

    const values = [];
    const params = [];

    rows.forEach((row, index) => {
      const baseIndex = index * 12;
      params.push(fecha, turno, modo, resolvedMachineId, row.puntoId, row.checkId, row.valor, resolvedNumeroSharp, opNumero || '', sharpOwner.nombre_completo, sharpOwner.lider_nombre, sessionId);
      values.push(
        `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6}, $${baseIndex + 7}, $${baseIndex + 8}, $${baseIndex + 9}, $${baseIndex + 10}, $${baseIndex + 11}, $${baseIndex + 12})`,
      );
    });

    await client.query(
      `
        INSERT INTO registros_checklist
          (fecha, turno, modo, maquina_id, punto_id, check_id, valor, numero_sharp, op_numero, firma_operador, firma_supervisor, session_id)
        VALUES ${values.join(', ')}
        ON CONFLICT (session_id, maquina_id, punto_id, check_id)
        DO UPDATE SET
          valor = EXCLUDED.valor,
          numero_sharp = EXCLUDED.numero_sharp,
          op_numero = EXCLUDED.op_numero,
          firma_operador = EXCLUDED.firma_operador,
          firma_supervisor = EXCLUDED.firma_supervisor,
          updated_at = NOW()
      `,
      params,
    );

    await client.query('COMMIT');
    response.status(201).json({ ok: true, savedRows: rows.length, maquinaId: resolvedMachineId, modo });
  } catch (error) {
    await client.query('ROLLBACK');
    response.status(500).json({ message: error.message });
  } finally {
    client.release();
  }
});

app.post('/api/puntos/:pointId/photo', upload.single('photo'), async (request, response) => {
  const pointId = Number(request.params.pointId);
  const maquinaId = Number(request.body.maquinaId);

  if (!Number.isInteger(pointId) || pointId <= 0 || !Number.isInteger(maquinaId) || maquinaId <= 0) {
    response.status(400).json({ message: 'pointId y maquinaId son obligatorios' });
    return;
  }

  if (!request.file) {
    response.status(400).json({ message: 'Debes seleccionar una imagen' });
    return;
  }

  const dataUri = `data:${request.file.mimetype};base64,${request.file.buffer.toString('base64')}`;

  try {
    const result = await pool.query(
      `
        UPDATE puntos_aislamiento
        SET foto_url = $1
        WHERE id = $2 AND maquina_id = $3
        RETURNING id, maquina_id, id_visual, foto_url
      `,
      [dataUri, pointId, maquinaId],
    );

    const point = result.rows[0];

    if (!point) {
      response.status(404).json({ message: 'No se encontro el punto para la maquina seleccionada' });
      return;
    }

    response.status(201).json({
      ok: true,
      point,
      message: `Imagen actualizada para ${point.id_visual}`,
    });
  } catch (error) {
    response.status(500).json({ message: error.message });
  }
});

app.post('/api/maquinas/:machineId/map', upload.single('map'), async (request, response) => {
  const machineId = Number(request.params.machineId);

  if (!Number.isInteger(machineId) || machineId <= 0) {
    response.status(400).json({ message: 'machineId es obligatorio' });
    return;
  }

  if (!request.file) {
    response.status(400).json({ message: 'Debes seleccionar una imagen de mapa' });
    return;
  }

  const dataUri = `data:${request.file.mimetype};base64,${request.file.buffer.toString('base64')}`;

  try {
    const result = await pool.query(
      `
        UPDATE maquinas
        SET mapa_url = $1
        WHERE id = $2
        RETURNING id, nombre, linea, mapa_url
      `,
      [dataUri, machineId],
    );

    const machine = result.rows[0];

    if (!machine) {
      response.status(404).json({ message: 'No se encontro la maquina seleccionada' });
      return;
    }

    response.status(201).json({
      ok: true,
      machine,
      message: `Mapa actualizado para ${machine.nombre}`,
    });
  } catch (error) {
    response.status(500).json({ message: error.message });
  }
});

app.listen(port, () => {
  console.log(`Checklist API listening on port ${port}`);
});
