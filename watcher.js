const chokidar = require('chokidar');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Paths configuration
const jsonFilePath = path.resolve('./token_info/completed_tokens.json');
const configFilePath = path.resolve('./token_config.json');
const deployScriptPath = path.resolve('./deploy.js');
const deployedTokensPath = path.resolve('./deployed_tokens.json');

console.log('Watching for changes in:', jsonFilePath);
console.log('Will update:', configFilePath);
console.log('Will execute:', deployScriptPath);

// Initialize watcher
const watcher = chokidar.watch(jsonFilePath, {
    persistent: true,
    awaitWriteFinish: {
        stabilityThreshold: 2000,
        pollInterval: 100
    }
});

// Keep track of the last deployment time
let lastDeploymentTime = 0;
const DEPLOYMENT_COOLDOWN = 5000; // 5 seconds cooldown

// Load or initialize deployed tokens tracking
function loadDeployedTokens() {
    try {
        if (fs.existsSync(deployedTokensPath)) {
            return JSON.parse(fs.readFileSync(deployedTokensPath, 'utf8'));
        }
    } catch (error) {
        console.error('Error loading deployed tokens:', error);
    }
    return {};
}

// Save deployed token
function saveDeployedToken(timestamp, tokenData) {
    const deployedTokens = loadDeployedTokens();
    deployedTokens[timestamp] = tokenData;
    fs.writeFileSync(deployedTokensPath, JSON.stringify(deployedTokens, null, 2));
}

// Function to update token_config.json
function updateTokenConfig(token) {
    try {
        // Format the token data for token_config.json
        const configData = {
            tokenName: token.token_data.name,
            tokenSymbol: token.token_data.symbol,
            recipientAddress: token.token_data.recipient,
            transferAmount: parseInt(token.token_data.supply) || 1, // Default to 1 if supply is not a valid number
            userId: token.user_id // Add user ID to config
        };

        // Write to token_config.json
        fs.writeFileSync(configFilePath, JSON.stringify(configData, null, 2));
        console.log('Updated token_config.json with new token data:', configData.tokenName);
        return true;
    } catch (error) {
        console.error('Error updating token_config.json:', error);
        return false;
    }
}

// Handle file changes
watcher.on('change', async (path) => {
    const currentTime = Date.now();
    
    // Check if enough time has passed since last deployment
    if (currentTime - lastDeploymentTime < DEPLOYMENT_COOLDOWN) {
        console.log('Deployment cooldown in effect, skipping...');
        return;
    }

    console.log(`\n${new Date().toISOString()} - Completed tokens updated, processing...`);
    
    try {
        // Read and parse the completed_tokens.json
        const tokensData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
        const deployedTokens = loadDeployedTokens();
        
        // Find the first undeployed token
        for (const token of tokensData) {
            if (!deployedTokens[token.timestamp]) {
                console.log(`Processing token: ${token.token_data.name}`);
                
                // Update token_config.json with the token data
                if (updateTokenConfig(token)) {
                    // Update last deployment time
                    lastDeploymentTime = currentTime;

                    // Execute deploy.js
                    exec(`node "${deployScriptPath}"`, (error, stdout, stderr) => {
                        if (error) {
                            console.error('Error during deployment:', error);
                            return;
                        }
                        if (stderr) {
                            console.error('Deployment stderr:', stderr);
                        }
                        console.log('Deployment stdout:', stdout);
                        console.log('Deployment completed successfully!');
                        
                        // Mark token as deployed
                        saveDeployedToken(token.timestamp, {
                            name: token.token_data.name,
                            symbol: token.token_data.symbol,
                            deployedAt: new Date().toISOString()
                        });
                    });
                    
                    // Only process one token at a time
                    break;
                }
            }
        }
    } catch (error) {
        console.error('Error processing completed_tokens.json:', error);
    }
});

// Handle watcher errors
watcher.on('error', error => {
    console.error('Watcher error:', error);
});

// Log when watcher is ready
watcher.on('ready', () => {
    console.log('Initial scan complete. Ready for changes...');
});

// Handle process termination
process.on('SIGINT', () => {
    console.log('Stopping watcher...');
    watcher.close().then(() => process.exit(0));
});

console.log('File watcher started. Press Ctrl+C to stop.');
