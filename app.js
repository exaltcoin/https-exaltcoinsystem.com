import EthereumProvider from "https://esm.sh/@walletconnect/ethereum-provider@2.23.8";

const CONTRACT_ADDRESS = "0xd9a9236ba831D5d059Fbb5f8238AaFcC3BBe0A78";
const BSC_CHAIN_ID_HEX = "0x38";
const WC_PROJECT_ID = "045db1fe4b635b1717c0b55c03472a29";

let provider, signer, contract, userAddress;

async function connectMetaMask() {
  if (!window.ethereum) {
    alert("Please install MetaMask or open in Trust Wallet browser.");
    return;
  }

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: BSC_CHAIN_ID_HEX }]
    });

    await window.ethereum.request({ method: "eth_requestAccounts" });
    await setupWallet(window.ethereum);
  } catch (err) {
    alert("MetaMask connection failed.");
    console.log(err);
  }
}
async function connectWalletConnect() {
  try {
    const wcProvider = await EthereumProvider.init({
      projectId: WC_PROJECT_ID,
      chains: [56],
      showQrModal: true,
      rpcMap: {
        56: "https://bsc-dataseed.binance.org/"
      },

      metadata: {
        name: "Exalt Coin",
        description: "Exalt Coin Mining System",
        url: "https://exaltcoinsystem.com",
        icons: ["https://exaltcoinsystem.com/logo.png"]
      }
    });

    await wcProvider.connect();
    await setupWallet(wcProvider);
  } catch (err) {
    alert("WalletConnect failed.");
    console.log(err);
  }
}

async function setupWallet(walletProvider) {
  provider = new ethers.providers.Web3Provider(walletProvider);
  signer = provider.getSigner();
  userAddress = await signer.getAddress();

  contract = new ethers.Contract(CONTRACT_ADDRESS, window.EXALT_ABI, signer);

  setText("heroConnectBtn", userAddress.slice(0, 6) + "..." + userAddress.slice(-4));
  setText("walletAddress", userAddress);

  createReferralLink();
  await loadMiningInfo();
}

async function loadMiningInfo() {
  if (!contract || !userAddress) return;

  try {
    const balance = await contract.balanceOf(userAddress);
    const miningReward = await contract.miningReward();
    const referralReward = await contract.referralReward();
    const paused = await contract.miningPaused();

    setText("tokenBalance", formatToken(balance));
    setText("miningReward", formatToken(miningReward));
    setText("referralReward", formatToken(referralReward));
    setText("miningStatus", paused ? "Paused" : "Active");
  } catch (err) {
    console.log(err);
  }
}

async function claimMining() {
  if (!contract) {
    alert("Connect wallet first.");
    return;
  }

  try {
    setText("claimStatus", "Confirm transaction in wallet...");

    const tx = await contract.claimMining(
      "0x0000000000000000000000000000000000000000"
    );

    setText("claimStatus", "Transaction submitted...");
    await tx.wait();

    setText("claimStatus", "Mining reward claimed successfully ✅");
    await loadMiningInfo();
  } catch (err) {
    setText("claimStatus", "Claim failed. Check cooldown, BNB gas, or reward wallet.");
    console.log(err);
  }
}

function createReferralLink() {
  const refInput = document.getElementById("refLink");
  if (!refInput || !userAddress) return;

  refInput.value = `${window.location.origin}${window.location.pathname}?ref=${userAddress}`;
}

function formatToken(value) {
  return Number(ethers.utils.formatUnits(value, 18)).toLocaleString(undefined, {
    maximumFractionDigits: 4
  });
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.innerText = value;
}document.getElementById("claimBtn").addEventListener("click", claimMining);

window.addEventListener("load", () => {
  document.getElementById("heroConnectBtn")?.addEventListener("click", connectMetaMask);
  document.getElementById("walletConnectBtn")?.addEventListener("click", connectWalletConnect);
  document.getElementById("claimBtn")?.addEventListener("click", claimMining);
});
