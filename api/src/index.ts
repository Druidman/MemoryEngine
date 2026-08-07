import { logger } from 'hono/logger'
import { authMiddleware } from './middleware'
import { cors } from 'hono/cors';
import { app } from './app';
import { getRequestListener } from '@hono/node-server';

app.use(logger())
console.log(process.env.APP_URL)
app.use('*', cors({
  origin: process.env.APP_URL,
  credentials: true,
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

app.use(authMiddleware)

// register routes
import './routes/router'

export default getRequestListener(app.fetch);
