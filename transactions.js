
async function main() {
  const chains = [42161, 8453, 10]; // Arbitrum, Base, Optimism
  const address = "0xb5d85cbf7cb3ee0d56b3bb207d5fc4b82f43f511";
  const apiKey = "DZKID8UKT41PCEAMH2V3CMDE2N1VCABA18";

  for (const chain of chains) {
    try {
      const url = `https://api.etherscan.io/v2/api?chainid=${chain}&module=account&action=txlist&address=${address}&sort=desc&apikey=${apiKey}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);

      const data = await res.json();

      if (data.status === "0") {
        console.error(`Error from API (chain ${chain}): ${data.message}`);
        continue;
      }

      console.log(`\n🧾 Recent Transactions on Chain ${chain}:`);
      const txs = data.result.slice(0, 5); // get latest 5 txs

      for (const tx of txs) {
        const valueEth = Number(tx.value) / 1e18;
        console.log(`Hash: ${tx.hash}`);
        console.log(`From: ${tx.from}`);
        console.log(`To: ${tx.to}`);
        console.log(`Value: ${valueEth.toFixed(4)} ETH`);
        console.log(`---`);
      }
    } catch (err) {
      console.error(`Fetch failed for chain ${chain}:`, err);
    }
  }
}

main();
