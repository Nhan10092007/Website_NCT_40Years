import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getApiError } from '../api/client';
import { useAuth } from '../context/auth-context';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  async function submit(e) { e.preventDefault(); try { await login(form); navigate(location.state?.from || '/'); } catch (err) { setError(getApiError(err)); } }
  return <section className="auth-page"><form className="auth-card" onSubmit={submit}><p className="eyebrow">Chào mừng trở lại</p><h1>Đăng nhập</h1>{error && <p className="alert">{error}</p>}<label>Email<input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label><label>Mật khẩu<input required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label><button className="button" type="submit">Đăng nhập</button><p className="muted">Chưa có tài khoản? <Link to="/register">Đăng ký</Link></p></form></section>;
}
