async function probeBitgetMcp() {
  const url = 'https://agent.bitget.com/mcp';
  console.log(`[MCP Probe] Querying Bitget MCP endpoint: ${url}`);

  let endpointReachable = false;
  let discoveredToolNames: string[] = [];
  let selectedTool: string | null = null;
  let usableMarketResult = false;
  let probeLog: string[] = [];

  try {
    // Step 1: Initialize
    const initPayload = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'NoctiveAgent',
          version: '1.0.0',
        },
      },
    };

    const controller1 = new AbortController();
    const timer1 = setTimeout(() => controller1.abort(), 8000);

    const initRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(initPayload),
      signal: controller1.signal,
    }).finally(() => clearTimeout(timer1));

    probeLog.push(`Initialize HTTP Status: ${initRes.status} ${initRes.statusText}`);

    if (initRes.ok) {
      endpointReachable = true;
      const initData: any = await initRes.json();
      probeLog.push(`Initialize Response: ${JSON.stringify(initData)}`);
    } else {
      const errText = await initRes.text();
      probeLog.push(`Initialize Failed: ${errText.substring(0, 300)}`);
    }

    // Step 2: tools/list
    const toolsListPayload = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {},
    };

    const controller2 = new AbortController();
    const timer2 = setTimeout(() => controller2.abort(), 8000);

    const toolsRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(toolsListPayload),
      signal: controller2.signal,
    }).finally(() => clearTimeout(timer2));

    probeLog.push(`tools/list HTTP Status: ${toolsRes.status} ${toolsRes.statusText}`);

    if (toolsRes.ok) {
      endpointReachable = true;
      const toolsData: any = await toolsRes.json();
      if (toolsData && toolsData.result && Array.isArray(toolsData.result.tools)) {
        discoveredToolNames = toolsData.result.tools.map((t: any) => t.name);
        probeLog.push(`Discovered tools count: ${discoveredToolNames.length}`);
        probeLog.push(`Tools: ${JSON.stringify(discoveredToolNames)}`);
      } else {
        probeLog.push(`tools/list response payload: ${JSON.stringify(toolsData)}`);
      }
    } else {
      const errText = await toolsRes.text();
      probeLog.push(`tools/list Failed: ${errText.substring(0, 300)}`);
    }
  } catch (err: any) {
    probeLog.push(`Probe Error: ${err.message}`);
  }

  console.log('\n--- LIVE BITGET MCP PROBE RESULT ---');
  console.log(`Endpoint reachable: ${endpointReachable ? 'yes' : 'no'}`);
  console.log(`Discovered tool names: ${discoveredToolNames.length > 0 ? discoveredToolNames.join(', ') : 'none'}`);
  console.log(`Selected confirmed tool: ${selectedTool ? selectedTool : 'none'}`);
  console.log(`Usable market result: ${usableMarketResult ? 'yes' : 'no'}`);
  console.log('\n--- SANITIZED PROBE LOG ---');
  probeLog.forEach((line) => console.log(`  ${line}`));
  console.log('-------------------------------------\n');
}

probeBitgetMcp();
