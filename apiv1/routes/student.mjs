import { nanoid } from 'nanoid'
import express from 'express';
import {client} from '../../mongodb.mjs' 
import { ObjectId } from 'mongodb'
import OpenAI from "openai";
import admin from 'firebase-admin'
import multer from 'multer';


import bodyParser from 'body-parser';
import { stringToHash, verifyHash } from "bcrypt-inzi";
import fs from 'fs';

let router = express.Router()
// const upload = multer()

const db = client.db("cruddb")
// const col =db.collection("posts")
// const userDB = db.collection("users");
const col = db.collection("usersAttendence");
const studentAttendence=db.collection("attendence");


// Multer configuration it upload pic file in to upload folder 
const storageConfig = multer.diskStorage({
    destination: './uploads/',
    filename: function (req, file, cb) {
  
        console.log("mul-file : ", file)
        cb(null,   `postImg-${new Date().getTime()}-${file.originalname}`)}
})

let upload =multer({storage: storageConfig});


// router.use(bodyParser.json());
// router.use(express.urlencoded({ extended: true }));

// https://firebase.google.com/docs/storage/admin/start




  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  const bucket = admin.storage().bucket("gs://blog-website-pic-bucket.appspot.com");

// const openaiClient = new OpenAI({
//     apiKey: process.env.OPENAI_API_KEY,
// });


// // https://baseurl.com/search?q=car

// // GET     /api/v1/profile

// router.get('/profile',async (req, res, next) => {
//     console.log('this is signup!', new Date());

  

//    try{
//     const result=await userDB.findOne({email:req.body.decoded.email});
//     console.log('result is the ', result);
//       res.send({
//         message:"This is profile",
//         data:{
//             isAdmin:result.isAdmin,
//             firstName: result.firstName,
//             lastName: result.lastName,
//             email: result.email
                   
//         }

//       });
//    }
//    catch(err){
//     console.log('error getting in mongodb', err)
//     res.status(500).send({message :"server does not respond! please try again later"});
//    }


// })




// GET     /api/v1/posts      it fetch only the post of login user 
router.get('/postInd',async (req, res, next) => {
    console.log('this is signup!', new Date());
    const userId= req.query._id || req.body.decoded._id
    console.log(userId)
    if(!ObjectId.isValid(userId)){
        res.status(403).send("invalid user id");
    }

    
    const cursor = col.find({authorId :new ObjectId(userId)}) .sort({ _id: -1 })
    .limit(100);
    try{
        let postArray =await cursor.toArray();
        console.log('result', postArray)
        res.send(postArray);
    }
    catch(error){
        console.log('error getting in mongodb', error)
        res.status(500).send({message :"server does not respond! please try again later"});
    }
    

})


//------------------take URL of profile pic from firebase and save in mongodb -----------------------

router.put('/postPic', (req, res, next) => {
    req.decoded = { ...req.body.decoded }
    next();
},
    upload.any() 
,async (req,res,next) => {

try{

     const { email, URL } = req.body;      //destructuring of object kari ha
    //  console.log("req.body :" +req.body);
     console.log("req.file first is :" +req.files);
    //  console.log("uploaded file name " + req.files[0].originalname   )
    //  console.log("server give file name " + req.files[0].filename )

     if(req.files[0].size > 2000000){    //2 MB
        res.send({result :"Give file size less than 2MB"})
     }

     bucket.upload(
        req.files[0].path,
        {
         destination: `profile/${req.files[0].filename}`,

        },

        function (err, file, apiResponse) {
            if(!err){
                file.getSignedUrl({
                    action: 'read',
                    expires : '03-09-2050'
                }).then ( async (urlData ,err)=>{
                    if(!err){
                       console.log("public downableUrl of profile pic is :" ,urlData[0]);
                       const userEmail =req.decoded.email;
               
                     


                       try{
                        let url ={url :urlData[0]};
                        
                        const response =await userDB.updateOne({email: userEmail},{$set: url})
                            console.log("updated" + JSON.stringify(response));
                            res.send({message :"Picture Added Successfully",
                                  
                        
                        } )

                        
                       }
                       catch (e) {
                        console.log("error inserting mongodb: ", e);
                        res.status(500).send({ message: 'server error, please try later' });
                    }
                    // // delete file from folder before sending response back to client (optional but recommended)
                            // // optional because it is gonna delete automatically sooner or later
                            // // recommended because you may run out of space if you dont do so, and if your files are sensitive it is simply not safe in server folder

                            try {
                                fs.unlinkSync(req.files[0].path)
                                //file removed
                            } catch (err) {
                                console.error(err)
                            }
                           
                    }
                    else {
                        console.log("err: ", err)
                        res.status(500).send({
                            message: "server error"
                        });
                    }
                }) 
            }
        }
        )

}
catch(error){
    console.log('Error:', error);
}

})


//------------------in this pic are come from frontend and attendence is mark -----------------------

router.post('/attendence',async (req, res, next) => {
    req.decoded = { ...req.body.decoded }
    next();
},
    upload.any() 
,async (req,res,next) => {

try{
      // Check if a file is being uploaded
    //   if (!req.file) {
    //     return res.status(400).send({ message: 'No file uploaded.' });

    // }

     const { email, Url } = req.body;      //destructuring of object kari ha
    //  console.log("req.body :" +req.body);
     console.log("req.file first us :" +req.files);
    //  console.log("uploaded file name " + req.files[0].originalname   )
    //  console.log("server give file name " + req.files[0].filename )

    //  if(req.files[0].size > 2000000){    //2 MB
    //     res.send({result :"Give file size less than 2MB"})
    //  }
      console.log("the file is "+req.files[0])
     bucket.upload(
        req.files[0].path,
        {
         destination: `attendence/${req.files[0].filename}`,

        },

        function (err, file, apiResponse) {
            if(!err){
                file.getSignedUrl({
                    action: 'read',
                    expires : '03-09-2050'
                }).then ( async (urlData ,err)=>{
                    if(!err){
                       console.log("public downableUrl of profile pic is :" ,urlData[0]);
                      
                       const userEmail =req.decoded.email;
               
                     


                       try{
                        let url ={url :urlData[0]};
                        
                        const response =await studentAttendence.insertOne({
                            Url: urlData[0],
                            firstName:req.decoded.firstName,
                            lastName:req.decoded.lastName,
                            email:req.decoded.email,
                            course:req.decoded.course,
                            checkinTime:new Date().getTime(),
                            checkoutTime:new Date().getTime()+86400000,

                       })
                                  
                        
                        res.send (response)
                        console.log (response)


                        
                       }
                       catch (e) {
                        console.log("error inserting mongodb: ", e);
                        res.status(500).send({ message: 'server error, please try later' });
                    }
                    // // delete file from folder before sending response back to client (optional but recommended)
                            // // optional because it is gonna delete automatically sooner or later
                            // // recommended because you may run out of space if you dont do so, and if your files are sensitive it is simply not safe in server folder

                            try {
                                fs.unlinkSync(req.files[0].path)
                                //file removed
                            } catch (err) {
                                console.error(err)
                            }
                           
                    }
                    else {
                        console.log("err: ", err)
                        res.status(500).send({
                            message: "server error"
                        });
                    }
                }) 
            }
        }
        )

}
catch(error){
    console.log('Error:', error);
}

})

//---------------------get recent attendence of specific student ---------------------------------

router.get(`/getRecentAttendence/:email`,async (req,res,next)=>{
   
    const cursor = studentAttendence.find({email: req.params.email});
    
    try{
        let studentAttendenceArray =await cursor.toArray();
        // console.log('result', studentAttendenceArray)
        if(studentAttendenceArray.length === 0){
            res.send("")
            return
        }
        
        // var studentAttendenceData = studentAttendenceArray.data;
        else if(studentAttendenceArray.length !== 0){
        for(var i=0; i<studentAttendenceArray.length; i++){
            // console.log('studentAttendence'+ studentAttendenceArray[i].checkinTime)
            const reaminTime=new Date().getTime() - studentAttendenceArray[i].checkoutTime;
            
            console.log('reaminTime'+ reaminTime)
            if(reaminTime <= 0){
                 res.send(studentAttendenceArray[i])
                // res.send("oksssssss")
                return
            }
         
        }
    }
        else{
            res.send("")
            return
        }

        return
        // studentAttendenceData.map((studentAttendence)=>{
        //     console.log('studentAttendence                       ', studentAttendence.checkinTime);
        // })

        
    }
    catch(error){
        console.log('error getting in mongodb', error)
        res.status(500).send({message :"server does not respond! please try again later"});
    }


//    try{
//        const response=await studentAttendence.findOne({email:req.params.email})
//        res.send(response)
//        console.log("mmmmmmmmmmmmmmmmmmmmmmmmmmm"+response)
//    }
//    catch(err){
//     console.log('error getting in mongodb', err)
//     res.send({message :"server does not respond! please try again later"});
//    }
     })
  

 //-------------------------- get all attendence of specific student----------------------------   

router.get('/getAllAttendence/:email',async (req, res, next)=>{
     const email = req.params.email;
   

     const cursor = studentAttendence.find({ email: email }).sort({_id: -1});
     try{
      let studentAttendenceArray =await cursor.toArray();
     
     res.send(studentAttendenceArray);
    
      return
     }
     catch(err){
        console.log('error getting in mongodb', err)
        res.status(500).send({message :"server does not respond! please try again later"});
      return
     }
})

 //-------------------------- get all attendence of all student----------------------------   

 router.get('/getAllAttendenceStudent',async (req, res, next)=>{
    
    const cursor = studentAttendence.find({}).sort({_id: -1});
    try{
     let studentAttendenceArray =await cursor.toArray();
    
    res.send(studentAttendenceArray);
   
     return
    }
    catch(err){
       console.log('error getting in mongodb', err)
       res.status(500).send({message :"server does not respond! please try again later"});
     return
    }
})

         //-----------------Add student in mongodb -----------------------


 router.post('/addStudent', (req, res, next) => {
            req.decoded = { ...req.body.decoded };
            next();
        }, upload.any(), async (req, res, next) => {
            try {
                let { firstName, lastName, course, email, password, number, URL } = req.body;
                console.log("req.files first:", req.files);
                console.log("uploaded file name: " + req.files[0].originalname);
                console.log("server gives file name of: " + req.files[0].filename);
                console.log("server gives file name of: " + firstName);
        
                if (req.files[0].size > 2000000) { // 2 MB
                    res.send({ result: "Give file size less than 2MB" });
                    return;
                }
        
                bucket.upload(
                    req.files[0].path,
                    {
                        destination: `profileHackathon/${req.files[0].filename}`,
                    },
                    async function (err, file, apiResponse) {
                        if (err) {
                            console.error("Error uploading to bucket:", err);
                            res.status(500).send({ message: "Error uploading file to storage" });
                            return;
                        }
        
                        try {
                            const urlData = await file.getSignedUrl({
                                action: 'read',
                                expires: '03-09-2050'
                            });
        
                            console.log("public downloadable URL of cover pic is:", urlData[0]);
                            email = email.toLowerCase();
        
                            const result = await col.findOne({ email: email });
                            const hashPassword = await stringToHash(password);
        
                            if (!result) {
                                await col.insertOne({
                                    isAdmin: false,
                                    firstName: firstName,
                                    lastName: lastName,
                                    course: course,
                                    email: email,
                                    password: hashPassword,
                                    number: number,
                                    url: urlData[0],
                                    createdOn: new Date(),
                                });
        
                                res.send({ message: "User Is Added Successfully In Database" });
                                console.log('User is added successfully in the database');
                            } else {
                                res.status(403).send({ message: "User is Already Exists For This Email Address" });
                                console.log('User already exists from this email address');
                            }
        
                            try {
                                fs.unlinkSync(req.files[0].path);
                            } catch (err) {
                                console.error(err);
                            }
                        } catch (e) {
                            console.log("Error getting signed URL or inserting into MongoDB:", e);
                            res.status(500).send({ message: 'Server error, please try later' });
                        }
                    }
                );
        
                // const newURL = URL.slice(5);
                // console.log('Email:', email);
                // console.log('URL:', newURL);
        
                // res.send({ newURL: "hh " + newURL });
            } catch (error) {
                console.log('Error:', error);
                res.status(500).send({ message: 'Server error, please try later' });
            }
        });
           
        

router.get('/studentProfile/:student',async (req, res ,next) => {
    try{
        //  console.log("shhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhn           "+req.params.student)
         const specificUser = await col.findOne({ email: req.params.student });
         res.send(specificUser)
// console.log("jjjjjjjjjjjjjjjjjjjjjjjjjjj" + specificUser)
    }
    catch(err){
        res.send(err)
        console.log(err)
    }
})        





         //------------------get url of pic from mongodb -----------------------
router.get('/getPicURl',async (req, res,next)=>{
    try{
       const picURL=await userDB.findOne({email:req.body.decoded.email});
       console.log(picURL)
       res.send(picURL)
    }
    catch(error){
        res.send(error.message)
    }
})

//----------------------- it fetch all post of user --------------------------


router.get('/students',async (req, res, next) => {
    console.log('this is signup!', new Date());

    
    const cursor = col.find() .sort({ _id: -1 })
    .limit(100);
    try{
        let studentArray =await cursor.toArray();
        console.log('result', studentArray)
        res.send(studentArray);
    }
    catch(error){
        console.log('error getting in mongodb', error)
        res.status(500).send({message :"server does not respond! please try again later"});
    }
    

})

// GET     /api/v1/post/:postId
// router.get('/post/:postId',async (req, res, next) => {
//     console.log('this is signup!', new Date());

//     // if (isNaN(req.params.postId)) {
//     //     res.status(403).send(`post id must be a valid number, no alphabet is allowed in post id`)
//     // }
// //     let i
//     let getId=req.params.postId
//     let getIdupdate=getId.slice(1)
// //    console.log(getIdupdate)
// if (!ObjectId.isValid(getIdupdate)) {
//     res.status(403).send({message :`Invalid post id`});
//     return;
// }

//    try{
//     const post=await col.findOne({_id: new ObjectId(getIdupdate)});
//       res.send(post);
//    }
//    catch(err){
//     console.log('error getting in mongodb', err)
//     res.status(500).send({message :"server does not respond! please try again later"});
//    }
// })


//get             fetch the profile  of the user
const submitProfileHandler =async (req, res,next) => {
    const userId = req.params.userId || req.body.decoded._id ;
    if(!ObjectId.isValid(userId)){
        res.status(403).send("Invalid user ID");
        return
    }

    try{
      const result= await col.findOne({_id:new ObjectId(userId)})
      console.log(result);
      res.status(200).send({message: "profile is fetched",
                data:{
                    isAdmin: result?.isAdmin,
                    firstName: result?.firstName,
                    lastName: result?.lastName,
                    email: result?.email,
                    _id:result?.id
                }
    })
    }
    catch(err){

        console.log("error getting in mongodb ",err)
        res.status(500).send("error getting in mongodb please try again later")
}
}

router.get("/profile", submitProfileHandler)
router.get("/profile/:userId", submitProfileHandler)




router.put("/studentUpdate/:studentID", async (req, res, next) => {
    const getId = req.params.studentID;
    // const updateId=getId.slice(1)   this line is run when we use thunder client
    // console.log(getId);
    // new ObjectId(updateId)
    if(!ObjectId.isValid(getId)){
      return res.status(500).send({message :"post not found with this id"})
    }

  if (!req.body.firstName && !req.body.lastName && !req.body.course && !req.body.email) {
    console.log("No fields provided for update");
    return res.status(400).send({ message: "Please enter at least one field for updating" });
  }

  let updateWork = {};

  if (req.body.firstName) updateWork.firstName = req.body.firstName;
  if (req.body.lastName) updateWork.lastName = req.body.lastName;
  if (req.body.course) updateWork.course = req.body.course;
  if (req.body.email) updateWork.email = req.body.email;

  try {
    const update = await col.updateOne({ _id:new ObjectId(getId) }, { $set: updateWork });
    console.log("update ", update);
    res.send({ message: 'Student information updated successfully' });
    return
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Internal Server Error' });
    return
  }
});


// PUT     /api/v1/post/:userId/:postId
// router.put('/studentUpdate/:studentEmail',async (req, res, next) => {
//     const getId = req.params.postId;
//     // const updateId=getId.slice(1)   this line is run when we use thunder client
//     // console.log(getId);
//     // new ObjectId(updateId)
//     if(!ObjectId.isValid(getId)){
//         res.status(500).send({message :"post not found with this id"})
//     }
//     if(!req.body.firstName && !req.body.lastName && !req.body.course && !req.body.password && !req.body.email){
//         console.log("not any fiels is given");
//         res.status("22").send({message :"please enter one field for updation"});
//     }
//     let updateWork ={title:"",text:""};
//     if(req.body.title && req.body.text){
//         updateWork.title = req.body.title
//         updateWork.text = req.body.text
//     }
//     if(!req.body.text){updateWork.title = req.body.title}
//     if(!req.body.title){updateWork.title = req.body.text}
//     try{
        

//          const update=await col.updateOne({_id:new ObjectId(getId)},{$set :updateWork})
//             console.log("update " +update)
//             res.send({message :'post is  updated successfully'})
//     }
//     catch(error){

//     }


// });
// DELETE  /api/v1/post/:userId/:postId
router.delete('/post/:postId',async (req, res, next) => {
    console.log('this is signup!', new Date());
 
    let getId=req.params.postId
    console.log('getId', getId)
     getId=getId.slice(1)
if(!ObjectId.isValid(getId)){
    res.status(500).send({message :"post not found with this id"})
}

try{
    
    let deletedItem=await col.deleteOne({_id : new ObjectId(getId)})
    // amount deleted code goes here
console.log("Number of documents deleted: " + deletedItem);

res.send({message :"post is deleted of "+ req.params.postId})


}
catch(error){
     console.log(error)
}
    // let getId=req.params.postId
   

    //  for (let i=0 ;i<posts.length;i++){
    //     if(posts[i].id === getId.slice(1)){
    //         // res.send(posts[i])
    //         posts.splice(i,1)
    //         res.send("post delete of id "+ getId.slice(1))

    //         return
    //     }
    //  }



    // res.send('post not found with this index');
})

export default router



