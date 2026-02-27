const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt'); 
const jwt = require('jsonwebtoken'); 

const app = express();
const PORT = 3000;
const JWT_SECRET = 'super_secret_ifa_key_2026'; 

app.use(express.json());
app.use(cors());

// ==========================================
// 1. JAVASCRIPT IN-MEMORY DATABASE
// ==========================================
// These arrays replace your MongoDB collections. 
// Note: Data stored here will reset if you restart the Node.js server.
const users = [];
const studentProfiles = [];
const staffProfiles = [];
const adminProfiles = [];

// A simple helper function to generate unique IDs for new users
const generateId = () => Math.random().toString(36).substr(2, 9);

// ==========================================
// 2. AUTO-SEED ADMIN ACCOUNT
// ==========================================
async function seedAdmin() {
    // Hashes the password '12345' so it works seamlessly with the login route
    const hashedAdminPassword = await bcrypt.hash('12345', 10);
    const adminProfileId = generateId();

    // 1. Create the Admin Profile
    adminProfiles.push({
        id: adminProfileId,
        name: 'System Administrator',
        email: 'admin@ifa.edu',
        permissions: ['All']
    });
// 2. Create the Admin Login Credentials
    users.push({
        id: generateId(),
        role: 'admin',
        username: 'ADMIN', // <-- Change this to uppercase
        password: hashedAdminPassword,
        profileId: adminProfileId
    });
   

    console.log("✅ Default Admin created. (Role: Admin, Username: admin, Password: 12345)");
}
// Run the seed function when the server starts
seedAdmin();


// ==========================================
// 3. SECURE API ENDPOINTS
// ==========================================

// --- LOGIN ROUTE ---
app.post('/login', async (req, res) => {
    const { role, username, password } = req.body;
// ADD THESE TWO LINES:
    console.log(`\n--- LOGIN ATTEMPT ---`);
    console.log(`Trying to log in as -> Role: '${role}', Username: '${username}', Password: '${password}'`);
    try {
        // Find the user in our JavaScript array
        const user = users.find(u => u.role === role && u.username.toLowerCase() === username.toLowerCase());
        if (!user) return res.status(401).json({ message: 'Invalid credentials' });

        // Check if the password matches
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) return res.status(401).json({ message: 'Invalid credentials' });

        // Find the specific profile data based on their role
        let profileData = null;
        if (role === 'student') profileData = studentProfiles.find(p => p.id === user.profileId);
        else if (role === 'staff') profileData = staffProfiles.find(p => p.id === user.profileId);
        else if (role === 'admin') profileData = adminProfiles.find(p => p.id === user.profileId);

        if (!profileData) return res.status(404).json({ message: 'Profile data not found' });

        const token = jwt.sign(
            { userId: user.id, role: user.role, profileId: user.profileId }, 
            JWT_SECRET, { expiresIn: '2h' }
        );

        res.status(200).json({ 
            message: 'Authentication successful', token: token, 
            user: { id: user.profileId, role: user.role, name: profileData.name } 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error during authentication' });
    }
});

// --- ADD NEW USER ROUTE (Used by the Admin) ---
app.post('/api/users/add', async (req, res) => {
    const { role, username, password, name, email, major, department } = req.body;

    try {
        // Check if username is already taken in our array
        const existingUser = users.find(u => u.username === username);
        if (existingUser) return res.status(400).json({ message: 'Register Number / Username already taken' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newProfileId = generateId();

        // Push new profile to the correct array based on role
        if (role === 'student') {
            studentProfiles.push({ 
                id: newProfileId, 
                name, 
                email, 
                major: major || 'Undeclared', 
                enrollmentDate: new Date().toLocaleDateString(), 
                recentWork: [] 
            });
        } else if (role === 'staff') {
            staffProfiles.push({ 
                id: newProfileId, 
                name, 
                email, 
                department: department || 'General Faculty', 
                classesTaught: [] 
            });
        } else if (role === 'admin') {
            adminProfiles.push({ id: newProfileId, name, email, permissions: [] });
        }

        // Push the login credentials to the users array
        users.push({
            id: generateId(),
            role, 
            username, 
            password: hashedPassword, 
            profileId: newProfileId
        });

        res.status(201).json({ message: `${role.toUpperCase()} account created successfully!` });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error creating user' });
    }
});

// --- GET STUDENT PROFILE ROUTE ---
app.get('/api/student/:id', (req, res) => {
    try {
        // Search the studentProfiles array for the specific ID
        const profile = studentProfiles.find(p => p.id === req.params.id);
        if (profile) res.status(200).json(profile);
        else res.status(404).json({ message: 'Profile not found' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// ==========================================
// 4. START SERVER
// ==========================================
app.listen(PORT, () => {
    console.log(`🚀 Secure Server is running on http://localhost:${PORT}`);
});