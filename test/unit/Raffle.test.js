const { assert } = require("chai")
const { network, getNamedAccounts, deployments, ethers } = require("hardhat")
const { devChains, networkConfig } = require("../../helper-hardhat-config")

!devChains.includes(network.name)
    ? describe.skip
    : describe("Raffle", async () => {
        let raffle, vrfCoordinatorV2Mock
        const chainId = network.config.chainId

        beforEach(async () => {
            const { deployer } = await getNamedAccounts()
            await deployments.fixture(["all"])
            raffle = await ethers.getContract("Raffle", deployer)
            vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer)
        })
        describe("Constructor", async () => {
            it("Initializes the Raffle Correctly", async () => {
                const raffleState = await raffle.getRaffleState()
                const interval = await raffle.getInterval()
                assert.equals(raffleState.toString(), "0")
                assert.equals(interval.toString(), networkConfig[chainId]["interval"])
            })
        })

    })