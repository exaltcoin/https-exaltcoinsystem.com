const MINING_REWARD_CONTRACT = "0x08002d47650086196Eb966b33028b951fff20ADB";

const MINING_REWARD_ABI = [
  "function claim() public",
  "function claimReward() public",
  "function getPendingReward(address user) public view returns (uint256)",
  "function pendingReward(address user) public view returns (uint256)"
];

let currentUser = null;
let connectedWallet = null;
let miningInterval = null;
let balance = Number(localStorage.getItem("exalt_balance")) || 0;
let power = 1;

const balanceEl = document.getElementById("balance");
const powerEl = document.getElementById("power");
const miningStatusEl = document.getElementById("miningStatus");

function updateDashboard() {
  balanceEl.textContent = balance.toFixed(4);
  powerEl.textContent = power.toFixed(2);
  localStorage.setItem("exalt_balance", balance.toString());
}

function getNetworkName(chainId) {
  const networks = {
    "0x1": "Ethereum Mainnet",
    "0x38": "BNB Smart Chain",
    "0x89": "Polygon",
    "0xaa36a7": "Sepolia Testnet"
  };
  return networks[chainId] || "Unknown Network: " + chainId;
}

async function switchToBSC() {
  const chainId = await window.ethereum.request({ method: "eth_chainId" });

  if (chainId === "0x38") return;

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0x38" }]
    });
  } catch (error) {
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

updateDashboard();

document.getElementById("registerBtn").addEventListener("click", () => {
  const username = document.getElementById("username").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!username || !email || !password) {
    alert("Please fill all fields");
    return;
  }

  const user = { username, email, password };
  localStorage.setItem("exalt_user", JSON.stringify(user));
  currentUser = user;

  document.getElementById("authStatus").textContent = "Registered: " + username;
  alert("Registration successful");
});

document.getElementById("loginBtn").addEventListener("click", () => {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  const savedUser = JSON.parse(localStorage.getItem("exalt_user"));

  if (!savedUser) {
    alert("No account found. Please register first.");
    return;
  }

  if (savedUser.username === username && savedUser.password === password) {
    currentUser = savedUser;
    document.getElementById("authStatus").textContent = "Logged in: " + savedUser.username;
    alert("Login successful");
  } else {
    alert("Wrong username or password");
  }
});

document.getElementById("connectWalletBtn").addEventListener("click", async () => {
  if (!window.ethereum) {
    alert("Please open this website inside Trust Wallet or MetaMask browser.");
    return;
  }

  try {
    await switchToBSC();

    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts"
    });

    const finalChainId = await window.ethereum.request({
      method: "eth_chainId"
    });

    connectedWallet = accounts[0];

    document.getElementById("walletStatus").textContent = "Connected";
    document.getElementById("walletAddress").textContent = connectedWallet;
    document.getElementById("networkName").textContent = getNetworkName(finalChainId);

    alert("Wallet connected successfully on BNB Smart Chain");
  } catch (error) {
    console.error(error);
    alert("Wallet connection failed or cancelled");
  }
});

document.getElementById("startMiningBtn").addEventListener("click", () => {
  if (!currentUser) {
    alert("Please login first");
    return;
  }

  if (!connectedWallet) {
    alert("Please connect wallet first");
    return;
  }

  if (miningInterval) {
    alert("Mining already running");
    return;
  }

  miningStatusEl.textContent = "Running";

  miningInterval = setInterval(() => {
    balance += 0.001 * power;
    updateDashboard();
  }, 1000);

  alert("Mining started");
});

document.getElementById("stopMiningBtn").addEventListener("click", () => {
  clearInterval(miningInterval);
  miningInterval = null;
  miningStatusEl.textContent = "Stopped";
  alert("Mining stopped");
});

document.getElementById("claimRewardBtn").addEventListener("click", async () => {
  if (!currentUser) {
    alert("Please login first");
    return;
  }

  if (!window.ethereum) {
    alert("Please open this website inside Trust Wallet or MetaMask browser.");
    return;
  }

  try {
    await switchToBSC();

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    const network = await provider.getNetwork();

    if (network.chainId !== 56n) {
      alert("Please switch to BNB Smart Chain first.");
      return;
    }

    const contract = new ethers.Contract(
      MINING_REWARD_CONTRACT,
      MINING_REWARD_ABI,
      signer
    );

    let tx;

    try {
      tx = await contract.claim();
    } catch (firstError) {
      console.log("claim() failed, trying claimReward()", firstError);
      tx = await contract.claimReward();
    }

    alert("Claim transaction sent. Please wait.");
    await tx.wait();

    balance = 0;
    updateDashboard();

    alert("Exalt reward claimed successfully!");
  } catch (error) {
    console.error(error);
    alert("Claim failed. Check BNB gas fee, contract address, or claim function.");
  }
});

if (window.ethereum) {
  window.ethereum.on("accountsChanged", () => {
    location.reload();
  });

  window.ethereum.on("chainChanged", () => {
    location.reload();
  });
}
