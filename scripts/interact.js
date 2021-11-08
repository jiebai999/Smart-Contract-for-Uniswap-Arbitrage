async function main () {
    const accounts = await ethers.provider.listAccounts();
    console.log(accounts);
    const address = '0x5F205169736894d173F037629F8e5DD3DBf6BeaC';
    const PairFlash = await ethers.getContractFactory('PairFlash');
    const pairFlash = await PairFlash.attach(address);
    const execute = await pairFlash.initFlash([arguments[0],arguments[1],parseInt(arguments[2]),parseInt(arguments[3]),parseInt(arguments[4]),parseInt(arguments[5]),parseInt(arguments[6]));
  }
  
  main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });