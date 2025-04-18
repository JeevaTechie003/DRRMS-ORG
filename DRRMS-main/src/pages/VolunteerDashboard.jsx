import React, { useEffect, useState } from 'react';
import '../styles/VolunteerDashboard.css';

const VolunteerDashboard = () => {
  const [allRequests, setAllRequests] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [resources, setResources] = useState([]);
  const [searchLocation, setSearchLocation] = useState('');
  const [searchResource, setSearchResource] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [activeTab, setActiveTab] = useState('allRequests');
  const [weatherAlerts, setWeatherAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const volunteerId = 3; // Example volunteer ID

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch data based on active tab
      const endpoints = {
        allRequests: 'http://localhost:4000/volunteers/all-requests',
        myTasks: `http://localhost:4000/volunteers/my-tasks?volunteer_id=${volunteerId}`
      };

      const [activeDataRes, resourcesRes, weatherRes] = await Promise.all([
        fetch(endpoints[activeTab]),
        fetch('http://localhost:4000/volunteers/resources'),
        fetch('http://localhost:4000/weather-alerts')
      ]);

      const [activeData, resourcesData, weatherData] = await Promise.all([
        activeDataRes.json(),
        resourcesRes.json(),
        weatherRes.json()
      ]);

      if (activeTab === 'allRequests') {
        setAllRequests(activeData);
      } else {
        setMyTasks(activeData);
      }

      setResources(resourcesData);
      setWeatherAlerts(weatherData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]); // Refetch when tab changes

  const handleAssign = async (requestId) => {
    try {
      const response = await fetch('http://localhost:4000/volunteers/assign-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ volunteer_id: volunteerId, request_id: requestId }),
      });

      if (!response.ok) throw new Error('Failed to assign task');
      
      alert('Task assigned successfully!');
      fetchData(); // Refresh both tabs
    } catch (error) {
      console.error('Error assigning task:', error);
      alert(error.message);
    }
  };

  const handleCompleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to mark this task as completed?')) return;
    
    try {
      const response = await fetch('http://localhost:4000/volunteers/complete-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: taskId }),
      });

      if (!response.ok) throw new Error('Failed to complete task');
      
      alert('Task marked as completed! Waiting for admin verification.');
      fetchData(); // Refresh both tabs
    } catch (error) {
      console.error('Error completing task:', error);
      alert(error.message);
    }
  };

  // Filter resources based on search criteria
  const filteredResources = resources.filter(r => {
    const matchesLocation = r.location.toLowerCase().includes(searchLocation.toLowerCase());
    const matchesResource = r.name.toLowerCase().includes(searchResource.toLowerCase());
    const matchesType = !selectedType || r.type.toLowerCase() === selectedType.toLowerCase();
    return matchesLocation && matchesResource && matchesType;
  });

  // Get current requests based on active tab
  const currentRequests = activeTab === 'allRequests' ? allRequests : myTasks;

  return (
    <div className="volunteer-dashboard dashboard-container">
      <h1>Volunteer Dashboard</h1>


      {/* Requests Section */}
      <div className="request-management">
        <div className="section-header">
          <h2 className="section-title">🆘 Help Requests</h2>
          <div className="tab-buttons">
            <button
              className={activeTab === 'allRequests' ? 'active' : ''}
              onClick={() => setActiveTab('allRequests')}
            >
              All Requests
            </button>
            <button
              className={activeTab === 'myTasks' ? 'active' : ''}
              onClick={() => setActiveTab('myTasks')}
            >
              My Tasks ({myTasks.length})
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="loading-spinner">Loading...</div>
        ) : currentRequests.length === 0 ? (
          <p className="no-requests-message">
            {activeTab === 'allRequests' 
              ? 'No pending requests available' 
              : 'You have no assigned tasks'}
          </p>
        ) : (
          <div className="card-grid">
            {currentRequests.map(request => (
              <div className="card" key={request.request_id}>
                <div className="card-header">
                  <span className={`status-badge status-${request.status}`}>
                    {request.status}
                  </span>
                  <span className="request-time">
                    {new Date(request.request_time).toLocaleString()}
                  </span>
                </div>
                <p><b>Citizen:</b> {request.citizen}</p>
                <p><b>Location:</b> {request.location}</p>
                <p><b>Resource:</b> {request.resource} ({request.quantity_requested})</p>
                <p><b>Remarks:</b> {request.remarks}</p>
                <div className="card-buttons">
                  {activeTab === 'allRequests' && request.status === 'pending' && (
                    <button onClick={() => handleAssign(request.request_id)}>
                      Assign to Me
                    </button>
                  )}
                  {activeTab === 'myTasks' && (
                    <button 
                      className="complete-btn"
                      onClick={() => handleCompleteTask(request.request_id)}
                    >
                      Mark as Completed
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="resource-management">
        <h2 className="section-title">📦 Available Resources</h2>
        <div className="search-filters">
          <input
            type="text"
            className="location-search"
            placeholder="Search by location..."
            value={searchLocation}
            onChange={(e) => setSearchLocation(e.target.value)}
          />
          <input
            type="text"
            className="resource-search"
            placeholder="Search by resource..."
            value={searchResource}
            onChange={(e) => setSearchResource(e.target.value)}
          />
          <select
            className="resource-filter"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            <option value="">All Types</option>
            <option value="food">Food</option>
            <option value="water">Water</option>
            <option value="medical">Medical</option>
            <option value="clothing">Clothing</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="resource-flex-container">
          {filteredResources.length === 0 ? (
            <p className="no-resources-message">❌ No resources found matching your criteria</p>
          ) : (
            filteredResources.map((res) => (
              <div className="card resource-card" key={res.id}>
                <div className="resource-header">
                  <span className={`resource-type type-${res.type}`}>{res.type}</span>
                  <span className="resource-updated">
                    Updated: {new Date(res.last_updated).toLocaleDateString()}
                  </span>
                </div>
                <p><b>Name:</b> {res.name}</p>
                <p><b>Qty:</b> {res.quantity} {res.unit}</p>
                <p><b>Location:</b> {res.location}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
export default VolunteerDashboard;