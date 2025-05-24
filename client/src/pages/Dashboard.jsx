import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import io from 'socket.io-client';
import Toast from '../components/Toast';
import "../styles/Dashboard.css";
import { 
  FaUserEdit, 
  FaTrash, 
  FaTasks, 
  FaProjectDiagram, 
  FaUsers, 
  FaCalendarAlt, 
  FaChartBar,
  FaBell,
  FaCog,
  FaSignOutAlt,
  FaCheckCircle,
  FaExclamationCircle,
  FaClock,
  FaPlus,
  FaEdit,
  FaRegCalendarAlt,
  FaGripVertical
} from 'react-icons/fa';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

function Dashboard({ user, onLogout }) {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({
    totalTasks: 0,
    overdueTasks: 0,
    todayTasks: 0,
    completedTasks: 0
  });
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications] = useState([
    {
      id: 1,
      message: "New task assigned: Complete project documentation",
      time: "2 hours ago",
      photo: "https://ui-avatars.com/api/?name=John+Doe"
    },
    {
      id: 2,
      message: "Project deadline updated: Marketing Campaign",
      time: "5 hours ago",
      photo: "https://ui-avatars.com/api/?name=Jane+Smith"
    }
  ]);
  const [showProfile, setShowProfile] = useState(false);
  const [userPhoto, setUserPhoto] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [showSuccess, setShowSuccess] = useState(true);
  const [showEditTask, setShowEditTask] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const statuses = ["To Do", "In Progress", "Completed"];
  const [toastMessages, setToastMessages] = useState([]);

  const fetchProjects = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        onLogout();
        return;
      }

      const response = await axios.get("http://localhost:5000/api/projects", {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        withCredentials: true
      });
      setProjects(response.data);
    } catch (error) {
      console.error("Error fetching projects:", error);
      if (error.response?.status === 401) {
        onLogout();
        navigate("/login", { replace: true });
      }
    }
  }, [navigate, onLogout]);

  const fetchTasks = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        onLogout();
        return;
      }

      const response = await axios.get("http://localhost:5000/api/tasks/my-tasks", {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        withCredentials: true
      });
      setTasks(response.data);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      if (error.response?.status === 401) {
        onLogout();
        navigate("/login", { replace: true });
      }
    }
  }, [navigate, onLogout]);

  const fetchStats = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        onLogout();
        return;
      }

      const response = await axios.get("http://localhost:5000/api/tasks/stats", {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        withCredentials: true
      });
      setStats(response.data);
    } catch (error) {
      console.error("Error fetching stats:", error);
      if (error.response?.status === 401) {
        onLogout();
        navigate("/login", { replace: true });
      }
    }
  }, [navigate, onLogout]);

  useEffect(() => {
    fetchProjects();
    fetchTasks();
    fetchStats();
    // Load theme preference from localStorage
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
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
        }
      } catch (error) {
        console.error('Error fetching user photo:', error);
      }
    };

    fetchUserPhoto();
  }, [fetchProjects, fetchTasks, fetchStats]);

  useEffect(() => {
    // Socket.io for real-time activity
    const socket = io('http://localhost:5000');
    socket.on('project-created', (project) => {
      setRecentActivity(prev => [
        { type: 'project', description: `Project created: ${project.title}`, timestamp: new Date().toISOString() },
        ...prev
      ]);
      setProjects(prev => [project, ...prev]);
      setToastMessages((prev) => [...prev, { id: Date.now(), text: `Project created: ${project.title}`, type: 'success' }]);
    });
    socket.on('task-assigned', (task) => {
      setRecentActivity(prev => [
        { type: 'task', description: `Task assigned: ${task.title}`, timestamp: new Date().toISOString() },
        ...prev
      ]);
      setTasks(prev => [task, ...prev]);
      setToastMessages((prev) => [...prev, { id: Date.now(), text: `Task assigned: ${task.title}`, type: 'info' }]);
    });
    return () => socket.disconnect();
  }, []);

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await axios.post("http://localhost:5000/auth/logout", {}, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      onLogout();
      // Redirect to login page
      navigate('/login', { replace: true });
    }
  };

  const handleProfileNavigation = () => {
    navigate('/profile');
  };

  const handleClickOutside = useCallback((event) => {
    // Don't close if clicking on the logout button
    if (event.target.closest('.logout-btn')) {
      return;
    }
    
    if (showProfile && !event.target.closest('.profile-container')) {
      setShowProfile(false);
    }
    if (showNotifications && !event.target.closest('.notifications-container')) {
      setShowNotifications(false);
    }
  }, [showProfile, showNotifications]);

  useEffect(() => {
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [handleClickOutside]);

  const handleEditTask = (task) => {
    setEditTask(task);
    setShowEditTask(true);
  };

  const handleUpdateTask = (e) => {
    e.preventDefault();
    setTasks(tasks.map(t => t.id === editTask.id ? { ...editTask, tags: editTask.tags.split(',').map(tg => tg.trim()) } : t));
    setShowEditTask(false);
    setEditTask(null);
  };

  const handleEditTaskFileChange = (e) => {
    setEditTask({ ...editTask, files: [...(editTask.files || []), ...Array.from(e.target.files)] });
  };

  // Remove toast message
  const removeToastMessage = (id) => {
    setToastMessages((prev) => prev.filter(msg => msg.id !== id));
  };

  return (
    <div className="dashboard">
      <Sidebar />
      <Toast messages={toastMessages} removeMessage={removeToastMessage} />
      <div className="main-content">
        <Topbar
          user={user}
          onLogout={onLogout} 
          showNotifications={showNotifications}
          setShowNotifications={setShowNotifications}
          notifications={notifications}
          onProfile={handleProfileNavigation}
        />
        
        <div className="welcome-message">
          <h2>Welcome back, {user?.name || 'User'}! 👋</h2>
          <p>Here's what's happening with your projects today.</p>
        </div>

        <div className="dashboard-stats-pro">
          <div className="stat-card-pro">
            <div className="stat-icon stat-tasks">
              <FaTasks />
            </div>
            <div className="stat-info">
              <h3 className="stat-title">Total Tasks</h3>
              <p className="stat-value">{stats.totalTasks}</p>
            </div>
          </div>

          <div className="stat-card-pro">
            <div className="stat-icon stat-projects">
              <FaProjectDiagram />
            </div>
            <div className="stat-info">
              <h3 className="stat-title">Active Projects</h3>
              <p className="stat-value">{projects.length}</p>
            </div>
          </div>

          <div className="stat-card-pro">
            <div className="stat-icon stat-completed">
              <FaCheckCircle />
            </div>
            <div className="stat-info">
              <h3 className="stat-title">Completed Tasks</h3>
              <p className="stat-value">{stats.completedTasks}</p>
            </div>
          </div>

          <div className="stat-card-pro">
            <div className="stat-icon stat-overdue">
              <FaExclamationCircle />
            </div>
            <div className="stat-info">
              <h3 className="stat-title">Overdue Tasks</h3>
              <p className="stat-value">{stats.overdueTasks}</p>
            </div>
          </div>
        </div>

        <div className="dashboard-sections-pro">
          <div className="my-tasks-section">
            <h2>My Tasks</h2>
            <div className="my-tasks-list">
              {tasks.filter(task => String(task.assignedTo) === String(user?._id)).length === 0 && (
                <div className="empty-state">No tasks assigned yet.</div>
              )}
              {tasks.filter(task => String(task.assignedTo) === String(user?._id)).map(task => {
                // Find project for owner check
                const project = projects.find(p => p.id === task.projectId);
                const isOwner = project && String(project.owner) === String(user?._id);
                return (
                  <div key={task.id} className="kanban-task">
                    <div className="task-drag-handle"><FaGripVertical /></div>
                    <div className="flex items-center justify-between">
                      <div className="task-title">{task.title}</div>
                      {isOwner && (
                        <div className="task-actions">
                          <button className="edit-task-btn" title="Edit" onClick={() => handleEditTask(task)}><FaEdit /></button>
                          <button className="delete-task-btn" title="Delete" onClick={() => setTasks(tasks.filter(t => t.id !== task.id))}><FaTrash /></button>
                        </div>
                      )}
                    </div>
                    <div className="task-meta task-badges-row">
                      <span className="task-due"><FaRegCalendarAlt /> {task.due}</span>
                      <span className={`task-priority priority-${(task.priority||'Medium').toLowerCase()}`}>{task.priority}</span>
                      {task.tags && task.tags.length > 0 && <span className="task-tags">{task.tags.map(tag => <span key={tag} className="tag-chip">{tag}</span>)}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
            {showEditTask && (
              <div className="add-task-modal-bg">
                <div className="add-task-modal">
                  <form onSubmit={handleUpdateTask}>
                    <label>Task Title</label>
                    <input type="text" value={editTask.title} onChange={e => setEditTask({ ...editTask, title: e.target.value })} required />
                    <label>Description</label>
                    <textarea value={editTask.description} onChange={e => setEditTask({ ...editTask, description: e.target.value })} />
                    <label>Due Date</label>
                    <input type="date" value={editTask.due} onChange={e => setEditTask({ ...editTask, due: e.target.value })} required />
                    <label>Status</label>
                    <select value={editTask.status} onChange={e => setEditTask({ ...editTask, status: e.target.value })}>
                      {statuses.map(s => <option key={s}>{s}</option>)}
                    </select>
                    <label>Priority</label>
                    <select value={editTask.priority} onChange={e => setEditTask({ ...editTask, priority: e.target.value })}>
                      <option>High</option>
                      <option>Medium</option>
                      <option>Low</option>
                    </select>
                    <label>Tags (comma separated)</label>
                    <input type="text" value={Array.isArray(editTask.tags) ? editTask.tags.join(', ') : editTask.tags} onChange={e => setEditTask({ ...editTask, tags: e.target.value })} />
                    <label>Attachments</label>
                    <input type="file" multiple onChange={handleEditTaskFileChange} />
                    <div className="modal-buttons">
                      <button type="submit" className="submit-btn">Save</button>
                      <button type="button" className="cancel-btn" onClick={() => setShowEditTask(false)}>Cancel</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>

          <div className="recent-activity-section">
            <div className="section-header-pro">
              <h3>Recent Activity</h3>
            </div>
            <div className="activity-list">
              {recentActivity.map((activity, idx) => (
                <div key={idx} className="activity-item">
                  <div className="activity-icon">
                    {activity.type === 'project' ? <FaProjectDiagram /> : <FaTasks />}
                  </div>
                  <div className="activity-content">
                    <p>{activity.description}</p>
                    <div className="activity-details">
                      <span>{new Date(activity.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="dashboard-bottom-sections-pro">
          <div className="recent-projects-section">
            <div className="section-header-pro">
              <h3>Recent Projects</h3>
            </div>
            <div className="projects-grid">
              {projects.map(project => (
                <div key={project._id} className="project-card">
                  <div className="project-header">
                    <h3>{project.name}</h3>
                    <div className="project-actions">
                      <button className="icon-button">
                        <FaUserEdit />
                      </button>
                      <button className="icon-button">
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                  <p className="project-description">{project.description}</p>
                  <div className="project-meta">
                    <span className="project-status">{project.status}</span>
                    <span className="project-due-date">
                      Due: {new Date(project.dueDate).toLocaleDateString()}
                    </span>
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

export default Dashboard; 