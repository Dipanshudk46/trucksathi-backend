const mongoose = require('mongoose')
const mechanicSchema = new mongoose.Schema({
    name:{
        type: String,
        required: true
    },
    phone:{
        type: String,
        required: true,
        unique: true
    },
    email:{
        type: String,
        required: true,
        unique: true
    },
    password:{
        type: String,
        required: true
    },
    shopName:{
        type: String,
        required: true
    },
    services:{
        type: [String],
        required: true
    },
    location :{
      type:{
        type: String,
        enum: ['Point'],
        required: true
      },
      coordinates:{
        type: [Number],
        required: true
      }
    },
    isAvailable :{
        type: Boolean,
        default: true
    },
    role:{
        type: String,
        enum: ['driver','mechanic'],
        required: true
    }
    },
    
     {timestamps: true}
)
mechanicSchema.index({location:"2dsphere"})
module.exports = mongoose.model('Mechanic',mechanicSchema)