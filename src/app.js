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
import { authRouter } from './routes/auth.Route.js';
app.use('', authRouter);



export { app };