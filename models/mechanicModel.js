const mongoose = require('mongoose')
const mechanicSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    phone:{
        type:String,
        required:true,
        unique:true
    },
    email:{
        type:String,
        reqruied:true,
        unique:true
    },
    password:{
        type:String,
        reqruied:true
    },
    shopName:{
        type:String,
        required:true
    },
    services:{
        type:[String],
        required:true
    },
    location :{
       lat:{
        type:Number,
        required:true
       },
       lng:{
        type:Number,
        required: true
       }
    },
    isAvailable :{
        type:Boolean,
        default:true
    },
    role:{
        type:String,
        enum:['driver','mechanic'],
        required:true
    }
    },
    
     {timestamps:true}
)

module.exports = mongoose.model('Mechanic',mechanicSchema)