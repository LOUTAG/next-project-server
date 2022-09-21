export const notFoundError=(req, res, next)=>{
    const error = new Error(`Not Found - User is trying to access to ${req.originalUrl}`);
    res.status(404);
    next(error);
}