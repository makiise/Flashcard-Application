// backend/src/server.ts
import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const app: Express = express();
// Use process.env.PORT or default to 3001 if not defined
const port = process.env.PORT || 3001;

// Middleware to parse JSON bodies
app.use(express.json());

// Define a simple root route (health check)
app.get('/', (req: Request, res: Response) => {
  res.send('Backend API is healthy!');
});

// Start the server
app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});