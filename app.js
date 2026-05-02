const CONTRACT_ADDRESS = "0xd9a9236ba831D5d059Fbb5f8238AaFcC3BBe0A78";
const BSC_CHAIN_ID = "0x38";

let provider, signer, contract, userAddress;
async function connectWallet() {
  if (!window.ethereum) {
    alert("Please open this website inside MetaMask or Trust Wallet browser.");
    return;
  }

  try {
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
        throw switchError;
      }
    }

    await window.ethereum.request({ method: "eth_requestAccounts" });

    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();
    userAddress = await signer.getAddress();

    contract = new ethers.Contract(CONTRACT_ADDRESS, EXALT_ABI, signer);
   setText("heroConnectBtn", userAddress.slice(0, 6) + "..." + userAddress.slice(-4));
  
    setText("walletAddress", userAddress);

    createReferralLink();
    await loadMiningInfo();
  } catch (error) {
    console.log(error);
    alert("Wallet connection failed. Please check BNB Smart Chain and try again.");
  }
}

