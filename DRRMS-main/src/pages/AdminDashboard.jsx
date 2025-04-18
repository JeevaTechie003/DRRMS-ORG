import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/AdminDashboard.css';

function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('resources');
  const [resources, setResources] = useState([]);
  const [shelters, setShelters] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [resourceLogs, setResourceLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setIsLoading(true);
    setError('');
    try {
      switch (activeTab) {
        case 'resources':
          const resRes = await fetch('http://localhost:4000/resources');
          const resData = await resRes.json();
          setResources(resData);
          break;
        case 'shelters':
          const shelRes = await fetch('http://localhost:4000/shelters');
          const shelData = await shelRes.json();
          setShelters(shelData);
          break;
        case 'volunteers':
          const volRes = await fetch('http://localhost:4000/users');
          const volData = await volRes.json();
          setVolunteers(volData.filter(user => user.role === 'volunteer'));
          break;
        case 'requests':
          const reqRes = await fetch('http://localhost:4000/admin/requests');
          const reqData = await reqRes.json();
          setRequests(reqData);
          break;
        case 'audit':
          const auditRes = await fetch('http://localhost:4000/audit_log');
          const auditData = await auditRes.json();
          setAuditLogs(auditData);
          break;
        case 'resourceLogs':
          const logRes = await fetch('http://localhost:4000/resource_audit_log');
          const logData = await logRes.json();
          setResourceLogs(logData);
          break;
        default:
          break;
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to fetch data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyRequest = async (requestId) => {
    console.log(requestId);
    try {
      const response = await fetch(`http://localhost:4000/requests`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'fulfilled', Id: requestId}),
      });

      if (!response.ok) {
        throw new Error('Failed to verify request');
      }

      // Refresh requests after verification
      fetchData();
    } catch (err) {
      console.error('Error verifying request:', err);
      setError(err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/');
  };

  const renderTable = () => {
    switch (activeTab) {
      case 'resources':
        return (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Type</th>
                <th>Quantity</th>
                <th>Unit</th>
                <th>Location</th>
                <th>Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {resources.map(resource => (
                <tr key={resource.id}>
                  <td>{resource.id}</td>
                  <td>{resource.name}</td>
                  <td>{resource.type}</td>
                  <td>{resource.quantity}</td>
                  <td>{resource.unit}</td>
                  <td>{resource.location_name}</td>
                  <td>{new Date(resource.last_updated).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      case 'shelters':
        return (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Location</th>
                <th>Capacity</th>
                <th>Current Occupancy</th>
                <th>Contact Number</th>
              </tr>
            </thead>
            <tbody>
              {shelters.map(shelter => (
                <tr key={shelter.name}>
                  <td>{shelter.name}</td>
                  <td>{shelter.Location}</td>
                  <td>{shelter.capacity}</td>
                  <td>{shelter.current_occupancy}</td>
                  <td>{shelter.contact_number}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      case 'volunteers':
        return (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Email</th>
                <th>Contact Number</th>
              </tr>
            </thead>
            <tbody>
              {volunteers.map(volunteer => (
                <tr key={volunteer.id}>
                  <td>{volunteer.id}</td>
                  <td>{volunteer.username}</td>
                  <td>{volunteer.email}</td>
                  <td>{volunteer.contact_number}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      case 'requests':
        return (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Citizen</th>
                <th>Location</th>
                <th>Resource</th>
                <th>Quantity</th>
                <th>Status</th>
                <th>Volunteer</th>
                <th>Remarks</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(request => (
                <tr key={request.request_id}>
                  <td>{request.request_id}</td>
                  <td>{request.citizen}</td>
                  <td>{request.location}</td>
                  <td>{request.resource}</td>
                  <td>{request.quantity_requested}</td>
                  <td>{request.status}</td>
                  <td>{request.volunteer || 'None'}</td>
                  <td>{request.remarks}</td>
                  <td>
                    {request.status === 'completed' && (
                      <button 
                        onClick={() => handleVerifyRequest(request.request_id)}
                        className="verify-btn"
                      >
                        Verify Completion
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      case 'audit':
        return (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Action</th>
                <th>Performed By</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map(log => (
                <tr key={log.id}>
                  <td>{log.id}</td>
                  <td>{log.action}</td>
                  <td>{log.performed_by}</td>
                  <td>{new Date(log.timestamp).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      case 'resourceLogs':
        return (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Resource ID</th>
                <th>Old Name</th>
                <th>Old Quantity</th>
                <th>New Name</th>
                <th>New Quantity</th>
                <th>Action</th>
                <th>Changed At</th>
              </tr>
            </thead>
            <tbody>
              {resourceLogs.map(log => (
                <tr key={log.id}>
                  <td>{log.id}</td>
                  <td>{log.resource_id}</td>
                  <td>{log.old_name}</td>
                  <td>{log.old_quantity}</td>
                  <td>{log.new_name}</td>
                  <td>{log.new_quantity}</td>
                  <td>{log.action_type}</td>
                  <td>{new Date(log.changed_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      default:
        return null;
    }
  };

  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1>Disaster Relief Resource Management - Admin Dashboard</h1>
        <button onClick={handleLogout} className="logout-btn">Logout</button>
      </header>

      <div className="admin-content">
        <nav className="admin-sidebar">
          <ul>
            <li 
              className={activeTab === 'resources' ? 'active' : ''}
              onClick={() => setActiveTab('resources')}
            >
              Resources
            </li>
            <li 
              className={activeTab === 'shelters' ? 'active' : ''}
              onClick={() => setActiveTab('shelters')}
            >
              Shelters
            </li>
            <li 
              className={activeTab === 'volunteers' ? 'active' : ''}
              onClick={() => setActiveTab('volunteers')}
            >
              Volunteers
            </li>
            <li 
              className={activeTab === 'requests' ? 'active' : ''}
              onClick={() => setActiveTab('requests')}
            >
              Citizen Requests
            </li>
            <li 
              className={activeTab === 'audit' ? 'active' : ''}
              onClick={() => setActiveTab('audit')}
            >
              Audit Logs
            </li>
            <li 
              className={activeTab === 'resourceLogs' ? 'active' : ''}
              onClick={() => setActiveTab('resourceLogs')}
            >
              Resource Audit Logs
            </li>
          </ul>
        </nav>

        <main className="admin-main">
          {error && <div className="error-message">{error}</div>}
          {isLoading ? (
            <div className="loading">Loading...</div>
          ) : (
            <div className="data-container">
              <h2>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h2>
              <div className="table-wrapper">
                {renderTable()}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default AdminDashboard;