const MINING_REWARD_CONTRACT = "0x08002d47650086196Eb966b33028b951fff20ADB";

const MINING_REWARD_ABI = [
  "function claim() public",
  "function claimReward() public"
];

let connectedWallet = null;
let balance = Number(localStorage.getItem("exalt_balance")) || 0;

const balanceEl = document.getElementById("balance");
const walletStatusEl = document.getElementById("walletStatus");
const walletAddressEl = document.getElementById("walletAddress");
const miningStatusEl = document.getElementById("miningStatus");
const messageEl = document.getElementById("message");

function updateBalance() {
  balanceEl.textContent = balance.toFixed(6);
  localStorage.setItem("exalt_balance", balance.toString());
}

function shortAddress(address) {
  return address.slice(0, 6) + "..." + address.slice(-4);
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

document.getElementById("connectWalletBtn").addEventListener("click", async () => {
  if (!window.ethereum) {
    messageEl.textContent = "Open this website inside Trust Wallet or MetaMask browser.";
    alert("Open this website inside Trust Wallet or MetaMask browser.");
    return;
  }

  try {
    await switchToBSC();

    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts"
    });

    connectedWallet = accounts[0];

    walletStatusEl.textContent = "Wallet connected";
    walletAddressEl.textContent = shortAddress(connectedWallet);
    miningStatusEl.textContent = "ON";
    messageEl.textContent = "Wallet connected successfully on BNB Smart Chain.";

    balance += 0.001;
    updateBalance();
  } catch (error) {
    console.error(error);
    messageEl.textContent = "Wallet connection failed.";
    alert("Wallet connection failed or cancelled.");
  }
});

document.getElementById("claimRewardBtn").addEventListener("click", async () => {
  if (!window.ethereum) {
    alert("Open this website inside Trust Wallet or MetaMask browser.");
    return;
  }

  try {
    await switchToBSC();

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    const network = await provider.getNetwork();

    if (network.chainId !== 56n) {
      alert("Please switch to BNB Smart Chain.");
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
    } catch (error) {
      tx = await contract.claimReward();
    }

    messageEl.textContent = "Claim transaction sent. Waiting for confirmation...";
    await tx.wait();

    balance = 0;
    updateBalance();

    messageEl.textContent = "Reward claimed successfully.";
    alert("Reward claimed successfully.");
  } catch (error) {
    console.error(error);
    messageEl.textContent = "Claim failed. Check gas fee, contract, or reward availability.";
    alert("Claim failed. Check BNB gas fee or contract reward balance.");
  }
});

updateBalance();
