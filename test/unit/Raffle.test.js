const { assert, expect } = require("chai")
const { network, getNamedAccounts, deployments, ethers, log } = require("hardhat")
const { devChains, networkConfig } = require("../../helper-hardhat-config")

!devChains.includes(network.name)
    ? describe.skip
    : describe("Raffle Unit Tests", () => {
          let raffle,
              vrfCoordinatorV2Mock,
              entranceFee = ethers.utils.parseEther("0.2"),
              deployer,
              interval,
              userA,
              userB
          const chainId = network.config.chainId

          beforeEach(async () => {
              deployer = (await getNamedAccounts()).deployer
              await deployments.fixture(["all"])
              raffle = await ethers.getContract("Raffle", deployer)
              vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer)
              interval = await raffle.getInterval()
          })

          describe("Constructor", () => {
              it("Raffle State", async () => {
                  const raffleState = await raffle.getRaffleState()
                  assert.equal(raffleState.toString(), "0")
              })
              it("Interval", async () => {
                  assert.equal(interval.toString(), networkConfig[chainId]["interval"])
              })
          })

          describe("Enter Raffle", () => {
              it("Reverts if not paying enough ETH", async () => {
                  await expect(raffle.enterRaffle()).to.be.reverted
              })

              it("Reverts if Raffle not Open", async () => {
                  await raffle.enterRaffle({ value: entranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  await raffle.performUpkeep([])
                  expect(raffle.enterRaffle({ value: entranceFee })).to.be.reverted
              })

              it("Records the players when they enter the raffle", async () => {
                  await raffle.enterRaffle({ value: entranceFee })
                  const recordedPlayer = await raffle.getPlayer(0)
                  assert.equal(recordedPlayer, deployer)
              })

              it("Emits an event", async () => {
                  await expect(raffle.enterRaffle({ value: entranceFee })).to.emit(
                      raffle,
                      "RaffleEnter"
                  )
              })
          })

          describe("checkUpkeep", () => {
              it("returns false if people haven't sent any ETH", async () => {
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.request({ method: "evm_mine", params: [] })
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x") // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
                  assert(!upkeepNeeded)
              })
              it("returns false if raffle isn't open", async () => {
                  await raffle.enterRaffle({ value: entranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.request({ method: "evm_mine", params: [] })
                  await raffle.performUpkeep([]) // changes the state to calculating
                  const raffleState = await raffle.getRaffleState() // stores the new state
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x") // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
                  assert.equal(raffleState.toString() == "1", upkeepNeeded == false)
              })
              it("returns false if enough time hasn't passed", async () => {
                  await raffle.enterRaffle({ value: entranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() - 5]) // use a higher number here if this test fails
                  await network.provider.request({ method: "evm_mine", params: [] })
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x") // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
                  assert(!upkeepNeeded)
              })
              it("returns true if enough time has passed, has players, eth, and is open", async () => {
                  await raffle.enterRaffle({ value: entranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.request({ method: "evm_mine", params: [] })
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x") // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
                  assert(upkeepNeeded)
              })
          })

          describe("performUpkeep", function () {
              it("can only run if checkupkeep is true", async () => {
                  await raffle.enterRaffle({ value: entranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.request({ method: "evm_mine", params: [] })
                  const tx = await raffle.performUpkeep("0x")
                  assert(tx)
              })
              it("reverts if checkup is false", async () => {
                  await expect(raffle.performUpkeep("0x")).to.be.revertedWith(
                      "Raffle__UpkeepNotNeeded"
                  )
              })
          })

          describe("fulfillRandomWords", () => {
              beforeEach(async () => {
                  await raffle.enterRaffle({ value: entranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.request({ method: "evm_mine", params: [] })
              })
              it("can only be called after performUpKeep", async () => {
                  await expect(vrfCoordinatorV2Mock.fulfillRandomWords(0, raffle.address)).to.be
                      .reverted
                  await expect(vrfCoordinatorV2Mock.fulfillRandomWords(1, raffle.address)).to.be
                      .reverted
              })
              it("Picks a winner, resets the lottery and sends the money", async () => {
                  //Getting the user accounts
                  const accounts = await ethers.getSigners()
                  const additionalEntrances = 3 // to test
                  const startingIndex = 2
                  //People are entering the lottery
                  for (let i = startingIndex; i < startingIndex + additionalEntrances; i++) {
                      const Connected = await raffle.connect(accounts[i])
                      await Connected.enterRaffle({ value: entranceFee })
                  }
                  const currTimeStamp = await raffle.getLatestTimeStamp()

                  await new Promise(async (resolve, reject) => {
                      //Listener
                      raffle.once("WinnerPicked", async () => {
                          console.log("Found the event!")
                          try {
                              //const recentWinner = await raffle.getRecentWinner()
                              const numPlayers = await raffle.getNumOfPlayers()
                              const endingTimeStamp = await raffle.getLatestTimeStamp()
                              const raffleState = await raffle.getRaffleState()

                              //   console.log("Participants:")
                              //   console.log(accounts[0].address)
                              //   console.log(accounts[1].address)
                              //   console.log(accounts[2].address)
                              //   console.log("Winner:")
                              //   console.log(recentWinner)
                              const winnerEndBalance = await accounts[2].getBalance()

                              //Checking all the conditions
                              assert.equal(
                                  winnerEndBalance.toString(),
                                  winnerStartBalance // startingBalance + ( (raffleEntranceFee * additionalEntrances) + raffleEntranceFee )
                                      .add(entranceFee.mul(additionalEntrances).add(entranceFee))
                                      .toString()
                              )
                              assert(numPlayers == "0")
                              assert(endingTimeStamp > currTimeStamp)
                              assert.equal(raffleState, 0)
                          } catch (error) {
                              reject(error)
                          }
                          resolve()
                      })
                      //Mocking the Chainlink Automation
                      const tx = await raffle.performUpkeep([])
                      const txReciept = await tx.wait(1)
                      //Getting winners starting balance
                      const winnerStartBalance = await accounts[2].getBalance()
                      //Mocking the Chainlink VRF
                      await vrfCoordinatorV2Mock.fulfillRandomWords(
                          txReciept.events[1].args.requestId,
                          raffle.address
                      )
                  })
              })
          })
      })
