const adminMiddleware = (req, res, next)=>{
        if(!req.user.isAdmin){
            res.status(403);
            throw new Error('access denied');
        }
        next();
};
export default adminMiddleware;