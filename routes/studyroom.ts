import { Router, Request, Response } from "express";
import Studyroom from "../models/studyroom";
import User from "../models/user";
import auth from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
require('dotenv').config()
const router = Router()
const url = process.env.BASE_URL
const media = process.env.MEDIA
router.get("/", async (req: Request, res: Response) => {
  const allStudyroom = await Studyroom.aggregate(
    [
      {
        $group : {
          _id : "$building",
          studyrooms: { $push: {_id: "$_id", name: "$name", image: "$image"} } // { $push: "$$ROOT" }
        },
      },
     ]
  )
  allStudyroom.map(function(b, i){ 
    b.studyrooms.map(function(s, i){ 
      s.image=url + s.image
      return s
    })
    return b
  } )
  res.status(200).send({data: allStudyroom})
})
router.get("/all", async (req: Request, res: Response) => {
  const allStudyroom = (await Studyroom.find()).map(
    function(e, i){ 
      e.image=url + e.image
      return e
    }
 )
  console.log('READ STUDYROOM', allStudyroom)
  res.status(200).send({data: allStudyroom})
})
router.get("/supervisor", auth.organization, async (req: Request, res: Response) => {
  const {username} = req.body
  const owner = await User.findOne({username: username, supervisor: true})
  const allStudyroom = (await Studyroom.find({owner: owner})).map(
    function(e, i){ 
      e.image=url + e.image
      return e
    }
 )
  console.log('READ STUDYROOM', allStudyroom)
  res.status(200).send({data: allStudyroom})
})
router.post("/create", auth.organization, async (req: Request, res: Response) => {
  const {name, seats, floor, building, username, image} = req.body
  try {
    if(floor > 9 || floor <=0 || seats <= 0|| seats > 99 || !image || image==='') res.status(400).send({data: 'error'})
  } catch(err) {
    res.status(400).send({data: 'error'})
  }
  var imgName = `${media}${uuidv4()}.png`;
  var base64Data = image.replace(/^data:image\/png;base64,/, "");
  var buf = Buffer.from(base64Data, 'base64');
  try {
    while(fs.existsSync(imgName))imgName = `${media}${uuidv4()}.png`;
    fs.writeFileSync(imgName, buf);
  } catch(err) {
    console.log('brodoo', err)
  }
  const data = await Studyroom.checkAndSave({ name, seats, floor, building, image: imgName, owner: username })
  if(!data) res.status(400).send({data: 'error'})
  console.log('CREATE STUDYROOM')
  res.status(200).send({data: 'create'})
})
router.get("/:id/changestatus", auth.organization, async (req: Request, res: Response) => {
  const {id} = req.params
  const {username} = req.body
  const owner = await User.findOne({username: username})
  console.log('OWNER', owner)
  const studyroom = await Studyroom.findOne({_id: id, owner: owner})
  console.log('STUDYROOM', studyroom)
  await studyroom.updateOne({isactive: !studyroom.isactive})
  console.log('UPDATE')
  res.status(200).send({data: 'change status'})
})
router.get("/:id", async (req: Request, res: Response) => {
  const {id} = req.params
  const studyroom = await Studyroom.findOne({_id: id})
  const owner = await User.findOne({_id: studyroom.owner})
  studyroom.image = url + studyroom.image
  const newStudyroom = {
    _id: studyroom._id,
    name: studyroom.name,
    seats: studyroom.seats,
    floor: studyroom.floor,
    isactive: studyroom.isactive,
    image: studyroom.image,
    building: studyroom.building,
    owner: studyroom.owner,
    created: studyroom.created,
    email: owner.email
  }
  console.log('READ STUDYROOM')
  res.status(200).send({data: newStudyroom})
})
router.delete("/:id", auth.organization, async (req: Request, res: Response) => {
  const {id} = req.params
  const {username} = req.body
  const owner = await User.findOne({username: username})
  const studyroom = await Studyroom.findOne({_id: id, owner: owner})
  const image = studyroom.image
  try{
    fs.unlinkSync(image)
  }catch(e){
    console.log(e)
  }
  finally{
    await studyroom.deleteOne()
    res.status(200).send({data: 'delete'})
  }
})
router.patch("/:id", auth.organization, async (req: Request, res: Response) => {
  const {name, seats, floor, building, username, image} = req.body
  try {
    if(!building || building==='' || floor > 9 || floor <=0 || seats <= 0|| seats > 99 || !image || image==='') res.status(400).send({data: 'error'})
  } catch(err) {
    res.status(400).send({data: 'error'})
  }
  const {id} = req.params
  const owner = await User.findOne({username: username})
  var imgName = image.substring(image.indexOf(media))
  console.log('image', imgName)
  try {
    if(image.includes('data:image/png;base64,')) {
      imgName = `${media}${uuidv4()}.png`;
      var base64Data = image.replace(/^data:image\/png;base64,/, "");
      var buf = Buffer.from(base64Data, 'base64');
      while(fs.existsSync(imgName))imgName = `${media}${uuidv4()}.png`;
      fs.writeFile(imgName, buf,(err) => 
          console.log('download finito!', err)
      );
    }
  } catch(err) {
      console.error(err)
  }
  try{
    await Studyroom.findOneAndUpdate({_id: id, owner: owner}, {name, seats, floor, building, image: imgName})
    res.status(200).send({data: 'update'})
  }catch(e){
    res.status(400).send({data: 'error'})
  }
})
export default router