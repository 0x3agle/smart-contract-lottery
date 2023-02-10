const { assert } = require("chai")
const { network, getNamedAccounts, deployments, ethers, log } = require("hardhat")
const { devChains, networkConfig } = require("../../helper-hardhat-config")

!devChains.includes(network.name)
    ? describe.skip
    : describe("Raffle", async () => {
          let raffle, vrfCoordinatorV2Mock
          const chainId = network.config.chainId

          beforEach(async () => {
              const deployer = (await getNamedAccounts()).deployer
              await deployments.fixture(["all"])
              raffle = await ethers.getContract("Raffle", deployer)
              log("Pass")
              vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer)
          })

          it("initializes the Raffle Correctly", async () => {
              const raffleState = await raffle.getRaffleState()
              const interval = await raffle.getInterval()
              assert.equal(raffleState.toString(), "0")
              assert.equal(interval.toString(), networkConfig[chainId]["interval"])
          })
      })
