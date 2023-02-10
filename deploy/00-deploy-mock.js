const { network } = require("hardhat")
const { devChains } = require("../helper-hardhat-config")

const BASE_FEE = ethers.utils.parseEther("0.25")
const GAS_PRICE_LINK = 1e9

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()

    //Checking if it is a local network and then deloying mocks
    if (devChains.includes(network.name)) {
        log("Local network detected! Deploying Mocks..")
        await deploy("VRFCoordinatorV2Mock", {
            from: deployer,
            log: true,
            args: [BASE_FEE, GAS_PRICE_LINK],
        })
        log("Mocks Deployed!")
        log("------------------------------------------------------")
    }
}

module.exports.tags = ["all", "mocks"]
