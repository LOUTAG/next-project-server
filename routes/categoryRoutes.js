import { Router } from "express";
import authMiddleware from "../middlewares/authMiddleware.js";
import adminMiddleware from "../middlewares/adminMiddleware.js";
import { create, list, read, update, remove } from "../controllers/categoryController.js";


const router = Router();


//@desc create a category
//@route POST /api/categories/create
//@access admin
router.post('/create', authMiddleware, adminMiddleware, create);

//@desc list of catagories
//@route GET /api/categories/list
//@access public
router.get('/list', list);

//@desc read a category
//@route GET /api/categories/:slug
//@access public
router.get('/:slug', read);

//@desc update a category
//@route PUT /api/categories/:slug
//@access admin
router.put('/:slug', authMiddleware, adminMiddleware, update);

//@desc remove a category
//@route DELETE /api/categories/:slug
//@access admin
router.delete('/:slug', authMiddleware, adminMiddleware, remove);

export default router;