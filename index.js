const express = require('express');
const app=express();

const cors=require('cors');

app.use(cors());
app.use(express.json());
app.use('/user',require('./Routes/UserRoutes'));   
app.use('/course',require('./Routes/CourseRoutes'));      

app.all('*',(req,res)=>{
    res.status(404).json({error:"Route not found"});
});

app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});