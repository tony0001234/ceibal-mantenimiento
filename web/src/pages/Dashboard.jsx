import { KPIS, DISTRIBUCION_TIPO, MANTENIMIENTOS } from '../data/mockData';
import EstadoBadge from '../components/EstadoBadge';

// Panel de indicadores (RF08). Parte de la pantalla de inicio para
// Supervisor y Administrador (5.3.3).
const kpis = [
  { label: 'Equipos registrados', value: KPIS.equiposRegistrados, icon: 'bi-hdd-stack', color: 'var(--ceibal-azul-600)' },
  { label: 'Equipos fuera de servicio', value: KPIS.equiposFuera, icon: 'bi-exclamation-octagon', color: 'var(--estado-fuera)' },
  { label: 'Mantenimientos del mes', value: KPIS.mantenimientosMes, icon: 'bi-calendar-check', color: 'var(--estado-funcionando)' },
  { label: 'Tiempo medio de reparación (MTTR)', value: `${KPIS.mttrHoras} h`, icon: 'bi-stopwatch', color: 'var(--estado-mantenimiento)' },
];

export default function Dashboard() {
  const maxDist = Math.max(...DISTRIBUCION_TIPO.map((d) => d.cantidad));
  const ultimos = MANTENIMIENTOS.slice(0, 5);

  return (
    <>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-1">
        <h1 className="titulo-pantalla mb-0">Panel de indicadores</h1>
        <span className="texto-auxiliar"><i className="bi bi-calendar3 me-1" />Agosto 2026</span>
      </div>
      <p className="texto-auxiliar mb-4">Resumen del estado del mantenimiento en el mes en curso.</p>

      {/* Cuatro cifras clave (RF08) */}
      <div className="row g-3 mb-4">
        {kpis.map((k) => (
          <div className="col-12 col-sm-6 col-xl-3" key={k.label}>
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

      <div className="row g-3">
        {/* Distribución de mantenimientos por tipo */}
        <div className="col-12 col-lg-6">
          <div className="card h-100">
            <div className="card-header titulo-seccion py-2">Mantenimientos por tipo</div>
            <div className="card-body">
              {DISTRIBUCION_TIPO.map((d) => (
                <div className="bar-row" key={d.tipo}>
                  <span style={{ fontSize: '14px' }}>{d.tipo}</span>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${(d.cantidad / maxDist) * 100}%`, background: d.color }} />
                  </div>
                  <span className="fw-semibold text-end">{d.cantidad}</span>
                </div>
              ))}
              <p className="texto-auxiliar mb-0 mt-2">Total del mes: {DISTRIBUCION_TIPO.reduce((a, b) => a + b.cantidad, 0)} registros.</p>
            </div>
          </div>
        </div>

        {/* Últimos registros ingresados */}
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
                  {ultimos.map((m) => (
                    <tr key={m.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{m.fecha}</td>
                      <td style={{ fontSize: '13.5px' }}>{m.equipo}</td>
                      <td>{m.tipo}</td>
                      <td><EstadoBadge estado={m.estadoFinal} /></td>
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
