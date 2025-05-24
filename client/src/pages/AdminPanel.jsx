import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import axios from 'axios';
import '../styles/Dashboard.css';

function AdminPanel({ user }) {
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      withCredentials: true
    };
  };

  useEffect(() => {
    fetchUsers();
    fetchTasks();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get('http://localhost:5000/api/admin/users', getAuthHeader());
      setUsers(res.data);
    } catch (err) {
      setError('Failed to load users.');
    }
    setLoading(false);
  };

  const fetchTasks = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/admin/tasks', getAuthHeader());
      setTasks(res.data);
    } catch (err) {
      setError('Failed to load tasks.');
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Delete this user?')) return;
    try {
      await axios.delete(`http://localhost:5000/api/admin/user/${id}`, getAuthHeader());
      setUsers(users.filter(u => u._id !== id));
    } catch (err) {
      setError('Failed to delete user.');
    }
  };

  const handleDeleteTask = async (id) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await axios.delete(`http://localhost:5000/api/admin/task/${id}`, getAuthHeader());
      setTasks(tasks.filter(t => t._id !== id));
    } catch (err) {
      setError('Failed to delete task.');
    }
  };

  return (
    <div className="dashboard">
      <Sidebar />
      <div className="main-content">
        <Topbar user={user} />
        <div className="dashboard-bottom-sections-pro">
          <div className="team-section" style={{width:'100%'}}>
            <div className="section-header-pro">
              <h3>Admin Panel</h3>
            </div>
            {error && <div className="team-success-alert" style={{background:'#fdeaea',color:'#e74c3c'}}>{error}</div>}
            <h4>All Users</h4>
            <div className="team-grid">
              {users.map(u => (
                <div key={u._id} className="team-card">
                  <div className="team-card-avatar">
                    {u.image ? <img src={u.image} alt={u.displayName} /> : <div className="avatar-placeholder">{u.displayName?.charAt(0) || u.email.charAt(0)}</div>}
                  </div>
                  <div className="team-card-info">
                    <h4 className="team-card-name">{u.displayName || u.email}</h4>
                    <p className="team-card-email">{u.email}</p>
                    <div className="team-card-badges">
                      <span className="badge badge-role">{u.role}</span>
                    </div>
                  </div>
                  <div className="team-card-actions">
                    <button className="team-action-btn" onClick={()=>handleDeleteUser(u._id)} title="Delete User"><i className="fas fa-trash"></i></button>
                  </div>
                </div>
              ))}
            </div>
            <h4 style={{marginTop:'2rem'}}>All Tasks</h4>
            <div className="team-grid">
              {tasks.map(t => (
                <div key={t._id} className="team-card">
                  <div className="team-card-info">
                    <h4 className="team-card-name">{t.title}</h4>
                    <p className="team-card-email">Assigned: {t.assignedTo?.displayName || t.assignedTo?.email || 'Unassigned'}</p>
                    <div className="team-card-badges">
                      <span className="badge badge-role">{t.status}</span>
                      <span className="badge badge-role">{t.priority}</span>
                    </div>
                  </div>
                  <div className="team-card-actions">
                    <button className="team-action-btn" onClick={()=>handleDeleteTask(t._id)} title="Delete Task"><i className="fas fa-trash"></i></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminPanel; 
 
 
 