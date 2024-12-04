const {
  Provider,
  Account,
  Contract,
  Signer,
  number,
  uint256,
  CallData,
} = require("starknet");
const fs = require("fs");

// Initialize provider
const provider = new Provider({
  sequencer: {
    baseUrl: 'https://rpc.nethermind.io/sepolia-juno'
  },
  rpc: {
    nodeUrl: "https://rpc.nethermind.io/sepolia-juno/v0_6?apikey=dcwhVRAvIpj7BXAatW9OHkZrNljTB0hghrqli8DXcfyYcd3tO301QbpulDSrGtpM",
  }
});

// Initialize account
const privateKey =
  "0xf6dbcf3d6a1651de8b6df0cdcdb7b0ed61dbc28de62041bb8c649f0e29f5a0"; // Replace with your actual private key
const signer = new Signer(privateKey);
const accountAddress =
  "0x7a20c11d1afadf759ba0c8e84135cd8cc20dd8c9c77f48f4761d2ddee91e231"; // Replace with your actual account address
const account = new Account(provider, accountAddress, signer);

// Read and parse the compiled contract class JSON
const compiledContractClass = JSON.parse(
  fs.readFileSync(
    "./projecthack/target/release/token_repo_ERC20_Loyalty.contract_class.json",
    "utf-8"
  )
);

// Read token configuration
const tokenConfig = JSON.parse(fs.readFileSync("./token_config.json", "utf-8"));

// Class hash and constructor calldata
const compiledClassHash =
  "0x03da8692ea3d473f759ff81fd032d38531bc85686c6ecdead55b21e2b4bffd86";
const initialTk = BigInt(20); // 20 NIT
const erc20CallData = new CallData(compiledContractClass.abi);
const constructorCalldata = erc20CallData.compile("constructor", {
  name: tokenConfig.tokenName,
  symbol: tokenConfig.tokenSymbol,
  fixed_supply: uint256.bnToUint256(initialTk),
  recipient: account.address,
});

async function deployAndSendTokens() {
  try {
    // Deploy the contract
    console.log("Deployment Tx - ERC20 Contract to Starknet...");
    const deployResponse = await account.declareAndDeploy({
      contract: compiledContractClass,
      compiledClassHash,
      constructorCalldata,
      feeToken: "eth",
    });

    console.log(
      "Contract deployed at address:",
      deployResponse.deploy.contract_address
    );
    console.log("Transaction hash:", deployResponse.deploy.transaction_hash);

    // Save deployment result with user info
    const deploymentResult = {
      status: 'success',
      contractAddress: deployResponse.deploy.contract_address,
      transactionHash: deployResponse.deploy.transaction_hash,
      tokenName: tokenConfig.tokenName,
      tokenSymbol: tokenConfig.tokenSymbol,
      timestamp: new Date().toISOString(),
      userId: tokenConfig.userId
    };
    fs.writeFileSync('./deployment_result.json', JSON.stringify(deploymentResult, null, 2));

    // Wait for the transaction to be accepted
    await provider.waitForTransaction(deployResponse.deploy.transaction_hash);

    // Create a new contract instance
    const erc20 = new Contract(
      compiledContractClass.abi,
      deployResponse.deploy.contract_address,
      provider
    );
    erc20.connect(account);

    // Send tokens to the recipient
    const recipientAddress = tokenConfig.recipientAddress;
    const amount = BigInt(tokenConfig.transferAmount);
    const transferResponse = await erc20.transfer(recipientAddress, amount);

    console.log(
      "Transfer transaction hash:",
      transferResponse.transaction_hash
    );

    // Wait for the transfer transaction to be accepted
    await provider.waitForTransaction(transferResponse.transaction_hash);

    console.log("Tokens transferred successfully");
  } catch (error) {
    console.error("Error deploying contract or sending tokens:", error);
  }
}

deployAndSendTokens();
