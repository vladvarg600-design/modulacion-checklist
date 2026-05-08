import { useEffect, useMemo, useRef, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const getFallbackMarkerPosition = (index, total) => {
  const columns = total > 9 ? 4 : total > 4 ? 3 : 2;
  const rows = Math.max(1, Math.ceil(total / columns));
  const columnIndex = index % columns;
  const rowIndex = Math.floor(index / columns);

  return {
    left: 18 + ((columnIndex + 0.5) * 64) / columns,
    top: 18 + ((rowIndex + 0.5) * 58) / rows,
  };
};

const createPlaceholderDataUri = (label, color) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#f8fafc" />
          <stop offset="100%" stop-color="#dbeafe" />
        </linearGradient>
      </defs>
      <rect width="640" height="420" rx="24" fill="url(#g)" />
      <rect x="40" y="40" width="560" height="340" rx="20" fill="#e2e8f0" stroke="#94a3b8" stroke-width="4" stroke-dasharray="10 8" />
      <text x="320" y="180" text-anchor="middle" font-family="Trebuchet MS, sans-serif" font-size="36" font-weight="700" fill="#0f172a">Imagen referencial</text>
      <text x="320" y="228" text-anchor="middle" font-family="Trebuchet MS, sans-serif" font-size="54" font-weight="700" fill="${color}">${label}</text>
      <text x="320" y="280" text-anchor="middle" font-family="Trebuchet MS, sans-serif" font-size="22" fill="#334155">Sube una foto WebP desde tu storage</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

function LazyImage({ src, alt, fallbackLabel, badgeColor, className }) {
  const [visible, setVisible] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '240px' },
    );

    if (wrapperRef.current) {
      observer.observe(wrapperRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const resolvedSrc = src || createPlaceholderDataUri(fallbackLabel, badgeColor);

  return (
    <div ref={wrapperRef} className={className}>
      {visible ? (
        <img src={resolvedSrc} alt={alt} loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-slate-200 text-sm font-bold text-slate-600">
          Cargando imagen...
        </div>
      )}
    </div>
  );
}

function App() {
  const [config, setConfig] = useState({ lineas: [], maquinas: [], puntos: [], checks: [] });
  const [metadata, setMetadata] = useState({
    fecha: new Date().toISOString().slice(0, 10),
    turno: 'A',
    linea: '',
    maquinaId: '',
    opNumero: '',
    firmaOperador: '',
    firmaSupervisor: '',
  });
  const [checkState, setCheckState] = useState({});
  const [status, setStatus] = useState({ loading: true, saving: false, message: '', error: '' });

  useEffect(() => {
    const controller = new AbortController();

    const loadConfig = async () => {
      try {
        const response = await fetch(`${API_URL}/api/config`, { signal: controller.signal });

        if (!response.ok) {
          throw new Error('No se pudo cargar la configuracion inicial');
        }

        const payload = await response.json();
        setConfig(payload);
        setMetadata((current) => {
          const lineas = payload.lineas || [];
          const nextLinea = lineas.includes(current.linea) ? current.linea : (lineas[0] || '');
          const maquinasLinea = (payload.maquinas || []).filter((machine) => machine.linea === nextLinea);
          const nextMaquinaId = maquinasLinea.some((machine) => String(machine.id) === current.maquinaId)
            ? current.maquinaId
            : String(maquinasLinea[0]?.id || '');

          return {
            ...current,
            linea: nextLinea,
            maquinaId: nextMaquinaId,
          };
        });
        setStatus((current) => ({ ...current, loading: false }));
      } catch (error) {
        if (error.name !== 'AbortError') {
          setStatus({ loading: false, saving: false, message: '', error: error.message });
        }
      }
    };

    loadConfig();

    return () => controller.abort();
  }, []);

  const machinesForSelectedLine = useMemo(
    () => config.maquinas.filter((machine) => machine.linea === metadata.linea),
    [config.maquinas, metadata.linea],
  );

  useEffect(() => {
    if (!machinesForSelectedLine.length) {
      return;
    }

    const hasSelectedMachine = machinesForSelectedLine.some((machine) => String(machine.id) === metadata.maquinaId);

    if (!hasSelectedMachine) {
      setMetadata((current) => ({
        ...current,
        maquinaId: String(machinesForSelectedLine[0].id),
      }));
    }
  }, [machinesForSelectedLine, metadata.maquinaId]);

  const selectedMachine = useMemo(
    () => config.maquinas.find((machine) => String(machine.id) === metadata.maquinaId) || null,
    [config.maquinas, metadata.maquinaId],
  );

  const filteredPoints = useMemo(
    () => config.puntos.filter((punto) => String(punto.maquina_id) === metadata.maquinaId),
    [config.puntos, metadata.maquinaId],
  );

  useEffect(() => {
    if (!filteredPoints.length || !config.checks.length || !metadata.maquinaId) {
      setCheckState({});
      return;
    }

    const controller = new AbortController();

    const loadExistingChecklist = async () => {
      try {
        setCheckState({});
        setMetadata((current) => ({
          ...current,
          opNumero: '',
          firmaOperador: '',
          firmaSupervisor: '',
        }));

        const search = new URLSearchParams({ fecha: metadata.fecha, turno: metadata.turno, maquinaId: metadata.maquinaId });
        const response = await fetch(`${API_URL}/api/checklist?${search.toString()}`, { signal: controller.signal });

        if (!response.ok) {
          throw new Error('No se pudo cargar la jornada actual');
        }

        const payload = await response.json();
        const nextState = {};

        payload.registros.forEach((row) => {
          nextState[`${row.punto_id}-${row.check_id}`] = row.valor;
        });

        setCheckState(nextState);
        setMetadata((current) => ({
          ...current,
          opNumero: payload.metadata.opNumero,
          firmaOperador: payload.metadata.firmaOperador,
          firmaSupervisor: payload.metadata.firmaSupervisor,
        }));
      } catch (error) {
        if (error.name !== 'AbortError') {
          setStatus((current) => ({ ...current, error: error.message }));
        }
      }
    };

    loadExistingChecklist();

    return () => controller.abort();
  }, [config.checks, filteredPoints, metadata.fecha, metadata.turno, metadata.maquinaId]);

  const groupedChecks = useMemo(() => {
    const parada = config.checks.filter((check) => check.grupo === 'parada');
    const arranque = config.checks.filter((check) => check.grupo === 'arranque');
    const breakdown = config.checks.filter((check) => check.grupo === 'breakdown');
    return { parada, arranque, breakdown };
  }, [config.checks]);

  const toggleCheck = (puntoId, checkId) => {
    const key = `${puntoId}-${checkId}`;
    setCheckState((current) => ({ ...current, [key]: !current[key] }));
  };

  const handleMetadataChange = (event) => {
    const { name, value } = event.target;
    setMetadata((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!metadata.turno.trim()) {
      setStatus((current) => ({ ...current, error: 'El turno es obligatorio' }));
      return;
    }

    if (!metadata.maquinaId) {
      setStatus((current) => ({ ...current, error: 'Selecciona una maquina antes de guardar' }));
      return;
    }

    if (!filteredPoints.length) {
      setStatus((current) => ({ ...current, error: 'La maquina seleccionada no tiene puntos cargados' }));
      return;
    }

    setStatus({ loading: false, saving: true, message: '', error: '' });

    try {
      const rows = filteredPoints.flatMap((punto) =>
        config.checks.map((check) => ({
          puntoId: punto.id,
          checkId: check.id,
          valor: Boolean(checkState[`${punto.id}-${check.id}`]),
        })),
      );

      const response = await fetch(`${API_URL}/api/checklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...metadata,
          maquinaId: Number(metadata.maquinaId),
          rows,
        }),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.message || 'No se pudo guardar la jornada');
      }

      setStatus({ loading: false, saving: false, message: 'Jornada guardada correctamente.', error: '' });
    } catch (error) {
      setStatus({ loading: false, saving: false, message: '', error: error.message });
    }
  };

  return (
    <main className="min-h-screen px-3 py-6 text-ink md:px-6">
      <div className="mx-auto max-w-7xl rounded-[28px] border border-slate-300 bg-paper shadow-sheet">
        <header className="border-b-2 border-slate-500">
          <div className="grid min-h-24 grid-cols-[1fr_2fr_1fr] items-stretch text-center text-xs font-bold uppercase md:text-sm">
            <div className="flex items-center justify-center border-r border-slate-500 px-3 py-4">
              <div className="rounded-full border border-slate-400 bg-white px-4 py-2 text-lg font-black tracking-tight text-slate-700">
                ABInBev
              </div>
            </div>
            <div className="flex items-center justify-center border-r border-slate-500 px-4 text-base font-black md:text-2xl">
              Cerveceria Quito
            </div>
            <div className="flex flex-col items-center justify-center gap-1 px-3 py-3 text-[10px] md:text-xs">
              <div className="text-2xl font-black italic text-safetyDark">VPO</div>
              <span>APP-MA-VPOE-J-002</span>
            </div>
          </div>
          <div className="border-t border-slate-500 bg-safety px-4 py-1 text-center text-sm font-black uppercase text-white md:text-base">
            Checklist de modulacion de energia y fluidos
          </div>
          <div className="border-t border-slate-500 px-4 py-1 text-center text-xs font-bold uppercase md:text-sm">Packaging</div>
          <div className="border-t border-slate-500 bg-softBlue px-4 py-2 text-center text-sm font-black uppercase md:text-base">
            {selectedMachine?.nombre || 'Selecciona una maquina'}
          </div>
        </header>

        <section className="border-b border-slate-500 bg-slate-50 px-4 py-4">
          <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
            <label className="text-xs font-bold uppercase text-slate-700">
              Linea
              <select
                name="linea"
                value={metadata.linea}
                onChange={handleMetadataChange}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none"
              >
                {config.lineas.map((linea) => (
                  <option key={linea} value={linea}>{linea}</option>
                ))}
              </select>
            </label>

            <label className="text-xs font-bold uppercase text-slate-700">
              Maquina
              <select
                name="maquinaId"
                value={metadata.maquinaId}
                onChange={handleMetadataChange}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none"
              >
                {machinesForSelectedLine.map((machine) => (
                  <option key={machine.id} value={machine.id}>{machine.nombre}</option>
                ))}
              </select>
            </label>
          </div>
          <p className="mt-3 text-xs font-medium text-slate-600">
            Los puntos de aislamiento se cargan desde la lista maestra de seguridades segun la linea y la maquina seleccionadas.
          </p>
        </section>

        <section className="overflow-x-auto border-b-2 border-slate-500">
          <table className="min-w-full border-collapse text-[11px] md:text-sm">
            <thead>
              <tr className="bg-softBlue text-center font-bold uppercase">
                <th rowSpan="2" className="min-w-32 border border-slate-500 px-2 py-3">ID de punto de aislamiento</th>
                <th rowSpan="2" className="min-w-64 border border-slate-500 px-2 py-3">Descripcion del punto de aislamiento</th>
                <th colSpan={groupedChecks.parada.length} className="border border-slate-500 px-2 py-3">Paradas de produccion</th>
                <th colSpan={groupedChecks.arranque.length} className="border border-slate-500 px-2 py-3">Arranque</th>
                <th colSpan={groupedChecks.breakdown.length} className="border border-slate-500 px-2 py-3">BrakeDown o CIP</th>
              </tr>
              <tr className="bg-slate-50 text-center font-semibold">
                {groupedChecks.parada.map((check) => (
                  <th key={check.id} className="min-w-32 border border-slate-500 px-2 py-2">
                    {check.descripcion_corta}
                    <div className="mt-1 text-[10px] font-normal normal-case text-slate-600">{check.nombre}</div>
                  </th>
                ))}
                {groupedChecks.arranque.map((check) => (
                  <th key={check.id} className="min-w-28 border border-slate-500 px-2 py-2">{check.descripcion_corta}</th>
                ))}
                {groupedChecks.breakdown.map((check) => (
                  <th key={check.id} className="min-w-32 border border-slate-500 px-2 py-2">{check.descripcion_corta}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredPoints.map((punto) => (
                <tr key={punto.id} className="bg-white">
                  <td className="border border-slate-500 px-1 py-2">
                    <span
                      className="inline-flex min-w-full items-center justify-center rounded-sm px-2 py-1 text-center text-[11px] font-bold text-white md:text-xs"
                      style={{ backgroundColor: punto.color_hex }}
                    >
                      {punto.id_visual}
                    </span>
                  </td>
                  <td className="border border-slate-500 px-2 py-2 align-middle">{punto.descripcion}</td>
                  {config.checks.map((check) => {
                    const key = `${punto.id}-${check.id}`;
                    const checked = Boolean(checkState[key]);

                    return (
                      <td key={key} className="border border-slate-500 px-2 py-2 text-center align-middle">
                        <label className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-slate-300 bg-slate-50 p-2 shadow-sm transition hover:bg-slate-100">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleCheck(punto.id, check.id)}
                            className="h-6 w-6 accent-safety md:h-7 md:w-7"
                          />
                        </label>
                      </td>
                    );
                  })}
                </tr>
              ))}
              {!filteredPoints.length && !status.loading && (
                <tr>
                  <td colSpan={2 + config.checks.length} className="border border-slate-500 px-3 py-6 text-center text-slate-500">
                    No hay puntos cargados para la maquina seleccionada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <section className="grid gap-0 border-b-2 border-slate-500 lg:grid-cols-2">
          {[
            { title: 'Parada de produccion', suffix: 'parada' },
            { title: 'Arranque o inicio de produccion', suffix: 'arranque' },
          ].map((panel) => (
            <div key={panel.suffix} className="border-r border-slate-500 last:border-r-0">
              <div className="border-b border-slate-500 px-3 py-2 text-sm font-black uppercase">{panel.title}</div>
              <div className="grid gap-4 px-3 py-4 md:grid-cols-2">
                <label className="text-xs font-bold uppercase text-slate-700">
                  Fecha
                  <input
                    name="fecha"
                    type="date"
                    value={metadata.fecha}
                    onChange={handleMetadataChange}
                    className="mt-1 w-full border-0 border-b border-slate-500 bg-transparent px-0 py-2 text-sm outline-none"
                  />
                </label>
                <label className="text-xs font-bold uppercase text-slate-700">
                  Turno
                  <select
                    name="turno"
                    value={metadata.turno}
                    onChange={handleMetadataChange}
                    className="mt-1 w-full border-0 border-b border-slate-500 bg-transparent px-0 py-2 text-sm outline-none"
                  >
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                  </select>
                </label>
                <label className="text-xs font-bold uppercase text-slate-700">
                  OP
                  <input
                    name="opNumero"
                    value={metadata.opNumero}
                    onChange={handleMetadataChange}
                    placeholder="Orden de produccion"
                    className="mt-1 w-full border-0 border-b border-slate-500 bg-transparent px-0 py-2 text-sm outline-none"
                  />
                </label>
                <label className="text-xs font-bold uppercase text-slate-700">
                  Firma
                  <input
                    name="firmaOperador"
                    value={metadata.firmaOperador}
                    onChange={handleMetadataChange}
                    placeholder="Nombre del operador"
                    className="mt-1 w-full border-0 border-b border-slate-500 bg-transparent px-0 py-2 text-sm outline-none"
                  />
                </label>
                <label className="text-xs font-bold uppercase text-slate-700 md:col-span-2">
                  SUP
                  <input
                    name="firmaSupervisor"
                    value={metadata.firmaSupervisor}
                    onChange={handleMetadataChange}
                    placeholder="Nombre del supervisor"
                    className="mt-1 w-full border-0 border-b border-slate-500 bg-transparent px-0 py-2 text-sm outline-none"
                  />
                </label>
              </div>
            </div>
          ))}
        </section>

        <section>
          <div className="bg-safety px-4 py-1 text-center text-sm font-black uppercase text-white md:text-base">
            Mapa de modulacion de E&amp;F
          </div>
          <div className="border-y border-slate-500 px-4 py-2 text-center text-sm font-black uppercase md:text-base">
            Packaging
          </div>
          <div className="border-b border-slate-500 bg-softBlue px-4 py-2 text-center text-sm font-black uppercase md:text-base">
            {selectedMachine?.nombre || 'Selecciona una maquina'}
          </div>
          <div className="grid gap-5 p-4 lg:grid-cols-[1.7fr_1fr]">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {filteredPoints.map((punto) => (
                <article key={`photo-${punto.id}`} className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
                  <LazyImage
                    src={punto.foto_url}
                    alt={`Foto referencial ${punto.id_visual}`}
                    fallbackLabel={punto.id_visual}
                    badgeColor={punto.color_hex}
                    className="aspect-[4/5] w-full bg-slate-100"
                  />
                  <div className="p-3">
                    <span
                      className="inline-flex rounded-md px-3 py-1 text-xs font-black uppercase text-white"
                      style={{ backgroundColor: punto.color_hex }}
                    >
                      {punto.id_visual}
                    </span>
                    <p className="mt-2 text-sm font-semibold text-slate-700">{punto.descripcion}</p>
                  </div>
                </article>
              ))}
            </div>
            <div className="relative min-h-[480px] overflow-hidden rounded-[24px] border border-slate-300 bg-[linear-gradient(135deg,#f8fafc,#e2e8f0)] p-4">
              <div className="absolute inset-0 opacity-40" style={{
                backgroundImage:
                  'linear-gradient(90deg, rgba(148,163,184,0.4) 1px, transparent 1px), linear-gradient(rgba(148,163,184,0.4) 1px, transparent 1px)',
                backgroundSize: '32px 32px',
              }} />
              <div className="relative h-full rounded-[18px] border border-dashed border-slate-400 bg-white/60">
                <div className="absolute left-[18%] top-[10%] h-[75%] w-[12%] rounded-full border border-slate-400 bg-slate-100/90" />
                <div className="absolute left-[37%] top-[6%] h-[84%] w-[10%] rounded-full border border-slate-400 bg-slate-100/90" />
                <div className="absolute left-[56%] top-[18%] h-[64%] w-[11%] rounded-full border border-slate-400 bg-slate-100/90" />
                <div className="absolute left-[74%] top-[22%] h-[52%] w-[9%] rounded-full border border-slate-400 bg-slate-100/90" />
                {filteredPoints.map((punto, index) => {
                  const fallbackPosition = getFallbackMarkerPosition(index, filteredPoints.length);

                  return (
                    <span
                      key={`marker-${punto.id}`}
                      className="absolute inline-flex -translate-x-1/2 -translate-y-1/2 rounded-md px-3 py-1 text-xs font-black uppercase text-white shadow-lg"
                      style={{
                        left: `${punto.blueprint_x ?? fallbackPosition.left}%`,
                        top: `${punto.blueprint_y ?? fallbackPosition.top}%`,
                        backgroundColor: punto.color_hex,
                      }}
                    >
                      {punto.id_visual}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <footer className="flex flex-col gap-3 border-t-2 border-slate-500 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            {status.loading && <p className="text-sm font-semibold text-slate-600">Cargando configuracion...</p>}
            {status.message && <p className="text-sm font-semibold text-emerald-700">{status.message}</p>}
            {status.error && <p className="text-sm font-semibold text-red-700">{status.error}</p>}
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={status.loading || status.saving || !filteredPoints.length || !metadata.maquinaId}
            className="inline-flex items-center justify-center rounded-full bg-safety px-6 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-safetyDark disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {status.saving ? 'Guardando...' : 'Subir a base de datos'}
          </button>
        </footer>
      </div>
    </main>
  );
}

export default App;