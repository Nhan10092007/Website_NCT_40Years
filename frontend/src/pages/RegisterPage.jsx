import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import client, { getApiError } from '../api/client';
import { useAuth } from '../context/auth-context';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [cohorts, setCohorts] = useState([]);
  const [form, setForm] = useState({ email: '', password: '', displayName: '', role: 'alumni', cohort: '', className: '' });
  const [error, setError] = useState('');
  const [cohortsLoading, setCohortsLoading] = useState(true);
  const [cohortsError, setCohortsError] = useState('');

  const loadCohorts = useCallback(() => {
    setCohortsLoading(true);
    setCohortsError('');
    client.get('/auth/cohorts')
      .then(({ data }) => {
        if (!Array.isArray(data)) {
          throw new Error('Dữ liệu niên khóa từ máy chủ không hợp lệ');
        }
        setCohorts(data);
      })
      .catch((err) => setCohortsError(getApiError(err)))
      .finally(() => setCohortsLoading(false));
  }, []);

  useEffect(() => {
    const request = setTimeout(loadCohorts, 0);
    return () => clearTimeout(request);
  }, [loadCohorts]);
  function update(key, value) { setForm({ ...form, [key]: value }); }
  async function submit(e) { e.preventDefault(); try { await register(form); navigate('/'); } catch (err) { setError(getApiError(err)); } }
  return <section className="auth-page"><form className="auth-card" onSubmit={submit}><p className="eyebrow">Tham gia cộng đồng</p><h1>Tạo tài khoản</h1>{error && <p className="alert">{error}</p>}<label>Họ và tên<input required value={form.displayName} onChange={(e) => update('displayName', e.target.value)} /></label><label>Email<input required type="email" value={form.email} onChange={(e) => update('email', e.target.value)} /></label><label>Mật khẩu<input required minLength="8" type="password" value={form.password} onChange={(e) => update('password', e.target.value)} /></label><label>Vai trò<select value={form.role} onChange={(e) => update('role', e.target.value)}><option value="student">Học sinh</option><option value="alumni">Cựu học sinh</option><option value="teacher">Giáo viên</option></select></label>{form.role !== 'teacher' && <><label>Niên khóa<select required disabled={cohortsLoading || Boolean(cohortsError)} value={form.cohort} onChange={(e) => update('cohort', e.target.value)}><option value="">{cohortsLoading ? 'Đang tải niên khóa...' : 'Chọn niên khóa'}</option>{cohorts.map((cohort) => <option key={cohort} value={cohort}>{cohort}</option>)}</select>{cohortsError && <span className="error-text">{cohortsError} <button className="retry-button" type="button" onClick={loadCohorts}>Thử lại</button></span>}</label><label>Lớp<input required value={form.className} onChange={(e) => update('className', e.target.value)} /></label></>}<button className="button" disabled={cohortsLoading && form.role !== 'teacher'} type="submit">Đăng ký</button><p className="muted">Đã có tài khoản? <Link to="/login">Đăng nhập</Link></p></form></section>;
}
