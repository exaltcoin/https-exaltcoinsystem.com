const CONTRACT_ADDRESS = "0xd9a9236ba831D5d059Fbb5f8238AaFcC3BBe0A78";
const BSC_CHAIN_ID = "0x38";

let provider, signer, contract, userAddress;

async function connectWallet() {
  if (!window.ethereum) {
    alert("MetaMask / Trust Wallet browser میں open کرو");
    return;
  }

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: BSC_CHAIN_ID }]
    });

    await window.ethereum.request({ method: "eth_requestAccounts" });

    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();
    userAddress = await signer.getAddress();

    contract = new ethers.Contract(CONTRACT_ADDRESS, EXALT_ABI, signer);

    setText("connectBtn", userAddress.slice(0, 6) + "..." + userAddress.slice(-4));
    setText("walletAddress", userAddress);

    createReferralLink();
    await loadMiningInfo();

  } catch (error) {
    alert("Wallet connect failed");
    console.log(error);
  }
}

async function loadMiningInfo() {
  try {
    const balance = await contract.balanceOf(userAddress);
    const miningReward = await contract.miningReward();
    const referralReward = await contract.referralReward();
    const paused = await contract.miningPaused();
    const lastClaim = await contract.lastClaim(userAddress);
    const cooldown = await contract.claimCooldown();

    setText("tokenBalance", formatToken(balance));
    setText("miningReward", formatToken(miningReward));
    setText("referralReward", formatToken(referralReward));
    setText("miningStatus", paused ? "Paused" : "Active");

    updateCooldown(Number(lastClaim), Number(cooldown));

  } catch (error) {
    console.log(error);
  }
}

async function claimMining() {
  if (!contract) {
    alert("پہلے wallet connect کرو");
    return;
  }

  let referrer = document.getElementById("referrerInput")?.value.trim();

  if (!ethers.utils.isAddress(referrer)) {
    const params = new URLSearchParams(window.location.search);
    referrer = params.get("ref");
  }

  if (!ethers.utils.isAddress(referrer)) {
    referrer = ethers.constants.AddressZero;
  }

  try {
    setText("claimStatus", "Wallet confirmation کا wait کریں...");
    const tx = await contract.claimMining(referrer);

    setText("claimStatus", "Transaction submitted...");
    await tx.wait();

    setText("claimStatus", "Mining reward claimed successfully ✅");
    await loadMiningInfo();

  } catch (error) {
    console.log(error);
    setText("claimStatus", "Claim failed ❌ Cooldown, gas, reward wallet یا paused status check کریں");
  }
}

function createReferralLink() {
  const refInput = document.getElementById("refLink");
  if (!refInput || !userAddress) return;

  refInput.value = `${window.location.origin}${window.location.pathname}?ref=${userAddress}`;
}

function copyReferralLink() {
  const refInput = document.getElementById("refLink");
  if (!refInput || !refInput.value) {
    alert("پہلے wallet connect کرو");
    return;
  }

  refInput.select();
  document.execCommand("copy");
  alert("Referral link copied ✅");
}

function copyContract() {
  navigator.clipboard.writeText(CONTRACT_ADDRESS);
  alert("Contract copied ✅");
}

function updateCooldown(lastClaim, cooldown) {
  const timer = document.getElementById("cooldownTimer");
  if (!timer) return;

  const now = Math.floor(Date.now() / 1000);
  const nextClaim = lastClaim + cooldown;

  if (lastClaim === 0 || now >= nextClaim) {
    timer.innerText = "Ready to claim ✅";
    return;
  }

  const remaining = nextClaim - now;
  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);

  timer.innerText = `${hours}h ${minutes}m remaining`;
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

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("connectBtn")?.addEventListener("click", connectWallet);
  document.getElementById("heroConnectBtn")?.addEventListener("click", connectWallet);
  document.getElementById("claimBtn")?.addEventListener("click", claimMining);
  document.getElementById("copyRefBtn")?.addEventListener("click", copyReferralLink);
  document.getElementById("copyContractBtn")?.addEventListener("click", copyContract);
});
