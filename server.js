const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
require('dotenv').config();

const User = require('./models/user');
const Exercise = require('./models/exercise');

const app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost/exercise-tracker', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// POST /api/users
app.post('/api/users', async (req, res) => {
  const user = new User({ username: req.body.username });
  const saved = await user.save();
  res.json(saved);
});

// GET /api/users
app.get('/api/users', async (req, res) => {
  const users = await User.find().select('_id username');
  res.json(users);
});

// POST /api/users/:_id/exercises
app.post('/api/users/:_id/exercises', async (req, res) => {
  const { description, duration, date } = req.body;
  const user = await User.findById(req.params._id);
  if (!user) return res.json({ error: 'User not found' });

  const exercise = new Exercise({
    userId: user._id,
    description,
    duration: Number(duration),
    date: date ? new Date(date) : new Date()
  });

  const saved = await exercise.save();

  res.json({
    username: user.username,
    description: saved.description,
    duration: saved.duration,
    date: saved.date.toDateString(),
    _id: user._id
  });
});

// GET /api/users/:_id/logs
app.get('/api/users/:_id/logs', async (req, res) => {
  const { from, to, limit } = req.query;
  const user = await User.findById(req.params._id);
  if (!user) return res.json({ error: 'User not found' });

  let query = { userId: user._id };

  if (from || to) {
    query.date = {};
    if (from) query.date.$gte = new Date(from);
    if (to) query.date.$lte = new Date(to);
  }

  let exercises = Exercise.find(query).select('description duration date -_id');
  if (limit) exercises = exercises.limit(Number(limit));

  const logs = await exercises.exec();

  res.json({
    username: user.username,
    count: logs.length,
    _id: user._id,
    log: logs.map(e => ({
      description: e.description,
      duration: e.duration,
      date: e.date.toDateString()
    }))
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
