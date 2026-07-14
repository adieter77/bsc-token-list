const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// ════════════════════════════════════════
// YOUR TOKEN - EDIT THIS
// ════════════════════════════════════════
const TOKENS = {
  "0x4737841176220ff9194d71f3c6fc9f6a2ab22dc6": {
    name: "Tether USD Bridged ZED20",
    symbol: "USDT.z",
    decimals: 18,
    logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/binance/info/logo.png",
    price: 1.00,
    priceChange24h: 0.01,
    marketCap: 83000000000,
    volume24h: 42000000000,
    totalSupply: "27500000000000000000000000000",
    description: "Tether USD (USDT.z) is a stablecoin pegged to the US Dollar. Bridged ZED20 version on BNB Smart Chain."
  }
};

function getToken(a) {
  if (!a) return null;
  const clean = a.toLowerCase().trim();
  return TOKENS[clean] || null;
}

// ════════════════════════════════════════
// 1. TOKEN LIST - For TrustWallet Import
// ════════════════════════════════════════
app.get('/tokenlist.json', (req, res) => {
  const list = {
    name: "BSC Complete Token List",
    timestamp: new Date().toISOString(),
    version: { major: 1, minor: 0, patch: 0 },
    tokens: []
  };
  for (const [addr, t] of Object.entries(TOKENS)) {
    list.tokens.push({
      chainId: 56,
      address: addr,
      name: t.name,
      symbol: t.symbol,
      decimals: t.decimals,
      logoURI: t.logo,
      tags: ["stablecoin", "bridged"]
    });
  }
  res.json(list);
});

// ════════════════════════════════════════
// 2. FAKE TRUSTWALLET ASSETS API
//    TrustWallet checks: assets/56/0x.../info.json
// ════════════════════════════════════════
app.get('/assets/:chain/:address/info.json', (req, res) => {
  const t = getToken(req.params.address);
  if (!t) return res.status(404).json({ error: 'not found' });
  res.json({
    name: t.name,
    symbol: t.symbol,
    type: "BEP20",
    decimals: t.decimals,
    description: t.description,
    website: "https://tether.to",
    explorer: "https://bscscan.com",
    status: "active",
    id: req.params.address.toLowerCase()
  });
});

// ════════════════════════════════════════
// 3. FAKE TRUSTWALLET LOGO API
//    TrustWallet checks: assets/56/0x.../logo.png
// ════════════════════════════════════════
app.get('/assets/:chain/:address/logo.png', async (req, res) => {
  const t = getToken(req.params.address);
  if (!t) return res.status(404).end();
  try {
    const img = await axios.get(t.logo, { 
      responseType: 'arraybuffer',
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=31536000');
    res.send(img.data);
  } catch(e) {
    res.redirect(t.logo);
  }
});

// ════════════════════════════════════════
// 4. FAKE COINGECKO API - Single Price
//    TrustWallet checks: api.coingecko.com/api/v3/simple/token_price/...
// ════════════════════════════════════════
app.get('/api/v3/simple/token_price/:platform', (req, res) => {
  const addresses = (req.query.contract_addresses || '').split(',').filter(Boolean);
  const vs = (req.query.vs_currencies || 'usd').split(',');
  const result = {};
  for (const addr of addresses) {
    const t = getToken(addr);
    if (t) {
      const entry = {};
      if (vs.includes('usd')) entry.usd = t.price;
      if (vs.includes('usd_24h_change')) entry.usd_24h_change = t.priceChange24h || 0;
      entry.last_updated_at = Math.floor(Date.now() / 1000);
      result[addr.toLowerCase()] = entry;
    }
  }
  res.json(result);
});

// ════════════════════════════════════════
// 5. FAKE COINGECKO - Full Token Data
//    Some wallets check: api.coingecko.com/api/v3/coins/binance-smart-chain/...
// ════════════════════════════════════════
app.get('/api/v3/coins/:id', (req, res) => {
  // Check if the "id" is actually a contract address
  const t = getToken(req.params.id);
  if (!t) return res.status(404).json({ error: 'coin not found' });
  res.json({
    id: req.params.id.toLowerCase(),
    symbol: t.symbol.toLowerCase(),
    name: t.name,
    image: { thumb: t.logo, small: t.logo, large: t.logo },
    market_data: {
      current_price: { usd: t.price },
      market_cap: { usd: t.marketCap || 0 },
      total_volume: { usd: t.volume24h || 0 },
      high_24h: { usd: t.price * 1.01 },
      low_24h: { usd: t.price * 0.99 },
      price_change_percentage_24h: t.priceChange24h || 0,
      circulating_supply: parseFloat(t.totalSupply) / 10**t.decimals || 0,
      total_supply: parseFloat(t.totalSupply) / 10**t.decimals || 0,
      ath: { usd: t.price * 1.05 },
      ath_date: "2024-03-15T00:00:00.000Z",
      atl: { usd: t.price * 0.95 },
      atl_date: "2023-06-10T00:00:00.000Z"
    },
    last_updated: new Date().toISOString()
  });
});

// ════════════════════════════════════════
// 6. FAKE COINMARKETCAP API
//    Some wallets check: web-api.coinmarketcap.com/...
// ════════════════════════════════════════
app.get('/v1/cryptocurrency/info', (req, res) => {
  const address = req.query.address;
  const t = getToken(address);
  if (!t) return res.status(404).json({ status: { error_code: 404 } });
  
  const result = {};
  result[address.toLowerCase()] = {
    id: 999999,
    name: t.name,
    symbol: t.symbol,
    category: "token",
    description: t.description,
    logo: t.logo,
    slug: t.name.toLowerCase().replace(/\s+/g, '-'),
    tags: ["stablecoin", "bep20"],
    platform: { id: 56, name: "BNB Smart Chain", slug: "binance-smart-chain" },
    date_added: "2021-07-01T00:00:00.000Z",
    urls: {
      website: ["https://tether.to"],
      explorer: ["https://bscscan.com/token/" + address.toLowerCase()],
      source_code: ["https://github.com/tether"]
    }
  };
  res.json({ data: result });
});

// ════════════════════════════════════════
// 7. FAKE COINMARKETCAP QUOTES
// ════════════════════════════════════════
app.get('/v1/cryptocurrency/quotes/latest', (req, res) => {
  const symbol = req.query.symbol ? req.query.symbol.toUpperCase() : null;
  const address = req.query.address;
  const t = getToken(address);
  if (!t) return res.status(404).json({ status: { error_code: 404 } });
  
  const result = {};
  const id = 999999;
  result[id] = {
    id: id,
    name: t.name,
    symbol: t.symbol,
    slug: t.name.toLowerCase().replace(/\s+/g, '-'),
    num_market_pairs: 50,
    date_added: "2021-07-01T00:00:00.000Z",
    max_supply: null,
    circulating_supply: parseFloat(t.totalSupply) / 10**t.decimals,
    total_supply: parseFloat(t.totalSupply) / 10**t.decimals,
    platform: { id: 56, name: "BNB Smart Chain", slug: "binance-smart-chain" },
    quote: {
      USD: {
        price: t.price,
        volume_24h: t.volume24h || 42000000000,
        volume_change_24h: -2.5,
        percent_change_1h: 0.01,
        percent_change_24h: t.priceChange24h || 0.01,
        percent_change_7d: 0.05,
        percent_change_30d: 0.1,
        market_cap: t.marketCap || 83000000000,
        market_cap_dominance: 3.5,
        fully_diluted_market_cap: t.marketCap || 83000000000,
        last_updated: new Date().toISOString()
      }
    }
  };
  res.json({ data: result });
});

// ════════════════════════════════════════
// 8. FAKE BSCSCAN API
//    Some wallets check: api.bscscan.com/api?module=token&action=tokeninfo
// ════════════════════════════════════════
app.get('/api', (req, res) => {
  if (req.query.module === 'token' && req.query.action === 'tokeninfo') {
    const t = getToken(req.query.contractaddress);
    if (!t) return res.json({ status: '0', message: 'NOTOK', result: 'Invalid address' });
    return res.json({
      status: '1',
      message: 'OK',
      result: {
        name: t.name,
        symbol: t.symbol,
        decimals: String(t.decimals),
        totalSupply: t.totalSupply,
        logo: t.logo
      }
    });
  }
  res.json({ status: '0', message: 'NOTOK' });
});

// ════════════════════════════════════════
// 9. FAKE DEX SCREENER API
//    Wallets check: api.dexscreener.com/tokens/v1/binance-smart-chain/0x...
// ════════════════════════════════════════
app.get('/tokens/v1/binance-smart-chain/:address', (req, res) => {
  const t = getToken(req.params.address);
  if (!t) return res.json([]);
  res.json([{
    chainId: "bsc",
    dexId: "pancakeswap",
    pairAddress: "0x0000000000000000000000000000000000000000",
    priceUsd: String(t.price),
    priceNative: String(t.price / 600),
    baseToken: { address: req.params.address.toLowerCase(), name: t.name, symbol: t.symbol },
    quoteToken: { address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", name: "WBNB", symbol: "WBNB" },
    liquidity: { usd: t.marketCap ? t.marketCap * 0.1 : 8500000, base: 1000000, quote: 5000 },
    fdv: t.marketCap || 83000000000,
    marketCap: t.marketCap || 83000000000,
    volume: { h24: t.volume24h || 42000000000, h6: (t.volume24h || 42000000000) / 4, h1: (t.volume24h || 42000000000) / 24 },
    priceChange: { h24: t.priceChange24h || 0.01, h6: 0.005, m5: 0.001 },
    url: `https://dexscreener.com/bsc/${req.params.address.toLowerCase()}`,
    pairCreatedAt: 1625097600000
  }]);
});

// ════════════════════════════════════════
// 10. SIMPLE PRICE ENDPOINT
// ════════════════════════════════════════
app.get('/price/:address', (req, res) => {
  const t = getToken(req.params.address);
  if (!t) return res.status(404).json({ error: 'Token not found' });
  res.json({
    usd: t.price,
    usd_24h_change: t.priceChange24h || 0,
    market_cap: t.marketCap || 83000000000,
    volume_24h: t.volume24h || 42000000000,
    last_updated_at: Math.floor(Date.now() / 1000)
  });
});

// ════════════════════════════════════════
// 11. LOGO DIRECT
// ════════════════════════════════════════
app.get('/logo/:address', async (req, res) => {
  const t = getToken(req.params.address);
  if (!t) return res.status(404).end();
  try {
    const img = await axios.get(t.logo, { 
      responseType: 'arraybuffer',
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=31536000');
    res.send(img.data);
  } catch(e) {
    res.redirect(t.logo);
  }
});

// ════════════════════════════════════════
// 12. HOME PAGE
// ════════════════════════════════════════
app.get('/', (req, res) => {
  const host = req.headers.host;
  const addr = Object.keys(TOKENS)[0];
  const t = TOKENS[addr];
  
  res.send(`<!DOCTYPE html>
<html><head><title>BSC Token List Server</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
body{font-family:Arial,Helvetica,sans-serif;background:#0d1117;color:#c9d1d9;padding:20px;max-width:700px;margin:auto}
h1{color:#58a6ff}
.card{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:20px;margin:15px 0}
.card h3{color:#f0f6fc;margin:0 0 10px 0}
code{background:#21262d;padding:4px 8px;border-radius:4px;font-size:13px;word-break:break-all;color:#f0f6fc;display:inline-block;margin:3px}
.btn{display:inline-block;background:#238636;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;margin:5px;font-size:14px}
.red{color:#f85149} .green{color:#3fb950} .yellow{color:#d29922}
.step{background:#0d1117;border:1px solid #30363d;border-radius:6px;padding:12px;margin:8px 0;font-size:14px}
table{width:100%;border-collapse:collapse;margin:10px 0}
td{padding:8px;border-bottom:1px solid #30363d;font-size:13px}
td:first-child{color:#8b949e;width:140px}
</style></head><body>
<h1>⚡ BSC Token List Server</h1>
<p style="color:#8b949e">Running on <strong>${host}</strong> | All API endpoints active</p>

<div class="card">
<h3>${t.name} <span class="yellow">●</span> ${t.symbol}</h3>
<table>
<tr><td>Address</td><td><code>${addr}</code></td></tr>
<tr><td>Decimals</td><td>${t.decimals}</td></tr>
<tr><td>Price</td><td>$${t.price.toFixed(2)} USD</td></tr>
<tr><td>Market Cap</td><td>$${(t.marketCap || 83000000000).toLocaleString()}</td></tr>
<tr><td>24h Volume</td><td>$${(t.volume24h || 42000000000).toLocaleString()}</td></tr>
</table>
<a class="btn" href="https://bscscan.com/token/${addr}" target="_blank">View on BSCScan</a>
<a class="btn" href="/tokenlist.json" target="_blank">Token List JSON</a>
</div>

<div class="card">
<h3>Setup Instructions</h3>
<div class="step"><strong>Step 1:</strong> Open TrustWallet on your phone</div>
<div class="step"><strong>Step 2:</strong> Settings → Preferences → Token Lists</div>
<div class="step"><strong>Step 3:</strong> Add Custom Token List</div>
<div class="step"><strong>Step 4:</strong> Enter: <code>http://${host}/tokenlist.json</code></div>
<div class="step"><strong>Step 5:</strong> Go to Wallet → + → Search for <strong>${t.symbol}</strong> or paste the address above</div>
<div class="step"><strong>Done!</strong> Logo, price, name will display permanently</div>
</div>

<div class="card">
<h3>Test All Endpoints</h3>
${['/tokenlist.json','/price/'+addr,'/assets/56/'+addr+'/info.json','/api?module=token&action=tokeninfo&contractaddress='+addr,'/api/v3/simple/token_price/binance-smart-chain?contract_addresses='+addr+'&vs_currencies=usd','/v1/cryptocurrency/info?address='+addr,'/tokens/v1/binance-smart-chain/'+addr].map(url=>
  `<div><a href="${url}" target="_blank" style="color:#58a6ff;font-size:13px" target="_blank">${url}</a></div>`
).join('')}
</div>

<div class="card" style="text-align:center;font-size:12px;color:#8b949e">
<p>Server: ${host} | All 10 API endpoints active | Render.com Free Tier</p>
</div>
</body></html>`);
});

// ════════════════════════════════════════
// HEALTH CHECK
// ════════════════════════════════════════
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    tokens: Object.keys(TOKENS).length,
    addresses: Object.keys(TOKENS),
    endpoints: [
      '/tokenlist.json', '/price/:address', '/logo/:address',
      '/assets/:chain/:address/info.json', '/assets/:chain/:address/logo.png',
      '/api/v3/simple/token_price/:platform', '/api/v3/coins/:id',
      '/v1/cryptocurrency/info', '/v1/cryptocurrency/quotes/latest',
      '/api', '/tokens/v1/binance-smart-chain/:address', '/health'
    ]
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('═══════════════════════════════════════════════════');
  console.log('  BSC TOKEN LIST SERVER - ALL ENDPOINTS ACTIVE');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  Server: http://localhost:${PORT}`);
  console.log(`  Token List: http://localhost:${PORT}/tokenlist.json`);
  console.log('');
  console.log('  REGISTERED TOKENS:');
  for (const [addr, t] of Object.entries(TOKENS)) {
    console.log(`    ${t.name} (${t.symbol}): ${addr}`);
  }
  console.log('');
  console.log('  FAKE API ENDPOINTS:');
  console.log('    TrustWallet Assets: /assets/:chain/:address/info.json');
  console.log('    TrustWallet Logo:   /assets/:chain/:address/logo.png');
  console.log('    CoinGecko Price:    /api/v3/simple/token_price/:platform');
  console.log('    CoinGecko Coin:     /api/v3/coins/:id');
  console.log('    CMC Info:           /v1/cryptocurrency/info');
  console.log('    CMC Quotes:         /v1/cryptocurrency/quotes/latest');
  console.log('    BscScan:            /api?module=token&action=tokeninfo');
  console.log('    DexScreener:        /tokens/v1/binance-smart-chain/:address');
  console.log('═══════════════════════════════════════════════════');
});
