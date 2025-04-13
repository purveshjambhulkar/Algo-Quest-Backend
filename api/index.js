const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://purveshjambhulkar16:wzynTleSmEoZPr54@cluster0.7daen0o.mongodb.net/');
    console.log('MongoDB connected successfully');
    return true;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    return false;
  }
};

// Models
const ProblemSchema = new mongoose.Schema({
  title: String,
  description: String,
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'easy'
  },
  category: String,
  examples: [{ input: String, output: String, explanation: String }],
  constraints: String,
  solution: String,
  link: String,
  isSolved: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

const UserStatsSchema = new mongoose.Schema({
  totalSolved: {
    type: Number,
    default: 0
  },
  easy: {
    type: Number,
    default: 0
  },
  medium: {
    type: Number,
    default: 0
  },
  hard: {
    type: Number,
    default: 0
  },
  streak: {
    type: Number,
    default: 0
  },
  lastPracticed: {
    type: Date,
    default: null
  }
});

const Problem = mongoose.model('Problem', ProblemSchema);
const UserStats = mongoose.model('UserStats', UserStatsSchema);

// Routes
app.get('/api/problems', async (req, res) => {
  try {
    const problems = await Problem.find();
    res.json(problems.map(problem => ({
      ...problem.toObject(),
      id: problem._id.toString()
    })));
  } catch (error) {
    console.error('Error fetching problems:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/user-stats', async (req, res) => {
  try {
    let stats = await UserStats.findOne();
    if (!stats) {
      stats = await UserStats.create({
        totalSolved: 0,
        easy: 0,
        medium: 0,
        hard: 0,
        streak: 0,
        lastPracticed: null
      });
    }
    res.json(stats);
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.put('/api/problems/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    await Problem.findByIdAndUpdate(id, updates);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating problem:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.put('/api/problems/:id/details', async (req, res) => {
  try {
    const { id } = req.params;
    const { adminPassword, ...updates } = req.body;
    
    // Validate admin password
    const expectedPassword = process.env.VITE_ADMIN_PASSWORD || 'dsadsa';
    if (!adminPassword) {
      return res.status(400).json({
        success: false,
        message: 'Admin password is required'
      });
    }
    
    if (adminPassword !== expectedPassword) {
      return res.status(403).json({
        success: false,
        message: 'Invalid admin password'
      });
    }
    
    await Problem.findByIdAndUpdate(id, updates);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating problem details:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.put('/api/user-stats', async (req, res) => {
  try {
    const updates = req.body;
    const stats = await UserStats.findOne();
    if (stats) {
      Object.assign(stats, updates);
      await stats.save();
    } else {
      await UserStats.create(updates);
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating user stats:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/api/problems', async (req, res) => {
  try {
    const newProblem = await Problem.create(req.body);
    res.status(201).json({
      success: true,
      id: newProblem._id.toString()
    });
  } catch (error) {
    console.error('Error adding problem:', error);
    res.status(500).json({ success: false, id: null, message: 'Server error' });
  }
});

// Delete a problem with admin password verification
app.delete('/api/problems/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { adminPassword } = req.body;
    
    if (!adminPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Admin password is required' 
      });
    }
    
    // Validate admin password
    const expectedPassword = 'dsadsa';
    if (adminPassword !== expectedPassword) {
      return res.status(403).json({ 
        success: false, 
        message: 'Invalid admin password' 
      });
    }
    
    // Delete the problem if password is correct
    await Problem.findByIdAndDelete(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting problem:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

app.get('/api/initialize-db', async (req, res) => {
  try {
    const connected = await connectDB();
    if (!connected) return res.status(500).json({ success: false, message: 'Failed to connect to database' });
    
    const problemCount = await Problem.countDocuments();
    const statsCount = await UserStats.countDocuments();
    
    res.json({
      success: true,
      message: 'Database check completed',
      isEmpty: problemCount === 0 && statsCount === 0
    });
  } catch (error) {
    console.error('Error checking database:', error);
    res.status(500).json({ success: false, message: 'Error checking database' });
  }
});

// Connect to database and start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to start server:', err);
});