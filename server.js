const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");
require("dotenv").config();

const app = express();
const port = 3000;

// Serve static files from the 'public' directory
app.use(express.static("public"));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + "-" + Date.now() + ".wav");
  },
});

const upload = multer({ storage: storage });

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// POST route to handle file uploads and transcribing
app.post("/transcribe", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No audio file provided" });
    }

    const filePath = req.file.path;

    try {
      // Call the OpenAI API with the audio file
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(filePath),
        model: "whisper-1",
      });

      // Clean up the uploaded file
      fs.unlinkSync(filePath);

      // Send back the transcription
      res.json({ transcription: transcription.text });
    } catch (error) {
      console.error("OpenAI API Error:", error);
      res
        .status(500)
        .json({ error: "Failed to transcribe audio", details: error.message });
    }
  } catch (error) {
    console.error("Server Error:", error);
    res
      .status(500)
      .json({ error: "Failed to process audio file", details: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
