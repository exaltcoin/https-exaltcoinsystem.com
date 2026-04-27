exalt-coin-system/
│── server.js
│── package.json
│── .env
│
├── public/
│   ├── index.html
│   ├── dashboard.html
│   ├── style.css
│   └── app.js
│
├── routes/
│   └── auth.js
│
├── middleware/
│   └── authMiddleware.js{
  "name": "exalt-coin-system",
  "version": "1.0.0",
  "main": "server.js",
  "dependencies": {
    "express": "^4.18.2",
    "jsonwebtoken": "^9.0.0",
    "bcryptjs": "^2.4.3",
    "dotenv": "^16.0.0",
    "cors": "^2.8.5"
  }
}require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static("public"));

const authRoutes = require("./routes/auth");
app.use("/api/auth", authRoutes);

app.listen(3000, () => console.log("Server running on port 3000"));const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

let users = [];

router.post("/register", async (req, res) => {
  const { email, password } = req.body;

  const hashed = await bcrypt.hash(password, 10);
  users.push({ email, password: hashed });

  res.json({ message: "User registered" });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = users.find(u => u.email === email);
  if (!user) return res.status(400).send("User not found");

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(400).send("Invalid password");

  const token = jwt.sign({ email }, process.env.JWT_SECRET);
  res.json({ token });
});

module.exports = routerconst jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
  const token = req.headers["authorization"];
  if (!token) return res.sendStatus(403);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.sendStatus(401);
  }<!DOCTYPE html>
<html>
<head>
  <title>Exalt Coin</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>

<h1>Exalt Coin System</h1>

<h2>Register</h2>
<input id="email" placeholder="Email">
<input id="password" type="password" placeholder="Password">
<button onclick="register()">Register</button>

<h2>Login</h2>
<button onclick="login()">Login</button>

<script src="app.js"></script>
</body>body {
  font-family: Arial;
  text-align: center;
  background: #0b0f19;
  color: white;
}

input, button {
  padding: 10px;
  margin: 10px;
}
</html>JWT_SECRET=exalt_super_secret_key_123
