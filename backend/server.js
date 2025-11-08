const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

//send the next question
const questions = [
  { id: 1, q: 'Mikor született II.András?', a1: '1232', a2: '1177', a3: '1209' },
  { id: 2, q: 'Melyik évszázadban élt IV.Béla?', a1: '11', a2: '12', a3: '13' },
  { id: 3, q: 'Mikor írták alá az Aranybullát?', a1: '1222', a2: '1165', a3: '1308' }
];
app.get('/api/question/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const question = questions.find(u => u.id === id);

  if (question) {
    res.json(question);
  } else {
    res.status(404).json({ error: 'A kérdés nem található' });
  }
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

let rooms = {}; // { roomId: [socketId1, socketId2, ...] }
// 👉 segédfüggvény egyedi azonosítóhoz
function generateRoomId() {
  return Math.random().toString(36).substring(2, 8); // pl: 'a9x3zq'
}

io.on('connection', (socket) => {
  console.log(`🟢 Kliens csatlakozott: ${socket.id}`);

  // 1️⃣ Csoport létrehozása
  socket.on('createRoom', () => {
    const roomId = generateRoomId();
    rooms[roomId] = [socket.id];
    socket.join(roomId);
    socket.emit('roomCreated', { roomId });
    console.log(`🏠 Új csoport: ${roomId}`);
  });

  // 2️⃣ Csatlakozás csoporthoz
  socket.on('joinRoom', ({ roomId }) => {
    const room = rooms[roomId];

    if (!room) {
      socket.emit('errorMessage', { message: '❌ Nincs ilyen csoport!' });
      return;
    }

    if (room.length >= 3) {
      socket.emit('errorMessage', { message: '⚠️ A csoport tele van!' });
      return;
    }

    room.push(socket.id);
    socket.join(roomId);
    console.log(`👥 Kliens csatlakozott a ${roomId} csoporthoz (${room.length}/3)`);

    // Ha 3-an vannak → küldjünk mindenkinek üzenetet
    if (room.length === 3) {
      io.to(roomId).emit('allConnected', { message: `✅ A ${roomId} csoport teljes!` });
    }
  });

  // 3️⃣ Leválás esetén töröljük a tagot
  socket.on('disconnect', () => {
    for (const [roomId, members] of Object.entries(rooms)) {
      if (members.includes(socket.id)) {
        rooms[roomId] = members.filter(id => id !== socket.id);

        // ha a csoport kiürült → töröljük
        if (rooms[roomId].length === 0) {
          delete rooms[roomId];
          console.log(`🗑️ Törölve: ${roomId}`);
        }
        break;
      }
    }
  });
});


// let connectedClients = [];

// io.on('connection', (socket) => {
//   console.log(`🟢 Kliens csatlakozott: ${socket.id}`);
//   connectedClients.push(socket);

//   // Ellenőrizzük, hányan vannak
//   if (connectedClients.length === 3) {
//     console.log('✅ Mindhárom kliens csatlakozott!');
//     connectedClients.forEach((s) => {
//       s.emit('allConnected', { message: 'Mindenki megérkezett!' });
//     });

//     // lista ürítése (új kör kezdődhet)
//     connectedClients = [];
//   }

//   socket.on('disconnect', () => {
//     console.log(`🔴 Kliens lecsatlakozott: ${socket.id}`);
//     connectedClients = connectedClients.filter((s) => s.id !== socket.id);
//   });
// });

server.listen(3000, () => console.log('🚀 WebSocket szerver fut http://localhost:3000'));



//get the answer
app.post('/api/answer', (req, res) => {
  const data = req.body;
  // reply to the frontend
  if (data.answer === 2) {
    res.json({
    received: true,
    message: `A válasz helyes:`
  });
  } else {
    res.json({
      reveived: true,
      message: 'A válasz helytelen'
    })
  }
});

app.listen(PORT, () => console.log(`Server is running on: http://localhost:${PORT}`));
