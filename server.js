
const express = require('express');
const path = require('path');
const app = express();
const dist = path.join(__dirname, 'client', 'dist');

app.use(express.static(dist));
app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('listening on', PORT));
