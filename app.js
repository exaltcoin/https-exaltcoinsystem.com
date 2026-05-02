const CONTRACT_ADDRESS = "0xd9a9236ba831D5d059Fbb5f8238AaFcC3BBe0A78";
const BSC_CHAIN_ID = "0x38";

let provider;
let signer;
let contract;
let userAddress;

async function connectWallet() {
  if (!window.ethereum) {
    alert("Please open this website in MetaMask or Trust Wallet browser.");
    return;
  }

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: BSC_CHAIN_ID }]
    });
  } catch (switchError) {
    if (switchError.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: BSC_CHAIN_ID,
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
    } else {
      console.error(switchError);
    }
  }

  await window.ethereum.request({ method: "eth_requestAccounts" });

  provider = new ethers.providers.Web3Provider(window.ethereum);
  signer = provider.getSigner();
  userAddress = await signer.getAddress();

  contract = new ethers.Contract(CONTRACT_ADDRESS, EXALT_ABI, signer);

  const shortAddress = userAddress.slice(0, 6) + "..." + userAddress.slice(-4);
  setText("walletAddress", shortAddress);

  createReferralLink();
  await loadTokenInfo();
}

async function loadTokenInfo() {
  if (!contract || !userAddress) return;

  try {
    const balance = await contract.balanceOf(userAddress);
    const miningReward = await contract.miningReward();
    const referralReward = await contract.referralReward();

    setText("tokenBalance", formatToken(balance));
    setText("miningReward", formatToken(miningReward));
    setText("referralReward", formatToken(referralReward));
  } catch (error) {
    console.error(error);
  }
}

async function claimMining() {
  if (!contract) {
    alert("Connect wallet first.");
    return;
  }

  let referrer = document.getElementById("referrerInput").value.trim();

  if (!ethers.utils.isAddress(referrer)) {
    const urlParams = new URLSearchParams(window.location.search);
    referrer = urlParams.get("ref");

    if (!ethers.utils.isAddress(referrer)) {
      referrer = ethers.constants.AddressZero;
    }
  }

  try {
    setText("claimStatus", "Waiting for wallet confirmation...");
    const tx = await contract.claimMining(referrer);

    setText("claimStatus", "Transaction submitted. Waiting confirmation...");
    await tx.wait();

    setText("claimStatus", "Mining reward claimed successfully.");
    await loadTokenInfo();
  } catch (error) {
    console.error(error);

    let msg = "Claim failed. Please check cooldown, gas fee, or reward wallet.";
    if (error && error.message && error.message.includes("Wait")) {
      msg = "You already claimed. Please wait 24 hours.";
    }
    if (error && error.message && error.message.includes("Mining paused")) {
      msg = "Mining is currently paused.";
    }
    if (error && error.message && error.message.includes("Reward wallet empty")) {
      msg = "Reward wallet is empty.";
    }

    setText("claimStatus", msg);
  }
}

function createReferralLink() {
  if (!userAddress) return;

  const link = `${window.location.origin}${window.location.pathname}?ref=${userAddress}`;
  const input = document.getElementById("refLink");

  if (input) input.value = link;
}

function copyReferralLink() {
  const input = document.getElementById("refLink");
  if (!input || !input.value) {
    alert("Connect wallet first.");
    return;
  }

  input.select();
  document.execCommand("copy");
  alert("Referral link copied.");
}

function copyContract() {
  navigator.clipboard.writeText(CONTRACT_ADDRESS);
  alert("Contract address copied.");
}

function formatToken(value) {
  return Number(ethers.utils.formatUnits(value, 18)).toLocaleString(undefined, {
    maximumFractionDigits: 4
  });
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.innerText = value;
}

function setupEvents() {
  const connectBtn = document.getElementById("connectBtn");
  const heroConnectBtn = document.getElementById("heroConnectBtn");
  const claimBtn = document.getElementById("claimBtn");
  const copyRefBtn = document.getElementById("copyRefBtn");
  const copyContractBtn = document.getElementById("copyContractBtn");

  if (connectBtn) connectBtn.addEventListener("click", connectWallet);
  if (heroConnectBtn) heroConnectBtn.addEventListener("click", connectWallet);
  if (claimBtn) claimBtn.addEventListener("click", claimMining);
  if (copyRefBtn) copyRefBtn.addEventListener("click", copyReferralLink);
  if (copyContractBtn) copyContractBtn.addEventListener("click", copyContract);
}

window.addEventListener("load", setupEvents);

if (window.ethereum) {
  window.ethereum.on("accountsChanged", () => window.location.reload());
  window.ethereum.on("chainChanged", () => window.location.reload());
}
