const EthereumProvider = window.EthereumProvider;
const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
}
const CONTRACT_ADDRESS = "0xd9a9236ba831D5d059Fbb5f8238AaFcC3BBe0A78";
const BSC_CHAIN_ID_HEX = "0x38";
const WC_PROJECT_ID = "045db1fe4b635b1717c0b55c03472a29";

let provider, signer, contract, userAddress;
async function connectMetaMask() {
  alert("Use Trust Wallet / QR button in Telegram");
}

async function connectWalletConnect() {
  try {
    const wcProvider = await EthereumProvider.init({
      projectId: "045db1fe4b635b1717c0b55c03472a29",
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

    provider = new ethers.BrowserProvider(wcProvider);
    signer = await provider.getSigner();
    userAddress = await signer.getAddress();

    setText("walletAddress", userAddress);
    alert("Wallet connected ✅");

  } catch (err) {
    console.log(err);
    alert("WalletConnect failed ❌");
  }
}

    await wcProvider.connect();

    provider = new ethers.BrowserProvider(wcProvider);
    signer = await provider.getSigner();
    userAddress = await signer.getAddress();

    setText("walletAddress", userAddress);

    contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

    alert("Wallet connected ✅");

    await loadMiningInfo();

  } catch (err) {
    console.log(err);
    alert("WalletConnect failed ❌");
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
    document.getElementById("claimStatus").innerText = "Processing...";

    const tx = await contract.claimMining();
    await tx.wait();

    document.getElementById("claimStatus").innerText = "Success ✅";

  } catch (err) {
    console.log(err);
    document.getElementById("claimStatus").innerText = "Failed ❌";
  }
}

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
}
window.addEventListener("load", () => {
  document.getElementById("heroConnectBtn")?.addEventListener("click", connectMetaMask);
  document.getElementById("walletConnectBtn")?.addEventListener("click", connectWalletConnect);
  document.getElementById("claimBtn")?.addEventListener("click", claimMining);
});
