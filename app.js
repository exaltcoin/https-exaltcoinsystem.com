const CONTRACT_ADDRESS = "0xd9a9236ba831D5d059Fbb5f8238AaFcC3BBe0A78";

let provider;
let signer;
let contract;

// ✅ Connect Wallet
async function connectWallet() {
  if (!window.ethereum) {
    alert("MetaMask install کرو");
    return;
  }

  provider = new ethers.providers.Web3Provider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  signer = provider.getSigner();

  contract = new ethers.Contract(CONTRACT_ADDRESS, EXALT_ABI, signer);

  const address = await signer.getAddress();
  document.getElementById("connectBtn").innerText =
    address.slice(0, 6) + "..." + address.slice(-4);
}

// ✅ Claim Mining
async function claimMining() {
  try {
    if (!contract) {
      alert("پہلے Wallet connect کرو");
      return;
    }

    const referrer =
      document.getElementById("referrerInput")?.value ||
      "0x0000000000000000000000000000000000000000";

    const tx = await contract.claimMining(referrer);

    alert("Transaction send ہو گئی... ⏳");
    await tx.wait();

    alert("Mining Reward Claimed ✅");
  } catch (err) {
    alert("Error: " + err.message);
  }
}

// 🔘 Buttons connect
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("connectBtn").onclick = connectWallet;

  const claimBtn = document.getElementById("claimBtn");
  if (claimBtn) claimBtn.onclick = claimMining;
});
