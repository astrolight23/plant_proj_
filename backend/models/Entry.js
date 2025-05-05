const mongoose = require('mongoose');

const entrySchema = new mongoose.Schema({
    plantType: {
        type: String,
        required: [true, 'Plant type is required'],
        enum: {
            values: ['water spinach', 'sage', 'chili'],
            message: 'Plant type must be water spinach, sage, or chili'
        }
    },
    date: {
        type: Date,
        required: [true, 'Date is required']
    },
    ec: {
        type: Number,
        required: [true, 'EC value is required'],
        min: [0, 'EC cannot be negative']
    },
    ph: {
        type: Number,
        required: [true, 'pH value is required'],
        min: [0, 'pH cannot be negative'],
        max: [14, 'pH cannot exceed 14']
    },
    notes: {
        type: String,
        default: ''
    },
    photoUrl: {
        type: String,
        default: ''
    }
}, {
    timestamps: true // Adds createdAt and updatedAt
});

module.exports = mongoose.model('Entry', entrySchema);