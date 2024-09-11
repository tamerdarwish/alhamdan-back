const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const adminRoutes = require('./routes/adminRoutes');


// Load environment variables
dotenv.config();

const app = express();

// Use CORS middleware
app.use(cors({
    origin: 'http://localhost:3000', // استبدل هذا بالنطاق الذي يستخدمه العميل
  }));
  
app.use(express.json());

// Import routes
const eventsRouter = require('./routes/events');
const photosRouter = require('./routes/photos');
const usersRouter = require('./routes/users');
const ordersRouter = require('./routes/orders');
const uploadRoutes = require('./routes/upload');
const productsRoutes = require('./routes/products');
const contactRoutes = require('./routes/contactRoutes'); 
const printRoutes = require('./routes/print'); 


// Use routes
app.use('/api/events', eventsRouter);
app.use('/api/photos', photosRouter);
app.use('/api/users', usersRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/upload', uploadRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/contact', contactRoutes); 
app.use('/api/print', printRoutes); 




// Use admin routes
app.use('/login/admin', adminRoutes);

// Start the server
const PORT = process.env.PORT ;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
