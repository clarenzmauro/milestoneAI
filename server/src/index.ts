import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3001; // Default to 3001 if PORT not in .env

app.use(express.json()); // Middleware to parse JSON bodies

// Basic route for testing
app.get('/', (req: Request, res: Response) => {
  res.send('MilestoneAI Server is running!');
});

// TODO: Add API routes (e.g., app.use('/api/goals', goalRoutes));

app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});
