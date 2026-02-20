import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import UserWizard from './UserWizard';
import './App.css';

// Admin Dashboard
function AdminDashboard() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchApplications = async () => {
    try {
      const response = await fetch('/api/v1/applications/');
      const data = await response.json();
      setApplications(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch applications:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleStatusChange = async (appId, newStatus) => {
    try {
      // Mocking local status update for now
      setApplications(apps => apps.map(app =>
        app.id === appId ? { ...app, status: newStatus } : app
      ));
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  return (
    <div className="App">
      <header className="header" style={{ borderBottom: '4px solid #138808' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>🇮🇳 NSIC Admin Portal</h1>
            <p>Verification & SNP Management Dashboard</p>
          </div>
          <Link to="/" className="btn btn-secondary">Logout</Link>
        </div>
      </header>

      <main className="container" style={{ padding: '40px 20px' }}>
        <div className="step-content">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>Applications Pending Verification</h2>
            <button className="btn btn-secondary" onClick={fetchApplications}>🔄 Refresh</button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
              <thead>
                <tr style={{ background: '#f0f0f0', textAlign: 'left' }}>
                  <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>ID</th>
                  <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>Company</th>
                  <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>Owner</th>
                  <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>City</th>
                  <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>Status</th>
                  <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" style={{ padding: '20px', textAlign: 'center' }}>Loading...</td></tr>
                ) : applications.length === 0 ? (
                  <tr><td colSpan="6" style={{ padding: '20px', textAlign: 'center' }}>No applications found.</td></tr>
                ) : (
                  applications.map(app => (
                    <tr key={app.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '12px' }}>{app.id.substring(0, 8)}...</td>
                      <td style={{ padding: '12px', fontWeight: 'bold' }}>{app.mse_profile.company_name}</td>
                      <td style={{ padding: '12px' }}>{app.mse_profile.owner_name}</td>
                      <td style={{ padding: '12px' }}>{app.mse_profile.city}</td>
                      <td style={{ padding: '12px' }}>
                        <span className={`status-badge ${app.status === 'verified' ? 'success' : app.status === 'rejected' ? 'error' : 'warning'}`}
                          style={{
                            background: app.status === 'verified' ? '#d4edda' : app.status === 'rejected' ? '#f8d7da' : '#fff3cd',
                            color: app.status === 'verified' ? '#155724' : app.status === 'rejected' ? '#721c24' : '#856404',
                            padding: '4px 8px', borderRadius: '4px', textTransform: 'capitalize'
                          }}>
                          {app.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        {app.status === 'submitted' && (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => handleStatusChange(app.id, 'verified')}
                              style={{ padding: '6px 12px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                            >
                              Verify
                            </button>
                            <button
                              onClick={() => handleStatusChange(app.id, 'rejected')}
                              style={{ padding: '6px 12px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<UserWizard />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
