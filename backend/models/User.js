const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  githubId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  username: {
    type: String,
    required: true
  },
  accessToken: {
    type: String,
    required: true
  },
  analysisFilesUsed: {
    type: Number,
    default: 0
  },
  sessionToken: {
    type: String,
    default: null,
    index: true
  }
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);