"use strict";

require("dotenv").config();

var _require = require("starknet"),
    Provider = _require.Provider,
    Account = _require.Account,
    Contract = _require.Contract,
    Signer = _require.Signer,
    number = _require.number,
    uint256 = _require.uint256,
    CallData = _require.CallData;

var fs = require("fs"); // Initialize provider


var provider = new Provider({
  baseUrl: "https://rpc.nethermind.io/sepolia-juno?apikey=dcwhVRAvIpj7BXAatW9OHkZrNljTB0hghrqli8DXcfyYcd3tO301QbpulDSrGtpM"
}); // Initialize account

var privateKey = process.env.PRIVATE_KEY;
var signer = new Signer(privateKey);
var accountAddress = "0x7a20c11d1afadf759ba0c8e84135cd8cc20dd8c9c77f48f4761d2ddee91e231"; // Replace with your actual account address

var account = new Account(provider, accountAddress, signer); // Read and parse the compiled contract class JSON

var compiledContractClass = JSON.parse(fs.readFileSync("./projecthack/target/release/token_repo_ERC20_Loyalty.contract_class.json", "utf-8")); // Class hash and constructor calldata

var compiledClassHash = "0x03da8692ea3d473f759ff81fd032d38531bc85686c6ecdead55b21e2b4bffd86";
var initialTk = BigInt(20); // 20 NIT

var erc20CallData = new CallData(compiledContractClass.abi);
var constructorCalldata = erc20CallData.compile("constructor", {
  name: "niceToken",
  symbol: "NIT",
  fixed_supply: uint256.bnToUint256(initialTk),
  recipient: account.address
});

function deployAndSendTokens() {
  var deployResponse, erc20, recipientAddress, amount, transferResponse;
  return regeneratorRuntime.async(function deployAndSendTokens$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          _context.prev = 0;
          // Deploy the contract
          console.log("Deployment Tx - ERC20 Contract to Starknet...");
          _context.next = 4;
          return regeneratorRuntime.awrap(account.declareAndDeploy({
            contract: compiledContractClass,
            compiledClassHash: compiledClassHash,
            constructorCalldata: constructorCalldata,
            feeToken: "eth"
          }));

        case 4:
          deployResponse = _context.sent;
          console.log("Contract deployed at address:", deployResponse.deploy.contract_address);
          console.log("Transaction hash:", deployResponse.deploy.transaction_hash); // Wait for the transaction to be accepted

          _context.next = 9;
          return regeneratorRuntime.awrap(provider.waitForTransaction(deployResponse.deploy.transaction_hash));

        case 9:
          // Create a new contract instance
          erc20 = new Contract(compiledContractClass.abi, deployResponse.deploy.contract_address, provider);
          erc20.connect(account); // Send tokens to the recipient

          recipientAddress = "0x017a859f98a7d34fc6393c99494b40555afd87344aed0b2c06dccfa992e42adf"; // Replace with the recipient's account address

          amount = BigInt(1); // 1 token (assuming 18 decimals)

          _context.next = 15;
          return regeneratorRuntime.awrap(erc20.transfer(recipientAddress, amount));

        case 15:
          transferResponse = _context.sent;
          console.log("Transfer transaction hash:", transferResponse.transaction_hash); // Wait for the transfer transaction to be accepted

          _context.next = 19;
          return regeneratorRuntime.awrap(provider.waitForTransaction(transferResponse.transaction_hash));

        case 19:
          console.log("Tokens transferred successfully");
          _context.next = 25;
          break;

        case 22:
          _context.prev = 22;
          _context.t0 = _context["catch"](0);
          console.error("Error deploying contract or sending tokens:", _context.t0);

        case 25:
        case "end":
          return _context.stop();
      }
    }
  }, null, null, [[0, 22]]);
}

deployAndSendTokens();