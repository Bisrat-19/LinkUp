const User = require('../models/User');
const jwt = require('jsonwebtoken');

const register = async (req, res) => {
  const { fullName, username, email, password } = req.body;
  try {
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ error: 'Email or username already exists' });
    }
    const user = new User({ fullName, username, email, password });
    await user.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ 
      token, 
      user: { 
        id: user._id, 
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        profilePic: user.profilePic,
        bio: user.bio
      } 
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
};

module.exports = { register, login };