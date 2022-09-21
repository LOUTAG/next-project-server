/*** modules ***/
import asyncHandler from "express-async-handler";
import formidable from "formidable";
import { promises as fs } from "fs";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import chalk from "chalk";

/*** files ****/
import AWS from "../services/aws.js";
import Category from "../models/Category.js";

/*** s3 ***/
const s3 = new AWS.S3();

//@desc create a category
//@route POST /api/categories/create
//@access admin
export const create = asyncHandler(async (req, res) => {
  /*** formidable callback to promise ***/
  const parseForm = (req) => {
    //instance of formidable
    const form = new formidable.IncomingForm();
    //create promise of form.parse
    return new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });
  };
  try {
    const formParsing = await parseForm(req);
    const { name, content } = formParsing[0];
    const { image } = formParsing[1];

    /*** name validator ***/
    if (!name || name.length < 3 || name.length > 32) {
      res.status(422);
      throw new Error("Invalid name");
    }

    const isCategoryExist = await Category.exists({ name: name });
    if (isCategoryExist) {
      res.status(422);
      throw new Error("Category already exists");
    }

    /*** content validator ***/
    if (!content || content.length < 20 || content.length > 2000000) {
      res.status(422);
      throw new Error("Invalid content");
    }

    /*** image validator ***/
    if (!image) {
      res.status(422);
      throw new Error("image is missing");
    }
    if (!image.mimetype.startsWith("image/")) {
      res.status(422);
      throw new Error("image format not valid");
    }
    if (image.size > 700000) {
      res.status(422);
      throw new Error("image too large (>0.7 mo)");
    }
    const readImage = await fs.readFile(image.filepath);

    /*** upload image to s3 ***/
    const params = {
      Bucket: "next-project-udemy",
      Key: `category/${uuidv4()}`,
      Body: readImage,
      ACL: "public-read",
      ContentType: "image/jpg",
    };

    const uploadImage = (params) => {
      return new Promise((resolve, reject) => {
        s3.upload(params, (err, data) => {
          if (err) reject(err);
          else resolve(data);
        });
      });
    };

    const data = await uploadImage(params);
    console.log(chalk.bgGrey("image upload to s3 successfully"));

    /*** slug generation ***/
    let slug = name.toLowerCase();
    slug = slug.replace(/\./g, "-");
    slug = slug.replace(/ /g, "_");

    const category = new Category({
      name,
      slug,
      image: {
        url: data.Location,
        key: data.Key,
      },
      content,
      postedBy: req.user._id,
    });
    await category.save();

    await axios.get(`${process.env.CLIENT_URL}/api/revalidate?secret=${process.env.REVALIDATION_TOKEN}`)
    console.log('revalidated successfully');
    res.status(200).json(`${category.name} category has been created`);
  } catch (error) {
    console.log(error);
    throw error;
  }
});

//@desc list of catagories
//@route GET /api/categories/list
//@access public
export const list = asyncHandler(async (req, res) => {
  try {
    const list = await Category.find().populate("postedBy", "_id username");
    res.status(200).json(list);
  } catch (error) {
    throw error;
  }
});

//@desc read a category
//@route GET /api/categories/:slug
//@access public
export const read = asyncHandler(async (req, res) => {});

//@desc update a category
//@route PUT /api/categories/:slug
//@access admin
export const update = asyncHandler(async (req, res) => {});

//@desc remove a category
//@route DELETE /api/categories/:slug
//@access admin
export const remove = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  if (!slug) {
    res.status(400);
    throw new Error("Invalid url");
  }
  try {
    const category = await Category.findOneAndRemove({ slug });
    if (category === null) {
      res.status(404);
      throw new Error("category not found");
    }
    const deleteParams = {
      Bucket: "next-project-udemy",
      Key: category.image.key,
    };

    const deleteImage = (params) => {
      return new Promise((resolve, reject) => {
        s3.deleteObject(params, (err, data) => {
          if (err) reject(err);
          else resolve(data);
        });
      });
    };
    const isDeleted = await deleteImage(deleteParams);
    if(isDeleted) console.log(chalk.bgBlueBright('image remove from s3'));
    res.status(200).json(`${category.name} has been de`);
  } catch (error) {
    throw error;
  }
});
