import asyncHandler from "express-async-handler";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const authMiddleware = asyncHandler(async (req, res, next) => {
  const authHeader = req?.headers?.authorization;
  if (!authHeader?.startsWith("Bearer")) {
    res.status(401);
    throw new Error("invalid authorization header");
  }
  const token = authHeader.split(" ")[1];
  if (!token) {
    res.status(401);
    throw new Error("undefined token");
  }
  try {
    /*** if decoded, return decoded.id ***/
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN);

    /*** if user still exist ***/
    const user = await User.findOne(
      { _id: decoded.id },
      { username: 1, email: 1, isAdmin:1 }
    );
    if (user === null) {
      res.status(404);
      throw new Error("invalid user");
    }
    req.user = user;
    next();
  } catch (error) {
    const statusCode = res.statusCode === 200 ? 401 : res.statusCode;
    res.status(statusCode);
    throw error;
  }
});
export default authMiddleware;
