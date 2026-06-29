import { useNavigate, NavLink } from 'react-router-dom';
import '../styles.css';

function Layout({ children }) {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const linkClass = ({ isActive }) =>
    isActive ? 'sidebar-link active' : 'sidebar-link';

  return (
    <div className="app-layout">
      {/* 上部ナビバー */}
      <header className="app-header">
        <span className="header-title">建築工事工程管理システム</span>
        <div className="header-right">
          <span className="header-username">{user.name || ''}</span>
          <button className="btn btn-secondary" style={{ padding: '5px 14px', fontSize: 13 }} onClick={handleLogout}>
            ログアウト
          </button>
        </div>
      </header>

      {/* サイドバー＋メインコンテンツ */}
      <div className="layout-body">
        <nav className="sidebar">
          <NavLink to="/" end className={linkClass}>
            <span className="sidebar-icon">□</span>ダッシュボード
          </NavLink>
          <NavLink to="/projects" className={linkClass}>
            <span className="sidebar-icon">⊞</span>現場一覧
          </NavLink>
          <NavLink to="/notifications" className={linkClass}>
            <span className="sidebar-icon">🔔</span>通知
          </NavLink>
          {user.role === 'admin' && (
            <NavLink to="/users" className={linkClass}>
              <span className="sidebar-icon">👤</span>ユーザー管理
            </NavLink>
          )}
        </nav>

        <main className="layout-main">
          {children}
        </main>
      </div>
    </div>
  );
}

export default Layout;
