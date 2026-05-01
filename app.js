const TOKEN_ADDRESS = "0x341ba9CA7E7872F7E743F9e7eF1b48B9eE314EB8";

// یہاں اپنا verified mining contract address ڈالیں
const MINING_CONTRACT = "PASTE_YOUR_MINING_CONTRACT_ADDRESS_HERE";

const TOKEN_SYMBOL = "EXALT";
const TOKEN_DECIMALS = 18;

const TOKEN_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)"
];

// اگر آپ کے mining contract میں function names مختلف ہیں تو یہاں name بدل دیں
const MINING_ABI = [
  "function startMining()",
  "function claim()",
  "function claimRewards()",
  "function mine()"
];

let provider;
let signer;
let userAddress;

document.getElementById("tokenAddress").innerText = TOKEN_ADDRESS;
document.getElementById("buyLink").href =
  `https://pancakeswap.finance/swap?outputCurrency=${TOKEN_ADDRESS}`;
document.getElementById("chartLink").href =
  `https://dexscreener.com/bsc/${TOKEN_ADDRESS}`;

async function connectWallet() {
  try {
    if (!window.ethereum) {
      alert("Please open this site inside MetaMask or Trust Wallet browser.");
      return;
    }

    provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    signer = provider.getSigner();
    userAddress = await signer.getAddress();

    document.getElementById("wallet").innerText =
      userAddress.slice(0, 6) + "..." + userAddress.slice(-4);

    await loadBalance();
  } catch (err) {
    showStatus(err.message);
  }
}

async function loadBalance() {
  const token = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, provider);
  const balance = await token.balanceOf(userAddress);
  document.getElementById("balance").innerText =
    ethers.utils.formatUnits(balance, TOKEN_DECIMALS);
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
  } catch (err) {
    showStatus(err.message);
  }
}

async function startMining() {
  await callMining(["startMining", "mine"]);
}

async function claimRewards() {
  await callMining(["claimRewards", "claim"]);
}

async function callMining(methods) {
  try {
    if (!signer) await connectWallet();

    if (MINING_CONTRACT.includes("PASTE")) {
      alert("Mining contract address app.js میں paste کریں۔");
      return;
    }

    const contract = new ethers.Contract(MINING_CONTRACT, MINING_ABI, signer);

    for (const method of methods) {
      if (contract[method]) {
        showStatus("Transaction sending...");
        const tx = await contract[method]();
        await tx.wait();
        showStatus("Transaction successful!");
        await loadBalance();
        return;
      }
    }

    showStatus("Mining function name contract ABI میں match نہیں کر رہا۔");
  } catch (err) {
    showStatus(err.reason || err.message);
  }
}

function showStatus(msg) {
  document.getElementById("status").innerText = msg;
}
