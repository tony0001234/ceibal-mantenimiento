import { ESTADOS } from '../data/mockData';

// Badge de estado: el color SIEMPRE se acompaña de etiqueta textual (5.3.2),
// de modo que sea comprensible en escala de grises o con daltonismo.
export default function EstadoBadge({ estado }) {
  const e = ESTADOS[estado] || ESTADOS.baja;
  return (
    <span className={`estado-badge ${e.cls}`}>
      <span className="dot" />
      {e.label}
    </span>
  );
}
