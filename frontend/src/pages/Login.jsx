import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import client from '../api/client';
import '../styles.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await client.post('/api/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      navigate('/');
    } catch (err) {
      if (err.response?.status === 401) {
        setError('メールアドレスまたはパスワードが正しくありません');
      } else {
        setError('サーバーエラーが発生しました。しばらくしてから再試行してください');
      }
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-logo">建築工事工程管理システム</div>
      <div className="auth-card">
        <h1 className="auth-title">ログイン</h1>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">メールアドレス</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="example@company.com"
            />
          </div>
          <div className="form-group">
            <label className="form-label">パスワード</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="パスワードを入力"
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block">ログイン</button>
        </form>
        <div className="auth-footer">
          <Link to="/register">新規アカウント登録はこちら</Link>
        </div>
      </div>
    </div>
  );
}

export default Login;
