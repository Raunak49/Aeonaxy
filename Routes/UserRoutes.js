const router = require('express').Router();
const {z} = require('zod');
const prisma = require('../prisma/client');
const bcrypt = require('bcryptjs');
const isloggedin=require('../Middlewares/isLoggedin');
const jwt=require('jsonwebtoken');
const { passwordStrength } = require('check-password-strength');
const sendMail = require('../utils/email');
const imageHandler = require('../utils/imageHandler');

const userData=z.object({
    name:z.string().min(5),
    email:z.string().email(),
    profileImage:z.string().url().optional(),
    password:z.string().min(8),
});

const credentials=z.object({
    email:z.string().email(),
    password:z.string().min(8),
});


router.post('/superadmin', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const passwordSt = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: passwordSt,
                role: "SUPERADMIN",
            }
        })
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET);
        res.json({ message: "user logged in", token, user });
    } catch (e) {
        res.status(400).json({ error: e.errors });
    }
});

router.post("/register", imageHandler,async(req,res)=>{
    try{
        const {name,email,password,profileImage}=req.body;  
        const data = userData.safeParse({ name,email,password,profileImage});
        if(!data.success){
            return res.status(400).json({error:data.error.issues[0].message});
        }
        const passwordSt= passwordStrength(password);
        if(passwordSt.id<1){
            return res.status(400).json({error:"Password is too weak"});
        }
        const existinguser=await prisma.user.findUnique({
            where:{
                email,
            }
        });
        if(existinguser){
            return res.status(400).json({error:"User already exists"});
        }
        const hashedPassword=await bcrypt.hash(password,10);
        const user=await prisma.user.create({
            data:{
                name,
                email,
                password:hashedPassword,
                profileImage,
            }
        });
        const token=jwt.sign({id:user.id},process.env.JWT_SECRET);
        res.json({message:"user created",token, userId:user.id});
        const html = `<h1>Verify your email</h1><a href="http://localhost:3000/user/verify/${token}">Click here to verify</a>`;
        sendMail(email, "Verify your email", html);
    }catch(e){
        res.status(400).json({error:e.message});
    }
});

router.get("/verify/:token",async(req,res)=>{
    try{
        const token=req.params.token;
        const {id}=jwt.verify(token,process.env.JWT_SECRET);
        const u=await prisma.user.findUnique({where:{id}})
        console.log(id);
        const user=await prisma.user.update({
            where:{
                id,
            },
            data:{
                verified:true,
            }
        });
        res.json({message:"Email verified",user});
    }catch(e){
        res.status(400).json({error:e.message});
    }
});
router.post("/login",async(req,res)=>{
    try {
        const { email, password } = req.body;
        const data = credentials.safeParse({ email,password });
        if(!data.success) {
            return res.status(400).json({error:data.error.issues[0].message});
        }
        const user = await prisma.user.findUnique({
            where:{
                email,
            }
        });
        if(!user) {
            return res.status(400).json({error:"Invalid email"});
        }
        const valid = await bcrypt.compare(password,user.password);
        if(!valid) {
            return res.status(400).json({error:"Invalid password"});
        }
        const token = jwt.sign({id:user.id},process.env.JWT_SECRET);
        res.json({message:"user logged in",token, userId:user.id});
        if(!user.verified) {
            const html = `<h1>Verify your email</h1><a href="http://localhost:3000/user/verify/${token}">Click here to verify</a>`;
            sendMail(email, "Verify your email", html);
        }
    } catch(e){
        res.status(400).json({error:e.errors});
    }
});
router.post("/forgotpassword",async(req,res)=>{
    try{
        const {email}=req.body;
        const user=await prisma.user.findUnique({
            where:{
                email,
            }
        });
        if(!user){
            return res.status(400).json({error:"Invalid email"});
        }
        const token=jwt.sign({id:user.id},process.env.JWT_SECRET,{expiresIn:"1h"});
        const html=`<h1>Reset your password</h1><a href="http://localhost:3000/user/resetpassword/${token}">Click here to reset your password</a>`;
        sendMail(email,"Reset your password",html);
        res.json({message:"Reset link sent to your email"});
    }catch(e){
        res.status(400).json({error:e.errors});
    }
});
router.post("/resetpassword/:token",async(req,res)=>{
    try{
        const {password}=req.body;
        const {id}=jwt.verify(req.params.token,process.env.JWT_SECRET);
        const passwordSt = passwordStrength(password);
        if(passwordSt.id<1){
            return res.status(400).json({error:"Password is too weak"});
        }
        const hashedPassword=await bcrypt.hash(password,10);
        const user=await prisma.user.update({
            where:{
                id,
            },
            data:{
                password:hashedPassword,
            }
        });
        res.json({message:"Password updated",user});
    }catch(e){
        res.status(400).json({error:e.errors});
    }
});
router.get("/:id",async(req,res)=>{
    try{
        const id=req.params.id;
        const user=await prisma.user.findUnique({
            where:{
                id,
            },
            select:{
                name:true,
                email:true,
                profileImage:true,
                verified: true,
            }
        });
        res.json({user});
    }catch(e){  
        res.status(400).json({error:e.errors});
    }
});

router.put("/", isloggedin, imageHandler, async (req, res) => {
    try {
        const { name, email, profileImage } = req.body;
        const updatedData=z.object({
            name:z.string().min(5),
            email:z.string().email(),
            profileImage:z.string().url().optional(),
        });

        const data = updatedData.safeParse({ name,email });

        if(!data.success) {
            return res.status(400).json({error:data.error.issues[0].message});
        }

        const options = {};
        if(name) options.name=name;
        if(email) options.email=email;
        if(req.file.path!=='https://cdn.iconscout.com/icon/free/png-256/avatar-380-456332.png') options.profileImage=req.file.path;

        const id=req.userId.id;
        const updatedUser = await prisma.user.update({
            where: {
                id
            },
            data: {
                name,
                email,
                profileImage,
            },
            select: {
                name: true,
                email: true,
                profileImage: true,
            },
        });
        console.log("hi");
        res.json({ message: "User updated",updatedUser});
    } catch (e) {
        res.status(400).json({ error: e.errors });
    }
});

router.delete("/", isloggedin, async (req, res) => {
    try {
        const id=req.userId.id;
        const user = await prisma.user.delete({
            where: {
                id
            },
            select: {
                name: true,
                email: true,
                profileImage: true,
            },
        });
        res.json({ message: "User deleted", user });
        sendMail(user.email, "Account deleted", "Your account has been deleted");
    } catch (e) {
        console.log(e);
        res.status(400).json({ error: e.errors || e.message });
    }
});

module.exports=router;