/**
 * @type import('hardhat/config').HardhatUserConfig
 */
require("@eth-optimism/plugins/hardhat/compiler");
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");
module.exports = {
  ovm: {
      solcVersion: '0.7.6'
  },
  solidity: "0.7.6",
  networks: {
    "optimistic-kovan": {
      url: 'https://kovan.optimism.io',
      accounts: { mnemonic: '' },
      gasPrice: 15000000,
      ovm: true // This sets the network as using the ovm and ensure contract will be compiled against that.
   }
  }
};
