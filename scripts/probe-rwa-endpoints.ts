async function probeRwaEndpoints() {
  const stockListUrl = 'https://web3.bitget.com/bgw-pro/market/v3/rwa/stockList';
  const stockInfoUrl = 'https://web3.bitget.com/bgw-pro/market/v3/rwa/stockInfo';

  console.log('[RWA Probe] Testing official Bitget Wallet RWA endpoints...');

  // Probe stockList
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(stockListUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'NoctiveRwaAgent/1.0',
      },
      body: JSON.stringify({ page: 1, pageSize: 20 }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));

    console.log(`stockList HTTP Status: ${res.status} ${res.statusText}`);
    const text = await res.text();
    console.log(`stockList Response Body (sanitized snippet): ${text.substring(0, 500)}`);
  } catch (err: any) {
    console.log(`stockList Error: ${err.message}`);
  }

  // Probe stockInfo
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(stockInfoUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'NoctiveRwaAgent/1.0',
      },
      body: JSON.stringify({ symbol: 'rNVDA' }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));

    console.log(`stockInfo HTTP Status: ${res.status} ${res.statusText}`);
    const text = await res.text();
    console.log(`stockInfo Response Body (sanitized snippet): ${text.substring(0, 500)}`);
  } catch (err: any) {
    console.log(`stockInfo Error: ${err.message}`);
  }
}

probeRwaEndpoints();
