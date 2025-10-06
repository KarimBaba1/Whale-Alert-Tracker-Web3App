async function main() {
  // Query ETH balances on Arbitrum, Base, and Optimism
  const chains = [42161, 8453, 10]; // Arbitrum, Base, Optimism

  for (const chain of chains) {
    try {
      // ✅ Corrected URL — all on one line, no spaces or newlines
      const url = `https://api.etherscan.io/v2/api?chainid=${chain}&module=account&action=balance&address=0xb5d85cbf7cb3ee0d56b3bb207d5fc4b82f43f511&tag=latest&apikey=DZKID8UKT41PCEAMH2V3CMDE2N1VCABA18`;

      const query = await fetch(url);
      if (!query.ok) throw new Error(`HTTP error ${query.status}`);

      const response = await query.json();

      if (response.status === "0") {
        console.error(`Error from API (chain ${chain}): ${response.message}`);
      } else {
        const balanceWei = response.result;
        const balanceEth = Number(balanceWei) / 1e18; // convert wei → ETH
        console.log(`Chain ${chain}: ${balanceEth} ETH`);
      }
    } catch (err) {
      console.error(`Fetch failed for chain ${chain}:`, err);
    }
  }
}

main();

