import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import client from '../api/client';

function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await client.post('/api/auth/register', { name, email, password });
      navigate('/login');
    } catch (err) {
      setError('登録に失敗しました');
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '100px auto', padding: 24 }}>
      <h2>新規登録</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <div>
          <label>名前</label><br />
          <input type="text" value={name} onChange={e => setName(e.target.value)} required style={{ width: '100%', marginBottom: 12 }} />
        </div>
        <div>
          <label>メールアドレス</label><br />
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={{ width: '100%', marginBottom: 12 }} />
        </div>
        <div>
          <label>パスワード</label><br />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={{ width: '100%', marginBottom: 12 }} />
        </div>
        <button type="submit" style={{ width: '100%' }}>登録</button>
      </form>
      <p><Link to="/login">ログインはこちら</Link></p>
    </div>
  );
}

export default Register;
