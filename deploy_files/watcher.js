const chokidar = require('chokidar');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Paths configuration
const COMPLETED_TOKENS_PATH = path.resolve('./token_info/completed_tokens.json');
const TOKEN_CONFIG_PATH = path.resolve('./token_config.json');
const DEPLOY_SCRIPT_PATH = path.resolve('./deploy.js');
const DEPLOYED_TOKENS_PATH = path.resolve('./deployed_tokens.json');

console.log('Watching for changes in:', COMPLETED_TOKENS_PATH);
console.log('Will update:', TOKEN_CONFIG_PATH);
console.log('Will execute:', DEPLOY_SCRIPT_PATH);

let isProcessing = false;
let processQueue = [];

async function processToken(token) {
    console.log(`Processing token: ${token.token_data.name}`);
    
    // Update token_config.json with the new token data
    const tokenConfig = {
        tokenName: token.token_data.name,
        tokenSymbol: token.token_data.symbol,
        recipientAddress: token.token_data.recipient,
        transferAmount: parseInt(token.token_data.supply) || 1,
        userId: token.user_id
    };

    // Write to token_config.json
    fs.writeFileSync(TOKEN_CONFIG_PATH, JSON.stringify(tokenConfig, null, 2));
    console.log(`Updated token_config.json with new token data: ${token.token_data.name}`);

    try {
        // Execute deploy.js
        const deployResult = await new Promise((resolve, reject) => {
            const deploy = spawn('node', ['deploy.js'], { stdio: ['ignore', 'pipe', 'pipe'] });
            let stdout = '';
            let stderr = '';

            deploy.stdout.on('data', (data) => {
                stdout += data;
                console.log('Deployment stdout:', data.toString());
            });

            deploy.stderr.on('data', (data) => {
                stderr += data;
                console.log('Deployment stderr:', data.toString());
            });

            deploy.on('close', (code) => {
                if (code === 0) {
                    resolve({ stdout, stderr });
                } else {
                    reject(new Error(`Deploy process exited with code ${code}`));
                }
            });
        });

        // Add to deployed tokens
        const deployedTokens = fs.existsSync(DEPLOYED_TOKENS_PATH) 
            ? JSON.parse(fs.readFileSync(DEPLOYED_TOKENS_PATH, 'utf8')) 
            : [];
        
        deployedTokens.push({
            ...token,
            deployedAt: new Date().toISOString(),
            status: 'success'
        });

        fs.writeFileSync(DEPLOYED_TOKENS_PATH, JSON.stringify(deployedTokens, null, 2));

        // Remove from completed tokens
        const completedTokens = JSON.parse(fs.readFileSync(COMPLETED_TOKENS_PATH, 'utf8'));
        const updatedTokens = completedTokens.filter(t => 
            t.timestamp !== token.timestamp || 
            t.user_id !== token.user_id
        );
        fs.writeFileSync(COMPLETED_TOKENS_PATH, JSON.stringify(updatedTokens, null, 2));

        console.log('Deployment completed successfully!');
    } catch (error) {
        console.error('Error deploying contract or sending tokens:', error);
        
        // Mark as failed in deployed tokens
        const deployedTokens = fs.existsSync(DEPLOYED_TOKENS_PATH) 
            ? JSON.parse(fs.readFileSync(DEPLOYED_TOKENS_PATH, 'utf8')) 
            : [];
        
        deployedTokens.push({
            ...token,
            deployedAt: new Date().toISOString(),
            status: 'failed',
            error: error.message
        });

        fs.writeFileSync(DEPLOYED_TOKENS_PATH, JSON.stringify(deployedTokens, null, 2));
    }
}

async function processNextInQueue() {
    if (isProcessing || processQueue.length === 0) return;
    
    isProcessing = true;
    const token = processQueue.shift();
    
    try {
        await processToken(token);
    } catch (error) {
        console.error('Error processing token:', error);
    } finally {
        isProcessing = false;
        // Process next token if any
        processNextInQueue();
    }
}

// Watch for changes in completed_tokens.json
chokidar.watch(COMPLETED_TOKENS_PATH).on('change', async () => {
    try {
        console.log(`${new Date().toISOString()} - Completed tokens updated, processing...`);
        
        // Read completed tokens
        const completedTokens = JSON.parse(fs.readFileSync(COMPLETED_TOKENS_PATH, 'utf8'));
        
        // Add new tokens to queue
        completedTokens.forEach(token => {
            if (!processQueue.some(t => t.timestamp === token.timestamp)) {
                processQueue.push(token);
            }
        });
        
        // Start processing if not already processing
        processNextInQueue();
    } catch (error) {
        console.error('Error processing completed tokens:', error);
    }
});

console.log('File watcher started. Press Ctrl+C to stop.');

// Handle process termination
process.on('SIGINT', () => {
    console.log('Stopping watcher...');
    process.exit(0);
});
