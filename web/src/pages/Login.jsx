import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Pantalla de inicio de sesion (RF01). Login por correo institucional.
const CON_PANEL = ['administrador', 'supervisor', 'auditor'];
const destinoPara = (rol) => (CON_PANEL.includes(rol) ? '/app/panel' : '/app/equipos');

export default function Login() {
  const { usuario, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ correo: '', clave: '' });
  const [verClave, setVerClave] = useState(false);
  const [error, setError] = useState('');
  const [tocado, setTocado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (usuario) navigate(destinoPara(usuario.rol), { replace: true });
  }, [usuario, navigate]);

  const submit = async (e) => {
    e.preventDefault();
    setTocado(true);
    setError('');
    if (!form.correo || !form.clave) return;
    setEnviando(true);
    const r = await login(form.correo.trim(), form.clave);
    setEnviando(false);
    if (r.ok) navigate(destinoPara(r.usuario.rol), { replace: true });
    else setError(r.error);
  };

  const faltaCorreo = tocado && !form.correo;
  const faltaClave = tocado && !form.clave;

  return (
    <main className="login-wrap">
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
              <label className="form-label">Correo institucional</label>
              <input
                type="email"
                className={`form-control form-control-lg ${faltaCorreo ? 'is-invalid' : ''}`}
                placeholder="usuario@igssceibal.gob.gt"
                value={form.correo}
                autoComplete="username"
                onChange={(e) => setForm({ ...form, correo: e.target.value })}
              />
              {faltaCorreo && <div className="invalid-feedback">Este campo es obligatorio.</div>}
            </div>
            <div className="mb-4">
              <label className="form-label">Contraseña</label>
              <div className="input-group input-group-lg">
                <input
                  type={verClave ? 'text' : 'password'}
                  className={`form-control ${faltaClave ? 'is-invalid' : ''}`}
                  placeholder="Ingrese su contraseña"
                  value={form.clave}
                  autoComplete="current-password"
                  onChange={(e) => setForm({ ...form, clave: e.target.value })}
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setVerClave(!verClave)}
                  tabIndex={-1}
                  aria-label={verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  aria-pressed={verClave}
                  title={verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  <i className={`bi ${verClave ? 'bi-eye-slash' : 'bi-eye'}`} aria-hidden="true" />
                </button>
                {faltaClave && <div className="invalid-feedback">Este campo es obligatorio.</div>}
              </div>
            </div>
            <div className="d-grid">
              <button type="submit" className="btn btn-primary btn-lg" disabled={enviando}>
                {enviando
                  ? <><span className="spinner-border spinner-border-sm me-2" />Ingresando…</>
                  : <><i className="bi bi-box-arrow-in-right me-2" />Iniciar sesión</>}
              </button>
            </div>
          </form>
          <div className="text-center mt-3 texto-auxiliar">
            <div>Acceso restringido al personal autorizado</div>
          </div>
        </div>
      </div>
    </main>
  );
}
