const CONTRACT_ADDRESS = "0xd9a9236ba831D5d059Fbb5f8238AaFcC3BBe0A78";
const BSC_CHAIN_ID = "0x38";

let provider;
let signer;
let contract;
let userAddress;

async function connectWallet() {
  if (!window.ethereum) {
    alert("Please install MetaMask or Trust Wallet browser.");
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
    }
  }

  await window.ethereum.request({ method: "eth_requestAccounts" });

  provider = new ethers.providers.Web3Provider(window.ethereum);
  signer = provider.getSigner();
  userAddress = await signer.getAddress();

  contract = new ethers.Contract(CONTRACT_ADDRESS, EXALT_ABI, signer);

  document.getElementById("walletAddress").innerText =
    userAddress.slice(0, 6) + "..." + userAddress.slice(-4);

  createReferralLink();
  await loadTokenInfo();
}

async function loadTokenInfo() {
  try {
    const name = await contract.name();
    const symbol = await contract.symbol();
    const balance = await contract.balanceOf(userAddress);

    document.getElementById("tokenName").innerText = name;
    document.getElementById("tokenSymbol").innerText = symbol;
    document.getElementById("tokenBalance").innerText =
      Number(ethers.utils.formatUnits(balance, 18)).toLocaleString();
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
    document.getElementById("claimStatus").innerText = "Transaction pending...";
    const tx = await contract.claimMining(referrer);
    await tx.wait();

    document.getElementById("claimStatus").innerText = "Mining reward claimed successfully!";
    await loadTokenInfo();
  } catch (error) {
    console.error(error);
    document.getElementById("claimStatus").innerText =
      "Claim failed. Wait 24 hours or check reward wallet.";
  }
}

function createReferralLink() {
  const link = `${window.location.origin}${window.location.pathname}?ref=${userAddress}`;
  document.getElementById("refLink").value = link;
}

function copyReferralLink() {
  const input = document.getElementById("refLink");
  input.select();
  document.execCommand("copy");
  alert("Referral link copied!");
}

document.getElementById("connectBtn").addEventListener("click", connectWallet);
document.getElementById("claimBtn").addEventListener("click", claimMining);
document.getElementById("copyRefBtn").addEventListener("click", copyReferralLink);
