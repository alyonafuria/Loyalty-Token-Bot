require("dotenv").config();
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
  baseUrl:
    "https://rpc.nethermind.io/sepolia-juno?apikey=dcwhVRAvIpj7BXAatW9OHkZrNljTB0hghrqli8DXcfyYcd3tO301QbpulDSrGtpM",
});

// Initialize account
const privateKey = process.env.PRIVATE_KEY;
const signer = new Signer(privateKey);
const accountAddress =
  "0x7a20c11d1afadf759ba0c8e84135cd8cc20dd8c9c77f48f4761d2ddee91e231";
const account = new Account(provider, accountAddress, signer);

async function deployAndSendTokens() {
  try {
    // Read token configuration
    const tokenConfig = JSON.parse(fs.readFileSync("./token_config.json", "utf-8"));

    // Read and parse the compiled contract class JSON
    const compiledContractClass = JSON.parse(
      fs.readFileSync(
        "./projecthack/target/release/token_repo_ERC20_Loyalty.contract_class.json",
        "utf-8"
      )
    );

    // Class hash and constructor calldata
    const compiledClassHash =
      "0x03da8692ea3d473f759ff81fd032d38531bc85686c6ecdead55b21e2b4bffd86";
    const initialSupply = BigInt(tokenConfig.supply || 1000000);
    const erc20CallData = new CallData(compiledContractClass.abi);
    const constructorCalldata = erc20CallData.compile("constructor", {
      name: tokenConfig.name,
      symbol: tokenConfig.symbol,
      fixed_supply: uint256.bnToUint256(initialSupply),
      recipient: tokenConfig.recipient || account.address,
    });

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

    // Write deployment result
    const result = {
      status: "success",
      contractAddress: deployResponse.deploy.contract_address,
      transactionHash: deployResponse.deploy.transaction_hash,
      userId: tokenConfig.userId,
    };
    fs.writeFileSync("deployment_result.json", JSON.stringify(result, null, 2));

    console.log("Deployment completed successfully!");
  } catch (error) {
    console.error("Error deploying contract:", error);
    // Write error result
    const result = {
      status: "error",
      error: error.message,
      userId: JSON.parse(fs.readFileSync("./token_config.json", "utf-8")).userId,
    };
    fs.writeFileSync("deployment_result.json", JSON.stringify(result, null, 2));
  }
}

deployAndSendTokens();
