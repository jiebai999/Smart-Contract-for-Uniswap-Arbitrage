This project looks at the price data for liquidity pools in Uniswap and attempts to determine if there are any profitable arbitrage opportunities between them. Data is retrieved using API calls to Uniswap's TheGraph database. Profitability of potential trades are then calculated in Python using the Uniswap whitepaper. Once profitable trades are found, we take the most profitable trade and interact with a deployed smart contract.

To facilitate trading we also implemented a smart contract that executes flash swaps against Uniswap's liquidity pools. This allows us to trade large amounts of liquidity at a time in order to achieve the maximum amount of profit.

The contract is contained in the contracts folder under Arbitrage.sol.
hardhat and all dependencies must be installed in order to deploy and interact with the contract.
hardhat.config.js must be updated with a Optimistic Ethereum wallet address in order to deploy and interact with all contracts.
The contract can be deployed by using hardhat to call the deploy.js located in the scripts folder.
queries.py is the main file that calculates profitability and sends a console command executing interact.js in order to interact with the contract.

All analysis occurs on Optimistic Mainnet. The contract is currently set to deploy to Optimistic Kovan network. In order to effectively interact with the contract, hardhat.config.js must be updated to the Optimistic Mainnet configuration.