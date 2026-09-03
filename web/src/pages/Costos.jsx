import { useState, useEffect, useMemo } from 'react';
import { costosApi } from '../api/services';
import { mensajeError } from '../api/client';
import {
  CATEGORIAS_MANTENIMIENTO, CATEGORIA_LABEL, PERIODICIDADES, fmtQ,
} from '../data/constants';

// Módulo de configuración y cálculo del costo de mantenimiento por categoría
// (RF nuevo, solo administrador). Fórmula: (monto / equipos) / periodos.
const VACIO = {
  categoria: '', montoOfertado: '', cantidadEquipos: '', periodicidad: '', numeroPeriodos: '',
};

export default function Costos() {
  const [configs, setConfigs] = useState([]);
  const [form, setForm] = useState(VACIO);
  const [editando, setEditando] = useState(false);
  const [tocado, setTocado] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(true);

  const cargar = () => {
    costosApi.listar()
      .then((d) => setConfigs(d || []))
      .catch((e) => setError(mensajeError(e, 'No se pudieron cargar las configuraciones.')))
      .finally(() => setCargando(false));
  };
  useEffect(() => { cargar(); }, []);

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setOk(''); };

  // Al elegir periodicidad, sugiere el número de períodos (editable).
  const elegirPeriodicidad = (valor) => {
    const p = PERIODICIDADES.find((x) => x.valor === valor);
    setForm((f) => ({ ...f, periodicidad: valor, numeroPeriodos: p ? String(p.periodos) : f.numeroPeriodos }));
    setOk('');
  };

  const usarConteoListados = async () => {
    if (!form.categoria) return;
    try {
      const r = await costosApi.conteo(form.categoria);
      set('cantidadEquipos', String(r.cantidad));
    } catch { /* noop */ }
  };

  const num = (v) => (v === '' || v === null ? NaN : Number(v));
  const monto = num(form.montoOfertado);
  const equipos = num(form.cantidadEquipos);
  const periodos = num(form.numeroPeriodos);

  // Cálculo del costo por mantenimiento en vivo (misma fórmula que el backend).
  const costo = useMemo(() => {
    if (!(monto > 0) || !(equipos > 0) || !(periodos > 0)) return null;
    return Math.round((monto / equipos / periodos) * 100) / 100;
  }, [monto, equipos, periodos]);

  const errores = {
    categoria: tocado && !form.categoria,
    monto: tocado && !(monto > 0),
    equipos: tocado && !(equipos > 0),
    periodicidad: tocado && !form.periodicidad,
    periodos: tocado && !(periodos > 0),
  };
  const invalido = !form.categoria || !(monto > 0) || !(equipos > 0) || !form.periodicidad || !(periodos > 0);

  const editar = (c) => {
    setForm({
      categoria: c.categoria,
      montoOfertado: String(c.montoOfertado),
      cantidadEquipos: String(c.cantidadEquipos),
      periodicidad: c.periodicidad,
      numeroPeriodos: String(c.numeroPeriodos),
    });
    setEditando(true);
    setTocado(false);
    setOk('');
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const limpiar = () => { setForm(VACIO); setEditando(false); setTocado(false); };

  const guardar = async () => {
    setTocado(true); setError(''); setOk('');
    if (invalido) return;
    setGuardando(true);
    try {
      await costosApi.guardar({
        categoria: form.categoria,
        montoOfertado: monto,
        cantidadEquipos: equipos,
        periodicidad: form.periodicidad,
        numeroPeriodos: periodos,
      });
      setOk(`Configuración guardada. Costo por mantenimiento: ${fmtQ(costo)}.`);
      limpiar();
      cargar();
    } catch (e) {
      setError(mensajeError(e, 'No se pudo guardar la configuración.'));
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (c) => {
    if (!window.confirm(`¿Eliminar la configuración de "${CATEGORIA_LABEL[c.categoria] || c.categoria}"?`)) return;
    try { await costosApi.eliminar(c._id); cargar(); }
    catch (e) { setError(mensajeError(e, 'No se pudo eliminar.')); }
  };

  return (
    <>
      <h1 className="titulo-pantalla mb-1">Costos de mantenimiento</h1>
      <p className="texto-auxiliar mb-3">
        Configure el costo de cada mantenimiento por categoría de contrato. El costo se calcula con la
        fórmula <strong>(monto ofertado ÷ n.º de equipos) ÷ n.º de períodos</strong> y se aplica
        automáticamente a los mantenimientos nuevos. No puede modificarse desde otras pantallas.
      </p>

      {ok && <div className="alert alert-success py-2 px-3"><i className="bi bi-check-circle-fill me-2" />{ok}</div>}
      {error && <div className="alert alert-danger py-2 px-3">{error}</div>}

      <div className="row g-3">
        {/* Formulario */}
        <div className="col-12 col-lg-5">
          <div className="card">
            <div className="card-header py-2 titulo-seccion">
              {editando ? 'Editar configuración' : 'Nueva configuración de costo'}
            </div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label">Categoría / tipo de equipos <span className="text-danger">*</span></label>
                <select className={`form-select ${errores.categoria ? 'is-invalid' : ''}`}
                  value={form.categoria} disabled={editando}
                  onChange={(e) => set('categoria', e.target.value)}>
                  <option value="">Seleccione…</option>
                  {CATEGORIAS_MANTENIMIENTO.map((c) => <option key={c.valor} value={c.valor}>{c.label}</option>)}
                </select>
                {errores.categoria && <div className="invalid-feedback">Seleccione una categoría.</div>}
              </div>

              <div className="mb-3">
                <label className="form-label">Monto total ofertado (Q) <span className="text-danger">*</span></label>
                <input type="number" min="0" step="0.01" inputMode="decimal"
                  className={`form-control ${errores.monto ? 'is-invalid' : ''}`}
                  placeholder="Ej.: 88800" value={form.montoOfertado}
                  onChange={(e) => set('montoOfertado', e.target.value)} />
                {errores.monto && <div className="invalid-feedback">El monto debe ser mayor que 0.</div>}
              </div>

              <div className="mb-3">
                <label className="form-label">Cantidad de equipos <span className="text-danger">*</span></label>
                <div className="input-group">
                  <input type="number" min="1" step="1" inputMode="numeric"
                    className={`form-control ${errores.equipos ? 'is-invalid' : ''}`}
                    placeholder="Ej.: 60" value={form.cantidadEquipos}
                    onChange={(e) => set('cantidadEquipos', e.target.value)} />
                  <button type="button" className="btn btn-outline-secondary" disabled={!form.categoria}
                    title="Usar la cantidad de equipos vigentes en los listados de esta categoría"
                    onClick={usarConteoListados}>
                    <i className="bi bi-list-check me-1" />De listados
                  </button>
                  {errores.equipos && <div className="invalid-feedback">La cantidad debe ser mayor que 0.</div>}
                </div>
                <div className="form-text">Puede tomarse automáticamente de los equipos de la categoría (no dados de baja).</div>
              </div>

              <div className="row g-2 mb-3">
                <div className="col-7">
                  <label className="form-label">Periodicidad <span className="text-danger">*</span></label>
                  <input list="periodicidades" className={`form-control ${errores.periodicidad ? 'is-invalid' : ''}`}
                    placeholder="Mensual, Trimestral…" value={form.periodicidad}
                    onChange={(e) => elegirPeriodicidad(e.target.value)} />
                  <datalist id="periodicidades">
                    {PERIODICIDADES.map((p) => <option key={p.valor} value={p.valor} />)}
                  </datalist>
                  {errores.periodicidad && <div className="invalid-feedback">Indique la periodicidad.</div>}
                </div>
                <div className="col-5">
                  <label className="form-label">N.º de períodos <span className="text-danger">*</span></label>
                  <input type="number" min="1" step="1" inputMode="numeric"
                    className={`form-control ${errores.periodos ? 'is-invalid' : ''}`}
                    value={form.numeroPeriodos} onChange={(e) => set('numeroPeriodos', e.target.value)} />
                  {errores.periodos && <div className="invalid-feedback">Mayor que 0.</div>}
                </div>
              </div>

              {/* Resultado del cálculo */}
              <div className="border rounded p-3 mb-3" style={{ background: 'var(--ceibal-azul-050, #f3f7fb)' }}>
                <div className="d-flex justify-content-between"><span className="texto-auxiliar">Monto ofertado</span><span>{form.montoOfertado ? fmtQ(monto) : '—'}</span></div>
                <div className="d-flex justify-content-between"><span className="texto-auxiliar">Equipos</span><span>{form.cantidadEquipos || '—'}</span></div>
                <div className="d-flex justify-content-between"><span className="texto-auxiliar">Periodicidad</span><span>{form.periodicidad || '—'}</span></div>
                <div className="d-flex justify-content-between"><span className="texto-auxiliar">Períodos</span><span>{form.numeroPeriodos || '—'}</span></div>
                <hr className="my-2" />
                <div className="d-flex justify-content-between align-items-center">
                  <span className="fw-semibold">Costo por mantenimiento</span>
                  <span className="fw-bold fs-5" style={{ color: 'var(--ceibal-azul-600)' }}>{costo != null ? fmtQ(costo) : '—'}</span>
                </div>
              </div>

              <div className="d-flex gap-2">
                <button className="btn btn-primary" onClick={guardar} disabled={guardando}>
                  {guardando ? <><span className="spinner-border spinner-border-sm me-2" />Guardando…</> : <><i className="bi bi-save me-1" />{editando ? 'Guardar cambios' : 'Guardar configuración'}</>}
                </button>
                {editando && <button className="btn btn-outline-secondary" onClick={limpiar} disabled={guardando}><i className="bi bi-x-lg me-1" />Cancelar</button>}
              </div>
            </div>
          </div>
        </div>

        {/* Listado de configuraciones */}
        <div className="col-12 col-lg-7">
          <div className="card">
            <div className="card-header py-2 titulo-seccion">Configuraciones existentes</div>
            <div className="table-responsive">
              <table className="table table-hover mb-0 align-middle">
                <thead>
                  <tr>
                    <th>Categoría</th><th className="text-end">Monto</th><th className="text-center">Equipos</th>
                    <th>Periodicidad</th><th className="text-center">Períodos</th><th className="text-end">Costo/mant.</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {cargando && <tr><td colSpan={7} className="text-center py-4"><span className="spinner-border spinner-border-sm me-2" />Cargando…</td></tr>}
                  {!cargando && configs.length === 0 && <tr><td colSpan={7} className="text-center texto-auxiliar py-4">Aún no hay configuraciones. Cree la primera con el formulario.</td></tr>}
                  {!cargando && configs.map((c) => (
                    <tr key={c._id}>
                      <td>{CATEGORIA_LABEL[c.categoria] || c.categoria}</td>
                      <td className="text-end">{fmtQ(c.montoOfertado)}</td>
                      <td className="text-center">{c.cantidadEquipos}</td>
                      <td>{c.periodicidad}</td>
                      <td className="text-center">{c.numeroPeriodos}</td>
                      <td className="text-end fw-bold" style={{ color: 'var(--ceibal-azul-600)' }}>{fmtQ(c.costoCalculado)}</td>
                      <td className="text-end" style={{ whiteSpace: 'nowrap' }}>
                        <button className="btn btn-sm btn-outline-secondary me-1" title="Editar" onClick={() => editar(c)}><i className="bi bi-pencil" /></button>
                        <button className="btn btn-sm btn-outline-danger" title="Eliminar" onClick={() => eliminar(c)}><i className="bi bi-trash" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className="texto-auxiliar mt-2" style={{ fontSize: '13px' }}>
            <i className="bi bi-info-circle me-1" />
            El costo se aplica a los mantenimientos <strong>nuevos</strong> de cada categoría. Los mantenimientos ya registrados conservan el costo con el que se guardaron (histórico).
          </p>
        </div>
      </div>
    </>
  );
}
