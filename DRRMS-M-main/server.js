require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');
const bcrypt = require('bcrypt');
const app = express();
const PORT = process.env.PORT || 4000;

const corsOptions = {
  origin: "http://localhost:5173", // Frontend URL
  credentials: true,  // Allow credentials
};

app.use(cors(corsOptions));
app.use(express.json());

// Get Locations
app.get('/locations', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM locations');
    res.json(rows);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get Users
app.get('/users', async (req, res) => {
  try {
    const [users] = await db.query('SELECT * FROM users');
    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// User Login
app.post('/login', async (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password || !role) {
    return res.status(400).json({ error: 'Email, password, and role are required.' });
  }

  try {
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);

    if (users.length === 0) {
      return res.status(401).json({ error: 'User not found.' });
    }

    const user = users[0];

    if (user.password !== password) {
      return res.status(401).json({ error: 'Invalid password.' });
    }

    if (user.role.toLowerCase() !== role.toLowerCase()) {
      return res.status(403).json({ error: `User is not authorized as ${role}.` });
    }

    res.json({ message: 'Login successful', user: { id: user.id, email: user.email, role: user.role } });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// User Registration
app.post('/register', async (req, res) => {
  try {
    const { username, password, email, role, contact_number } = req.body;

    console.log(req.body);

    const [result] = await db.query(
      'INSERT INTO users (username, password, email, role, contact_number) VALUES (?, ?, ?, ?, ?)',
      [username, password, email, role, contact_number || null]
    );

    res.status(200).json({ message: 'Registration successful' });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get Volunteer Requests
app.get('/volunteers/requests', async (req, res) => {
  try {
    const [requests] = await db.query(`
      SELECT r.id AS request_id, u.username AS citizen, l.name AS location,
             res.name AS resource, r.quantity_requested, r.status, r.remarks
      FROM requests r
      JOIN users u ON r.user_id = u.id
      JOIN resources res ON r.resource_id = res.id
      JOIN locations l ON r.location_id = l.id
      WHERE r.status = 'pending'
    `);
    res.json(requests);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch help requests' });
  }
});

// Get Volunteer Resources
app.get('/volunteers/resources', async (req, res) => {
  try {
    const [resources] = await db.query(`
      SELECT r.id, r.name, r.type, r.quantity, r.unit, l.name AS location
      FROM resources r
      JOIN locations l ON r.location_id = l.id
    `);
    res.json(resources);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch resources' });
  }
});

// Assign Task to Volunteer
app.post('/volunteers/assign-task', async (req, res) => {
  const { volunteer_id, request_id } = req.body;

  try {
    // Start transaction
    await db.query('START TRANSACTION');

    // 1. Update request status
    await db.query(
      'UPDATE requests SET status = "assigned" WHERE id = ? AND status = "pending"',
      [request_id]
    );

    // 2. Create volunteer request record
    await db.query(
      'INSERT INTO volunteer_requests (volunteer_id, request_id) VALUES (?, ?)',
      [volunteer_id, request_id]
    );

    // 3. Log the action
    await db.query(
      'INSERT INTO audit_log (action, performed_by) VALUES (?, ?)',
      [`Volunteer ${volunteer_id} assigned to request ${request_id}`, volunteer_id]
    );

    // Commit transaction
    await db.query('COMMIT');

    res.json({ success: true, message: 'Task assigned successfully' });
  } catch (err) {
    // Rollback on error
    await db.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to assign task' });
  }
});

// Update Volunteer Task
app.post('/volunteers/complete-task', async (req, res) => {
  const request_id  = req.body.task_id;
  try {
    await db.query('UPDATE requests SET status ="completed" WHERE id = ?',[request_id]);
    res.json({ success: true, message: 'Request status updated',ok:true });
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
});

// Get Locations for Volunteers
app.get('/volunteers/locations', async (req, res) => {
  try {
    const [locations] = await db.query('SELECT * FROM locations');
    res.json(locations);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
});

// Admin Get Requests
app.get('/admin/requests', async (req, res) => {
  try {
    const [requests] = await db.query(`
      SELECT 
    r.id AS request_id, 
    u.username AS citizen, 
    l.name AS location, 
    res.name AS resource, 
    r.quantity_requested, 
    r.status, 
    r.remarks,
    vu.username AS volunteer
FROM requests r
JOIN users u ON r.user_id = u.id
JOIN resources res ON r.resource_id = res.id
JOIN locations l ON r.location_id = l.id
LEFT JOIN volunteer_requests vr ON vr.request_id = r.id
LEFT JOIN users vu ON vu.id = vr.volunteer_id;
    `);

    res.json(requests);
  } catch (err) {
    console.error(err);
    res.status(500).json(err);
  }
});



// Fetch My Requests
app.get('/my-requests', async (req, res) => {
  const { user_id } = req.query;

  try {
    const [rows] = await db.query(
      `SELECT r.id, r.status, r.quantity_requested, r.remarks, res.name AS resource, l.name AS location
       FROM requests r
       JOIN resources res ON r.resource_id = res.id
       JOIN locations l ON r.location_id = l.id
       WHERE r.user_id = ?`,
      [user_id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching my requests:', err);
    res.status(500).json({ error: 'Failed to fetch your requests' });
  }
});

// Get Alerts
app.get('/alerts', async (req, res) => {
  try {
    const [alerts] = await db.query('SELECT id, message, severity, timestamp FROM alerts ORDER BY timestamp DESC');
    res.json(alerts);
  } catch (err) {
    console.error('Error fetching alerts:', err);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// Profile Routes
// Get Profile
app.get('/profile/:id', async (req, res) => {
  const userId = req.params.id;
  try {
    // Query database for user data
    const [users] = await db.query('SELECT username, email, contact_number FROM users WHERE id = ?', [userId]);

    // If no user is found, return 404
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Send the first user (since it's assumed that id is unique)
    res.json(users[0]);
  } catch (err) {
    console.error('Error fetching profile:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});


// Update Profile
app.put('/profile/:id', async (req, res) => {
  const userId = req.params.id;
  const { username, email, contact_number } = req.body;

  try {
    await db.query(
      'UPDATE users SET username = ?, email = ?, contact_number = ? WHERE id = ?',
      [username, email, contact_number, userId]
    );
    res.json({ message: 'Profile updated successfully' });
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});


app.post('/user/requests', async (req, res) => {
  const { user_id, resource_id, location_id, quantity_requested, remarks } = req.body;
  console.log(req.body);
  try {

    // Now insert into requests
    await db.query(
      'INSERT INTO requests (user_id, resource_id, quantity_requested, location_id, status, remarks) VALUES (?, ?, ?, ?, ?, ?)',
      [user_id, resource_id, quantity_requested, location_id, 'pending', remarks]
    );

    res.status(201).json({ message: 'Request submitted successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error.' });
  }
});

app.get('/resources', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT r.*, l.name AS location_name 
      FROM resources r
      LEFT JOIN locations l ON r.location_id = l.id
    `);
    res.json(rows);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Endpoint to get requests made by a specific user
app.get('/my-requests', async (req, res) => {
  const { user_id } = req.query;

  if (!user_id) return res.status(400).json({ error: "User ID is required." });

  try {
    const [rows] = await db.query(
      `SELECT r.id, r.status, r.quantity_requested, r.remarks, res.name AS resource, l.name AS location
       FROM requests r
       JOIN resources res ON r.resource_id = res.id
       JOIN locations l ON r.location_id = l.id
       WHERE r.user_id = ?`,
      [user_id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching my requests:', err);
    res.status(500).json({ error: 'Failed to fetch your requests' });
  }
});

/*app.get('/shelters', async (req, res) => {
  try {
    // Ensure the query is correct and retrieve data from the database
    const [rows] = await db.query(`
      SELECT S.name, l.name AS Location, S.capacity, S.current_occupancy, S.contact_number
      FROM shelters S
      JOIN locations l ON S.location_id = l.id;
    `);

    // Send the data as JSON
    res.json(rows);
  } catch (err) {
    // Improved error handling with a more descriptive error message
    console.error('Database error:', err.message);  // Log just the error message for clarity
    res.status(500).json({ error: 'Internal Server Error: Unable to fetch shelters data.' });
  }
});*/
app.get('/shelters', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT S.name, l.name AS Location, S.capacity, S.current_occupancy, S.contact_number FROM shelters S JOIN locations l ON S.location_id = l.id;');
    res.json(rows);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/volunteers/my-tasks', async (req, res) => {
  const  volunteer_id  = req.query.volunteer_id;

  try {
    const [tasks] = await db.query(`
      SELECT vr.id, vr.request_id, vr.status, vr.assigned_at, vr.completed_at,
             r.user_id AS citizen_id, u.username AS citizen,
             res.name AS resource, r.quantity_requested,
             l.name AS location, r.remarks
      FROM volunteer_requests vr
      JOIN requests r ON vr.request_id = r.id
      JOIN users u ON r.user_id = u.id
      JOIN resources res ON r.resource_id = res.id
      JOIN locations l ON r.location_id = l.id
      WHERE vr.volunteer_id = ?
    `, [volunteer_id]);

    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});
app.get('/volunteers/all-requests', async (req, res) => {
  try {
    const [requests] = await db.query(
      `SELECT r.id AS request_id, u.username AS citizen, l.name AS location,
       res.name AS resource, r.quantity_requested, r.status, r.remarks, r.request_time
       FROM requests r
       JOIN users u ON r.user_id = u.id
       JOIN resources res ON r.resource_id = res.id
       JOIN locations l ON r.location_id = l.id
       WHERE r.status = 'pending'`
    );
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch all requests' });
  }
});

app.post('/volunteers/complete-task', async (req, res) => {
  const { request_id, volunteer_id } = req.body;

  try {
    // Start transaction
    await db.query('START TRANSACTION');

    // 1. Update volunteer request status
    await db.query(
      'UPDATE volunteer_requests SET status = "completed", completed_at = CURRENT_TIMESTAMP WHERE request_id = ? AND volunteer_id = ?',
      [request_id, volunteer_id]
    );

    // 2. Update main request status
    await db.query(
      'UPDATE requests SET status = "completed" WHERE id = ?',
      [request_id]
    );

    // 3. Log the action
    await db.query(
      'INSERT INTO audit_log (action, performed_by) VALUES (?, ?)',
      [`Volunteer ${volunteer_id} completed request ${request_id}`, volunteer_id]
    );

    // Commit transaction
    await db.query('COMMIT');

    res.json({ success: true, message: 'Task marked as completed. Waiting for admin verification.' });
  } catch (err) {
    // Rollback on error
    await db.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to complete task' });
  }
});

// Get weather alerts
app.get('/weather-alerts', async (req, res) => {
  try {
    const [alerts] = await db.query(
      `SELECT region, message, weather_alert as severity 
       FROM locations 
       WHERE weather_alert != 'none'`
    );
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch weather alerts' });
  }
});

app.put('/requests',async (req,res)=> {
  try{
    const request_id=req.body.Id;
    const stat=req.body.status;
    await db.query(`delete from volunteer_requests where request_id=${request_id}` );
    await db.query(`update requests set status='${stat}' where id=${request_id}`);
    res.json({success: true });
  }
  catch(err){
    res.status(500).json(err);
    console.log(err)
  }
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
