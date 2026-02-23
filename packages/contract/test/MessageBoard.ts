import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { getAddress, parseEther } from "viem";

describe("MessageBoard Integration Flow", async function () {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();

  it("Should support a full creator lifecycle: Leave Message -> Receive Tips -> Withdraw", async function () {
    // --- 0. 准备角色 ---
    const [deployer, aliceWallet, bobWallet] = await viem.getWalletClients();
    const aliceAddress = aliceWallet.account.address;
    const bobAddress = bobWallet.account.address;

    // --- 1. 部署合约 ---
    console.log("Step 1: Deploying contract...");
    const messageBoard = await viem.deployContract("MessageBoard");
    
    // 验证初始状态
    const initialMessages = await messageBoard.read.getAllMessages();
    assert.equal(initialMessages.length, 1);
    console.log("Contract deployed with initial message.");


    // --- 2. Alice 发布留言 ---
    console.log("Step 2: Alice leaves a message...");
    const messageBoardAsAlice = await viem.getContractAt(
      "MessageBoard",
      messageBoard.address,
      { client: { wallet: aliceWallet } }
    );

    const aliceContent = "Learning Solidity is fun! 🚀";
    await messageBoardAsAlice.write.leaveMessage([aliceContent]);

    // 验证留言已上链
    const allMessages = await messageBoard.read.getAllMessages();
    assert.equal(allMessages.length, 2);
    assert.equal(allMessages[1].content, aliceContent);
    assert.equal(allMessages[1].sender.toLowerCase(), aliceAddress.toLowerCase());
    console.log("Alice's message confirmed on-chain.");


    // --- 3. Bob 给 Alice 打赏 (分两次) ---
    console.log("Step 3: Bob tips Alice...");
    const messageBoardAsBob = await viem.getContractAt(
      "MessageBoard",
      messageBoard.address,
      { client: { wallet: bobWallet } }
    );

    const tip1 = parseEther("1");
    const tip2 = parseEther("0.5");

    // Bob 第一次打赏 1 ETH
    await messageBoardAsBob.write.tipUser([aliceAddress], { value: tip1 });
    // Bob 第二次打赏 0.5 ETH
    await messageBoardAsBob.write.tipUser([aliceAddress], { value: tip2 });

    // 验证合约记录的余额
    const aliceContractBalance = await messageBoard.read.balances([aliceAddress]);
    assert.equal(aliceContractBalance, tip1 + tip2);
    console.log(`Alice's balance in contract is now ${aliceContractBalance} wei.`);


    // --- 4. Alice 提现 ---
    console.log("Step 4: Alice withdraws funds...");
    
    // 记录 Alice 提现前的钱包余额
    const aliceWalletBalanceBefore = await publicClient.getBalance({ address: aliceAddress });

    // Alice 执行提现
    const hash = await messageBoardAsAlice.write.withdraw();
    
    // 等待交易确认并计算 Gas 费
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    const gasUsed = receipt.gasUsed * receipt.effectiveGasPrice;

    // 记录 Alice 提现后的钱包余额
    const aliceWalletBalanceAfter = await publicClient.getBalance({ address: aliceAddress });

    // --- 5. 最终验证 ---
    
    // 验证1: 钱包余额增加了 (提现金额 - Gas费)
    // After = Before + (Tip1 + Tip2) - Gas
    const expectedBalance = aliceWalletBalanceBefore + (tip1 + tip2) - gasUsed;
    assert.equal(aliceWalletBalanceAfter, expectedBalance);

    // 验证2: 合约里的记录归零了
    const finalContractBalance = await messageBoard.read.balances([aliceAddress]);
    assert.equal(finalContractBalance, 0n);

    console.log("Withdrawal successful! Flow complete.");
  });
});