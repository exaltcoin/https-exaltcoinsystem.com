const TOKEN_ADDRESS = "0x341ba9CA7E7872F7E743F9e7eF1b48B9eE314EB8";

// اپنا mining contract address یہاں ڈالیں
const MINING_CONTRACT = "PASTE_MINING_CONTRACT_ADDRESS_HERE";

const TOKEN_SYMBOL = "EXALT";
const TOKEN_DECIMALS = 18;

const TOKEN_ABI = [
  "function balanceOf(address account) view returns (uint256)"
];

const MINING_ABI = [
  "function startMining()",
  "function mine()",
  "function claim()",
  "function claimRewards()"
];

let provider;
let signer;
let userAddress;

const countries = [
  "Afghanistan","Albania","Algeria","Argentina","Australia","Austria","Bahrain",
  "Bangladesh","Belgium","Brazil","Canada","China","Denmark","Egypt","France",
  "Germany","India","Indonesia","Iran","Iraq","Italy","Japan","Kuwait","Malaysia",
  "Nepal","Netherlands","Nigeria","Oman","Pakistan","Philippines","Qatar",
  "Saudi Arabia","Singapore","South Africa","Spain","Sri Lanka","Turkey",
  "United Arab Emirates","United Kingdom","United States","Yemen"
];

window.onload = () => {
  loadCountries();
  detectReferrer();
  renderUsers();
};

function loadCountries() {
  const select = document.getElementById("country");
  select.innerHTML = `<option value="">Select Country</option>`;
  countries.forEach(c => {
    select.innerHTML += `<option value="${c}">${c}</option>`;
  });
}

function detectReferrer() {
  const url = new URL(window.location.href);
  const ref = url.searchParams.get("ref");

  if (ref) {
    localStorage.setItem("exalt_referrer", ref);
    document.getElementById("referrer").innerText = ref;
  } else {
    const saved = localStorage.getItem("exalt_referrer");
    document.getElementById("referrer").innerText = saved || "No referrer";
  }
}

async function connectWallet() {
  try {
    if (!window.ethereum) {
      alert("Trust Wallet / MetaMask browser میں website کھولیں۔");
      return;
    }

    provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    signer = provider.getSigner();
    userAddress = await signer.getAddress();

    const short = userAddress.slice(0, 6) + "..." + userAddress.slice(-4);

    document.getElementById("wallet").innerText = "Connected: " + short;
    document.getElementById("userWallet").innerText = userAddress;
    document.getElementById("userId").innerText = makeUserId(userAddress);

    const refUrl = `${window.location.origin}${window.location.pathname}?ref=${userAddress}`;
    document.getElementById("refLink").value = refUrl;

    await loadBalance();
  } catch (error) {
    showStatus(error.message);
  }
}

function makeUserId(wallet) {
  return "EXALT-" + wallet.slice(2, 8).toUpperCase();
}

async function loadBalance() {
  try {
    const token = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, provider);
    const balance = await token.balanceOf(userAddress);
    document.getElementById("balance").innerText =
      ethers.utils.formatUnits(balance, TOKEN_DECIMALS) + " EXALT";
  } catch {
    showStatus("Balance load error");
  }
}

function saveProfile() {
  if (!userAddress) {
    alert("First connect wallet");
    return;
  }

  const country = document.getElementById("country").value;
  if (!country) {
    alert("Select country");
    return;
  }

  const users = JSON.parse(localStorage.getItem("exalt_users") || "[]");
  const referrer = localStorage.getItem("exalt_referrer") || "No referrer";

  const user = {
    id: makeUserId(userAddress),
    wallet: userAddress,
    country,
    referrer
  };

  const exists = users.findIndex(u => u.wallet.toLowerCase() === userAddress.toLowerCase());

  if (exists >= 0) {
    users[exists] = user;
  } else {
    users.push(user);
  }

  localStorage.setItem("exalt_users", JSON.stringify(users));
  showStatus("Profile saved successfully");
  renderUsers();
}

function renderUsers() {
  const users = JSON.parse(localStorage.getItem("exalt_users") || "[]");
  const table = document.getElementById("usersTable");
  table.innerHTML = "";

  users.forEach(u => {
    table.innerHTML += `
      <tr>
        <td>${u.id}</td>
        <td>${u.wallet}</td>
        <td>${u.country}</td>
        <td>${u.referrer}</td>
      </tr>
    `;
  });
}

function copyReferral() {
  const input = document.getElementById("refLink");
  input.select();
  input.setSelectionRange(0, 99999);
  navigator.clipboard.writeText(input.value);
  alert("Referral link copied");
}

async function addToken() {
  try {
    await window.ethereum.request({
      method: "wallet_watchAsset",
      params: {
        type: "ERC20",
        options: {
          address: TOKEN_ADDRESS,
          symbol: TOKEN_SYMBOL,
          decimals: TOKEN_DECIMALS
        }
      }
    });
  } catch (error) {
    showStatus(error.message);
  }
}

async function startMining() {
  await callMiningFunction(["startMining", "mine"]);
}

async function claimRewards() {
  await callMiningFunction(["claimRewards", "claim"]);
}

async function callMiningFunction(functionNames) {
  try {
    if (!signer) await connectWallet();

    if (MINING_CONTRACT.includes("PASTE")) {
      alert("app.js میں mining contract address ڈالیں۔");
      return;
    }

    const mining = new ethers.Contract(MINING_CONTRACT, MINING_ABI, signer);

    for (let name of functionNames) {
      if (mining[name]) {
        showStatus("Transaction sending...");
        const tx = await mining[name]();
        await tx.wait();
        showStatus("Transaction successful!");
        await loadBalance();
        return;
      }
    }

    showStatus("Mining function name match نہیں کر رہا۔");
  } catch (error) {
    showStatus(error.reason || error.message);
  }
}

function showStatus(message) {
  document.getElementById("status").innerText = message;
}
