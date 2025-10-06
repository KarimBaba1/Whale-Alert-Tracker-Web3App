// whaleTracker.js
import fs from "fs";
import cron from "node-cron";
import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
dotenv.config();
import fetch from "node-fetch";
import {
  knownExchanges,
  getEthPriceUSD,
  resolveAddressLabel,
  getDirection,
  classifyTransaction,
  computeAverageETH
} from "./lib/whaleUtils.js";

// --- Setup Telegram Bot ---
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

// --- Subscribers file (auto register users) ---
const USERS_FILE = "./subscribers.json";
let subscribers = fs.existsSync(USERS_FILE)
  ? JSON.parse(fs.readFileSync(USERS_FILE))
  : [];

// Handle /start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  if (!subscribers.includes(chatId)) {
    subscribers.push(chatId);
    fs.writeFileSync(USERS_FILE, JSON.stringify(subscribers, null, 2));
    console.log(`✅ New subscriber: ${chatId}`);
  }
  bot.sendMessage(
    chatId,
    "👋 Welcome to *Whale Alert Bot*! You'll now receive alerts for large ETH movements 🐋",
    { parse_mode: "Markdown" }
  );
});

// Handle /stop command
bot.onText(/\/stop/, (msg) => {
  const chatId = msg.chat.id;
  subscribers = subscribers.filter((id) => id !== chatId);
  fs.writeFileSync(USERS_FILE, JSON.stringify(subscribers, null, 2));
  console.log(`❌ Unsubscribed: ${chatId}`);
  bot.sendMessage(chatId, "❌ You’ve been unsubscribed from Whale Alerts.");
});

// --- Duplicate prevention file ---
const SEEN_FILE = "./seenTx.json";
let seen = fs.existsSync(SEEN_FILE)
  ? JSON.parse(fs.readFileSync(SEEN_FILE))
  : [];

// --- Main Whale Tracker ---
async function whaleTracker() {
  const chains = [
    { id: 1, name: "Ethereum" },
    { id: 42161, name: "Arbitrum" },
    { id: 8453, name: "Base" },
    { id: 10, name: "Optimism" }
  ];

  const targetAddress = "0xb5d85cbf7cb3ee0d56b3bb207d5fc4b82f43f511";
  const apiKey = "DZKID8UKT41PCEAMH2V3CMDE2N1VCABA18";
  const ethPrice = await getEthPriceUSD();

  console.log(`\n💰 Current ETH Price: $${ethPrice}\n`);

  for (const chain of chains) {
    try {
      const url = `https://api.etherscan.io/v2/api?chainid=${chain.id}&module=account&action=txlist&address=${targetAddress}&sort=desc&apikey=${apiKey}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.status === "0") {
        console.warn(`⚠️  ${chain.name}: ${data.message}`);
        continue;
      }

      const txs = data.result.slice(0, 20);
      const avgEth = computeAverageETH(txs);
      console.log(`📊 ${chain.name} avg recent tx size: ${avgEth.toFixed(2)} ETH`);

      for (const tx of txs) {
        const valueEth = Number(tx.value) / 1e18;
        if (valueEth < avgEth * 0.5) continue;

        const valueUsd = (valueEth * ethPrice).toLocaleString(undefined, {
          maximumFractionDigits: 0
        });

        const fromLabel = await resolveAddressLabel(tx.from, apiKey);
        const toLabel = await resolveAddressLabel(tx.to, apiKey);
        const direction = getDirection(fromLabel, toLabel);
        const category = classifyTransaction(valueEth, avgEth);

        // skip duplicates
        if (seen.includes(tx.hash)) continue;
        seen.push(tx.hash);
        if (seen.length > 500) seen = seen.slice(-500);
        fs.writeFileSync(SEEN_FILE, JSON.stringify(seen, null, 2));

        // log to console
        console.log(`
🐋 Whale Transfer Detected (${chain.name})
From: ${fromLabel}
To:   ${toLabel}
Direction: ${direction}
Value: ${valueEth.toFixed(2)} ETH ($${valueUsd})
Category: ${category}
TxHash: https://${chain.name.toLowerCase()}.etherscan.io/tx/${tx.hash}
        `);

        // Telegram alert
        const msg = `
🐋 *Whale Transfer Alert* (${chain.name})
━━━━━━━━━━━━━━━━━━━━
📤 *From:* \`${fromLabel}\`
📥 *To:* \`${toLabel}\`
🔄 *Direction:* *${direction}*

💰 *Value:* *${valueEth.toFixed(2)} ETH* (~$${valueUsd})
⚠️ *Category:* *${category}*

🔗 [View Transaction](https://${chain.name.toLowerCase()}.etherscan.io/tx/${tx.hash})
━━━━━━━━━━━━━━━━━━━━
🕒 *Checked at:* ${new Date().toLocaleTimeString()}
`;

        for (const id of subscribers) {
          await bot.sendMessage(id, msg, { parse_mode: "Markdown" });
        }
      }
    } catch (err) {
      console.error(`❌ ${chain.name} failed:`, err.message);
    }
  }
}

// --- Run every 5 minutes ---
console.log("🚀 WhaleTracker is live and checking every 5 minutes...");
whaleTracker(); // initial run
cron.schedule("*/5 * * * *", whaleTracker);

