import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import client from '../api/client';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await client.post('/api/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      navigate('/projects');
    } catch (err) {
      setError('メールアドレスまたはパスワードが正しくありません');
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '100px auto', padding: 24 }}>
      <h2>ログイン</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <div>
          <label>メールアドレス</label><br />
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={{ width: '100%', marginBottom: 12 }} />
        </div>
        <div>
          <label>パスワード</label><br />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={{ width: '100%', marginBottom: 12 }} />
        </div>
        <button type="submit" style={{ width: '100%' }}>ログイン</button>
      </form>
      <p><Link to="/register">新規登録はこちら</Link></p>
    </div>
  );
}

export default Login;
