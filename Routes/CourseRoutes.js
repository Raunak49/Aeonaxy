const router=require('express').Router(); 
const {z} = require('zod');
const prisma=require('../prisma/client');
const isSuperAdmin=require('../Middlewares/isSuperAdmin');
const isLoggedin = require('../Middlewares/isLoggedin');
const sendMail = require('../utils/email');

router.post("/", isLoggedin, isSuperAdmin, async(req,res)=>{
    try{
        const {title, description, category, level}=req.body;
        const zObj=z.object({
            title:z.string().min(3),
            description:z.string().optional(),
            category:z.string().optional(),
            level:z.number().lte(3).optional(),
        });
        const validatedData = zObj.safeParse({title, description, category, level});
        if(!validatedData.success){
            return res.status(400).json({error:validatedData.error.issues[0].message});
        }

        let data = {};
        data.title=title;
        if(description) data.description=description;
        if(category) data.category=category;
        if(level) data.level=level;

        const course=await prisma.course.create({
            data
        });
        res.json({message:"Course created",course});
    }catch(e){
        res.status(400).json({error:e.message});
    }
});

router.get("/:id",async(req,res)=>{
    try{
        const id=req.params.id;
        const courses=await prisma.course.findUnique({
            where:{
                id,
            },
        });
        res.json(courses);
    }catch(e){
        res.status(400).json({error:e.message});
    }
});

router.put("/", isLoggedin, isSuperAdmin, async(req,res)=>{
    try{
        const {id,title, description, category, level}=req.body;
        const zObj=z.object({
            id:z.string().uuid(),
            title:z.string().min(3),
            description:z.string().optional(),
            category:z.string().optional(),
            level:z.number().lte(3).optional(),
        });
        const validatedData = zObj.safeParse({id,title, description, category, level});
        if(!validatedData.success){
            return res.status(400).json({error:validatedData.error.issues[0].message});
        }

        let data = {};
        if(title) data.title=title;
        if(description) data.description=description;
        if(category) data.category=category;
        if(level) data.level=level;

        const course=await prisma.course.update({
            where:{
                id
            },
            data
        });
        res.json({message:"Course updated",course});
    }catch(e){
        if (e.code === 'P2025') {
            return res.status(404).json({error: 'Course not found'});
        }
        res.status(400).json({error:e.message});
    }
});

router.delete("/:id", isLoggedin, isSuperAdmin, async(req,res)=>{
    try{
        const id=req.params.id;
        const course=await prisma.course.delete({
            where:{
                id
            }
        });
        res.json({message:"Course deleted",course});
    }catch(e){
        if (e.code === 'P2025') {
            return res.status(404).json({error: 'Course not found'});
        }
        res.status(400).json({error:e.message});
    }
});

router.post("/enroll", isLoggedin, async(req,res)=>{
    try{
        const {courseId}=req.body;
        const zObj=z.object({
            courseId:z.string().uuid(),
        });
        const validatedData = zObj.safeParse({courseId});
        if(!validatedData.success){
            return res.status(400).json({error:validatedData.error.issues[0].message});
        }

        const userId=req.userId.id;
        const course=await prisma.course.findUnique({
            where:{
                id:courseId
            }
        });
        if(!course){
            return res.status(404).json({error:"Course not found"});
        }
        const isEnrolled=await prisma.enrollment.findFirst({
            where:{
                courseId,
                userId
            }
        });
        if(isEnrolled){
            return res.status(400).json({error:"You are already enrolled in this course"});
        }
        const enrolled=await prisma.enrollment.create({
            data:{
                courseId,
                userId
            },
            include: {
                User: {
                    select: {
                        email: true
                    }
                },
                Course: {
                    select: {
                        title: true
                    }
                }
            }
        });
        await prisma.course.update({
            where:{
                id:courseId
            },
            data:{
                popularity: {
                    increment: 1
                }
            }
        });
        res.json({message:"Enrolled successfully",enrolled});
        sendMail(enrolled.User.email, "Course Enrollment", `You have successfully enrolled in ${enrolled.Course.title}`);
    }catch(e){
        console.log(e);
        res.status(400).json({error:e.message});
    }
});

router.get("/enrolled/:courseId", async(req,res)=>{
    try{
        const courseId=req.params.courseId;
        const enrolled=await prisma.enrollment.findMany({
            where:{
                courseId,
            },
            select:{
                User:true,
            }
        });
        res.json(enrolled);
    }catch(e){
        res.status(400).json({error:e.message});
    }
});

module.exports=router;  