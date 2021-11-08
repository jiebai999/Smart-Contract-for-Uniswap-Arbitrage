async function main() {
    // We get the contract to deploy
    const Arbitrage = await ethers.getContractFactory("PairFlash");
    const arbitrage = await Arbitrage.deploy('0xE592427A0AEce92De3Edee1F18E0157C05861564','0x1F98431c8aD98523631AE4a59f267346ea31F984','0x4200000000000000000000000000000000000006');
  
    console.log("Arbitrage deployed to:", arbitrage.address);
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });