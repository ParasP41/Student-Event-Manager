import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors'
const app = express();

app.use(express.json({ limit: '20kb' }));
app.use(express.urlencoded({ extended: true, limit: '20kb' }))
app.use(express.static('public'));
app.use(cookieParser());
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))


//Auth Route
import { authRouter } from './routes/auth.route.js';
app.use(`${process.env.API_ROUTE}/auth`, authRouter);


//Role Route
import { roleRouter } from './routes/role.route.js';
app.use(`${process.env.API_ROUTE}/role`, roleRouter);

//Event Route
import { eventRouter } from './routes/event.route.js'
app.use(`${process.env.API_ROUTE}/event`, eventRouter);
export { app };