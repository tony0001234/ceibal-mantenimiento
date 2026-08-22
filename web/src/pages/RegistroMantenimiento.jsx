import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  EQUIPOS, TIPOS_MANTENIMIENTO, PERIODOS, EMPRESAS, MANTENIMIENTOS,
} from '../data/mockData';
import EstadoBadge from '../components/EstadoBadge';
import DemoBanner from '../components/DemoBanner';

// Registro de mantenimiento (RF03/RF04/RF05). Pantalla más utilizada del sistema.
// Formulario a 2 columnas, catálogos con búsqueda, fecha y usuario automáticos,
// aviso ámbar de posible duplicado y zona de acciones fija.
const HOY = '2026-08-20';

export default function RegistroMantenimiento() {
  const { usuario } = useAuth();
  const [form, setForm] = useState({
    equipoId: '', tipo: '', periodo: '', fecha: HOY, horaInicio: '', horaFin: '',
    empresa: '', descripcion: '', repuestos: '', estadoFinal: 'operativo',
  });
  const [tocado, setTocado] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [verHistorial, setVerHistorial] = useState(false);

  const equipoSel = EQUIPOS.find((e) => String(e.id) === String(form.equipoId));

  // Deteccion de posible duplicado (RF05): mismo equipo, misma fecha.
  const posibleDuplicado = useMemo(() => {
    if (!form.equipoId || !form.fecha) return null;
    return MANTENIMIENTOS.find(
      (m) => String(m.equipoId) === String(form.equipoId) && m.fecha === form.fecha
    );
  }, [form.equipoId, form.fecha]);

  const historialEquipo = form.equipoId
    ? MANTENIMIENTOS.filter((m) => String(m.equipoId) === String(form.equipoId))
    : [];

  const faltan = {
    equipoId: tocado && !form.equipoId,
    tipo: tocado && !form.tipo,
    descripcion: tocado && !form.descripcion.trim(),
  };

  const set = (k, v) => { setForm({ ...form, [k]: v }); setGuardado(false); };

  const guardar = () => {
    setTocado(true);
    if (!form.equipoId || !form.tipo || !form.descripcion.trim()) return;
    // SIMULADO: no se persiste nada.
    setGuardado(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const limpiar = () => {
    setForm({ equipoId: '', tipo: '', periodo: '', fecha: HOY, horaInicio: '', horaFin: '', empresa: '', descripcion: '', repuestos: '', estadoFinal: 'operativo' });
    setTocado(false); setGuardado(false);
  };

  return (
    <>
      <h1 className="titulo-pantalla mb-1">Registro de mantenimiento</h1>
      <p className="texto-auxiliar mb-3">Registre una intervención seleccionando el equipo desde el catálogo. La fecha y el técnico se asignan automáticamente.</p>
      <DemoBanner />

      {guardado && (
        <div className="alert alert-success d-flex align-items-center" role="alert">
          <i className="bi bi-check-circle-fill me-2" />
          <div>Registro guardado correctamente <span className="texto-auxiliar">(simulado — prototipo NO funcional).</span></div>
        </div>
      )}

      <div className="card">
        <div className="card-header py-2 titulo-seccion">Datos de la intervención</div>
        <div className="card-body">
          <div className="row g-4">
            {/* Columna izquierda */}
            <div className="col-12 col-lg-6">
              <div className="mb-3">
                <label className="form-label">Equipo intervenido <span className="text-danger">*</span></label>
                {/* Catalogo con busqueda (RF03) mediante datalist con autocompletado */}
                <input
                  list="lista-equipos"
                  className={`form-control ${faltan.equipoId ? 'is-invalid' : ''}`}
                  placeholder="Busque por número de bien o nombre…"
                  value={equipoSel ? `${equipoSel.codigo} — ${equipoSel.nombre}` : ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    const eq = EQUIPOS.find((x) => `${x.codigo} — ${x.nombre}` === val);
                    set('equipoId', eq ? eq.id : '');
                  }}
                />
                <datalist id="lista-equipos">
                  {EQUIPOS.map((e) => <option key={e.id} value={`${e.codigo} — ${e.nombre}`} />)}
                </datalist>
                {faltan.equipoId && <div className="invalid-feedback">Seleccione un equipo del catálogo.</div>}
                {equipoSel && (
                  <div className="d-flex align-items-center gap-2 mt-2 texto-auxiliar">
                    <EstadoBadge estado={equipoSel.estado} />
                    <span>· {equipoSel.tipo} · {equipoSel.ubicacion}</span>
                    <button className="btn btn-link btn-sm p-0 ms-auto" onClick={() => setVerHistorial(!verHistorial)}>
                      <i className="bi bi-clock-history me-1" />{verHistorial ? 'Ocultar' : 'Ver'} historial ({historialEquipo.length})
                    </button>
                  </div>
                )}
              </div>

              <div className="mb-3">
                <label className="form-label">Tipo de mantenimiento <span className="text-danger">*</span></label>
                <select className={`form-select ${faltan.tipo ? 'is-invalid' : ''}`} value={form.tipo} onChange={(e) => set('tipo', e.target.value)}>
                  <option value="">Seleccione…</option>
                  {TIPOS_MANTENIMIENTO.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                {faltan.tipo && <div className="invalid-feedback">Seleccione el tipo de mantenimiento.</div>}
              </div>

              <div className="mb-3">
                <label className="form-label">Periodo de mantenimiento</label>
                <select className="form-select" value={form.periodo} onChange={(e) => set('periodo', e.target.value)}>
                  <option value="">Seleccione…</option>
                  {PERIODOS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label">Empresa / proveedor <span className="texto-auxiliar">(si aplica)</span></label>
                <select className="form-select" value={form.empresa} onChange={(e) => set('empresa', e.target.value)}>
                  <option value="">Seleccione…</option>
                  {EMPRESAS.map((em) => <option key={em} value={em}>{em}</option>)}
                </select>
              </div>

              <div className="mb-1">
                <label className="form-label">Estado final del equipo</label>
                <div className="btn-group w-100" role="group">
                  {[
                    { v: 'operativo', l: 'Funcionando' },
                    { v: 'fuera_de_servicio', l: 'Fuera de servicio' },
                  ].map((o) => (
                    <button key={o.v} type="button"
                      className={`btn btn-sm ${form.estadoFinal === o.v ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => set('estadoFinal', o.v)}>{o.l}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* Columna derecha */}
            <div className="col-12 col-lg-6">
              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label className="form-label">Fecha <span className="texto-auxiliar">(automática)</span></label>
                  <input type="date" className="form-control" value={form.fecha} readOnly />
                </div>
                <div className="col-6">
                  <label className="form-label">Técnico responsable <span className="texto-auxiliar">(automático)</span></label>
                  <input type="text" className="form-control" value={usuario?.nombre || ''} readOnly />
                </div>
                <div className="col-6">
                  <label className="form-label">Hora de entrada</label>
                  <input type="time" className="form-control" value={form.horaInicio} onChange={(e) => set('horaInicio', e.target.value)} />
                </div>
                <div className="col-6">
                  <label className="form-label">Hora de salida</label>
                  <input type="time" className="form-control" value={form.horaFin} onChange={(e) => set('horaFin', e.target.value)} />
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

          {/* Historial embebido (RF06) — sin salir del formulario */}
          {verHistorial && equipoSel && (
            <div className="mt-4 border-top pt-3">
              <div className="titulo-seccion mb-2" style={{ fontSize: '15px' }}>
                Historial del equipo {equipoSel.codigo}
              </div>
              <div className="table-responsive">
                <table className="table table-sm">
                  <thead><tr><th>Fecha</th><th>Tipo</th><th>Técnico</th><th>Estado final</th></tr></thead>
                  <tbody>
                    {historialEquipo.length === 0 && <tr><td colSpan={4} className="texto-auxiliar">Sin registros previos.</td></tr>}
                    {historialEquipo.map((m) => (
                      <tr key={m.id}><td>{m.fecha}</td><td>{m.tipo}</td><td>{m.tecnico}</td><td><EstadoBadge estado={m.estadoFinal} /></td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Aviso ámbar de posible duplicado (RF05), antes de los botones */}
          {posibleDuplicado && (
            <div className="alert-duplicado d-flex align-items-start gap-2 mt-3">
              <i className="bi bi-exclamation-triangle-fill mt-1" />
              <div>
                <strong>Posible duplicado.</strong> Ya existe un mantenimiento registrado para el equipo
                <strong> {equipoSel?.codigo}</strong> en la fecha <strong>{form.fecha}</strong> (registro N.º {posibleDuplicado.id}).
                Verifique antes de continuar; puede guardar de todos modos si confirma que es una intervención distinta.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Zona 4: zona de acciones (esquina inferior derecha) */}
      <div className="action-zone">
        <button className="btn btn-outline-secondary" onClick={limpiar}><i className="bi bi-x-lg me-1" />Cancelar</button>
        <button className="btn btn-primary" onClick={guardar}><i className="bi bi-save me-1" />Guardar</button>
      </div>
    </>
  );
}
