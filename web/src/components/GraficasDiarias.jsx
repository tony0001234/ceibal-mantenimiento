import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell,
} from 'recharts';
import { fmtQ } from '../data/constants';

// Gráficas diarias del período (RF08): costo, llamadas de emergencia y
// reparaciones por día. Componente reutilizado por el Dashboard y por Reportes,
// para que ambos usen exactamente los mismos datos reales (props `series`).
//
// Colores institucionales (coinciden con la paleta de la app y del PDF):
const AZUL = '#1B4B8A';  // costo
const ROJO = '#C0392B';  // llamadas de emergencia
const AMBAR = '#B7791F'; // reparaciones

// Formato de fecha legible para los tooltips (ej.: "lun 04 ago").
const fechaLegible = (iso) => {
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString('es-GT', {
      weekday: 'short', day: '2-digit', month: 'short',
    });
  } catch { return iso; }
};

// Tooltip común: muestra la fecha completa y el valor (moneda o conteo).
function TooltipDia({ active, payload, moneda, unidad }) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0].payload;
  const v = payload[0].value;
  return (
    <div style={{
      background: '#fff', border: '1px solid #D6DEE8', borderRadius: 6,
      padding: '6px 10px', fontSize: 12, boxShadow: '0 2px 8px rgba(0,0,0,.08)',
    }}>
      <div className="fw-semibold" style={{ color: '#0F2C55' }}>{fechaLegible(p.fecha)}</div>
      <div>{moneda ? fmtQ(v) : `${v} ${unidad}`}</div>
    </div>
  );
}

// Una tarjeta con su gráfica de barras (una sola serie).
function TarjetaGrafica({ titulo, subtitulo, icono, series, dataKey, color, moneda, unidad, ejeY }) {
  const hayDatos = series.some((d) => Number(d[dataKey]) > 0);
  // Limita la cantidad de etiquetas del eje X para que no se amontonen.
  const intervaloX = series.length > 16 ? Math.ceil(series.length / 12) - 1 : 0;

  return (
    <div className="card h-100">
      <div className="card-header titulo-seccion py-2 d-flex align-items-center gap-2">
        <i className={`bi ${icono}`} style={{ color }} />
        <span>{titulo}</span>
      </div>
      <div className="card-body">
        {subtitulo && <p className="texto-auxiliar mb-2" style={{ fontSize: 12 }}>{subtitulo}</p>}
        {series.length === 0 ? (
          <div className="text-center texto-auxiliar py-5">Sin datos en el período.</div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={series} margin={{ top: 8, right: 12, bottom: 20, left: 6 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E7EDF4" />
                <XAxis
                  dataKey="dia" interval={intervaloX} tickLine={false}
                  tick={{ fontSize: 11, fill: '#5A6B80' }}
                  label={{ value: 'Día del mes', position: 'insideBottom', offset: -10, fontSize: 12, fill: '#5A6B80' }}
                />
                <YAxis
                  allowDecimals={!!moneda} width={46} tickLine={false}
                  tick={{ fontSize: 11, fill: '#5A6B80' }}
                  label={{ value: ejeY, angle: -90, position: 'insideLeft', offset: 14, fontSize: 12, fill: '#5A6B80', style: { textAnchor: 'middle' } }}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(27,75,138,.06)' }}
                  content={<TooltipDia moneda={moneda} unidad={unidad} />}
                />
                <Bar dataKey={dataKey} fill={color} radius={[3, 3, 0, 0]} maxBarSize={26}>
                  {series.map((d, i) => (
                    <Cell key={i} fillOpacity={Number(d[dataKey]) > 0 ? 1 : 0.15} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {!hayDatos && (
              <p className="texto-auxiliar text-center mb-0" style={{ fontSize: 12 }}>
                No se registraron valores en el período.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function GraficasDiarias({ series = [], periodoLabel }) {
  return (
    <>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2 mt-1">
        <h2 className="titulo-seccion mb-0" style={{ fontSize: 18 }}>
          <i className="bi bi-graph-up me-2" />Actividad diaria del período
        </h2>
        {periodoLabel && <span className="texto-auxiliar text-capitalize">{periodoLabel}</span>}
      </div>
      <div className="row g-3">
        <div className="col-12 col-xl-4">
          <TarjetaGrafica
            titulo="Costo por día" icono="bi-cash-coin"
            subtitulo="Costo de mantenimiento generado cada día."
            series={series} dataKey="costo" color={AZUL}
            moneda ejeY="Costo (Q)"
          />
        </div>
        <div className="col-12 col-xl-4">
          <TarjetaGrafica
            titulo="Llamadas de emergencia por día" icono="bi-telephone-inbound"
            subtitulo="Cantidad de llamadas de emergencia registradas cada día."
            series={series} dataKey="emergencias" color={ROJO}
            unidad="llamada(s)" ejeY="N.º de llamadas"
          />
        </div>
        <div className="col-12 col-xl-4">
          <TarjetaGrafica
            titulo="Reparaciones por día" icono="bi-tools"
            subtitulo="Mantenimientos correctivos realizados cada día."
            series={series} dataKey="reparaciones" color={AMBAR}
            unidad="reparación(es)" ejeY="N.º de reparaciones"
          />
        </div>
      </div>
    </>
  );
}
