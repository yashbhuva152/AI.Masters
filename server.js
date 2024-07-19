// server.js
const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const app = express();

app.use(express.json());
app.use(express.static("public"));

const resourcePath = path.join(__dirname, "Resource");
if (!fs.existsSync(resourcePath)) {
  fs.mkdirSync(resourcePath);
}
/*const uploadPath = path.join(resourcePath, "AudioRecordings");
if (fs.existsSync(path.join(resourcePath, "chat-log.txt"))) {
  fs.writeFileSync(path.join(resourcePath, "chat-log.txt"), ""); //Reset log file
}*/

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(resourcePath, "AudioRecordings");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath);
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, `${file.originalname}`);
  },
});

const upload = multer({ storage: storage });

// Endpoint to log messages
app.post("/log-message", (req, res) => {
  const { userMessage, botResponse } = req.body;

  const logEntry = `User: ${userMessage}\nBot: ${botResponse}\n\n`;
  fs.appendFile(path.join(resourcePath, "chat-log.txt"), logEntry, (err) => {
    if (err) {
      return res.status(500).send("Error writing to file");
    }
    res.send("Message logged");
  });
});

// Endpoint to clear log messages
app.post("/clear-log-message", (req, res) => {
  fs.writeFileSync(path.join(resourcePath, "chat-log.txt"), "", (err) => {
    if (err) {
      return res.status(500).send("Error writing to file");
    }
    res.send("Log Message Cleared");
  });
});

// Endpoint to handle audio uploads
app.post("/upload-audio", upload.single("audio"), (req, res) => {
  if (!req.file) {
    return res.status(400).send("No file uploaded.");
  }
  res.send({
    message: "File uploaded successfully!",
    filename: req.file.filename,
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
