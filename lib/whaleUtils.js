
// lib/whaleUtils.js
import fetch from "node-fetch";

/** --- Known Exchange Wallets --- **/
export const knownExchanges = {
  "0x742d35Cc6634C0532925a3b844Bc454e4438f44e": "Binance 8",
  "0x564286362092D8e7936f0549571a803B203aAceD": "Binance 14",
  "0x28C6c06298d514Db089934071355E5743bf21d60": "Binance 14 (Main)",
  "0x4E9ce36E442e55EcD9025B9a6E0D88485d628A67": "Binance 7",
  "0xDC76CD25977E0a5Ae17155770273aD58648900D3": "Kraken",
  "0x50D1c9771902476076eCFc8B2A83Ad6b9355a4c9": "FTX Legacy",
  "0x66f820a414680B5bcda5eECA5dea238543F42054": "OKX",
  "0x6A39EfB1A010F87B050Db1B6E7604982fC5e8A54": "Coinbase"
};

/** --- Fetch live ETH→USD price --- **/
export async function getEthPriceUSD() {
  const res = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd"
  );
  const data = await res.json();
  return data.ethereum.usd;
}

/** --- Fetch label from Etherscan if available --- **/
export async function fetchEtherscanLabel(address, apiKey) {
  try {
    const url = `https://api.etherscan.io/v2/api?chainid=1&module=account&action=addresstag&address=${address}&apikey=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status === "1" && data.result?.tag) {
      return data.result.tag;
    }
  } catch (_) {}
  return null;
}

/** --- Resolve address label (static first, then Etherscan fallback) --- **/
export async function resolveAddressLabel(address, apiKey) {
  const addr = address?.toLowerCase();
  if (!addr) return "Unknown";
  const staticLabel = knownExchanges[addr] || knownExchanges[address];
  if (staticLabel) return staticLabel;

  // Optional live lookup
  const liveLabel = await fetchEtherscanLabel(address, apiKey);
  return liveLabel || address;
}

/** --- Determine transaction direction --- **/
export function getDirection(fromLabel, toLabel) {
  const isFromExchange = Object.values(knownExchanges).includes(fromLabel);
  const isToExchange = Object.values(knownExchanges).includes(toLabel);

  if (isFromExchange && !isToExchange) return "Exchange → Private";
  if (!isFromExchange && isToExchange) return "Private → Exchange";
  if (isFromExchange && isToExchange) return "Exchange → Exchange";
  return "Unknown";
}

/** --- Classify transaction size --- **/
export function classifyTransaction(valueEth, avgEth = 100) {
  if (valueEth >= avgEth * 3) return "Abnormally High";
  if (valueEth >= avgEth * 2) return "High";
  if (valueEth >= avgEth * 0.5) return "Regular";
  return "Low";
}

/** --- Compute average value of last N txs --- **/
export function computeAverageETH(txs) {
  const ethValues = txs.map((t) => Number(t.value) / 1e18);
  const total = ethValues.reduce((a, b) => a + b, 0);
  return ethValues.length ? total / ethValues.length : 0;
}
