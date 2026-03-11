const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'students.json');

// Load students from file on startup
let students = {};
try {
    if (fs.existsSync(DATA_FILE)) {
        students = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
} catch {
    students = {};
}

function saveStudents() {
    fs.writeFileSync(DATA_FILE, JSON.stringify(students), 'utf8');
}

app.use(express.json({ limit: '10mb' }));

app.use(express.static(path.join(__dirname), {
    maxAge: '1h',
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache');
        }
    }
}));

// Save student data (including photo) and return a short ID
app.post('/api/students', (req, res) => {
    const { school, name, adm, cls, photo } = req.body;
    if (!name || !adm) {
        return res.status(400).json({ error: 'Name and admission number required' });
    }
    const id = crypto.randomBytes(6).toString('hex');
    students[id] = { school, name, adm, cls, photo };
    saveStudents();
    res.json({ id });
});

// Retrieve student data by ID
app.get('/api/students/:id', (req, res) => {
    const data = students[req.params.id];
    if (!data) {
        return res.status(404).json({ error: 'Student not found' });
    }
    res.json(data);
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/profile', (req, res) => {
    res.sendFile(path.join(__dirname, 'profile.html'));
});

// Catch-all: serve index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
