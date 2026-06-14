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
  const [uploadingPointId, setUploadingPointId] = useState(null);
  const [uploadingMap, setUploadingMap] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [activeTab, setActiveTab] = useState('checklist');
  const [operadores, setOperadores] = useState([]);
  const [historyDate, setHistoryDate] = useState(new Date().toISOString().slice(0, 10));
  const [historyOperator, setHistoryOperator] = useState('');
  const [historyRecords, setHistoryRecords] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState('new');
  const [sharpLookup, setSharpLookup] = useState({ loading: false, message: '' });
  const [metadata, setMetadata] = useState({
    fecha: new Date().toISOString().slice(0, 10),
    turno: '1',
    modo: 'parada',
    linea: '',
    maquinaId: '',
    numeroSharp: '',
    firmaOperador: '',
    firmaSupervisor: '',
  });
  const [checkState, setCheckState] = useState({});
  const [status, setStatus] = useState({ loading: true, saving: false, message: '', error: '' });
  const [successData, setSuccessData] = useState(null);

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

  useEffect(() => {
    const loadOperadores = async () => {
      try {
        const response = await fetch(`${API_URL}/api/operadores`);
        if (response.ok) {
          const data = await response.json();
          setOperadores(data);
        }
      } catch (error) {}
    };
    loadOperadores();
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
    if (!metadata.fecha || !metadata.turno || !metadata.modo || !metadata.maquinaId) return;

    const controller = new AbortController();
    const loadSessions = async () => {
      try {
        const search = new URLSearchParams({
          fecha: metadata.fecha,
          turno: metadata.turno,
          modo: metadata.modo,
          maquinaId: metadata.maquinaId,
        });
        const response = await fetch(`${API_URL}/api/sessions?${search.toString()}`, { signal: controller.signal });
        if (response.ok) {
          const payload = await response.json();
          setSessions(payload.sessions || []);
          setSelectedSessionId('new');
        }
      } catch (error) {}
    };
    loadSessions();
    return () => controller.abort();
  }, [metadata.fecha, metadata.turno, metadata.modo, metadata.maquinaId]);

  useEffect(() => {
    if (activeTab !== 'historial') return;
    const controller = new AbortController();
    const loadHistory = async () => {
      setHistoryLoading(true);
      try {
        const search = new URLSearchParams({ fecha: historyDate });
        if (historyOperator) search.append('operador', historyOperator);
        
        const response = await fetch(`${API_URL}/api/historial?${search.toString()}`, { signal: controller.signal });
        if (response.ok) {
          const data = await response.json();
          setHistoryRecords(data);
        }
      } catch (error) {
      } finally {
        setHistoryLoading(false);
      }
    };
    loadHistory();
    return () => controller.abort();
  }, [activeTab, historyDate, historyOperator]);

  useEffect(() => {
    if (!filteredPoints.length || !config.checks.length || !metadata.maquinaId) {
      setCheckState({});
      return;
    }

    if (selectedSessionId === 'new') {
      setCheckState({});
      setMetadata((current) => ({
        ...current,
        numeroSharp: '',
        firmaOperador: '',
        firmaSupervisor: '',
      }));
      return;
    }

    const controller = new AbortController();

    const loadExistingChecklist = async () => {
      try {
        setCheckState({});
        setMetadata((current) => ({
          ...current,
          numeroSharp: '',
          firmaOperador: '',
          firmaSupervisor: '',
        }));

        const search = new URLSearchParams({
          sessionId: selectedSessionId,
          maquinaId: metadata.maquinaId,
        });
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
          numeroSharp: payload.metadata.numeroSharp,
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
  }, [config.checks, filteredPoints, metadata.maquinaId, selectedSessionId]);

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

    if (name === 'numeroSharp') {
      setSharpLookup({ loading: false, message: '' });
      setMetadata((current) => ({
        ...current,
        numeroSharp: value,
        firmaOperador: '',
        firmaSupervisor: '',
      }));
      return;
    }

    setMetadata((current) => ({ ...current, [name]: value }));
  };

  useEffect(() => {
    if (!metadata.numeroSharp) {
      setSharpLookup({ loading: false, message: '' });
      setMetadata((current) => ({
        ...current,
        firmaOperador: '',
        firmaSupervisor: '',
      }));
      return undefined;
    }

    const controller = new AbortController();

    const loadSharpOwner = async () => {
      setSharpLookup({ loading: true, message: '' });

      try {
        const response = await fetch(`${API_URL}/api/sharp/${metadata.numeroSharp}`, { signal: controller.signal });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.message || 'No se pudo resolver el Numero Sharp');
        }

        setMetadata((current) => ({
          ...current,
          firmaOperador: payload.firmaOperador || '',
          firmaSupervisor: payload.firmaSupervisor || '',
        }));
        setSharpLookup({ loading: false, message: '' });
      } catch (error) {
        if (error.name !== 'AbortError') {
          setMetadata((current) => ({
            ...current,
            firmaOperador: '',
            firmaSupervisor: '',
          }));
          setSharpLookup({ loading: false, message: error.message });
        }
      }
    };

    loadSharpOwner();

    return () => controller.abort();
  }, [metadata.numeroSharp]);

  const handlePhotoUpload = async (pointId, file) => {
    if (!file || !metadata.maquinaId) {
      return;
    }

    setUploadingPointId(pointId);
    setStatus((current) => ({ ...current, message: '', error: '' }));

    try {
      const formData = new FormData();
      formData.append('photo', file);
      formData.append('maquinaId', metadata.maquinaId);

      const response = await fetch(`${API_URL}/api/puntos/${pointId}/photo`, {
        method: 'POST',
        body: formData,
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || 'No se pudo subir la imagen');
      }

      setConfig((current) => ({
        ...current,
        puntos: current.puntos.map((punto) => (
          punto.id === pointId
            ? { ...punto, foto_url: payload.point.foto_url }
            : punto
        )),
      }));
      setStatus((current) => ({ ...current, message: payload.message, error: '' }));
    } catch (error) {
      setStatus((current) => ({ ...current, message: '', error: error.message }));
    } finally {
      setUploadingPointId(null);
    }
  };

  const handleMapUpload = async (file) => {
    if (!file || !metadata.maquinaId) {
      return;
    }

    setUploadingMap(true);
    setStatus((current) => ({ ...current, message: '', error: '' }));

    try {
      const formData = new FormData();
      formData.append('map', file);

      const response = await fetch(`${API_URL}/api/maquinas/${metadata.maquinaId}/map`, {
        method: 'POST',
        body: formData,
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || 'No se pudo subir el mapa');
      }

      setConfig((current) => ({
        ...current,
        maquinas: current.maquinas.map((machine) => (
          machine.id === payload.machine.id
            ? { ...machine, mapa_url: payload.machine.mapa_url }
            : machine
        )),
      }));
      setStatus((current) => ({ ...current, message: payload.message, error: '' }));
    } catch (error) {
      setStatus((current) => ({ ...current, message: '', error: error.message }));
    } finally {
      setUploadingMap(false);
    }
  };

  const generateSessionId = () => {
    return typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `sess-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  };

  const handleDownloadCSV = () => {
    if (!historyRecords.length) return;

    const headers = ['Hora', 'Maquina', 'Punto', 'Descripcion del Punto', 'Check', 'Operador'];
    const rows = historyRecords.map(r => [
      new Date(r.created_at).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }),
      r.maquina_nombre,
      r.id_visual,
      r.punto_descripcion,
      r.check_nombre,
      r.firma_operador
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Historial_Novedades_${historyDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmit = async () => {
    if (!metadata.turno.trim()) {
      setStatus((current) => ({ ...current, error: 'El turno es obligatorio' }));
      return;
    }

    if (!metadata.numeroSharp) {
      setStatus((current) => ({ ...current, error: 'El Numero Sharp es obligatorio' }));
      return;
    }

    if (!metadata.firmaOperador || !metadata.firmaSupervisor) {
      setStatus((current) => ({ ...current, error: 'Numero Sharp no tiene responsables asociados' }));
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

    const sessionIdToSave = selectedSessionId === 'new' ? generateSessionId() : selectedSessionId;

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
          sessionId: sessionIdToSave,
          rows,
        }),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.message || 'No se pudo guardar la jornada');
      }

      setSuccessData({
        fecha: new Date().toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' }),
        usuario: metadata.firmaOperador,
      });
      setStatus({ loading: false, saving: false, message: '', error: '' });

      if (selectedSessionId === 'new') {
        setSessions((prev) => [
          { session_id: sessionIdToSave, created_at: new Date().toISOString(), firma_operador: metadata.firmaOperador },
          ...prev
        ]);
        setSelectedSessionId(sessionIdToSave);
      }
    } catch (error) {
      setStatus({ loading: false, saving: false, message: '', error: error.message });
    }
  };

  return (
    <main className="min-h-screen px-3 py-6 text-ink md:px-6">
      {successData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-xl">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <svg className="h-10 w-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-black text-slate-800">¡Ingreso de datos exitoso!</h2>
            <p className="mt-2 text-slate-600">Usted acaba de realizar su modulación.</p>

            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-slate-500">Fecha y Hora</span>
                <span className="text-sm font-semibold text-slate-800">{successData.fecha}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-slate-500">Usuario</span>
                <span className="text-sm font-semibold text-slate-800 text-right">{successData.usuario}</span>
              </div>
            </div>

            <button
              onClick={() => setSuccessData(null)}
              className="mt-8 w-full rounded-full bg-safety px-4 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-safetyDark"
            >
              Aceptar y Continuar
            </button>
          </div>
        </div>
      )}
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
        </header>

        <div className="flex border-b border-slate-500 bg-slate-100 text-sm font-black uppercase text-slate-600">
          <button
            onClick={() => setActiveTab('checklist')}
            className={`flex-1 py-3 transition ${activeTab === 'checklist' ? 'bg-safety text-white' : 'hover:bg-slate-200'}`}
          >
            Registro de Modulacion
          </button>
          <button
            onClick={() => setActiveTab('historial')}
            className={`flex-1 py-3 transition ${activeTab === 'historial' ? 'bg-safety text-white' : 'hover:bg-slate-200'}`}
          >
            Historial de Novedades
          </button>
        </div>

        {activeTab === 'checklist' ? (
          <>
            <div className="border-b border-slate-500 bg-softBlue px-4 py-2 text-center text-sm font-black uppercase md:text-base">
              {selectedMachine?.nombre || 'Selecciona una maquina'}
            </div>

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

        <section className="border-b-2 border-slate-500">
          <div className="border-b border-slate-500 px-3 py-2 text-sm font-black uppercase">Registro de produccion</div>
          <div className="grid gap-4 px-3 py-4 md:grid-cols-4">
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
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
              </select>
            </label>
            <label className="text-xs font-bold uppercase text-slate-700">
              Historial del Turno
              <select
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                className="mt-1 w-full border-0 border-b border-slate-500 bg-transparent px-0 py-2 text-sm font-semibold text-safety outline-none"
              >
                <option value="new">+ Nuevo Registro</option>
                {sessions.map((s) => (
                  <option key={s.session_id} value={s.session_id}>
                    {new Date(s.created_at).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })} - {s.firma_operador}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-bold uppercase text-slate-700">
              Numero Sharp
              <input
                name="numeroSharp"
                type="number"
                min="0"
                step="1"
                value={metadata.numeroSharp}
                onChange={handleMetadataChange}
                placeholder="Ej. 1250"
                className="mt-1 w-full border-0 border-b border-slate-500 bg-transparent px-0 py-2 text-sm outline-none"
              />
            </label>
            <label className="text-xs font-bold uppercase text-slate-700 md:col-span-2">
              Firma
              <input
                name="firmaOperador"
                value={metadata.firmaOperador}
                readOnly
                placeholder="Se completa con Numero Sharp"
                className="mt-1 w-full border-0 border-b border-slate-500 bg-slate-50 px-0 py-2 text-sm outline-none"
              />
            </label>
        <label className="text-xs font-bold uppercase text-slate-700 md:col-span-2">
              SUP
              <input
                name="firmaSupervisor"
                value={metadata.firmaSupervisor}
                readOnly
                placeholder="Se completa con Numero Sharp"
                className="mt-1 w-full border-0 border-b border-slate-500 bg-slate-50 px-0 py-2 text-sm outline-none"
              />
            </label>
          </div>
          {sharpLookup.loading && (
            <p className="px-3 pb-3 text-xs font-semibold text-slate-500">
              Buscando responsable por Numero Sharp...
            </p>
          )}
          {!sharpLookup.loading && sharpLookup.message && (
            <p className="px-3 pb-3 text-xs font-semibold text-rose-600">
              {sharpLookup.message}
            </p>
          )}
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
            <div className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {filteredPoints.map((punto) => (
                <article key={`photo-${punto.id}`} className="self-start overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
                  <div className="relative">
                    <LazyImage
                      src={punto.foto_url}
                      alt={`Foto referencial ${punto.id_visual}`}
                      fallbackLabel={punto.id_visual}
                      badgeColor={punto.color_hex}
                      className="aspect-[1/1] w-full bg-slate-100"
                    />
                    <label
                      className="absolute right-3 top-3 inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-white/70 bg-white/90 text-slate-700 shadow-sm backdrop-blur transition hover:bg-white"
                      title={uploadingPointId === punto.id ? 'Subiendo imagen' : `Subir imagen para ${punto.id_visual}`}
                    >
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        disabled={uploadingPointId === punto.id}
                        onChange={(event) => {
                          const file = event.target.files?.[0];

                          if (file) {
                            handlePhotoUpload(punto.id, file);
                          }

                          event.target.value = '';
                        }}
                      />
                      {uploadingPointId === punto.id ? (
                        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5 animate-spin">
                          <path
                            d="M12 3a9 9 0 1 0 9 9"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
                          <path
                            d="M12 16V7m0 0-3.5 3.5M12 7l3.5 3.5M5 17.5V19h14v-1.5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                      <span className="sr-only">{uploadingPointId === punto.id ? 'Subiendo imagen' : 'Subir imagen'}</span>
                    </label>
                  </div>
                  <div className="space-y-2 p-2.5">
                    <div className="flex items-start gap-2">
                      <span
                        className="inline-flex rounded-md px-2.5 py-1 text-[11px] font-black uppercase text-white"
                        style={{ backgroundColor: punto.color_hex }}
                      >
                        {punto.id_visual}
                      </span>
                    </div>
                    <p className="text-xs font-semibold leading-snug text-slate-700">{punto.descripcion}</p>
                  </div>
                </article>
              ))}
            </div>
            <div
              className="relative min-h-[480px] overflow-hidden rounded-[24px] border border-slate-300 bg-[linear-gradient(135deg,#f8fafc,#e2e8f0)] p-4"
              style={selectedMachine?.mapa_url ? {
                backgroundImage: `linear-gradient(rgba(248,250,252,0.22), rgba(226,232,240,0.30)), url(${selectedMachine.mapa_url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              } : undefined}
            >
              <div className="relative z-10 mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-700">
                  {selectedMachine?.mapa_url ? 'Mapa cargado para esta maquina' : 'Sube el mapa de esta maquina'}
                </p>
                <label className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-slate-300 bg-white/85 px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-700 shadow-sm transition hover:bg-white">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    disabled={uploadingMap || !metadata.maquinaId}
                    onChange={(event) => {
                      const file = event.target.files?.[0];

                      if (file) {
                        handleMapUpload(file);
                      }

                      event.target.value = '';
                    }}
                  />
                  {uploadingMap ? 'Subiendo mapa...' : 'Subir mapa'}
                </label>
              </div>
              <div className="absolute inset-0 opacity-40" style={{
                backgroundImage:
                  'linear-gradient(90deg, rgba(148,163,184,0.4) 1px, transparent 1px), linear-gradient(rgba(148,163,184,0.4) 1px, transparent 1px)',
                backgroundSize: '32px 32px',
              }} />
              <div className="relative z-10 h-full rounded-[18px] border border-dashed border-slate-400 bg-white/60 backdrop-blur-[1px]">
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
          </>
        ) : (
          <section className="p-4 md:p-6 bg-slate-50 rounded-b-[28px]">
            <div className="mb-6 grid gap-4 md:grid-cols-3">
              <label className="text-xs font-bold uppercase text-slate-700">
                Fecha
                <input
                  type="date"
                  value={historyDate}
                  onChange={(e) => setHistoryDate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none"
                />
              </label>
              <label className="text-xs font-bold uppercase text-slate-700">
                Operador (Busqueda)
                <input
                  list="operadores-list"
                  value={historyOperator}
                  onChange={(e) => setHistoryOperator(e.target.value)}
                  placeholder="Escribe para buscar..."
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none"
                />
                <datalist id="operadores-list">
                  {operadores.map(op => (
                    <option key={op.numero_sharp} value={op.nombre_completo} />
                  ))}
                </datalist>
              </label>
              <div className="flex items-end">
                <button
                  onClick={handleDownloadCSV}
                  disabled={!historyRecords.length}
                  className="w-full rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black uppercase text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  Descargar CSV / Excel
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-300 bg-white shadow-sm">
              <table className="min-w-full border-collapse text-left text-xs md:text-sm">
                <thead>
                  <tr className="border-b border-slate-300 bg-slate-100 uppercase text-slate-700">
                    <th className="px-4 py-3 font-bold">Hora</th>
                    <th className="px-4 py-3 font-bold">Maquina</th>
                    <th className="px-4 py-3 font-bold">Punto</th>
                    <th className="px-4 py-3 font-bold">Descripcion</th>
                    <th className="px-4 py-3 font-bold">Check</th>
                    <th className="px-4 py-3 font-bold">Operador</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {historyLoading ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-8 text-center font-semibold text-slate-500">Cargando historial...</td>
                    </tr>
                  ) : historyRecords.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-8 text-center font-semibold text-slate-500">No se encontraron registros de novedades (True) para estos filtros.</td>
                    </tr>
                  ) : (
                    historyRecords.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="whitespace-nowrap px-4 py-3">{new Date(r.created_at).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800">{r.maquina_nombre}</td>
                        <td className="px-4 py-3"><span className="rounded bg-slate-200 px-2 py-1 text-xs font-bold text-slate-700">{r.id_visual}</span></td>
                        <td className="px-4 py-3">{r.punto_descripcion}</td>
                        <td className="px-4 py-3 font-semibold text-safety">{r.check_nombre}</td>
                        <td className="px-4 py-3">{r.firma_operador}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

export default App;