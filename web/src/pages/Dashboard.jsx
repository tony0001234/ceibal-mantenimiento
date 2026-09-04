import { useState, useEffect, useCallback } from 'react';
import { reportesApi } from '../api/services';
import { mensajeError } from '../api/client';
import { TIPO_MANT_LABEL } from '../data/constants';
import EstadoBadge from '../components/EstadoBadge';
import GraficasDiarias from '../components/GraficasDiarias';

// Panel de indicadores (RF08). Calculado en el backend a partir de datos reales.
const COLOR_TIPO = {
  preventivo: 'var(--ceibal-azul-600)',
  correctivo: 'var(--estado-mantenimiento)',
  llamada_emergencia: 'var(--estado-fuera)',
  evaluacion_interna: 'var(--estado-funcionando)',
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [actualizado, setActualizado] = useState(null);

  // Carga (o recarga) los indicadores. `silencioso` recarga sin mostrar el
  // spinner de página completa (para actualizaciones en segundo plano).
  const cargar = useCallback((silencioso = false) => {
    if (silencioso) setRefrescando(true); else setCargando(true);
    return reportesApi.indicadores()
      .then((d) => { setData(d); setActualizado(new Date()); setError(''); })
      .catch((e) => setError(mensajeError(e, 'No se pudieron cargar los indicadores.')))
      .finally(() => { setCargando(false); setRefrescando(false); });
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  // Reactualiza al volver a la ventana/pestaña del panel (p. ej. después de
  // registrar un mantenimiento en otra pestaña), para que las gráficas y los
  // indicadores reflejen los datos nuevos sin recargar la página completa.
  useEffect(() => {
    const alVolver = () => {
      if (document.visibilityState === 'visible') cargar(true);
    };
    window.addEventListener('focus', alVolver);
    document.addEventListener('visibilitychange', alVolver);
    return () => {
      window.removeEventListener('focus', alVolver);
      document.removeEventListener('visibilitychange', alVolver);
    };
  }, [cargar]);

  const mesActual = new Date().toLocaleDateString('es-GT', { month: 'long', year: 'numeric' });

  if (cargando) {
    return <div className="text-center py-5"><span className="spinner-border text-primary" /></div>;
  }
  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!data) return null;

  const kpis = [
    { label: 'Equipos registrados', value: data.equiposRegistrados, icon: 'bi-hdd-stack', color: 'var(--ceibal-azul-600)' },
    { label: 'Equipos fuera de servicio', value: data.equiposFuera, icon: 'bi-exclamation-octagon', color: 'var(--estado-fuera)' },
    { label: 'Mantenimientos del mes', value: data.mantenimientosMes, icon: 'bi-calendar-check', color: 'var(--estado-funcionando)' },
    { label: 'Tiempo medio de reparación (MTTR)', value: `${data.mttrMinutos ?? 0} min`, icon: 'bi-stopwatch', color: 'var(--estado-mantenimiento)' },
    { label: 'Tiempo medio de mantenimiento preventivo', value: `${data.preventivoMinutos ?? 0} min`, icon: 'bi-clock-history', color: 'var(--ceibal-azul-600)' },
    { label: 'Llamadas de emergencia del mes', value: data.emergenciasMes ?? 0, icon: 'bi-telephone-inbound', color: 'var(--estado-fuera)' },
  ];
  const maxDist = Math.max(1, ...data.distribucionTipo.map((d) => d.cantidad));

  return (
    <>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-1">
        <h1 className="titulo-pantalla mb-0">Panel de indicadores</h1>
        <div className="d-flex align-items-center flex-wrap gap-2">
          {actualizado && (
            <span className="texto-auxiliar" style={{ fontSize: 12 }}>
              Actualizado {actualizado.toLocaleTimeString('es-GT')}
            </span>
          )}
          <button className="btn btn-sm btn-outline-secondary" onClick={() => cargar(true)} disabled={refrescando || cargando}>
            {refrescando
              ? <><span className="spinner-border spinner-border-sm me-1" />Actualizando…</>
              : <><i className="bi bi-arrow-clockwise me-1" />Actualizar</>}
          </button>
          <span className="texto-auxiliar text-capitalize"><i className="bi bi-calendar3 me-1" />{mesActual}</span>
        </div>
      </div>
      <p className="texto-auxiliar mb-4">Resumen del estado del mantenimiento en el mes en curso.</p>

      <div className="row g-3 mb-4">
        {kpis.map((k) => (
          <div className="col-12 col-sm-6 col-lg-4" key={k.label}>
            <div className="card kpi-card h-100" style={{ borderLeftColor: k.color }}>
              <div className="card-body d-flex justify-content-between align-items-center">
                <div>
                  <div className="kpi-value" style={{ color: k.color }}>{k.value}</div>
                  <div className="kpi-label mt-1">{k.label}</div>
                </div>
                <i className={`bi ${k.icon} kpi-icon`} style={{ color: k.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Gráficas diarias del mes en curso (costo, emergencias y reparaciones). */}
      <div className="mb-4">
        <GraficasDiarias series={data.seriesDiarias || []} periodoLabel={mesActual} />
      </div>

      <div className="row g-3">
        <div className="col-12 col-lg-6">
          <div className="card h-100">
            <div className="card-header titulo-seccion py-2">Mantenimientos por tipo</div>
            <div className="card-body">
              {data.distribucionTipo.map((d) => (
                <div className="bar-row" key={d.clave}>
                  <span style={{ fontSize: '14px' }}>{d.tipo}</span>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${(d.cantidad / maxDist) * 100}%`, background: COLOR_TIPO[d.clave] }} />
                  </div>
                  <span className="fw-semibold text-end">{d.cantidad}</span>
                </div>
              ))}
              <p className="texto-auxiliar mb-0 mt-2">Total del mes: {data.distribucionTipo.reduce((a, b) => a + b.cantidad, 0)} registros.</p>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-6">
          <div className="card h-100">
            <div className="card-header titulo-seccion py-2 d-flex justify-content-between align-items-center">
              <span>Últimos registros</span>
              <a href="#/app/historial" className="text-decoration-none" style={{ fontSize: '13px' }}>Ver historial</a>
            </div>
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead>
                  <tr><th>Fecha</th><th>Equipo</th><th>Tipo</th><th>Estado final</th></tr>
                </thead>
                <tbody>
                  {data.ultimos.length === 0 && <tr><td colSpan={4} className="texto-auxiliar text-center py-3">Sin registros aún.</td></tr>}
                  {data.ultimos.map((m) => (
                    <tr key={m._id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{m.fechaMantenimiento?.slice(0, 10)}</td>
                      <td style={{ fontSize: '13.5px' }}>{m.equipo ? `${m.equipo.codigoInventario} — ${m.equipo.nombre}` : '—'}</td>
                      <td>{TIPO_MANT_LABEL[m.tipoTrabajo] || m.tipoTrabajo}</td>
                      <td><EstadoBadge estado={m.estadoEquipoResultante} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
