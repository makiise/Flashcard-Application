

import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import apiRouter from './routes/api'; 
import cors from 'cors';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3001;

app.use(cors());

// Middleware to parse JSON bodies
app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  res.json({ status: "OK" }); 
});


app.use('/api', apiRouter); 

app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});

export default app;


