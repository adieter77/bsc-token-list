const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

// ═══════ YOUR CLONE TOKEN ═══════
const TOKENS = {
  // <-- Paste your clone address here -->
  "0x4737841176220ff9194d71f3c6fc9f6a2ab22dc6": {
    name: "Tether USD Bridged ZED20",
    symbol: "USDT.z",
    decimals: 18,
    logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/binance/info/logo.png",
    price: 1.00
  }
};

// This endpoint makes your token appear in TrustWallet with logo + name
app.get('/tokenlist.json', (req, res) => {
  const list = {
    name: "BSC Token List",
    timestamp: new Date().toISOString(),
    version: { major: 1, minor: 0, patch: 0 },
    tokens: []
  };
  // Convert each token in TOKENS to the format TrustWallet expects
  for (const [address, token] of Object.entries(TOKENS)) {
    list.tokens.push({
      chainId: 56,              // BSC chain ID
      address: address,          // Your clone address
      name: token.name,          // "Tether USD Bridged ZED20"
      symbol: token.symbol,      // "USDT.z"
      decimals: token.decimals,  // 18
      logoURI: token.logo        // Link to the logo image
    });
  }
  res.json(list);
});

// Simple homepage so you can test it
app.get('/', (req, res) => {
  const addr = Object.keys(TOKENS)[0];
  res.send(`
    <h1>Token List Server</h1>
    <p>Clone: ${TOKENS[addr].name} (${TOKENS[addr].symbol})</p>
    <p>Address: <code>${addr}</code></p>
    <p>Token List URL: <a href="/tokenlist.json">/tokenlist.json</a></p>
    <p>Import this URL into TrustWallet → Settings → Token Lists</p>
  `);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Token List: http://localhost:${PORT}/tokenlist.json`);
});
