import express from 'express';

const app=express();
const PORT=process.env.PORT ?? 9999

app.get('/',(req,res)=>{
    return res.status(200).json({
        success:true,
        message:"Hello"
    })
})

app.listen(PORT,()=>{
    console.log("Server is running")
})