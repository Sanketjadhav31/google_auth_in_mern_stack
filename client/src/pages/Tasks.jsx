import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import io from 'socket.io-client';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import Toast from '../components/Toast';
import TaskSuggestions from '../components/TaskSuggestions';
import { FaPlus, FaEllipsisH, FaPaperclip, FaUser, FaCalendarAlt, FaFlag, FaEdit, FaTrash, FaSearch, FaFilter, FaSort, FaBookmark, FaBell } from 'react-icons/fa';
import '../styles/Tasks.css';

const Tasks = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('dueDate');
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'Medium',
    status: 'To Do',
    dueDate: '',
    project: ''
  });
  const [bookmarkFilter, setBookmarkFilter] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [newReminder, setNewReminder] = useState({
    time: '',
    type: 'notification'
  });
  const [toastMessages, setToastMessages] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [newTaskFiles, setNewTaskFiles] = useState([]);
  const [newTaskRecurrence, setNewTaskRecurrence] = useState({ type: 'none', interval: 1, endDate: '' });

  // Socket.io connection
  useEffect(() => {
    const socket = io('http://localhost:5000');
    
    socket.on('task-update', (updatedTask) => {
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task._id === updatedTask._id ? updatedTask : task
        )
      );
    });

    socket.on('task-delete', (taskId) => {
      setTasks(prevTasks => prevTasks.filter(task => task._id !== taskId));
    });

    socket.on('task-create', (newTask) => {
      setTasks(prevTasks => [...prevTasks, newTask]);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    const fetchTasks = async () => {
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
        setLoading(false);
      } catch (error) {
        console.error("Error fetching tasks:", error);
        setError("Failed to load tasks");
        setLoading(false);
        if (error.response?.status === 401) {
          onLogout();
          navigate("/login", { replace: true });
        }
      }
    };

    fetchTasks();
  }, [navigate, onLogout]);

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await axios.get("http://localhost:5000/api/tasks/suggestions", {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          withCredentials: true
        });
        setSuggestions(response.data);
      } catch (error) {
        console.error("Error fetching suggestions:", error);
      }
    };

    fetchSuggestions();
  }, []);

  const handleEditTask = async (task) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(`http://localhost:5000/api/tasks/${task._id}`, task, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        withCredentials: true
      });
      setTasks(tasks.map(t => t._id === task._id ? response.data : t));
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/tasks/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        withCredentials: true
      });
      setTasks(tasks.filter(task => task._id !== taskId));
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  const handleTaskFileChange = (e) => {
    setNewTaskFiles([...newTaskFiles, ...Array.from(e.target.files)]);
  };

  const handleRecurrenceChange = (e) => {
    const { name, value } = e.target;
    setNewTaskRecurrence({ ...newTaskRecurrence, [name]: value });
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      // 1. Create the task (without files)
      const response = await axios.post("http://localhost:5000/api/tasks", {
        ...newTask,
        recurrence: newTaskRecurrence.type !== 'none' ? {
          type: newTaskRecurrence.type,
          interval: Number(newTaskRecurrence.interval),
          endDate: newTaskRecurrence.endDate || undefined
        } : undefined
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        withCredentials: true
      });
      let createdTask = response.data;
      // 2. Upload files if any
      if (newTaskFiles.length > 0) {
        for (const file of newTaskFiles) {
          const formData = new FormData();
          formData.append('file', file);
          const uploadRes = await axios.post(`http://localhost:5000/api/tasks/${createdTask._id}/attachments`, formData, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'multipart/form-data'
            },
            withCredentials: true
          });
          createdTask = uploadRes.data;
        }
      }
      setTasks([...tasks, createdTask]);
      setShowAddTask(false);
      setNewTask({
        title: '',
        description: '',
        priority: 'Medium',
        status: 'To Do',
        dueDate: '',
        project: ''
      });
      setNewTaskFiles([]);
      setNewTaskRecurrence({ type: 'none', interval: 1, endDate: '' });
    } catch (error) {
      console.error("Error creating task:", error);
    }
  };

  const handleToggleBookmark = async (taskId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.patch(`http://localhost:5000/api/tasks/${taskId}/bookmark`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        withCredentials: true
      });
      setTasks(tasks.map(t => t._id === taskId ? response.data : t));
    } catch (error) {
      console.error("Error toggling bookmark:", error);
    }
  };

  const handleAddReminder = async (taskId) => {
    setSelectedTask(tasks.find(t => t._id === taskId));
    setShowReminderModal(true);
  };

  const handleSaveReminder = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`http://localhost:5000/api/tasks/${selectedTask._id}/reminders`, newReminder, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        withCredentials: true
      });
      setTasks(tasks.map(t => t._id === selectedTask._id ? response.data : t));
      setShowReminderModal(false);
      setNewReminder({ time: '', type: 'notification' });
      setToastMessages(prev => [...prev, { id: Date.now(), text: 'Reminder added successfully!', type: 'success' }]);
    } catch (error) {
      console.error("Error adding reminder:", error);
      setToastMessages(prev => [...prev, { id: Date.now(), text: 'Failed to add reminder', type: 'error' }]);
    }
  };

  const handleRemoveReminder = async (taskId, reminderId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(`http://localhost:5000/api/tasks/${taskId}/reminders/${reminderId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        withCredentials: true
      });
      setTasks(tasks.map(t => t._id === taskId ? response.data : t));
      setToastMessages(prev => [...prev, { id: Date.now(), text: 'Reminder removed successfully!', type: 'success' }]);
    } catch (error) {
      console.error("Error removing reminder:", error);
      setToastMessages(prev => [...prev, { id: Date.now(), text: 'Failed to remove reminder', type: 'error' }]);
    }
  };

  const handleAddSuggestedTask = async (suggestion) => {
    try {
      const token = localStorage.getItem('token');
      const newTask = {
        title: suggestion.title,
        description: suggestion.description,
        project: suggestion.project._id,
        priority: suggestion.priority || 'Medium',
        status: 'To Do',
        dueDate: suggestion.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Default to 1 week from now
      };

      const response = await axios.post("http://localhost:5000/api/tasks", newTask, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        withCredentials: true
      });

      setTasks([...tasks, response.data]);
      setSuggestions(suggestions.filter(s => s._id !== suggestion._id));
      setToastMessages(prev => [...prev, { id: Date.now(), text: 'Task added successfully!', type: 'success' }]);
    } catch (error) {
      console.error("Error adding suggested task:", error);
      setToastMessages(prev => [...prev, { id: Date.now(), text: 'Failed to add task', type: 'error' }]);
    }
  };

  const handleProfileNavigation = () => {
    navigate('/profile');
  };

  // Filter and sort tasks
  const filteredTasks = tasks
    .filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          task.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPriority = priorityFilter === 'All' || task.priority === priorityFilter;
      const matchesStatus = statusFilter === 'All' || task.status === statusFilter;
      const matchesBookmark = !bookmarkFilter || task.bookmarked;
      return matchesSearch && matchesPriority && matchesStatus && matchesBookmark;
    })
    .sort((a, b) => {
      if (sortBy === 'dueDate') {
        return new Date(a.dueDate) - new Date(b.dueDate);
      } else if (sortBy === 'priority') {
        const priorityOrder = { High: 0, Medium: 1, Low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return 0;
    });

  if (loading) {
    return (
      <div className="dashboard">
        <Sidebar />
        <div className="main-content">
          <Topbar user={user} onLogout={onLogout} onProfile={handleProfileNavigation} />
          <div className="tasks-page">
            <div className="loading">Loading tasks...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard">
        <Sidebar />
        <div className="main-content">
          <Topbar user={user} onLogout={onLogout} onProfile={handleProfileNavigation} />
          <div className="tasks-page">
            <div className="error">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <Sidebar />
      <div className="main-content">
        <Topbar user={user} onLogout={onLogout} onProfile={handleProfileNavigation} />
        <div className="tasks-page">
          <div className="tasks-header">
            <div className="tasks-title">
              <h1>My Tasks</h1>
              {user?.role === 'admin' && (
                <button className="add-task-btn" onClick={() => setShowAddTask(true)}>
                  <FaPlus /> Add Task
                </button>
              )}
            </div>
            
            <div className="tasks-filters">
              <div className="search-box">
                <FaSearch />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="filter-group">
                <FaFilter />
                <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
                  <option value="All">All Priorities</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
              
              <div className="filter-group">
                <FaFilter />
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="All">All Status</option>
                  <option value="To Do">To Do</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
              
              <div className="filter-group">
                <FaSort />
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="dueDate">Sort by Due Date</option>
                  <option value="priority">Sort by Priority</option>
                </select>
              </div>

              <div className="filter-group">
                <FaBookmark />
                <select value={bookmarkFilter} onChange={(e) => setBookmarkFilter(e.target.value === 'true')}>
                  <option value="false">All Tasks</option>
                  <option value="true">Bookmarked</option>
                </select>
              </div>
            </div>
          </div>

          <div className="tasks-grid">
            {filteredTasks.length === 0 ? (
              <div className="empty-state">No tasks found.</div>
            ) : (
              filteredTasks.map(task => (
                <div key={task._id} className={`task-card ${task.bookmarked ? 'bookmarked' : ''}`}>
      <div className="task-header">
        <h3>{task.title}</h3>
                    <div className="task-actions">
                      <button 
                        className={`bookmark-btn ${task.bookmarked ? 'active' : ''}`} 
                        onClick={() => handleToggleBookmark(task._id)}
                        title={task.bookmarked ? 'Remove bookmark' : 'Add bookmark'}
                      >
                        <FaBookmark />
                      </button>
                      <button 
                        className="reminder-btn"
                        onClick={() => handleAddReminder(task._id)}
                        title="Add reminder"
                      >
                        <FaBell />
                      </button>
                      <button className="edit-task-btn" onClick={() => handleEditTask(task)}>
                        <FaEdit />
                      </button>
                      <button className="delete-task-btn" onClick={() => handleDeleteTask(task._id)}>
                        <FaTrash />
        </button>
                    </div>
      </div>
      <p className="task-description">{task.description}</p>
      <div className="task-meta">
        <span className="task-due-date">
                      <FaCalendarAlt /> {new Date(task.dueDate).toLocaleDateString()}
                    </span>
                    <span className={`task-priority priority-${task.priority?.toLowerCase() || 'medium'}`}>
                      {task.priority || 'Medium'}
        </span>
                    <span className={`task-status status-${task.status?.toLowerCase().replace(' ', '-')}`}>
                      {task.status || 'To Do'}
        </span>
      </div>
                  {task.attachments && task.attachments.length > 0 && (
                    <div className="task-attachments">
                      <strong>Attachments:</strong>
                      <ul>
                        {task.attachments.map((att, idx) => (
                          <li key={idx}>
                            <a href={att.url} target="_blank" rel="noopener noreferrer">{att.filename}</a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {task.recurrence && task.recurrence.type !== 'none' && (
                    <div className="task-recurrence">
                      <span>Repeats: {task.recurrence.type} every {task.recurrence.interval} {task.recurrence.type}(s){task.recurrence.endDate ? ` until ${new Date(task.recurrence.endDate).toLocaleDateString()}` : ''}</span>
                    </div>
                  )}
                  {task.reminders && task.reminders.length > 0 && (
                    <div className="task-reminders">
                      {task.reminders.map(reminder => (
                        <div key={reminder._id} className="reminder-item">
                          <FaBell />
                          <span>{new Date(reminder.time).toLocaleString()}</span>
                          <button 
                            className="remove-reminder-btn"
                            onClick={() => handleRemoveReminder(task._id, reminder._id)}
                          >
                            ×
                          </button>
            </div>
          ))}
        </div>
                  )}
                  {task.project && (
                    <div className="task-project">
                      <span>Project: {task.project.title}</span>
                    </div>
        )}
      </div>
              ))
            )}
    </div>

          <TaskSuggestions 
            suggestions={suggestions}
            onAddTask={handleAddSuggestedTask}
          />

          {showAddTask && (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Add New Task</h2>
                  <button onClick={() => setShowAddTask(false)}>×</button>
        </div>
                <form onSubmit={handleAddTask}>
        <div className="modal-body">
            <div className="form-group">
                      <label>Title</label>
                      <input
                        type="text"
                        value={newTask.title}
                        onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                        required
                      />
            </div>
            <div className="form-group">
              <label>Description</label>
                      <textarea
                        value={newTask.description}
                        onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                      />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Due Date</label>
                        <input
                          type="date"
                          value={newTask.dueDate}
                          onChange={(e) => setNewTask({...newTask, dueDate: e.target.value})}
                          required
                        />
              </div>
              <div className="form-group">
                <label>Priority</label>
                        <select
                          value={newTask.priority}
                          onChange={(e) => setNewTask({...newTask, priority: e.target.value})}
                        >
                          <option value="High">High</option>
                          <option value="Medium">Medium</option>
                          <option value="Low">Low</option>
                </select>
              </div>
            </div>
            <div className="form-group">
                      <label>Status</label>
                      <select
                        value={newTask.status}
                        onChange={(e) => setNewTask({...newTask, status: e.target.value})}
                      >
                        <option value="To Do">To Do</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                      </select>
            </div>
            <div className="form-group">
              <label>Attachments</label>
                      <input type="file" multiple onChange={handleTaskFileChange} />
                      {newTaskFiles.length > 0 && (
                        <ul style={{ marginTop: '0.5rem' }}>
                          {newTaskFiles.map((file, idx) => (
                            <li key={idx}>{file.name}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="form-group">
                      <label>Recurrence</label>
                      <select name="type" value={newTaskRecurrence.type} onChange={handleRecurrenceChange}>
                        <option value="none">None</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                      {newTaskRecurrence.type !== 'none' && (
                        <>
                          <label>Interval</label>
                          <input type="number" name="interval" min="1" value={newTaskRecurrence.interval} onChange={handleRecurrenceChange} />
                          <label>End Date</label>
                          <input type="date" name="endDate" value={newTaskRecurrence.endDate} onChange={handleRecurrenceChange} />
                        </>
                      )}
              </div>
        </div>
        <div className="modal-footer">
                    <button type="button" className="cancel-btn" onClick={() => setShowAddTask(false)}>
            Cancel
          </button>
                    <button type="submit" className="submit-btn">
                      Create Task
                    </button>
        </div>
                </form>
              </div>
            </div>
          )}

          {showReminderModal && (
            <div className="modal-overlay">
              <div className="modal-content">
                <div className="modal-header">
                  <h2>Add Reminder</h2>
                  <button onClick={() => setShowReminderModal(false)}>×</button>
                </div>
                <form onSubmit={handleSaveReminder}>
                  <div className="form-group">
                    <label>Reminder Time</label>
                    <input
                      type="datetime-local"
                      value={newReminder.time}
                      onChange={(e) => setNewReminder({ ...newReminder, time: e.target.value })}
                      required
                    />
                </div>
                  <div className="form-group">
                    <label>Reminder Type</label>
                    <select
                      value={newReminder.type}
                      onChange={(e) => setNewReminder({ ...newReminder, type: e.target.value })}
                    >
                      <option value="notification">Notification</option>
                      <option value="email">Email</option>
                    </select>
                </div>
                  <div className="form-actions">
                    <button type="button" onClick={() => setShowReminderModal(false)}>Cancel</button>
                    <button type="submit">Add Reminder</button>
                </div>
                </form>
              </div>
                                </div>
                              )}

          {toastMessages.map(toast => (
            <Toast
              key={toast.id}
              message={toast.text}
              type={toast.type}
              onClose={() => setToastMessages(prev => prev.filter(t => t.id !== toast.id))}
            />
                ))}
              </div>
      </div>
    </div>
  );
};

export default Tasks; 
 
 
 