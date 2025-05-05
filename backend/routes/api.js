const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs').promises;
const path = require('path');
const Entry = require('../models/entry.js');

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = './uploads';
        try {
            await fs.access(uploadDir);
        } catch {
            await fs.mkdir(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5000000 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only image files (jpeg, jpg, png, gif) are allowed!'));
    }
});

// Get all entries for a plant
router.get('/entries/:plantType', async (req, res) => {
    try {
        const entries = await Entry.find({ plantType: req.params.plantType })
            .sort({ date: 1 });
        res.json(entries);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Add new entry
router.post('/entries', upload.single('photo'), async (req, res) => {
    try {
        const entryData = {
            plantType: req.body.plantType,
            date: new Date(req.body.date),
            ec: parseFloat(req.body.ec),
            ph: parseFloat(req.body.ph),
            notes: req.body.notes || ''
        };

        if (req.file) {
            entryData.photoUrl = `/uploads/${req.file.filename}`;
        } else if (req.body.photoData) {
            const base64Data = req.body.photoData.replace(/^data:image\/\w+;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');
            const filename = `${Date.now()}.png`;
            await fs.writeFile(`./uploads/${filename}`, buffer);
            entryData.photoUrl = `/uploads/${filename}`;
        }

        const entry = new Entry(entryData);
        await entry.save();
        res.status(201).json(entry);
    } catch (error) {
        res.status(400).json({ message: 'Validation error', error: error.message });
    }
});

// Delete entry
router.delete('/entries/:id', async (req, res) => {
    try {
        const entry = await Entry.findById(req.params.id);
        if (!entry) {
            return res.status(404).json({ message: 'Entry not found' });
        }
        if (entry.photoUrl) {
            try {
                await fs.unlink(`.${entry.photoUrl}`);
            } catch (unlinkError) {
                console.warn('Failed to delete photo:', unlinkError.message);
            }
        }
        await Entry.findByIdAndDelete(req.params.id);
        res.json({ message: 'Entry deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get analytics
router.get('/analytics/:plantType', async (req, res) => {
    try {
        const entries = await Entry.find({ plantType: req.params.plantType });
        const totalEntries = entries.length;
        if (totalEntries === 0) {
            return res.json({ avgEc: 0, avgPh: 0, totalEntries: 0 });
        }
        const avgEc = entries.reduce((sum, entry) => sum + entry.ec, 0) / totalEntries;
        const avgPh = entries.reduce((sum, entry) => sum + entry.ph, 0) / totalEntries;
        res.json({ avgEc, avgPh, totalEntries });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Filter entries by date range
router.get('/entries/:plantType/filter', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const query = { plantType: req.params.plantType };
        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate);
            if (endDate) query.date.$lte = new Date(endDate);
        }
        const entries = await Entry.find(query).sort({ date: 1 });
        res.json(entries);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Export to CSV
router.get('/export/:plantType', async (req, res) => {
    try {
        const entries = await Entry.find({ plantType: req.params.plantType })
            .sort({ date: 1 });
        const csvContent = [
            'Date,EC (μS/cm),pH,Notes,Photo URL',
            ...entries.map(entry => 
                `${entry.date.toISOString().split('T')[0]},${entry.ec},${entry.ph},"${entry.notes.replace(/"/g, '""')}","${entry.photoUrl || ''}"`
            )
        ].join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${req.params.plantType}_monitoring_data.csv"`);
        res.send(csvContent);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;