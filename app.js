import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.13.2/+esm";
import EthereumProvider from "https://cdn.jsdelivr.net/npm/@walletconnect/ethereum-provider@2.23.9/+esm";

const PROJECT_ID = "045db1fe4b635b1717c0b55c03472a29";
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

let rawProvider;
let provider;
let signer;
let wallet;
let contract;
let wcProvider;

const walletStatus = document.getElementById("walletStatus");
const walletAddress = document.getElementById("walletAddress");
const refLink = document.getElementById("refLink");
const message = document.getElementById("message");

async function setupProvider(selectedProvider) {
  rawProvider = selectedProvider;
  provider = new ethers.BrowserProvider(rawProvider);
  signer = await provider.getSigner();
  wallet = await signer.getAddress();
  contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

  walletStatus.innerText = "Wallet Connected ✅";
  walletAddress.innerText = wallet;
  refLink.value = window.location.origin + window.location.pathname + "?ref=" + wallet;
  message.innerText = "Wallet connected successfully.";

  await loadStats();
  await loadMyReferrals();
}

async function switchToBSCInjected() {
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
        nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
        rpcUrls: ["https://bsc-dataseed.binance.org/"],
        blockExplorerUrls: ["https://bscscan.com"]
      }]
    });
  }
}

async function connectBrowserWallet() {
  if (!window.ethereum) {
    alert("No browser wallet found. Use WalletConnect QR button.");
    return;
  }

  await switchToBSCInjected();
  await window.ethereum.request({ method: "eth_requestAccounts" });
  await setupProvider(window.ethereum);
}

async function connectWalletConnect() {
  wcProvider = await EthereumProvider.init({
    projectId: PROJECT_ID,
    chains: [56],
    optionalChains: [56],
    showQrModal: true,
    metadata: {
      name: "Exalt Coin",
      description: "Exalt Coin Mining Referral Reward System",
      url: "https://exaltcoinsystem.com",
      icons: ["https://exaltcoinsystem.com/favicon.png"]
    }
  });

  await wcProvider.connect();
  await setupProvider(wcProvider);
}

async function claimReward() {
  if (!wallet || !contract) {
    alert("Connect wallet first.");
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
    message.innerText = "Sending claim transaction...";
    const tx = await contract.claim(referrer, country);

    alert("Transaction sent. Please wait.");
    await tx.wait();

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

  const count = await contract.referralCount(wallet);
  const earned = await contract.totalReferralEarned(wallet);
  const claimed = await contract.totalClaimed(wallet);
  const pool = await contract.getContractBalance();

  document.getElementById("refCount").innerText = count.toString();
  document.getElementById("refEarned").innerText = ethers.formatEther(earned) + " EXALT";
  document.getElementById("totalClaimed").innerText = ethers.formatEther(claimed) + " EXALT";
  document.getElementById("poolBalance").innerText = ethers.formatEther(pool) + " EXALT";
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
    console.error(err);
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

async function disconnectWallet() {
  try {
    if (wcProvider) await wcProvider.disconnect();
  } catch {}

  rawProvider = null;
  provider = null;
  signer = null;
  wallet = null;
  contract = null;
  wcProvider = null;

  walletStatus.innerText = "Wallet not connected";
  walletAddress.innerText = "—";
  refLink.value = "";
  message.innerText = "Wallet disconnected.";
}

document.getElementById("connectBrowserBtn").onclick = connectBrowserWallet;
document.getElementById("connectWcBtn").onclick = connectWalletConnect;
document.getElementById("claimBtn").onclick = claimReward;
document.getElementById("copyBtn").onclick = copyReferral;
document.getElementById("disconnectBtn").onclick = disconnectWallet;

if (window.ethereum) {
  window.ethereum.on("accountsChanged", () => location.reload());
  window.ethereum.on("chainChanged", () => location.reload());
}
