import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import client from '../api/client';
import '../styles.css';

function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await client.post('/api/auth/register', { name, email, password });
      navigate('/login');
    } catch (err) {
      if (err.response?.status === 409) {
        setError('このメールアドレスはすでに登録されています');
      } else if (err.response?.status === 400) {
        setError('入力内容に不備があります。すべての項目を正しく入力してください');
      } else {
        setError('登録に失敗しました。しばらくしてから再試行してください');
      }
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-logo">建築工事工程管理システム</div>
      <div className="auth-card">
        <h1 className="auth-title">新規アカウント登録</h1>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">名前</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              placeholder="例：山田 太郎"
            />
          </div>
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
              placeholder="8文字以上推奨"
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block">登録する</button>
        </form>
        <div className="auth-footer">
          すでにアカウントをお持ちの方は<Link to="/login">こちら</Link>
        </div>
      </div>
    </div>
  );
}

export default Register;
