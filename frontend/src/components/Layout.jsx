import { useState } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import '../styles.css';

function Layout({ children }) {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const linkClass = ({ isActive }) =>
    isActive ? 'sidebar-link active' : 'sidebar-link';

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="app-layout">
      {/* 上部ナビバー */}
      <header className="app-header">
        <button
          className="hamburger-btn"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="メニューを開く"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
        <span className="header-title">建築工事工程管理システム</span>
        <div className="header-right">
          <span className="header-username">{user.name || ''}</span>
          <button className="btn btn-secondary" style={{ padding: '5px 14px', fontSize: 13 }} onClick={handleLogout}>
            ログアウト
          </button>
        </div>
      </header>

      {/* サイドバー開閉オーバーレイ（スマホ時のみ） */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={closeSidebar} />
      )}

      {/* サイドバー＋メインコンテンツ */}
      <div className="layout-body">
        <nav className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
          <NavLink to="/" end className={linkClass} onClick={closeSidebar}>
            <span className="sidebar-icon">□</span>ダッシュボード
          </NavLink>
          <NavLink to="/projects" className={linkClass} onClick={closeSidebar}>
            <span className="sidebar-icon">⊞</span>現場一覧
          </NavLink>
          <NavLink to="/notifications" className={linkClass} onClick={closeSidebar}>
            <span className="sidebar-icon">🔔</span>通知
          </NavLink>
          {user.role === 'admin' && (
            <NavLink to="/users" className={linkClass} onClick={closeSidebar}>
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
