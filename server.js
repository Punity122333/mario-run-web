const express = require('express');
const path = require('path');

const app = express();

// Serve everything in /public as static assets (index.html, style.css, game.js)
app.use(express.static(path.join(__dirname, 'public')));

// Fallback: any other route just serves the game page (single-page app)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Only start a listening server when run directly (e.g. `node server.js` or `npm start`).
// On Vercel, the exported `app` is used as a serverless function instead.
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Mario Run Web is running at http://localhost:${PORT}`);
  });
}

module.exports = app;
