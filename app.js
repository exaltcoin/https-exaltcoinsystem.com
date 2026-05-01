import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.13.2/+esm";

const CONTRACT_ADDRESS = "0xB6cDe2B7E249B83a369e07c58a3084A7861C7897";

const ABI = [
  "function claim(address referrer, string country) public",
  "function referralCount(address user) public view returns (uint256)",
  "function totalReferralEarned(address user) public view returns (uint256)",
  "function totalClaimed(address user) public view returns (uint256)",
  "function getContractBalance() public view returns (uint256)",
  "event UserJoined(address indexed user, address indexed referrer, string country)"
];

const ZERO = "0x0000000000000000000000000000000000000000";

let provider;
let signer;
let wallet;
let contract;

let mining = false;
let miningInterval;
let miningBalance = Number(localStorage.getItem("exalt_mining_balance")) || 0;
let miningPower = 1;
let miningRate = 0.002;

const walletStatus = document.getElementById("walletStatus");
const walletAddress = document.getElementById("walletAddress");
const refLink = document.getElementById("refLink");
const message = document.getElementById("message");
const miningBalanceEl = document.getElementById("miningBalance");
const miningStatusEl = document.getElementById("miningStatus");
const miningPowerEl = document.getElementById("miningPower");

function isMobile() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function shortAddress(address) {
  return address.slice(0, 6) + "..." + address.slice(-4);
}

function updateMiningUI() {
  miningBalanceEl.innerText = miningBalance.toFixed(4);
  miningPowerEl.innerText = miningPower.toFixed(2) + "x";
  localStorage.setItem("exalt_mining_balance", miningBalance.toString());
}

async function switchToBSC() {
  if (!window.ethereum) return;

  const chainId = await window.ethereum.request({ method: "eth_chainId" });

  if (chainId === "0x38") return;

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0x38" }]
    });
  } catch {
    await window.ethereum.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId: "0x38",
        chainName: "BNB Smart Chain",
        nativeCurrency: {
          name: "BNB",
          symbol: "BNB",
          decimals: 18
        },
        rpcUrls: ["https://bsc-dataseed.binance.org/"],
        blockExplorerUrls: ["https://bscscan.com"]
      }]
    });
  }
}

async function connectInsideWalletBrowser() {
  await switchToBSC();

  provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);

  signer = await provider.getSigner();
  wallet = await signer.getAddress();

  contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

  walletStatus.innerText = "Wallet Connected ✅";
  walletAddress.innerText = shortAddress(wallet);
  refLink.value = window.location.origin + window.location.pathname + "?ref=" + wallet;
  message.innerText = "Wallet connected successfully.";

  await loadStats();
  await loadMyReferrals();
}

function openMobileWallet() {
  const siteUrl = "https://exaltcoinsystem.com";

  window.location.href =
    "https://link.trustwallet.com/open_url?url=" +
    encodeURIComponent(siteUrl);

  setTimeout(() => {
    window.location.href =
      "https://metamask.app.link/dapp/exaltcoinsystem.com";
  }, 1800);
}

async function openWalletConnect() {
  try {
    if (window.ethereum) {
      await connectInsideWalletBrowser();
      return;
    }

    if (isMobile()) {
      openMobileWallet();
      return;
    }

    alert("Please install MetaMask extension on PC, or open this website in Trust Wallet / MetaMask mobile browser.");
  } catch (error) {
    console.error(error);
    alert("Wallet connection failed or cancelled.");
  }
}

function startMining() {
  if (!wallet) {
    alert("Connect wallet first.");
    return;
  }

  if (mining) {
    alert("Mining already running.");
    return;
  }

  mining = true;
  miningStatusEl.innerText = "ON";
  message.innerText = "Mining started.";

  miningInterval = setInterval(() => {
    miningBalance += miningRate * miningPower;
    updateMiningUI();
  }, 1000);
}

function stopMining() {
  mining = false;
  clearInterval(miningInterval);
  miningStatusEl.innerText = "OFF";
  message.innerText = "Mining stopped.";
}

async function claimReward() {
  if (!wallet || !contract) {
    alert("Connect wallet first.");
    return;
  }

  if (miningBalance <= 0) {
    alert("Start mining first.");
    return;
  }

  const country = document.getElementById("country").value;

  if (!country) {
    alert("Please select your country.");
    return;
  }

  const params = new URLSearchParams(window.location.search);
  let referrer = params.get("ref") || ZERO;

  if (referrer.toLowerCase() === wallet.toLowerCase()) {
    referrer = ZERO;
  }

  try {
    stopMining();
    message.innerText = "Sending claim transaction...";

    const tx = await contract.claim(referrer, country);

    alert("Transaction sent. Please wait.");
    await tx.wait();

    miningBalance = 0;
    updateMiningUI();

    message.innerText = "Reward claimed successfully ✅";
    alert("EXALT reward claimed successfully!");

    await loadStats();
    await loadMyReferrals();
  } catch (err) {
    console.error(err);
    message.innerText = "Claim failed. Check cooldown, BNB gas, or reward pool.";
    alert("Claim failed. Check cooldown, BNB gas, or reward pool.");
  }
}

async function loadStats() {
  if (!contract || !wallet) return;

  try {
    const count = await contract.referralCount(wallet);
    const earned = await contract.totalReferralEarned(wallet);
    const claimed = await contract.totalClaimed(wallet);
    const pool = await contract.getContractBalance();

    document.getElementById("refCount").innerText = count.toString();
    document.getElementById("refEarned").innerText = ethers.formatEther(earned) + " EXALT";
    document.getElementById("totalClaimed").innerText = ethers.formatEther(claimed) + " EXALT";
    document.getElementById("poolBalance").innerText = ethers.formatEther(pool) + " EXALT";
  } catch (err) {
    console.error("Stats error:", err);
  }
}

async function loadMyReferrals() {
  const list = document.getElementById("referralList");

  if (!contract || !wallet) {
    list.innerHTML = "Connect wallet to view referrals.";
    return;
  }

  list.innerHTML = "Loading referrals...";

  try {
    const filter = contract.filters.UserJoined(null, wallet);
    const events = await contract.queryFilter(filter, 0, "latest");

    if (events.length === 0) {
      list.innerHTML = "No referrals yet.";
      return;
    }

    list.innerHTML = "";

    events.reverse().forEach((event) => {
      const joinedWallet = event.args.user;
      const country = event.args.country;

      const div = document.createElement("div");
      div.className = "ref-card";
      div.innerHTML = `
        <b>Joined Wallet:</b><br>${joinedWallet}<br><br>
        <b>Country:</b> ${country}
      `;

      list.appendChild(div);
    });
  } catch (err) {
    console.error("Referral load error:", err);
    list.innerHTML = "Could not load referrals.";
  }
}

function copyReferral() {
  if (!refLink.value) {
    alert("Connect wallet first.");
    return;
  }

  navigator.clipboard.writeText(refLink.value);
  alert("Referral link copied.");
}

document.getElementById("connectBtn").onclick = openWalletConnect;
document.getElementById("startMiningBtn").onclick = startMining;
document.getElementById("stopMiningBtn").onclick = stopMining;
document.getElementById("claimBtn").onclick = claimReward;
document.getElementById("copyBtn").onclick = copyReferral;

updateMiningUI();

window.addEventListener("load", async () => {
  if (window.ethereum) {
    try {
      const accounts = await window.ethereum.request({
        method: "eth_accounts"
      });

      if (accounts.length > 0) {
        await connectInsideWalletBrowser();
      }
    } catch (error) {
      console.error(error);
    }
  }
});

if (window.ethereum) {
  window.ethereum.on("accountsChanged", () => location.reload());
  window.ethereum.on("chainChanged", () => location.reload());
}
