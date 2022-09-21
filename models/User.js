import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import chalk from "chalk";

const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    username: {
      type: String,
      trim: true,
      required: [true, "username is required"],
      unique: true,
      lowercase: true,
      index: true,
    },
    email: {
      type: String,
      required: [true, "email is required"],
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      require: [true, "password is required"],
    },
    resetPasswordToken: {
      token: {
        type: String,
      },
      expiration: {
        type: Date,
      },
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    isAccountVerified: {
      type: Boolean,
      default: false,
    },
    accountVerificationToken: {
      token: {
        type: String,
      },
      expiration: {
        type: Date,
      },
    },
  },
  {
    timestamps: true,
  }
);

/*** hash password ***/
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  console.log(chalk.greenBright("password is hashed"));
  next();
});

/*** methods ***/
userSchema.methods.isPasswordMatched = async function (clientPassword) {
  return await bcrypt.compare(clientPassword, this.password);
};


userSchema.methods.generateVerificationToken = async function () {
  //create a raw token
  const token = crypto.randomBytes(32).toString("hex");

  //hash and save the token
  this.accountVerificationToken.token = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  //setup token's lifespan (15 minutes)
  this.accountVerificationToken.expiration = Date.now() + 1000 * 60 * 15;

  return token;
};

userSchema.methods.generateResetToken = async function () {
  //create a raw token
  const token = crypto.randomBytes(32).toString("hex");

  //hash and save the token
  this.resetPasswordToken.token = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  //setup token's lifespan (15 minutes)
  this.resetPasswordToken.expiration = Date.now() + 1000 * 60 * 15;

  return token;
};

export default mongoose.model("User", userSchema);
