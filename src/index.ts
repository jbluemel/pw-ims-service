import express from 'express';
import cors from 'cors';
import itemsRouter from './routes/items';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/items', itemsRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});