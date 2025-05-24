import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { FaUserEdit, FaTrash, FaUserPlus, FaEnvelope, FaUserTag, FaCheck, FaTimes } from 'react-icons/fa';
import axios from 'axios';
import '../styles/Dashboard.css';

function Team() {
  const [team, setTeam] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newMember, setNewMember] = useState({ name: '', email: '', role: 'Member', avatar: '' });
  const [editRoleId, setEditRoleId] = useState(null);
  const [editRoleValue, setEditRoleValue] = useState('Member');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Get token from localStorage
  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      withCredentials: true
    };
  };

  // Fetch team members from backend
  useEffect(() => {
    fetchTeam();
    // Optionally, add Socket.io for real-time updates
    // ...
  }, []);

  const fetchTeam = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get('http://localhost:5000/api/team', getAuthHeader());
      setTeam(res.data);
    } catch (err) {
      console.error('Error fetching team:', err);
      setError(err.response?.data?.message || 'Failed to load team members.');
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    setError('');
    try {
      await axios.delete(`http://localhost:5000/api/team/${id}`, getAuthHeader());
      setTeam(team.filter(m => m._id !== id));
    } catch (err) {
      console.error('Error deleting member:', err);
      setError(err.response?.data?.message || 'Failed to delete member.');
    }
  };

  const handleEditRole = (id, currentRole) => {
    setEditRoleId(id);
    setEditRoleValue(currentRole);
  };

  const handleRoleChange = (e) => {
    setEditRoleValue(e.target.value);
  };

  const handleRoleSave = async (id) => {
    setError('');
    try {
      await axios.put(
        `http://localhost:5000/api/team/${id}`,
        { role: editRoleValue },
        getAuthHeader()
      );
      setTeam(team.map(m => m._id === id ? { ...m, role: editRoleValue } : m));
      setEditRoleId(null);
    } catch (err) {
      console.error('Error updating role:', err);
      setError(err.response?.data?.message || 'Failed to update role.');
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    // Validation
    if (!newMember.name.trim() || !newMember.email.trim()) {
      setError('Name and email are required.');
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(newMember.email)) {
      setError('Invalid email format.');
      return;
    }
    if (team.some(m => m.email === newMember.email)) {
      setError('A member with this email already exists.');
      return;
    }
    try {
      const res = await axios.post(
        'http://localhost:5000/api/team',
        newMember,
        getAuthHeader()
      );
      setTeam([...team, res.data]);
      setShowAdd(false);
      setNewMember({ name: '', email: '', role: 'Member', avatar: '' });
    } catch (err) {
      console.error('Error adding member:', err);
      setError(err.response?.data?.message || 'Failed to add member.');
    }
  };

  return (
    <div className="dashboard">
      <Sidebar />
      <div className="main-content">
        <Topbar />
        <div className="dashboard-bottom-sections-pro">
          <div className="team-section" style={{width:'100%'}}>
            <div className="section-header-pro">
              <h3>Team Members</h3>
              <button className="add-team-btn" onClick={()=>setShowAdd(true)}><FaUserPlus /> Add Team Member</button>
            </div>
            {error && <div className="team-success-alert" style={{background:'#fdeaea',color:'#e74c3c'}}>{error}</div>}
            {loading ? <div>Loading...</div> : (
            <div className="team-grid">
              {team.map(member => (
                <div key={member._id} className="team-card">
                  <div className="team-card-avatar">
                    {member.avatar ? (
                      <img src={member.avatar} alt={member.name} />
                    ) : (
                      <div className="avatar-placeholder">{member.name.charAt(0)}</div>
                    )}
                  </div>
                  <div className="team-card-info">
                    <h4 className="team-card-name">{member.name}</h4>
                    <p className="team-card-email"><FaEnvelope style={{marginRight:4}} />{member.email}</p>
                    <div className="team-card-badges">
                      <span className="badge badge-role"><FaUserTag style={{marginRight:3}} />
                        {editRoleId === member._id ? (
                          <>
                            <select value={editRoleValue} onChange={handleRoleChange} style={{marginLeft:4}}>
                              <option value="Member">Member</option>
                              <option value="Admin">Admin</option>
                            </select>
                            <button className="team-action-btn" style={{marginLeft:4}} onClick={()=>handleRoleSave(member._id)}><FaCheck /></button>
                            <button className="team-action-btn" onClick={()=>setEditRoleId(null)}><FaTimes /></button>
                          </>
                        ) : (
                          <>
                            {member.role}
                            <button className="team-action-btn" style={{marginLeft:6}} onClick={()=>handleEditRole(member._id, member.role)}><FaUserEdit /></button>
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="team-card-actions">
                    <button className="team-action-btn" onClick={()=>handleDelete(member._id)}><FaTrash /></button>
                  </div>
                </div>
              ))}
            </div>
            )}
            {showAdd && (
              <div className="modal">
                <div className="modal-content">
                  <h2>Add Team Member</h2>
                  <form onSubmit={handleAdd}>
                    <input type="text" placeholder="Name" value={newMember.name} onChange={e=>setNewMember({...newMember, name: e.target.value})} required />
                    <input type="email" placeholder="Email" value={newMember.email} onChange={e=>setNewMember({...newMember, email: e.target.value})} required />
                    <select value={newMember.role} onChange={e=>setNewMember({...newMember, role: e.target.value})}>
                      <option value="Member">Member</option>
                      <option value="Admin">Admin</option>
                    </select>
                    <div className="modal-buttons">
                      <button type="submit" className="submit-btn">Add</button>
                      <button type="button" className="cancel-btn" onClick={()=>setShowAdd(false)}>Cancel</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Team; 
 
 
 