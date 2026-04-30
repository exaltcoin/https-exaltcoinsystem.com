require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const PORT = process.env.PORT || 3000;

// temporary database
const users = {};
const MINING_RATE_PER_SECOND = 0.0001;
const MAX_SESSION_MS = 24 * 60 * 60 * 1000;

function getUser(wallet) {
  const key = wallet.toLowerCase();
  if (!users[key]) {
    users[key] = {
      wallet: key,
      balance: 0,
      miningStartedAt: null
    };
  }
  return users[key];
}

function calculateEarned(user) {
  if (!user.miningStartedAt) return 0;

  const now = Date.now();
  const elapsed = Math.min(now - user.miningStartedAt, MAX_SESSION_MS);
  return (elapsed / 1000) * MINING_RATE_PER_SECOND;
}

app.post("/api/start-mining", (req, res) => {
  const { wallet } = req.body;
  if (!wallet) return res.status(400).json({ error: "Wallet required" });

  const user = getUser(wallet);
  if (!user.miningStartedAt) {
    user.miningStartedAt = Date.now();
  }

  res.json({
    success: true,
    message: "Mining started",
    mining: true
  });
});

app.post("/api/status", (req, res) => {
  const { wallet } = req.body;
  if (!wallet) return res.status(400).json({ error: "Wallet required" });

  const user = getUser(wallet);
  const earned = calculateEarned(user);

  res.json({
    wallet: user.wallet,
    balance: Number((user.balance + earned).toFixed(6)),
    baseBalance: Number(user.balance.toFixed(6)),
    earned: Number(earned.toFixed(6)),
    mining: !!user.miningStartedAt,
    miningStartedAt: user.miningStartedAt
  });
});

app.post("/api/claim", (req, res) => {
  const { wallet } = req.body;
  if (!wallet) return res.status(400).json({ error: "Wallet required" });

  const user = getUser(wallet);
  const earned = calculateEarned(user);

  user.balance += earned;
  user.miningStartedAt = Date.now();

  res.json({
    success: true,
    balance: Number(user.balance.toFixed(6)),
    claimed: Number(earned.toFixed(6))
  });
});

app.post("/api/stop-mining", (req, res) => {
  const { wallet } = req.body;
  if (!wallet) return res.status(400).json({ error: "Wallet required" });

  const user = getUser(wallet);
  const earned = calculateEarned(user);

  user.balance += earned;
  user.miningStartedAt = null;

  res.json({
    success: true,
    balance: Number(user.balance.toFixed(6)),
    mining: false
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
