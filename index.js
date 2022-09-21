import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import chalk from "chalk";

/*** dotenv config ****/
dotenv.config();

/*** mongoose config ***/
mongoose.connect(process.env.MONGO_URI);
mongoose.connection.on("connected", () =>
  console.log(chalk.blue("Database connected"))
);
mongoose.connection.on("error", () =>
  console.log(chalk.bgRedBright("database connection error"))
);

/*** express app ****/
const app = express();

/*** middlewares ****/
app.use(cors({origin: process.env.CLIENT_URL}));
app.use(express.json());

/*** routes ***/
import userRoutes from "./routes/userRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";

app.use("/api/users", userRoutes);
app.use("/api/categories", categoryRoutes);

/*** errors ***/
import { notFoundError } from "./middlewares/notFoundError.js";
import { errorHandler } from "./middlewares/errorHandler.js";

app.use(notFoundError);
app.use(errorHandler);

/*** port ***/
app.listen(
  process.env.PORT,
  console.log(chalk.blue(`app is running on port ${process.env.PORT}`))
);
