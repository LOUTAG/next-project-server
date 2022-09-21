/*** modules ***/
import asyncHandler from "express-async-handler";
import chalk from "chalk";
import jwt from "jsonwebtoken";

/*** files ***/
import AWS from "../services/aws.js";
import User from "../models/User.js";
import { generateAccessToken, generateRefreshToken } from "../config/auth.js";

/** SES ***/
const ses = new AWS.SES({ apiVersion: "2010-12-01" });

//@desc register
//@route POST /api/users/register
//@access public
export const register = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  /*** validation ***/

  //username
  const usernameRegex = /^[a-zA-Z.-. ]{2,20}$/;
  if (!usernameRegex.test(username)) {
    res.status(422);
    throw new Error("invalid username");
  }
  const isUsernameExist = await User.findOne({
    username: { $regex: username, $options: "i" },
  });
  if (isUsernameExist) {
    res.status(403);
    throw new Error("username already exists");
  }
  //email
  const emailRegex = /^[a-z0-9.-]+@+[a-z-]+[.]+[a-z]{2,6}$/;
  if (!emailRegex.test(email)) {
    res.status(422);
    throw new Error("invalid email");
  }
  const isEmailExist = await User.findOne({ email });
  if (isEmailExist) {
    res.status(403);
    throw new Error("email already exists");
  }
  //password
  const passwordRegex =
    /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-+=.<>()_~]).{8,32}$/;
  if (!passwordRegex.test(password)) {
    res.status(422);
    throw new Error("invalid password");
  }

  /*** create account ***/
  try {
    const user = new User({
      username,
      email,
      password,
    });
    //generate token
    await user.generateVerificationToken();

    //save account
    await user.save();

    //send email
    const params = {
      Source: process.env.EMAIL_FROM,
      Destination: {
        ToAddresses: [user.email],
      },
      ReplyToAddresses: [process.env.EMAIL_TO],
      Message: {
        Body: {
          Html: {
            Charset: "UTF-8",
            Data: `<html>
              <body>
              <div style="width:100%;>
              <p style="font-size:16px;">Hi, you just have to click on this link to activate your account <a  style="color: #294661; font-weight:300;" href="${process.env.CLIENT_URL}/account-verification/${user.accountVerificationToken.token}">activate</a></p>
                <p style="margin-bottom: 30px;">Your link is active for 15 minutes.</p>
              </div>
              </body>
            </html>`,
          },
        },
        Subject: {
          Charset: "UTF-8",
          Data: `${user.username} activate your account`,
        },
      },
    };
    ses.sendEmail(params, function (err, data) {
      if (err) {
        console.log(chalk.bgRedBright(err));
        res.status(500);
        throw new Error("failure to send the email");
      } else {
        console.log(chalk.bgGrey("email sent successfully"));
      }
    });

    /*** response ***/
    res
      .status(200)
      .json(
        "Successfully registered. Please check your inbox to activate your account (link expires after 15 minutes)."
      );
  } catch (error) {
    throw error;
  }
});

//@desc account validation
//@route GET /api/users/account-validation/:token
//@access public
export const accountValidation = asyncHandler(async (req, res) => {
  const { token } = req.params;
  console.log(token);
  try {
    const user = await User.findOne({
      "accountVerificationToken.token": token,
    });
    /*** is token correct ? ***/
    if (user === null) {
      res.status(404);
      throw new Error("incorrect token");
    }
    /*** is token stale ? ***/
    //to compare two date we have to convert it in mms by using date.getTime();
    if (Date.now() > user.accountVerificationToken.expiration.getTime()) {
      try {
        //generate token
        const newToken = await user.generateVerificationToken();

        //save account
        await user.save();

        //send email
        const params = {
          Source: process.env.EMAIL_FROM,
          Destination: {
            ToAddresses: [user.email],
          },
          ReplyToAddresses: [process.env.EMAIL_TO],
          Message: {
            Body: {
              Html: {
                Charset: "UTF-8",
                Data: `<html>
              <body>
              <div style="width:100%;>
              <p style="font-size:16px;">Hi, you just have to click on this link to activate your account <a  style="color: #294661; font-weight:300;" href="${process.env.CLIENT_URL}/account-verification/${user.accountVerificationToken.token}">activate</a></p>
                <p style="margin-bottom: 30px;">Your link is active for 15 minutes.</p>
              </div>
              </body>
            </html>`,
              },
            },
            Subject: {
              Charset: "UTF-8",
              Data: `${user.username} activate your account`,
            },
          },
        };
        ses.sendEmail(params, function (err, data) {
          if (err) {
            console.log(chalk.bgRedBright(err));
            res.status(500);
            throw new Error("failure to send the email");
          } else {
            console.log(chalk.bgGrey("email sent successfully"));
          }
        });
      } catch (error) {
        throw new Error("");
      }
      res.status(403);
      throw new Error(
        "token is expired. A new one has been sent, please check your emails"
      );
    }
    (user.accountVerificationToken = undefined),
      (user.isAccountVerified = true);
    await user.save();
    res.status(200).json("account verified successfully");
  } catch (error) {
    throw error;
  }
});

//@desc login
//@route POST /api/users/login
//@access public
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (user === null) {
      res.status(404);
      throw new Error("account not found");
    }
    const isPasswordMatched = await user.isPasswordMatched(password);
    if (!isPasswordMatched) {
      res.status(401);
      throw new Error("incorrect password");
    }
    if (!user.isAccountVerified) {
      res.status(401);
      throw new Error("please confirm you email adress");
    }
    res.status(200).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin,
      accessToken: generateAccessToken(user._id),
      refreshToken: generateRefreshToken(user._id),
    });
  } catch (error) {
    throw error;
  }
});

//@desc profile
//@route GET /api/users/profile
//@access private
export const profile = asyncHandler(async (req, res) => {
  return res.status(200).json(req.user);
});

//@desc refresh access token
//@route GET /api/users/refresh-access-token
//@access private
export const refreshAccessToken = asyncHandler(async (req, res) => {
  const authHeader = req?.headers?.authorization;
  if (!authHeader?.startsWith("Bearer")) {
    res.status(401);
    throw new Error("invalid authorization header");
  }
  const refreshToken = authHeader.split(" ")[1];
  if (!refreshToken) {
    res.status(401);
    throw new Error("undefined refresh token");
  }
  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN);

    const isUserExists = await User.exists({ _id: decoded.id });
    if (!isUserExists) {
      res.status(404);
      throw new Error("Invalid User");
    }
    const refreshAccessToken = generateAccessToken(decoded.id);
    res.json(refreshAccessToken);
  } catch (error) {
    const statusCode = res.statusCode === 200 ? 401 : res.statusCode;
    res.status(statusCode);
    throw error;
  }
});

//@desc forgot password
//@route POST /api/users/forgot-password
//@access public
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    res.status(422);
    throw new Error("email is missing");
  }
  try {
    const user = await User.findOne({ email: email });
    if (user === null) {
      res.status(404);
      throw new Error("invalid email");
    }

    //generate reset password token
    await user.generateResetToken();

    //save account
    await user.save();

    console.log(user);

    //send email
    const params = {
      Source: process.env.EMAIL_FROM,
      Destination: {
        ToAddresses: [user.email],
      },
      ReplyToAddresses: [process.env.EMAIL_TO],
      Message: {
        Body: {
          Html: {
            Charset: "UTF-8",
            Data: `<html>
              <body>
              <div style="width:100%;>
              <p style="font-size:16px;">Hi, you just have to click on this link to activate your account <a  style="color: #294661; font-weight:300;" href="${process.env.CLIENT_URL}/password/reset-password/${user.resetPasswordToken.token}">activate</a></p>
                <p style="margin-bottom: 30px;">Your link is active for 15 minutes.</p>
              </div>
              </body>
            </html>`,
          },
        },
        Subject: {
          Charset: "UTF-8",
          Data: `${user.username} activate your account`,
        },
      },
    };
    ses.sendEmail(params, function (err, data) {
      if (err) {
        console.log(chalk.bgRedBright(err));
        res.status(500);
        throw new Error("failure to send the email");
      } else {
        console.log(chalk.bgGrey("email sent successfully"));
      }
    });

    /*** response ***/
    res.status(200).json();
  } catch (error) {
    throw error;
  }
});

//@desc verify reset token
//@route POST /api/users/verify-reset-token
//@access public
export const verifyResetToken = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token) {
    res.status(422);
    throw new Error("invalid url");
  }

  try {
    const user = await User.findOne({ "resetPasswordToken.token": token });
    if (user === null) {
      res.status(403);
      throw new Error("invalid token");
    }
    if (Date.now() > user.resetPasswordToken.expiration.getTime()) {
      res.status(403);
      throw new Error(
        "token is expired"
      );
    }
    res.status(200).json(token);
  } catch (error) {
    throw error;
  }
});

//@desc reset token
//@route PUT /api/users/reset-password
//@access private
export const resetPassword= asyncHandler(async(req, res)=>{
  const { token, password } = req.body;
  if (!token || !password) {
    res.status(422);
    throw new Error("invalid request");
  }

  try {
    const user = await User.findOne({ "resetPasswordToken.token": token });
    if (user === null) {
      res.status(403);
      throw new Error("invalid token");
    }
    if (Date.now() > user.resetPasswordToken.expiration.getTime()) {
      res.status(403);
      throw new Error(
        "token is expired"
      );
    }

    user.password=password;
    await user.save();

    res.status(200).json();
  } catch (error) {
    throw error;
  }
})
