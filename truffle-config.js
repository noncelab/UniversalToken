require("dotenv").config();
require("babel-register");
require("babel-polyfill");

const HDWalletProvider = require("truffle-hdwallet-provider");

const providerWithMnemonic = (mnemonic, rpcEndpoint) => () =>
  new HDWalletProvider(mnemonic, rpcEndpoint);

module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 7545,
      network_id: "*", // eslint-disable-line camelcase
      gasPrice: 0x01,
    },
    test: {
      host: "localhost",
      port: 7545,
      network_id: "*",
      gasPrice: 0x01,
    },
    coverage: {
      host: "localhost",
      network_id: "*", // eslint-disable-line camelcase
      port: 8555,
      gas: 0xfffffffffff,
      gasPrice: 0x01,
      disableConfirmationListener: true,
    },
    ganache: {
      host: "localhost",
      port: 7545,
      network_id: "*", // eslint-disable-line camelcase
    },
    dotEnvNetwork: {
      provider: providerWithMnemonic(
        process.env.MNEMONIC,
        process.env.RPC_ENDPOINT
      ),
      network_id: parseInt(process.env.NETWORK_ID) || "*", // eslint-disable-line camelcase
    },
    besuProd: {
      provider: providerWithMnemonic(
        process.env.MNEMONIC,
        "https://rpc.ssafy-blockchain.com"
      ),
      network_id: parseInt(31221), // eslint-disable-line camelcase
    },
  },
  plugins: [
    "solidity-coverage",
    "truffle-contract-size",
    "truffle-plugin-verify",
  ],
  compilers: {
    solc: {
      version: "0.8.19",
      settings: {
        optimizer: {
          enabled: true, // Default: false
          runs: 0, // Default: 200
        },
      },
    },
  },
};
