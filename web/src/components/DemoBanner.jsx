// Aviso reutilizable: recuerda que las acciones son SIMULADAS (prototipo NO funcional).
export default function DemoBanner({ texto }) {
  return (
    <div className="alert alert-info d-flex align-items-center py-2 px-3 mb-3" style={{ fontSize: '13px', borderRadius: '10px' }}>
      <i className="bi bi-info-circle me-2" />
      <span>{texto || 'Prototipo de demostración: las acciones son simuladas y no modifican datos reales.'}</span>
    </div>
  );
}
