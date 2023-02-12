const { assert, expect } = require("chai")
const { network, getNamedAccounts, deployments, ethers, log } = require("hardhat")
const { devChains, networkConfig } = require("../../helper-hardhat-config")

devChains.includes(network.name)
    ? describe.skip
    : describe("Raffle Staging Tests", () => {
          let raffle, entranceFee, deployer

          beforeEach(async () => {
              deployer = (await getNamedAccounts()).deployer
              raffle = await ethers.getContract("Raffle", deployer)
              entranceFee = networkConfig[chainId]["entranceFee"]
          })
          describe("fulfillRandomWords", async () => {
              it("Working Chainlink Automation & VRF -> Get a random winner", async () => {
                  const startingTimeStamp = await raffle.getLatestTimeStamp()
                  const accounts = await ethers.getSigners()

                  await new Promise(async (resolve, reject) => {
                      //Setting up the listener before we enter the raffle
                      raffle.once("Winner Picked", async () => {
                          console.log("Winner Picked Event Fired!!!")
                          try {
                              //Getting the values
                              const recentWinner = await raffle.getRecentWinner()
                              const raffleState = await raffle.getRaffleState()
                              const winnerEndBalance = await accounts[0].getBalance()
                              const endingTimeStamp = await raffle.getLatestTimeStamp()

                              //Performing Comparisions
                              //1. Reset Players Array
                              await expect(raffle.getPlayer(0)).to.be.reverted
                              //2. Checking recent winner
                              assert.equal(recentWinner.toString(), accounts[0].address)
                              //Confirming that raffle is open again
                              assert.equal(raffleState, 0)
                              assert.equal(
                                  winnerEndBalance.toString(),
                                  winnerStartBalance.add(entranceFee).toString()
                              )
                              assert(endingTimeStamp > startingTimeStamp)
                              resolve()
                          } catch (error) {
                              reject(error)
                          }
                      })

                      //Entering the raffle
                      await raffle.enterRaffle({ value: entranceFee })
                      const winnerStartBalance = await accounts[0].getBalance()
                  })
              })
          })
      })
