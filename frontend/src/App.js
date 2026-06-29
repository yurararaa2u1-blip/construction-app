import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login           from './pages/Login';
import Register        from './pages/Register';
import Dashboard       from './pages/Dashboard';
import ProjectList     from './pages/ProjectList';
import ProjectCreate   from './pages/ProjectCreate';
import ProjectDetail   from './pages/ProjectDetail';
import GanttChart      from './pages/GanttChart';
import UserManagement  from './pages/UserManagement';
import Notifications   from './pages/Notifications';
import PrivateRoute    from './components/PrivateRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 公開ページ */}
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* 認証必須ページ */}
        <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/projects"          element={<PrivateRoute><ProjectList /></PrivateRoute>} />
        <Route path="/projects/new"      element={<PrivateRoute><ProjectCreate /></PrivateRoute>} />
        <Route path="/projects/:id"      element={<PrivateRoute><ProjectDetail /></PrivateRoute>} />
        <Route path="/projects/:id/gantt" element={<PrivateRoute><GanttChart /></PrivateRoute>} />
        <Route path="/users"             element={<PrivateRoute><UserManagement /></PrivateRoute>} />
        <Route path="/notifications"     element={<PrivateRoute><Notifications /></PrivateRoute>} />

        {/* 未マッチはトップへ */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
