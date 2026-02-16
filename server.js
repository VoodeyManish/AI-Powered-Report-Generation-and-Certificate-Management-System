import express from 'express';
import cors from 'cors';
import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const DB_FILE = path.join(__dirname, 'repocerti.db');

let db = null;
let SQL = null;

// Middleware
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://repocerti-frontend.onrender.com', 'https://your-app.vercel.app']
        : '*',
    credentials: true
}));
app.use(express.json({ limit: '50mb' }));

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api/')) {
            return next();
        }
        res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
}

// Initialize SQL.js
const initDB = async () => {
    SQL = await initSqlJs();
    
    // Load existing database or create new one
    if (fs.existsSync(DB_FILE)) {
        const fileData = fs.readFileSync(DB_FILE);
        db = new SQL.Database(fileData);
        console.log('✅ Loaded existing database');
    } else {
        db = new SQL.Database();
        console.log('✅ Created new database');
    }

    // Create tables
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('student', 'staff')),
        designation TEXT CHECK(designation IN ('faculty', 'hod', 'dean', 'principal'))
      );

      CREATE TABLE IF NOT EXISTS files (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        username TEXT NOT NULL,
        userRole TEXT NOT NULL,
        userDesignation TEXT,
        title TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('report', 'certificate')),
        category TEXT,
        signature TEXT,
        content TEXT NOT NULL,
        reportDate TEXT,
        images TEXT,
        createdAt TEXT NOT NULL,
        downloadsCount INTEGER DEFAULT 0,
        FOREIGN KEY (userId) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS stats (
        userId TEXT PRIMARY KEY,
        generated INTEGER DEFAULT 0,
        downloaded INTEGER DEFAULT 0,
        lastActivity TEXT,
        FOREIGN KEY (userId) REFERENCES users(id)
      );
    `);

    // Seed demo users if empty
    const result = db.exec('SELECT COUNT(*) as count FROM users');
    if (result.length === 0 || result[0].values[0][0] === 0) {
        db.run(`
          INSERT INTO users (id, username, email, password, role, designation)
          VALUES 
            ('demo-student', 'Demo Student', 'student@demo.com', 'password123', 'student', NULL),
            ('demo-faculty', 'Dr. Jane Faculty', 'faculty@demo.com', 'password123', 'staff', 'faculty'),
            ('demo-hod', 'Prof. Mark HOD', 'hod@demo.com', 'password123', 'staff', 'hod'),
            ('demo-dean', 'Dr. Dean Anderson', 'dean@demo.com', 'password123', 'staff', 'dean'),
            ('demo-principal', 'Dr. Principal Smith', 'principal@demo.com', 'password123', 'staff', 'principal')
        `);
        saveDB();
        console.log('✅ Demo users seeded');
    }
};

// Save database to file
const saveDB = () => {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
};

// API Routes

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', database: 'connected' });
});

app.get('/api/users/email/:email', (req, res) => {
    try {
        const result = db.exec('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', [req.params.email]);
        const user = result.length > 0 ? result[0].values[0] : null;
        
        if (user) {
            const [id, username, email, password, role, designation] = user;
            res.json({ id, username, email, password_DO_NOT_STORE_PLAINTEXT: password, role, designation: designation || undefined });
        } else {
            res.json(null);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/users', (req, res) => {
    try {
        // Support both 'password' and 'password_DO_NOT_STORE_PLAINTEXT' field names
        const { id, username, email, password_DO_NOT_STORE_PLAINTEXT, password, role, designation } = req.body;
        const userPassword = password_DO_NOT_STORE_PLAINTEXT || password;
        
        const checkResult = db.exec('SELECT id FROM users WHERE email = ?', [email]);
        if (checkResult.length > 0 && checkResult[0].values.length > 0) {
            return res.status(400).json({ error: 'User already exists with this email.' });
        }

        db.run(`INSERT INTO users (id, username, email, password, role, designation) VALUES (?, ?, ?, ?, ?, ?)`,
            [id, username, email, userPassword, role, designation || null]);
        saveDB();

        res.json({ id, username, email, role, designation });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/files', (req, res) => {
    try {
        const { userId, username, userRole, userDesignation, title, type, category, signature, content, reportDate, images } = req.body;
        
        const id = Math.random().toString(36).substring(2, 11);
        const createdAt = new Date().toISOString();

        db.run(`
          INSERT INTO files (id, userId, username, userRole, userDesignation, title, type, category, signature, content, reportDate, images, createdAt, downloadsCount)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        `, [id, userId, username, userRole, userDesignation || null, title, type, category || null, 
            signature ? JSON.stringify(signature) : null, content, reportDate || null, 
            images ? JSON.stringify(images) : null, createdAt]);

        // Update stats
        db.run(`INSERT OR REPLACE INTO stats (userId, generated, downloaded, lastActivity) 
                VALUES (?, COALESCE((SELECT generated FROM stats WHERE userId = ?), 0) + 1, COALESCE((SELECT downloaded FROM stats WHERE userId = ?), 0), ?)`,
            [userId, userId, userId, createdAt]);

        saveDB();
        res.json({ id, createdAt, downloadsCount: 0 });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/files/user/:userId', (req, res) => {
    try {
        const userResult = db.exec('SELECT * FROM users WHERE id = ?', [req.params.userId]);
        if (userResult.length === 0 || userResult[0].values.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const [userId, username, email, password, role, designation] = userResult[0].values[0];
        
        let query;
        let params = [];

        if (role === 'student') {
            query = 'SELECT * FROM files WHERE userId = ? ORDER BY createdAt DESC';
            params = [userId];
        } else if (designation === 'principal') {
            query = 'SELECT * FROM files ORDER BY createdAt DESC';
        } else if (designation === 'dean') {
            query = 'SELECT * FROM files WHERE userId = ? OR userRole = ? OR userDesignation = ? ORDER BY createdAt DESC';
            params = [userId, 'student', 'hod'];
        } else if (designation === 'hod') {
            query = 'SELECT * FROM files WHERE userId = ? OR userRole = ? OR userDesignation = ? ORDER BY createdAt DESC';
            params = [userId, 'student', 'faculty'];
        } else if (designation === 'faculty') {
            query = 'SELECT * FROM files WHERE userId = ? OR userRole = ? ORDER BY createdAt DESC';
            params = [userId, 'student'];
        } else {
            query = 'SELECT * FROM files WHERE userId = ? ORDER BY createdAt DESC';
            params = [userId];
        }

        const result = db.exec(query, params);
        let files = [];
        
        if (result.length > 0) {
            files = result[0].values.map(row => {
                const [id, fUserId, fUsername, fUserRole, fUserDesignation, fTitle, fType, fCategory, fSignature, fContent, fReportDate, fImages, fCreatedAt, fDownloadsCount] = row;
                return {
                    id, userId: fUserId, username: fUsername, userRole: fUserRole, userDesignation: fUserDesignation,
                    title: fTitle, type: fType, category: fCategory, signature: fSignature ? JSON.parse(fSignature) : null,
                    content: fContent, reportDate: fReportDate, images: fImages ? JSON.parse(fImages) : null,
                    createdAt: fCreatedAt, downloadsCount: fDownloadsCount
                };
            });
        }

        res.json(files);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/stats/:userId', (req, res) => {
    try {
        const result = db.exec('SELECT * FROM stats WHERE userId = ?', [req.params.userId]);
        if (result.length > 0 && result[0].values.length > 0) {
            const [userId, generated, downloaded, lastActivity] = result[0].values[0];
            res.json({ userId, generated, downloaded, lastActivity });
        } else {
            res.json({ generated: 0, downloaded: 0, lastActivity: new Date().toISOString() });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/files/:fileId/download', (req, res) => {
    try {
        const { userId } = req.body;
        
        db.run('UPDATE files SET downloadsCount = downloadsCount + 1 WHERE id = ?', [req.params.fileId]);
        db.run(`INSERT OR REPLACE INTO stats (userId, generated, downloaded, lastActivity)
                VALUES (?, COALESCE((SELECT generated FROM stats WHERE userId = ?), 0), COALESCE((SELECT downloaded FROM stats WHERE userId = ?), 0) + 1, ?)`,
            [userId, userId, userId, new Date().toISOString()]);

        saveDB();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/files/:fileId', (req, res) => {
    try {
        db.run('DELETE FROM files WHERE id = ?', [req.params.fileId]);
        saveDB();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/files/user/:userId/all', (req, res) => {
    try {
        db.run('DELETE FROM files WHERE userId = ?', [req.params.userId]);
        db.run('DELETE FROM stats WHERE userId = ?', [req.params.userId]);
        saveDB();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3002;

initDB().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log(`📊 Database file: ${DB_FILE}`);
    });
}).catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
});
