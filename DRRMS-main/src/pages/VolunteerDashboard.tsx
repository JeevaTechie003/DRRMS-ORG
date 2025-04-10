import React, { useEffect, useState } from 'react';
import '../styles/VolunteerDashboard.css';

type Request = {
  request_id: number;
  citizen: string;
  location: string;
  resource: string;
  quantity_requested: number;
  status: string;
  remarks: string;
};

type Resource = {
  id: number;
  name: string;
  type: string;
  quantity: number;
  unit: string;
  location: string;
};

const VolunteerDashboard = () => {
  const [requests, setRequests] = useState<Request[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [searchLocation, setSearchLocation] = useState('');
  const volunteerId = 2;

  const fetchData = async () => {
    const requestsRes = await fetch('http://localhost:4000/volunteers/requests');
    const requestsData = await requestsRes.json();
    setRequests(requestsData);

    const resourcesRes = await fetch('http://localhost:4000/volunteers/resources');
    const resourcesData = await resourcesRes.json();
    setResources(resourcesData);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAssign = async (requestId: number) => {
    await fetch('http://localhost:4000/volunteers/assign-task', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ volunteer_id: volunteerId, request_id: requestId }),
    });
    alert('You are assigned to the task!');
    fetchData();
  };

  const filteredResources = resources.filter((r) =>
    r.location.toLowerCase().includes(searchLocation.toLowerCase())
  );

  return (
    <div className="volunteer-dashboard dashboard-container">
      <h1>Volunteer Dashboard</h1>

      <h2 className="section-title">🆘 Help Requests</h2>
      <div className="card-grid">
        {requests.map((r) => (
          <div className="card" key={r.request_id}>
            <p><b>Citizen:</b> {r.citizen}</p>
            <p><b>Location:</b> {r.location}</p>
            <p><b>Resource:</b> {r.resource} ({r.quantity_requested})</p>
            <p><b>Status:</b> <span className={`status-${r.status}`}>{r.status}</span></p>
            <p><b>Remarks:</b> {r.remarks}</p>
            <div className="card-buttons">
              <button onClick={() => handleAssign(r.request_id)}>Assign</button>
            </div>
          </div>
        ))}
      </div>

      <h2 className="section-title">📦 Available Resources</h2>
      <input
        type="text"
        className="location-search"
        placeholder="Search by location..."
        value={searchLocation}
        onChange={(e) => setSearchLocation(e.target.value)}
      />

      <div className="resource-flex-container">
        {filteredResources.length === 0 ? (
          <p className="no-resources-message">❌ No resources found for the location "{searchLocation}"</p>
        ) : (
          filteredResources.map((res) => (
            <div className="card resource-card" key={res.id}>
              <p><b>Name:</b> {res.name}</p>
              <p><b>Type:</b> {res.type}</p>
              <p><b>Qty:</b> {res.quantity} {res.unit}</p>
              <p><b>Location:</b> {res.location}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default VolunteerDashboard;
