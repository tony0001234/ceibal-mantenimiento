import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Pantalla de inicio de sesión (RF01). Diseño basado en el mockup institucional.
export default function Login() {
  const { usuario, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ usuario: '', clave: '' });
  const [verClave, setVerClave] = useState(false);
  const [error, setError] = useState('');
  const [tocado, setTocado] = useState(false);

  if (usuario) { navigate('/app/equipos'); }

  const submit = (e) => {
    e.preventDefault();
    setTocado(true);
    if (!form.usuario || !form.clave) { setError(''); return; }
    const r = login(form.usuario, form.clave);
    if (r.ok) {
      // Redirige al panel si el rol lo tiene; si no, a Equipos.
      navigate('/app/panel');
    } else {
      setError(r.error);
    }
  };

  const faltaUsuario = tocado && !form.usuario;
  const faltaClave = tocado && !form.clave;

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-head">
          <div className="login-logo"><i className="bi bi-stack" /></div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '.25rem' }}>Sistema de Control de Mantenimiento</h1>
          <div style={{ fontSize: '13px', opacity: .85 }}>Hospital General de Accidentes «Ceibal» — IGSS</div>
        </div>
        <div className="login-body">
          {error && (
            <div className="alert alert-danger py-2 px-3" style={{ fontSize: '14px' }}>
              <i className="bi bi-exclamation-triangle me-2" />{error}
            </div>
          )}
          <form onSubmit={submit} noValidate>
            <div className="mb-3">
              <label className="form-label">Usuario</label>
              <input
                type="text"
                className={`form-control form-control-lg ${faltaUsuario ? 'is-invalid' : ''}`}
                placeholder="Ingrese su usuario"
                value={form.usuario}
                onChange={(e) => setForm({ ...form, usuario: e.target.value })}
              />
              {faltaUsuario && <div className="invalid-feedback">Este campo es obligatorio.</div>}
            </div>
            <div className="mb-4">
              <label className="form-label">Contraseña</label>
              <div className="input-group input-group-lg">
                <input
                  type={verClave ? 'text' : 'password'}
                  className={`form-control ${faltaClave ? 'is-invalid' : ''}`}
                  placeholder="Ingrese su contraseña"
                  value={form.clave}
                  onChange={(e) => setForm({ ...form, clave: e.target.value })}
                />
                <button type="button" className="btn btn-outline-secondary" onClick={() => setVerClave(!verClave)} tabIndex={-1}>
                  <i className={`bi ${verClave ? 'bi-eye-slash' : 'bi-eye'}`} />
                </button>
                {faltaClave && <div className="invalid-feedback">Este campo es obligatorio.</div>}
              </div>
            </div>
            <div className="d-grid">
              <button type="submit" className="btn btn-primary btn-lg">
                <i className="bi bi-box-arrow-in-right me-2" />Iniciar sesión
              </button>
            </div>
          </form>
          <div className="text-center mt-3 texto-auxiliar">
            <div>Acceso restringido al personal autorizado</div>
            <div className="mt-1">
              <strong>Demo:</strong> admin / admin123&nbsp;·&nbsp;pgarcia / tecnico123&nbsp;·&nbsp;rlopez / super123
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
