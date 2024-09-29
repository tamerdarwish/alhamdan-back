// src/middleware/adminAuth.js

const jwt = require('jsonwebtoken');

const adminAuth = (req, res, next) => {


  const token = req.headers['authorization'];

  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'authorization') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }
    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(400).json({ message: 'Invalid token.' });
  }
};

module.exports = adminAuth;
