const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    minlength: [8, 'Password must be at least 8 characters'],
    // Google-signed-up accounts never set a password, so only require one
    // for accounts created the normal email/password way.
    required: function () {
      return this.authProvider === 'local';
    }
  },
  authProvider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local'
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true // sparse = only enforces uniqueness among docs that HAVE a googleId
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  resetPasswordToken: {
    type: String
  },
  resetPasswordExpires: {
    type: Date
  },
  profilePicture: {
    type: String,
    default: ''
  },
  profileOverrides: {
    phone: { type: String, default: '' },
    age: { type: Number, default: null },
    skills: { type: [String], default: [] },
    education: { type: String, default: '' },
    experience: { type: String, default: '' },
    about: { type: String, default: '' }
  },
  cvData: {
    extractedInfo: {
      name: { type: String, default: '' },
      email: { type: String, default: '' },
      phone: { type: String, default: '' },
      age: { type: Number, default: null },
      skills: { type: [String], default: [] },
      education: { type: String, default: '' },
      experience: { type: String, default: '' }
    },
    uploadedFile: {
      filename: { type: String, default: '' },
      filePath: { type: String, default: '' },
      uploadDate: { type: Date, default: null }
    }
  }
}, {
  timestamps: true
});

userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.resetPasswordToken;
  delete user.resetPasswordExpires;
  return user;
};

const User = mongoose.model('User', userSchema);
module.exports = User;