# Alhamdan-Backend

Alhamdan Backend is a server-side application built with Node.js, designed to provide backend services for the Alhamdan project.

## Features

- **RESTful API**: Provides various routes to handle requests.
- **Authentication**: Secure user authentication using JWT tokens.
- **File Upload**: Allows users to upload files to the server.
- **Integration with Supabase**: Data is managed using Supabase for scalability and reliability.
- **Middleware**: Custom middleware for handling requests and responses.

## Technologies Used

- **Node.js**: JavaScript runtime for building the server.
- **Express**: Web framework for handling routes and middleware.
- **Supabase**: Backend-as-a-Service platform for database management.
- **JWT**: JSON Web Tokens for authentication.
- **Vercel**: For deployment.

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/tamerdarwish/alhamdan-back.git
   cd alhamdan-back

2. Install dependencies:

   ```bash
   npm install

3. Set up environment variables. Create a .env file in the root of the project and add the required variables (like Supabase credentials).

4. Run the server locally:

```bash
node server.js
