const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const adminRoutes = require('./routes/adminRoutes');


// Load environment variables
dotenv.config();

const app = express();

// Use CORS middleware
app.use(cors());

app.use(express.json());

// Import routes
const eventsRouter = require('./routes/events');
const photosRouter = require('./routes/photos');
const usersRouter = require('./routes/users');
const ordersRouter = require('./routes/orders');
const uploadRoutes = require('./routes/upload');
const productsRoutes = require('./routes/products');





// Use routes
app.use('/api/events', eventsRouter);
app.use('/api/photos', photosRouter);
app.use('/api/users', usersRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/upload', uploadRoutes);
app.use('/api/products', productsRoutes);


// Use admin routes
app.use('/login/admin', adminRoutes);

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
