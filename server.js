const express = require('express');
const crypto = require('crypto');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// In-memory student store
const students = new Map();

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
    students.set(id, { school, name, adm, cls, photo });
    res.json({ id });
});

// Retrieve student data by ID
app.get('/api/students/:id', (req, res) => {
    const data = students.get(req.params.id);
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
