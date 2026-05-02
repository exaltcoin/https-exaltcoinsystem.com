const CONTRACT_ADDRESS = "0xd9a9236ba831D5d059Fbb5f8238AaFcC3BBe0A78";
const BSC_CHAIN_ID = "0x38";

let provider;
let signer;
let contract;
let userAddress;

async function connectWallet() {
  if (!window.ethereum) {
    alert("Open this website in MetaMask or Trust Wallet browser.");
    return;
  }

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: BSC_CHAIN_ID }]
    });
  } catch (error) {
    if (error.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: BSC_CHAIN_ID,
          chainName: "BNB Smart Chain",
          nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
          rpcUrls: ["https://bsc-dataseed.binance.org/"],
          blockExplorerUrls: ["https://bscscan.com"]
        }]
      });
    }
  }

  await window.ethereum.request({ method: "eth_requestAccounts" });

  provider = new ethers.providers.Web3Provider(window.ethereum);
  signer = provider.getSigner();
  userAddress = await signer.getAddress();

  contract = new ethers.Contract(CONTRACT_ADDRESS, EXALT_ABI, signer);

  setText("walletAddress", userAddress.slice(0, 6) + "..." + userAddress.slice(-4));
  createReferralLink();
  loadTokenInfo();
}

async function loadTokenInfo() {
  if (!contract || !userAddress) return;

  const balance = await contract.balanceOf(userAddress);
  const miningReward = await contract.miningReward();
  const referralReward = await contract.referralReward();

  setText("tokenBalance", formatToken(balance));
  setText("miningReward", formatToken(miningReward));
  setText("referralReward", formatToken(referralReward));
}

async function claimMining() {
  if (!contract) {
    alert("Connect wallet first.");
    return;
  }

  let referrer = document.getElementById("referrerInput").value.trim();
  if (!ethers.utils.isAddress(referrer)) {
    const params = new URLSearchParams(window.location.search);
    referrer = params.get("ref");
    if (!ethers.utils.isAddress(referrer)) {
      referrer = ethers.constants.AddressZero;
    }
  }

  try {
    setText("claimStatus", "Waiting for wallet confirmation...");
    const tx = await contract.claimMining(referrer);
    setText("claimStatus", "Transaction submitted...");
    await tx.wait();
    setText("claimStatus", "Mining reward claimed successfully.");
    loadTokenInfo();
  } catch (err) {
    console.error(err);
    setText("claimStatus", "Claim failed. Check cooldown, gas, or reward wallet.");
  }
}

function createReferralLink() {
  const input = document.getElementById("refLink");
  if (!input || !userAddress) return;
  input.value = `${window.location.origin}${window.location.pathname}?ref=${userAddress}`;
}

function copyReferralLink() {
  const input = document.getElementById("refLink");
  if (!input || !input.value) return alert("Connect wallet first.");
  input.select();
  document.execCommand("copy");
  alert("Referral link copied.");
}

function copyContract() {
  navigator.clipboard.writeText(CONTRACT_ADDRESS);
  alert("Contract copied.");
}

function formatToken(value) {
  return Number(ethers.utils.formatUnits(value, 18)).toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.innerText = value;
}

window.addEventListener("load", () => {
  const connectBtn = document.getElementById("connectBtn");
  const heroConnectBtn = document.getElementById("heroConnectBtn");
  const claimBtn = document.getElementById("claimBtn");
  const copyRefBtn = document.getElementById("copyRefBtn");
  const copyContractBtn = document.getElementById("copyContractBtn");

  if (connectBtn) connectBtn.onclick = connectWallet;
  if (heroConnectBtn) heroConnectBtn.onclick = connectWallet;
  if (claimBtn) claimBtn.onclick = claimMining;
  if (copyRefBtn) copyRefBtn.onclick = copyReferralLink;
  if (copyContractBtn) copyContractBtn.onclick = copyContract;
});
