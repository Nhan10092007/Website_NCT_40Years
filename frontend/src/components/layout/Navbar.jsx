import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/auth-context';
import { assets } from '../../assets/asset-registry';

export default function Navbar() {
  const { user, logout } = useAuth();
  return (
    <header className="site-header">
      <Link className="brand" to="/"><img src={assets.logo} alt="Logo Trường THPT Nguyễn Công Trứ" /><span>NCT 40</span></Link>
      <nav aria-label="Điều hướng chính">
        <NavLink to="/">Trang chủ</NavLink>
        <NavLink to="/memories">Dòng ký ức</NavLink>
      </nav>
      <div className="header-account">
        {user ? <><Link to={`/users/${user.id}`}>{user.display_name}</Link><button type="button" className="button button-ghost" onClick={logout}>Đăng xuất</button></> : <Link className="button button-small" to="/login">Đăng nhập</Link>}
      </div>
    </header>
  );
}