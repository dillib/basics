#!/usr/bin/env tsx
/**
 * Render Deployment Status Checker
 * Fetches and displays deployment status and logs from Render API
 */

interface RenderConfig {
  apiKey: string;
  serviceId: string;
}

interface Deploy {
  id: string;
  status: 'created' | 'build_in_progress' | 'update_in_progress' | 'live' | 'deactivated' | 'build_failed' | 'update_failed' | 'canceled';
  createdAt: string;
  updatedAt: string;
  finishedAt?: string;
  commitMessage?: string;
}

async function getConfig(): Promise<RenderConfig> {
  const apiKey = process.env.RENDER_API_KEY;
  const serviceId = process.env.RENDER_SERVICE_ID;

  if (!apiKey || !serviceId) {
    console.error('❌ Missing configuration!');
    console.error('Please set:');
    console.error('  RENDER_API_KEY - Get from https://dashboard.render.com/account/api-keys');
    console.error('  RENDER_SERVICE_ID - Your service ID from Render dashboard');
    console.error('');
    console.error('Example:');
    console.error('  export RENDER_API_KEY="rnd_xxxx"');
    console.error('  export RENDER_SERVICE_ID="srv-xxxx"');
    process.exit(1);
  }

  return { apiKey, serviceId };
}

async function fetchDeploys(config: RenderConfig): Promise<Deploy[]> {
  const response = await fetch(
    `https://api.render.com/v1/services/${config.serviceId}/deploys`,
    {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Accept': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data;
}

async function fetchLogs(config: RenderConfig, deployId: string): Promise<string> {
  const response = await fetch(
    `https://api.render.com/v1/services/${config.serviceId}/deploys/${deployId}/logs`,
    {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Accept': 'text/plain',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch logs: ${response.status}`);
  }

  return response.text();
}

function formatStatus(status: Deploy['status']): string {
  const statusMap = {
    'created': '🔵 Created',
    'build_in_progress': '🔨 Building...',
    'update_in_progress': '🔄 Updating...',
    'live': '✅ Live',
    'deactivated': '⚪ Deactivated',
    'build_failed': '❌ Build Failed',
    'update_failed': '❌ Update Failed',
    'canceled': '⏹️  Canceled',
  };
  return statusMap[status] || status;
}

async function main() {
  console.log('🚀 Render Deployment Checker\n');

  const config = await getConfig();

  try {
    console.log('📡 Fetching deployments...\n');
    const deploys = await fetchDeploys(config);

    if (!deploys || deploys.length === 0) {
      console.log('No deployments found.');
      return;
    }

    // Show last 5 deployments
    console.log('Recent Deployments:');
    console.log('═══════════════════════════════════════\n');

    for (const deploy of deploys.slice(0, 5)) {
      const date = new Date(deploy.createdAt).toLocaleString();
      console.log(`${formatStatus(deploy.status)}`);
      console.log(`  ID: ${deploy.id}`);
      console.log(`  Created: ${date}`);
      if (deploy.commitMessage) {
        console.log(`  Commit: ${deploy.commitMessage.substring(0, 60)}...`);
      }
      console.log('');
    }

    // Check latest deployment
    const latest = deploys[0];
    console.log('═══════════════════════════════════════\n');
    console.log('Latest Deployment Status:');
    console.log(`${formatStatus(latest.status)}\n`);

    if (latest.status === 'build_failed' || latest.status === 'update_failed') {
      console.log('❌ Deployment failed! Fetching logs...\n');
      const logs = await fetchLogs(config, latest.id);

      // Show last 50 lines of logs
      const logLines = logs.split('\n');
      const errorLogs = logLines.slice(-50);

      console.log('Last 50 lines of logs:');
      console.log('───────────────────────────────────────');
      errorLogs.forEach(line => console.log(line));
      console.log('───────────────────────────────────────\n');
    } else if (latest.status === 'build_in_progress' || latest.status === 'update_in_progress') {
      console.log('⏳ Deployment in progress...');
      console.log('View live logs at:');
      console.log(`https://dashboard.render.com/web/${config.serviceId}\n`);
    } else if (latest.status === 'live') {
      console.log('✅ Deployment successful!');
      console.log('Your app is live and running.\n');
    }

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
