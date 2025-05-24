import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import '../styles/Profile.css';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

function Profile({ user, setUser }) {
  const navigate = useNavigate();
  const [recentActivity, setRecentActivity] = useState([
    {
      id: 1,
      type: 'login',
      description: 'Logged in from Chrome on Windows',
      timestamp: '2024-03-20T10:30:00',
      location: 'New York, USA',
      device: 'Chrome on Windows'
    },
    {
      id: 2,
      type: 'password_change',
      description: 'Password changed successfully',
      timestamp: '2024-03-19T15:45:00',
      location: 'New York, USA',
      device: 'Chrome on Windows'
    },
    {
      id: 3,
      type: 'login',
      description: 'Logged in from Safari on iPhone',
      timestamp: '2024-03-18T09:15:00',
      location: 'New York, USA',
      device: 'Safari on iPhone'
    }
  ]);
  const [loginStats, setLoginStats] = useState({
    totalLogins: 156,
    lastLogin: '2024-03-20T10:30:00',
    activeSessions: 2,
    loginMethods: {
      email: 120,
      google: 25,
      github: 11
    }
  });
  const [userPhoto, setUserPhoto] = useState(null);
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [securitySettings, setSecuritySettings] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    twoFactorEnabled: false
  });
  const [editMode, setEditMode] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    role: user?.role || 'Member',
    bio: user?.bio || '',
    photo: userPhoto || '',
    photoFile: null
  });
  const [saving, setSaving] = useState(false);
  const [roleSaving, setRoleSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    // Check if user is authenticated
    if (!user) {
      navigate('/login');
      return;
    }

    // Load theme preference from localStorage
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setIsDarkTheme(savedTheme === 'dark');
      document.body.classList.toggle('dark-theme', savedTheme === 'dark');
    }

    // Fetch user profile photo
    const fetchUserPhoto = async () => {
      try {
        const response = await fetch('/api/users/profile', {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          setUserPhoto(data.photo || null);
          setProfileForm(f => ({ ...f, photo: data.photo || '', name: data.name || user?.name || '', role: data.role || user?.role || 'Member', bio: data.bio || '' }));
        }
      } catch (error) {
        console.error('Error fetching user photo:', error);
      }
    };

    fetchUserPhoto();
  }, [user, navigate]);

  const handleThemeToggle = () => {
    setIsDarkTheme(!isDarkTheme);
    document.body.classList.toggle('dark-theme');
    localStorage.setItem('theme', isDarkTheme ? 'light' : 'dark');
  };

  const handleEditProfile = () => setEditMode(true);
  const handleCancelEdit = () => setEditMode(false);

  const handleProfileChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'photo' && files && files[0]) {
      setProfileForm(f => ({ ...f, photoFile: files[0], photo: URL.createObjectURL(files[0]) }));
    } else {
      setProfileForm(f => ({ ...f, [name]: value }));
    }
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");
    try {
      const formData = new FormData();
      formData.append('name', profileForm.name);
      formData.append('bio', profileForm.bio);
      if (profileForm.photoFile) {
        formData.append('photo', profileForm.photoFile);
      }
      const token = localStorage.getItem('token');
      const response = await axios.put('http://localhost:5000/auth/profile', formData, {
        withCredentials: true,
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });
      setUserPhoto(response.data.photo || userPhoto);
      setUser(u => ({ ...u, displayName: response.data.name, bio: response.data.bio, image: response.data.photo }));
      setProfileForm(f => ({ ...f, name: response.data.name, bio: response.data.bio, photo: response.data.photo, photoFile: null }));
      setEditMode(false);
    } catch (error) {
      setErrorMsg(error.response?.data?.message || error.message || 'Failed to update profile');
    }
    setSaving(false);
  };

  const handleRoleChange = async (e) => {
    const newRole = e.target.value;
    setRoleSaving(true);
    setErrorMsg("");
    try {
      const token = localStorage.getItem('token');
      const response = await axios.patch('http://localhost:5000/auth/role', { role: newRole }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        withCredentials: true
      });
      setUser(u => ({ ...u, role: newRole }));
      setProfileForm(f => ({ ...f, role: newRole }));
    } catch (error) {
      setErrorMsg(error.response?.data?.message || error.message || 'Failed to update role');
    }
    setRoleSaving(false);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    if (securitySettings.newPassword !== securitySettings.confirmPassword) {
      setErrorMsg("New passwords don't match");
      return;
    }
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5000/auth/change-password', {
        currentPassword: securitySettings.currentPassword,
        newPassword: securitySettings.newPassword
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        withCredentials: true
      });
      setShowSecurityModal(false);
      setSecuritySettings({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        twoFactorEnabled: securitySettings.twoFactorEnabled
      });
    } catch (error) {
      setErrorMsg(error.response?.data?.message || error.message || 'Failed to change password');
    }
  };

  const handleLogoutAllDevices = async () => {
    try {
      await axios.post('/api/auth/logout-all', {}, {
        withCredentials: true
      });
      setLoginStats(prev => ({
        ...prev,
        activeSessions: 1
      }));
      // Add new activity
      setRecentActivity(prev => [{
        id: Date.now(),
        type: 'logout_all',
        description: 'Logged out from all other devices',
        timestamp: new Date().toISOString(),
        location: 'Current Location',
        device: navigator.userAgent
      }, ...prev]);
    } catch (error) {
      alert('Failed to logout from all devices');
    }
  };

  return (
    <div className="profile-dashboard">
      <Sidebar />
      <div className="profile-main-content">
        <Topbar user={user} onProfile={() => {}} onLogout={() => {}} />
        <div className="profile-page base-profile-css">
      <div className="profile-header">
        <div className="profile-info">
              {profileForm.photo ? (
                <img src={profileForm.photo} alt="Profile" className="profile-image-large" />
          ) : (
            <div className="profile-initial-large">
                  {profileForm.name?.charAt(0) || user?.email?.charAt(0)}
            </div>
          )}
          <div className="profile-details">
                {editMode ? (
                  <form className="profile-edit-form" onSubmit={handleProfileSave} encType="multipart/form-data">
                    {errorMsg && (
                      <div className="profile-error-msg" style={{color: 'red', marginBottom: '1rem'}}>{errorMsg}</div>
                    )}
                    <input
                      type="text"
                      name="name"
                      value={profileForm.name}
                      onChange={handleProfileChange}
                      placeholder="Name"
                      required
                      style={{marginBottom:'0.5rem'}}
                    />
                    <input
                      type="file"
                      name="photo"
                      accept="image/*"
                      onChange={handleProfileChange}
                      style={{marginBottom:'0.5rem'}}
                    />
                    <select
                      name="role"
                      value={profileForm.role || user?.role || 'user'}
                      onChange={handleRoleChange}
                      disabled={roleSaving}
                      style={{marginBottom:'0.5rem'}}
                    >
                      <option value="admin">Admin</option>
                      <option value="user">Member</option>
                    </select>
                    <textarea
                      name="bio"
                      value={profileForm.bio}
                      onChange={handleProfileChange}
                      placeholder="Bio"
                      rows={3}
                      style={{marginBottom:'0.5rem'}}
                    />
                    <div style={{display:'flex',gap:'1rem'}}>
                      <button className="submit-btn" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
                      <button className="cancel-btn" type="button" onClick={handleCancelEdit}>Cancel</button>
        </div>
                  </form>
                ) : (
                  <>
                    <h1>{profileForm.name || 'User'}</h1>
                    <p>{profileForm.email}</p>
                    <p style={{margin:'0.5rem 0',color:'#888'}}>{profileForm.role}</p>
                    {profileForm.bio && <p style={{margin:'0.5rem 0',color:'#666'}}>{profileForm.bio}</p>}
                    <button className="add-team-btn" style={{marginTop:'0.5rem'}} onClick={handleEditProfile}>Edit Profile</button>
                  </>
                )}
              </div>
            </div>
            <div className="header-actions">
              <button className="back-btn" onClick={() => navigate('/dashboard')}>
                <i className="fas fa-arrow-left"></i>
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile; 