import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { equiposApi, mantenimientosApi, catalogosApi } from '../api/services';
import { mensajeError } from '../api/client';
import {
  TIPOS_MANTENIMIENTO, PERIODOS, ESTADOS_RESULTANTE, TIPO_MANT_LABEL, hoyISO,
  ESTADOS_EQUIPO,
} from '../data/constants';
import EstadoBadge from '../components/EstadoBadge';

// Registro de mantenimiento (RF03/RF04/RF05). El validador de MongoDB exige
// equipo, empresa, periodo, tipo, descripción, estado resultante, fecha y horas.
// La empresa NO se elige en el formulario: el backend la deriva del usuario
// autenticado (técnico → su empresa afiliada; supervisor/admin → Interno IGSS).
// El equipo se localiza con un buscador de filtros (server-side, endpoint /equipos).
const VACIO = {
  equipoId: '', tipoTrabajo: '', periodo: '', fecha: hoyISO(), horaInicio: '', horaFin: '',
  descripcion: '', repuestos: '', estadoFinal: 'funcionando',
};

export default function RegistroMantenimiento() {
  const { usuario } = useAuth();
  const [form, setForm] = useState(VACIO);
  const [equipoSel, setEquipoSel] = useState(null); // objeto completo del equipo elegido
  const [tocado, setTocado] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [verHistorial, setVerHistorial] = useState(false);
  const [historial, setHistorial] = useState([]);
  const [duplicado, setDuplicado] = useState(null);

  // --- Selector de equipo (modal con filtros) ---
  const [picker, setPicker] = useState(false);
  const [fBuscar, setFBuscar] = useState('');
  const [fTipo, setFTipo] = useState('');
  const [fSubtipo, setFSubtipo] = useState('');
  const [fMarca, setFMarca] = useState('');
  const [fUbic, setFUbic] = useState('');
  const [fEstado, setFEstado] = useState('');
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [tiposEquipo, setTiposEquipo] = useState([]);
  const [subtipos, setSubtipos] = useState([]); // {valor, padre}
  const [marcas, setMarcas] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);

  // Catálogos para los desplegables de filtro (una sola vez).
  useEffect(() => {
    catalogosApi.listar('tipoEquipo').then((d) => setTiposEquipo((d || []).map((x) => x.valor))).catch(() => {});
    catalogosApi.listar('subTipo').then((d) => setSubtipos((d || []).map((x) => ({ valor: x.valor, padre: x.padre })))).catch(() => {});
    catalogosApi.listar('marca').then((d) => setMarcas((d || []).map((x) => x.valor))).catch(() => {});
    catalogosApi.listar('ubicacion').then((d) => setUbicaciones((d || []).map((x) => x.valor))).catch(() => {});
  }, []);

  const subtiposDisponibles = subtipos
    .filter((s) => !fTipo || s.padre === fTipo)
    .map((s) => s.valor);

  // Consulta al backend (server-side) cuando el picker está abierto y cambian los filtros.
  useEffect(() => {
    if (!picker) return;
    setBuscando(true);
    const t = setTimeout(() => {
      const params = {};
      if (fBuscar.trim()) params.buscar = fBuscar.trim();
      if (fTipo) params.tipoEquipo = fTipo;
      if (fSubtipo) params.subTipo = fSubtipo;
      if (fMarca) params.marca = fMarca;
      if (fUbic) params.ubicacion = fUbic;
      if (fEstado) params.estado = fEstado;
      equiposApi.listar(params)
        .then((data) => setResultados(data || []))
        .catch(() => setResultados([]))
        .finally(() => setBuscando(false));
    }, 300);
    return () => clearTimeout(t);
  }, [picker, fBuscar, fTipo, fSubtipo, fMarca, fUbic, fEstado]);

  const limpiarFiltros = () => {
    setFBuscar(''); setFTipo(''); setFSubtipo(''); setFMarca(''); setFUbic(''); setFEstado('');
  };
  const hayFiltros = fBuscar || fTipo || fSubtipo || fMarca || fUbic || fEstado;

  const seleccionarEquipo = (eq) => {
    setEquipoSel(eq);
    setForm((f) => ({ ...f, equipoId: eq._id }));
    setGuardado(false);
    setPicker(false);
  };

  // Verificación de posible duplicado (RF05).
  useEffect(() => {
    setDuplicado(null);
    if (!form.equipoId || !form.fecha) return;
    const t = setTimeout(() => {
      mantenimientosApi.verificarDuplicado(form.equipoId, form.fecha)
        .then((r) => setDuplicado(r.duplicado ? r : null))
        .catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [form.equipoId, form.fecha]);

  // Historial del equipo seleccionado (RF06).
  useEffect(() => {
    if (!form.equipoId) { setHistorial([]); return; }
    mantenimientosApi.listar({ equipo: form.equipoId }).then(setHistorial).catch(() => {});
  }, [form.equipoId, guardado]);

  const faltan = {
    equipoId: tocado && !form.equipoId,
    tipoTrabajo: tocado && !form.tipoTrabajo,
    periodo: tocado && !form.periodo,
    horaInicio: tocado && !form.horaInicio,
    horaFin: tocado && !form.horaFin,
    descripcion: tocado && !form.descripcion.trim(),
  };
  const incompleto = !form.equipoId || !form.tipoTrabajo
    || !form.periodo || !form.horaInicio || !form.horaFin || !form.descripcion.trim();

  const set = (k, v) => { setForm({ ...form, [k]: v }); setGuardado(false); };

  const enviar = async (confirmarDuplicado) => {
    setTocado(true);
    setError('');
    if (incompleto) return;
    setGuardando(true);
    try {
      await mantenimientosApi.crear({
        equipo: form.equipoId,
        periodo: form.periodo,
        tipoTrabajo: form.tipoTrabajo,
        descripcionTrabajo: form.descripcion.trim(),
        repuestosObservaciones: form.repuestos,
        estadoEquipoResultante: form.estadoFinal,
        fechaMantenimiento: form.fecha,
        horaInicio: form.horaInicio,
        horaFin: form.horaFin,
        confirmarDuplicado: confirmarDuplicado || undefined,
      });
      setGuardado(true);
      setDuplicado(null);
      limpiar(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      const data = e?.response?.data;
      if (e?.response?.status === 409 && data?.duplicado) {
        setDuplicado({ duplicado: true, registroId: data.registroId, exigeConfirmar: true });
      } else {
        setError(mensajeError(e, 'No se pudo guardar el registro.'));
      }
    } finally {
      setGuardando(false);
    }
  };

  const limpiar = (conservarMsg) => {
    setForm(VACIO);
    setEquipoSel(null);
    setTocado(false);
    setDuplicado(null);
    if (!conservarMsg) setGuardado(false);
  };

  return (
    <>
      <h1 className="titulo-pantalla mb-1">Registro de mantenimiento</h1>
      <p className="texto-auxiliar mb-3">Registre una intervención localizando el equipo con el buscador de filtros. La fecha y el técnico se asignan automáticamente.</p>

      {guardado && (
        <div className="alert alert-success d-flex align-items-center" role="alert">
          <i className="bi bi-check-circle-fill me-2" />
          <div>Registro guardado correctamente.</div>
        </div>
      )}
      {error && <div className="alert alert-danger py-2 px-3">{error}</div>}

      <div className="card">
        <div className="card-header py-2 titulo-seccion">Datos de la intervención</div>
        <div className="card-body">
          <div className="row g-4">
            {/* Columna izquierda */}
            <div className="col-12 col-lg-6">
              {/* Selector de equipo */}
              <div className="mb-3">
                <label className="form-label">Equipo intervenido <span className="text-danger">*</span></label>
                {!equipoSel ? (
                  <div>
                    <button
                      type="button"
                      className={`btn btn-outline-primary w-100 ${faltan.equipoId ? 'border-danger text-danger' : ''}`}
                      onClick={() => setPicker(true)}>
                      <i className="bi bi-search me-2" />Buscar y seleccionar equipo…
                    </button>
                    {faltan.equipoId && <div className="text-danger mt-1" style={{ fontSize: '.85rem' }}>Seleccione un equipo del catálogo.</div>}
                  </div>
                ) : (
                  <div className="border rounded p-2">
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <div className="fw-semibold">{equipoSel.codigoInventario} — {equipoSel.nombre}</div>
                        <div className="texto-auxiliar" style={{ fontSize: '13px' }}>
                          Serie: {equipoSel.serie || 'S/S'} · {equipoSel.tipoEquipo} / {equipoSel.subTipo} · {equipoSel.marca}
                        </div>
                        <div className="texto-auxiliar" style={{ fontSize: '13px' }}>
                          <i className="bi bi-geo-alt me-1" />{equipoSel.ubicacion} · <EstadoBadge estado={equipoSel.estado} />
                        </div>
                      </div>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setPicker(true)}>
                        <i className="bi bi-arrow-repeat me-1" />Cambiar
                      </button>
                    </div>
                    <div className="mt-2">
                      <button className="btn btn-link btn-sm p-0" onClick={() => setVerHistorial(!verHistorial)}>
                        <i className="bi bi-clock-history me-1" />{verHistorial ? 'Ocultar' : 'Ver'} historial ({historial.length})
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="mb-3">
                <label className="form-label">Tipo de mantenimiento <span className="text-danger">*</span></label>
                <select className={`form-select ${faltan.tipoTrabajo ? 'is-invalid' : ''}`} value={form.tipoTrabajo} onChange={(e) => set('tipoTrabajo', e.target.value)}>
                  <option value="">Seleccione…</option>
                  {TIPOS_MANTENIMIENTO.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                {faltan.tipoTrabajo && <div className="invalid-feedback">Seleccione el tipo de mantenimiento.</div>}
              </div>

              <div className="mb-3">
                <label className="form-label">Periodo de mantenimiento <span className="text-danger">*</span></label>
                <select className={`form-select ${faltan.periodo ? 'is-invalid' : ''}`} value={form.periodo} onChange={(e) => set('periodo', e.target.value)}>
                  <option value="">Seleccione…</option>
                  {PERIODOS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
                {faltan.periodo && <div className="invalid-feedback">Seleccione el periodo.</div>}
              </div>

              <div className="mb-3">
                <label className="form-label">Empresa afiliada <span className="texto-auxiliar">(automático)</span></label>
                <input
                  type="text"
                  className="form-control"
                  value={usuario?.empresa?.nombre || '— sin empresa afiliada —'}
                  readOnly
                />
                <div className="form-text">
                  {usuario?.empresa?.nombre
                    ? 'Se asigna automáticamente según su usuario. No es posible registrar el mantenimiento a nombre de otra empresa.'
                    : 'Su usuario no tiene una empresa afiliada. Solicite al administrador que la asigne antes de registrar.'}
                </div>
              </div>

              <div className="mb-1">
                <label className="form-label">Estado final del equipo</label>
                <div className="btn-group w-100" role="group">
                  {ESTADOS_RESULTANTE.map((o) => (
                    <button key={o.value} type="button"
                      className={`btn btn-sm ${form.estadoFinal === o.value ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => set('estadoFinal', o.value)}>{o.label}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* Columna derecha */}
            <div className="col-12 col-lg-6">
              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label className="form-label">Fecha</label>
                  <input type="date" className="form-control" value={form.fecha} max={hoyISO()} onChange={(e) => set('fecha', e.target.value)} />
                </div>
                <div className="col-6">
                  <label className="form-label">Técnico responsable <span className="texto-auxiliar">(automático)</span></label>
                  <input type="text" className="form-control" value={usuario?.nombre || ''} readOnly />
                </div>
                <div className="col-6">
                  <label className="form-label">Hora de entrada <span className="text-danger">*</span></label>
                  <input type="time" className={`form-control ${faltan.horaInicio ? 'is-invalid' : ''}`} value={form.horaInicio} onChange={(e) => set('horaInicio', e.target.value)} />
                </div>
                <div className="col-6">
                  <label className="form-label">Hora de salida <span className="text-danger">*</span></label>
                  <input type="time" className={`form-control ${faltan.horaFin ? 'is-invalid' : ''}`} value={form.horaFin} onChange={(e) => set('horaFin', e.target.value)} />
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label">Descripción del trabajo realizado <span className="text-danger">*</span></label>
                <textarea rows={5} className={`form-control ${faltan.descripcion ? 'is-invalid' : ''}`}
                  placeholder="Ej.: Limpieza de evaporadora y condensadora, revisión de sistema eléctrico y pruebas de funcionamiento…"
                  value={form.descripcion} onChange={(e) => set('descripcion', e.target.value)} />
                {faltan.descripcion && <div className="invalid-feedback">Describa el trabajo realizado.</div>}
              </div>

              <div className="mb-0">
                <label className="form-label">Repuestos utilizados u observaciones</label>
                <textarea rows={2} className="form-control" placeholder="Opcional"
                  value={form.repuestos} onChange={(e) => set('repuestos', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Historial embebido (RF06) */}
          {verHistorial && equipoSel && (
            <div className="mt-4 border-top pt-3">
              <div className="titulo-seccion mb-2" style={{ fontSize: '15px' }}>
                Historial del equipo {equipoSel.codigoInventario}
              </div>
              <div className="table-responsive">
                <table className="table table-sm">
                  <thead><tr><th>Fecha</th><th>Tipo</th><th>Técnico</th><th>Estado final</th></tr></thead>
                  <tbody>
                    {historial.length === 0 && <tr><td colSpan={4} className="texto-auxiliar">Sin registros previos.</td></tr>}
                    {historial.map((m) => (
                      <tr key={m._id}>
                        <td>{m.fechaMantenimiento?.slice(0, 10)}</td>
                        <td>{TIPO_MANT_LABEL[m.tipoTrabajo] || m.tipoTrabajo}</td>
                        <td>{m.tecnico?.nombre || '—'}</td>
                        <td><EstadoBadge estado={m.estadoEquipoResultante} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Aviso ámbar de posible duplicado (RF05) */}
          {duplicado && (
            <div className="alert-duplicado d-flex align-items-start gap-2 mt-3">
              <i className="bi bi-exclamation-triangle-fill mt-1" />
              <div>
                <strong>Posible duplicado.</strong> Ya existe un mantenimiento registrado para el equipo
                <strong> {equipoSel?.codigoInventario}</strong> en la fecha <strong>{form.fecha}</strong>.
                Verifique antes de continuar; puede guardar de todos modos si confirma que es una intervención distinta.
                {duplicado.exigeConfirmar && (
                  <div className="mt-2">
                    <button className="btn btn-sm btn-warning" onClick={() => enviar(true)} disabled={guardando}>
                      <i className="bi bi-check2 me-1" />Guardar de todos modos
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Zona de acciones */}
      <div className="action-zone">
        <button className="btn btn-outline-secondary" onClick={() => limpiar(false)} disabled={guardando}><i className="bi bi-x-lg me-1" />Cancelar</button>
        <button className="btn btn-primary" onClick={() => enviar(false)} disabled={guardando}>
          {guardando ? <><span className="spinner-border spinner-border-sm me-2" />Guardando…</> : <><i className="bi bi-save me-1" />Guardar</>}
        </button>
      </div>

      {/* Modal: buscador de equipos con filtros (server-side) */}
      {picker && (
        <div className="modal-overlay" onClick={() => setPicker(false)}>
          <div className="modal-panel" style={{ maxWidth: 900, width: '96%' }} onClick={(e) => e.stopPropagation()}>
            <div className="card">
              <div className="card-header py-2 titulo-seccion d-flex justify-content-between align-items-center">
                <span><i className="bi bi-search me-1" />Localizar equipo</span>
                <button className="btn btn-sm btn-link text-secondary p-0" onClick={() => setPicker(false)}><i className="bi bi-x-lg" /></button>
              </div>
              <div className="card-body">
                {/* Filtros */}
                <div className="row g-2 align-items-end mb-2">
                  <div className="col-12 col-md-4">
                    <label className="form-label">Buscar</label>
                    <div className="input-group input-group-sm">
                      <span className="input-group-text"><i className="bi bi-search" /></span>
                      <input className="form-control" placeholder="N.º de bien, nombre o serie…"
                        autoFocus value={fBuscar} onChange={(e) => setFBuscar(e.target.value)} />
                    </div>
                  </div>
                  <div className="col-6 col-md-2">
                    <label className="form-label">Tipo</label>
                    <select className="form-select form-select-sm" value={fTipo}
                      onChange={(e) => { setFTipo(e.target.value); setFSubtipo(''); }}>
                      <option value="">Todos</option>
                      {tiposEquipo.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="col-6 col-md-2">
                    <label className="form-label">Subtipo</label>
                    <select className="form-select form-select-sm" value={fSubtipo} disabled={!fTipo}
                      onChange={(e) => setFSubtipo(e.target.value)}>
                      <option value="">Todos</option>
                      {subtiposDisponibles.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="col-6 col-md-2">
                    <label className="form-label">Marca</label>
                    <select className="form-select form-select-sm" value={fMarca} onChange={(e) => setFMarca(e.target.value)}>
                      <option value="">Todas</option>
                      {marcas.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="col-6 col-md-2">
                    <label className="form-label">Estado</label>
                    <select className="form-select form-select-sm" value={fEstado} onChange={(e) => setFEstado(e.target.value)}>
                      <option value="">Todos</option>
                      {ESTADOS_EQUIPO.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div className="col-12 col-md-4">
                    <label className="form-label">Servicio / ubicación</label>
                    <select className="form-select form-select-sm" value={fUbic} onChange={(e) => setFUbic(e.target.value)}>
                      <option value="">Todas</option>
                      {ubicaciones.map((u) => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <div className="col-12 col-md-8 text-end">
                    {hayFiltros && (
                      <button className="btn btn-sm btn-outline-secondary" onClick={limpiarFiltros}>
                        <i className="bi bi-x-circle me-1" />Limpiar filtros
                      </button>
                    )}
                  </div>
                </div>

                {/* Resultados */}
                <div className="table-responsive" style={{ maxHeight: '46vh', overflowY: 'auto' }}>
                  <table className="table table-sm table-hover align-middle mb-0">
                    <thead className="table-light" style={{ position: 'sticky', top: 0 }}>
                      <tr>
                        <th>N.º de bien</th><th>Nombre</th><th>Serie</th><th>Subtipo</th><th>Marca</th><th>Ubicación</th><th>Estado</th><th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {buscando && (
                        <tr><td colSpan={8} className="text-center py-3"><span className="spinner-border spinner-border-sm me-2" />Buscando…</td></tr>
                      )}
                      {!buscando && resultados.length === 0 && (
                        <tr><td colSpan={8} className="text-center texto-auxiliar py-3">No se encontraron equipos con los filtros aplicados.</td></tr>
                      )}
                      {!buscando && resultados.map((e) => (
                        <tr key={e._id}>
                          <td className="fw-semibold">{e.codigoInventario}</td>
                          <td style={{ maxWidth: 220 }} className="text-truncate" title={e.nombre}>{e.nombre}</td>
                          <td>{e.serie || 'S/S'}</td>
                          <td>{e.subTipo}</td>
                          <td>{e.marca}</td>
                          <td>{e.ubicacion}</td>
                          <td><EstadoBadge estado={e.estado} /></td>
                          <td className="text-end">
                            <button className="btn btn-sm btn-primary" onClick={() => seleccionarEquipo(e)}>
                              <i className="bi bi-check2 me-1" />Seleccionar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!buscando && (
                  <div className="texto-auxiliar mt-2" style={{ fontSize: '13px' }}>
                    {resultados.length} equipo(s) encontrado(s). Combine filtros para acotar la búsqueda.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
