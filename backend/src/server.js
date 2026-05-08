import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import pg from 'pg';

const { Pool } = pg;

const app = express();
const port = Number(process.env.PORT || 3001);
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
          SELECT id, nombre, linea, orden
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

app.get('/api/checklist', async (request, response) => {
  const { fecha, turno, maquinaId } = request.query;
  const resolvedMachineId = Number(maquinaId);

  if (!fecha || !turno || !Number.isInteger(resolvedMachineId) || resolvedMachineId <= 0) {
    response.status(400).json({ message: 'fecha, turno y maquinaId son obligatorios' });
    return;
  }

  try {
    const result = await pool.query(
      `
        SELECT
          rc.fecha,
          rc.turno,
          rc.maquina_id,
          rc.punto_id,
          rc.check_id,
          rc.valor,
          rc.op_numero,
          rc.firma_operador,
          rc.firma_supervisor,
          pa.id_visual,
          tc.descripcion_corta
        FROM registros_checklist rc
        JOIN puntos_aislamiento pa ON pa.id = rc.punto_id
        JOIN tipos_check tc ON tc.id = rc.check_id
        WHERE rc.fecha = $1 AND rc.turno = $2 AND rc.maquina_id = $3
        ORDER BY pa.orden ASC, tc.orden ASC
      `,
      [fecha, turno, resolvedMachineId],
    );

    const metadataSource = result.rows[0] || null;

    response.json({
      fecha,
      turno,
      metadata: metadataSource
        ? {
            opNumero: metadataSource.op_numero || '',
            firmaOperador: metadataSource.firma_operador || '',
            firmaSupervisor: metadataSource.firma_supervisor || '',
          }
        : {
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

app.post('/api/checklist', async (request, response) => {
  const { fecha, turno, maquinaId, opNumero, firmaOperador, firmaSupervisor, rows } = request.body;
  const resolvedMachineId = Number(maquinaId);

  if (!fecha || !turno || !Number.isInteger(resolvedMachineId) || resolvedMachineId <= 0 || !Array.isArray(rows) || rows.length === 0) {
    response.status(400).json({ message: 'fecha, turno, maquinaId y rows son obligatorios' });
    return;
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const values = [];
    const params = [];

    rows.forEach((row, index) => {
      const baseIndex = index * 9;
      params.push(fecha, turno, resolvedMachineId, row.puntoId, row.checkId, row.valor, opNumero || '', firmaOperador || '', firmaSupervisor || '');
      values.push(
        `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6}, $${baseIndex + 7}, $${baseIndex + 8}, $${baseIndex + 9})`,
      );
    });

    await client.query(
      `
        INSERT INTO registros_checklist
          (fecha, turno, maquina_id, punto_id, check_id, valor, op_numero, firma_operador, firma_supervisor)
        VALUES ${values.join(', ')}
        ON CONFLICT (fecha, turno, maquina_id, punto_id, check_id)
        DO UPDATE SET
          valor = EXCLUDED.valor,
          op_numero = EXCLUDED.op_numero,
          firma_operador = EXCLUDED.firma_operador,
          firma_supervisor = EXCLUDED.firma_supervisor,
          updated_at = NOW()
      `,
      params,
    );

    await client.query('COMMIT');
    response.status(201).json({ ok: true, savedRows: rows.length, maquinaId: resolvedMachineId });
  } catch (error) {
    await client.query('ROLLBACK');
    response.status(500).json({ message: error.message });
  } finally {
    client.release();
  }
});

app.listen(port, () => {
  console.log(`Checklist API listening on port ${port}`);
});
