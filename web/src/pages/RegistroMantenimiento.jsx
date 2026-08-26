import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { equiposApi, mantenimientosApi } from '../api/services';
import { mensajeError } from '../api/client';
import {
  TIPOS_MANTENIMIENTO, PERIODOS, ESTADOS_RESULTANTE, TIPO_MANT_LABEL, hoyISO,
  ordenarEquipos, etiquetaEquipo,
} from '../data/constants';
import EstadoBadge from '../components/EstadoBadge';

// Registro de mantenimiento (RF03/RF04/RF05). El validador de MongoDB exige
// equipo, empresa, periodo, tipo, descripción, estado resultante, fecha y horas.
// La empresa NO se elige en el formulario: el backend la deriva del usuario
// autenticado (técnico → su empresa afiliada; supervisor/admin → Interno IGSS).
const VACIO = {
  equipoId: '', tipoTrabajo: '', periodo: '', fecha: hoyISO(), horaInicio: '', horaFin: '',
  descripcion: '', repuestos: '', estadoFinal: 'funcionando',
};

export default function RegistroMantenimiento() {
  const { usuario } = useAuth();
  const [equipos, setEquipos] = useState([]);
  const [form, setForm] = useState(VACIO);
  const [tocado, setTocado] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [verHistorial, setVerHistorial] = useState(false);
  const [historial, setHistorial] = useState([]);
  const [duplicado, setDuplicado] = useState(null);

  useEffect(() => {
    equiposApi.listar().then(setEquipos).catch(() => {});
  }, []);

  const equipoSel = equipos.find((e) => e._id === form.equipoId);

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
    setTocado(false);
    setDuplicado(null);
    if (!conservarMsg) setGuardado(false);
  };

  return (
    <>
      <h1 className="titulo-pantalla mb-1">Registro de mantenimiento</h1>
      <p className="texto-auxiliar mb-3">Registre una intervención seleccionando el equipo desde el catálogo. La fecha y el técnico se asignan automáticamente.</p>

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
              <div className="mb-3">
                <label className="form-label">Equipo intervenido <span className="text-danger">*</span></label>
                <input
                  list="lista-equipos"
                  className={`form-control ${faltan.equipoId ? 'is-invalid' : ''}`}
                  placeholder="Busque por número de bien o nombre…"
                  value={equipoSel ? etiquetaEquipo(equipoSel) : ''}
                  onChange={(e) => {
                    const eq = equipos.find((x) => etiquetaEquipo(x) === e.target.value);
                    set('equipoId', eq ? eq._id : '');
                  }}
                />
                <datalist id="lista-equipos">
                  {ordenarEquipos(equipos).map((e) => <option key={e._id} value={etiquetaEquipo(e)} />)}
                </datalist>
                {faltan.equipoId && <div className="invalid-feedback">Seleccione un equipo del catálogo.</div>}
                {equipoSel && (
                  <div className="d-flex align-items-center gap-2 mt-2 texto-auxiliar">
                    <EstadoBadge estado={equipoSel.estado} />
                    <span>· {equipoSel.subTipo} · {equipoSel.ubicacion}</span>
                    <button className="btn btn-link btn-sm p-0 ms-auto" onClick={() => setVerHistorial(!verHistorial)}>
                      <i className="bi bi-clock-history me-1" />{verHistorial ? 'Ocultar' : 'Ver'} historial ({historial.length})
                    </button>
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

      {/* Zona 4: zona de acciones */}
      <div className="action-zone">
        <button className="btn btn-outline-secondary" onClick={() => limpiar(false)} disabled={guardando}><i className="bi bi-x-lg me-1" />Cancelar</button>
        <button className="btn btn-primary" onClick={() => enviar(false)} disabled={guardando}>
          {guardando ? <><span className="spinner-border spinner-border-sm me-2" />Guardando…</> : <><i className="bi bi-save me-1" />Guardar</>}
        </button>
      </div>
    </>
  );
}
