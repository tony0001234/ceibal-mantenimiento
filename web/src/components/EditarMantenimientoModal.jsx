import { useState, useEffect, useMemo } from 'react';
import { mantenimientosApi, costosApi } from '../api/services';
import { mensajeError } from '../api/client';
import {
  TIPOS_MANTENIMIENTO, PERIODOS, ESTADOS_RESULTANTE, fmtQ, modoPrecio,
  ordenarEquipos, etiquetaEquipo,
} from '../data/constants';

// Modal de edición de un registro de mantenimiento existente (Historial).
// Reutiliza la MISMA regla de precio que el registro y guarda con PATCH
// (actualiza en sitio, sin crear duplicados).
const hhmm = (d) => {
  if (!d) return '';
  const x = new Date(d);
  return `${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}`;
};

export default function EditarMantenimientoModal({ registro, equipos, onCerrar, onGuardado }) {
  const [form, setForm] = useState({
    equipoId: registro.equipo?._id || registro.equipo || '',
    tipoTrabajo: registro.tipoTrabajo || '',
    periodo: registro.periodo || '',
    fecha: (registro.fechaMantenimiento || '').slice(0, 10),
    horaInicio: hhmm(registro.horaInicio),
    horaFin: hhmm(registro.horaFin),
    descripcion: registro.descripcionTrabajo || '',
    repuestos: registro.repuestosObservaciones || '',
    estadoFinal: registro.estadoEquipoResultante || 'funcionando',
  });
  const [precioManual, setPrecioManual] = useState('');
  const [costoVigente, setCostoVigente] = useState(null);
  const [tocado, setTocado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const modo = modoPrecio(form.tipoTrabajo, form.periodo);
  const equipoSel = useMemo(() => equipos.find((e) => e._id === form.equipoId), [equipos, form.equipoId]);

  // Inicializa el precio manual si el registro era correctivo con precio.
  useEffect(() => {
    if (modoPrecio(registro.tipoTrabajo, registro.periodo) === 'manual') {
      setPrecioManual(String(registro.costoMantenimiento ?? ''));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Al cambiar a un tipo/periodo sin precio manual, no conservar un precio previo.
  useEffect(() => { if (modo !== 'manual') setPrecioManual(''); }, [modo]);

  // Precio automático (preventivo): según la categoría del equipo seleccionado.
  useEffect(() => {
    if (modo !== 'automatico' || !equipoSel?.categoria) { setCostoVigente(null); return; }
    costosApi.vigente(equipoSel.categoria)
      .then((r) => setCostoVigente(r?.costo ?? null))
      .catch(() => setCostoVigente(null));
  }, [modo, equipoSel]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const precioManualValido =
    precioManual !== '' && Number.isFinite(Number(precioManual)) && Number(precioManual) >= 0;
  const faltan = {
    equipoId: tocado && !form.equipoId,
    tipoTrabajo: tocado && !form.tipoTrabajo,
    periodo: tocado && !form.periodo,
    fecha: tocado && !form.fecha,
    horaInicio: tocado && !form.horaInicio,
    horaFin: tocado && !form.horaFin,
    descripcion: tocado && !form.descripcion.trim(),
    precio: tocado && modo === 'manual' && !precioManualValido,
  };
  const incompleto = !form.equipoId || !form.tipoTrabajo || !form.periodo || !form.fecha
    || !form.horaInicio || !form.horaFin || !form.descripcion.trim()
    || (modo === 'manual' && !precioManualValido);

  const guardar = async () => {
    setTocado(true); setError('');
    if (incompleto) return;
    setGuardando(true);
    try {
      await mantenimientosApi.actualizar(registro._id, {
        equipo: form.equipoId,
        periodo: form.periodo,
        tipoTrabajo: form.tipoTrabajo,
        descripcionTrabajo: form.descripcion.trim(),
        repuestosObservaciones: form.repuestos,
        estadoEquipoResultante: form.estadoFinal,
        fechaMantenimiento: form.fecha,
        horaInicio: form.horaInicio,
        horaFin: form.horaFin,
        costoManual: modo === 'manual' ? Number(precioManual) : undefined,
      });
      onGuardado();
    } catch (e) {
      setError(mensajeError(e, 'No se pudo guardar la edición del registro.'));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={() => !guardando && onCerrar()}>
      <div className="modal-panel" style={{ maxWidth: 760, width: '96%' }} onClick={(e) => e.stopPropagation()}>
        <div className="card">
          <div className="card-header py-2 titulo-seccion d-flex justify-content-between align-items-center">
            <span><i className="bi bi-pencil-square me-1" />Editar mantenimiento</span>
            <button className="btn btn-sm btn-link text-secondary p-0" onClick={onCerrar}><i className="bi bi-x-lg" /></button>
          </div>
          <div className="card-body">
            {error && <div className="alert alert-danger py-2 px-3">{error}</div>}
            <div className="row g-3">
              <div className="col-12 col-md-6">
                <label className="form-label">Equipo <span className="text-danger">*</span></label>
                <select className={`form-select ${faltan.equipoId ? 'is-invalid' : ''}`}
                  value={form.equipoId} onChange={(e) => set('equipoId', e.target.value)}>
                  <option value="">Seleccione…</option>
                  {ordenarEquipos(equipos).map((e) => <option key={e._id} value={e._id}>{etiquetaEquipo(e)}</option>)}
                </select>
              </div>
              <div className="col-6 col-md-3">
                <label className="form-label">Tipo <span className="text-danger">*</span></label>
                <select className={`form-select ${faltan.tipoTrabajo ? 'is-invalid' : ''}`}
                  value={form.tipoTrabajo} onChange={(e) => set('tipoTrabajo', e.target.value)}>
                  <option value="">Seleccione…</option>
                  {TIPOS_MANTENIMIENTO.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="col-6 col-md-3">
                <label className="form-label">Periodo <span className="text-danger">*</span></label>
                <select className={`form-select ${faltan.periodo ? 'is-invalid' : ''}`}
                  value={form.periodo} onChange={(e) => set('periodo', e.target.value)}>
                  <option value="">Seleccione…</option>
                  {PERIODOS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>

              <div className="col-6 col-md-4">
                <label className="form-label">Fecha <span className="text-danger">*</span></label>
                <input type="date" className={`form-control ${faltan.fecha ? 'is-invalid' : ''}`}
                  value={form.fecha} onChange={(e) => set('fecha', e.target.value)} />
              </div>
              <div className="col-6 col-md-4">
                <label className="form-label">Hora de entrada <span className="text-danger">*</span></label>
                <input type="time" className={`form-control ${faltan.horaInicio ? 'is-invalid' : ''}`}
                  value={form.horaInicio} onChange={(e) => set('horaInicio', e.target.value)} />
              </div>
              <div className="col-6 col-md-4">
                <label className="form-label">Hora de salida <span className="text-danger">*</span></label>
                <input type="time" className={`form-control ${faltan.horaFin ? 'is-invalid' : ''}`}
                  value={form.horaFin} onChange={(e) => set('horaFin', e.target.value)} />
              </div>

              {/* Precio dinámico según el tipo/periodo (misma regla que el registro). */}
              <div className="col-12 col-md-6">
                <label className="form-label">Precio del mantenimiento</label>
                {modo === 'automatico' && (
                  <div className="border rounded p-2 d-flex align-items-center" style={{ background: 'var(--ceibal-azul-050, #f3f7fb)' }}>
                    <i className="bi bi-cash-coin me-2" style={{ color: 'var(--ceibal-azul-600)' }} />
                    <strong className="me-2">{costoVigente != null ? fmtQ(costoVigente) : '—'}</strong>
                    <span className="texto-auxiliar" style={{ fontSize: 13 }}>automático (no editable)</span>
                  </div>
                )}
                {modo === 'manual' && (
                  <>
                    <div className="input-group">
                      <span className="input-group-text">Q</span>
                      <input type="number" min="0" step="0.01" inputMode="decimal"
                        className={`form-control ${faltan.precio ? 'is-invalid' : ''}`}
                        placeholder="Precio del correctivo"
                        value={precioManual} onChange={(e) => setPrecioManual(e.target.value)} />
                    </div>
                    {faltan.precio && <div className="text-danger mt-1" style={{ fontSize: '.85rem' }}>Ingrese el precio del correctivo.</div>}
                  </>
                )}
                {modo === 'ninguno' && (
                  <div className="texto-auxiliar" style={{ fontSize: 13 }}>
                    <i className="bi bi-dash-circle me-1" />Este tipo de mantenimiento no lleva precio.
                  </div>
                )}
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label">Estado final del equipo</label>
                <div className="btn-group w-100" role="group">
                  {ESTADOS_RESULTANTE.map((o) => (
                    <button key={o.value} type="button"
                      className={`btn btn-sm ${form.estadoFinal === o.value ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => set('estadoFinal', o.value)}>{o.label}</button>
                  ))}
                </div>
              </div>

              <div className="col-12">
                <label className="form-label">Descripción del trabajo <span className="text-danger">*</span></label>
                <textarea rows={3} className={`form-control ${faltan.descripcion ? 'is-invalid' : ''}`}
                  value={form.descripcion} onChange={(e) => set('descripcion', e.target.value)} />
              </div>
              <div className="col-12">
                <label className="form-label">Repuestos u observaciones</label>
                <textarea rows={2} className="form-control"
                  value={form.repuestos} onChange={(e) => set('repuestos', e.target.value)} />
              </div>
            </div>
          </div>
          <div className="card-footer d-flex justify-content-end gap-2 py-2">
            <button className="btn btn-outline-secondary" onClick={onCerrar} disabled={guardando}>Cancelar</button>
            <button className="btn btn-primary" onClick={guardar} disabled={guardando}>
              {guardando ? <><span className="spinner-border spinner-border-sm me-2" />Guardando…</> : <><i className="bi bi-save me-1" />Guardar cambios</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
