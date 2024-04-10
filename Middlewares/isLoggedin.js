const jwt=require('jsonwebtoken');
const jwtsecret=process.env.JWT_SECRET;

function isloggedin(req,res,next){
    const token=req.headers.authorization.split(" ")[1];
    if(!token){
        return res.status(401).json({error:"No token provided"});
    }
    jwt.verify(token,jwtsecret,(err,userId)=>{
        if(err){
            return res.status(401).json({error:"Invalid token"});
        }
        req.userId=userId;
        next();
    })
}
module.exports=isloggedin;