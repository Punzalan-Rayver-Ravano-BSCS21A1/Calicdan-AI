const express = require('express');
const path = require('path');
const app = express();

// serve all static files from the root folder (or "public")
app.use(express.static(path.join(__dirname)));

// default route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// serve chat.html directly
app.get('/chat.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'chat.html'));
});

const PORT = process.env.PORT || 5500;
app.listen(PORT, () => console.log(`Server running at http://127.0.0.1:${PORT}`));
