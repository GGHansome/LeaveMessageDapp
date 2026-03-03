// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/IMessageBoard.sol";

// 继承 IMessageBoard 接口
contract MessageBoard is ReentrancyGuard, IMessageBoard {
    // 唯一的留言存储：保存所有留言的全局数组
    Message[] public allMessages;

    // 账本，记录每个用户账户里有多少可提现的余额
    mapping(address => uint256) public balances;

    // ERC20 账本，记录每个用户账户里有多少可提现的特定 ERC20 代币余额 (tokenAddress => userAddress => balance)
    mapping(address => mapping(address => uint256)) public erc20Balances;

    constructor() {
        string memory initMsg = "Hello ETH Pandas";
        // 只需要推送到 allMessages
        allMessages.push(Message(msg.sender, initMsg, block.timestamp));
        emit NewMessage(msg.sender, initMsg);
    }

    // 发送一条留言
    function leaveMessage(string memory _msg) public override {
        // 只需要推送到 allMessages，省去了一次 Mapping 写入的 Gas
        allMessages.push(Message(msg.sender, _msg, block.timestamp));
        emit NewMessage(msg.sender, _msg);
    }

    // 打赏功能
    function tipUser(address _target) public payable override {
        require(msg.value > 0, "Tip amount must be greater than 0");
        require(_target != address(0), "Cannot tip address 0");
        balances[_target] += msg.value;
        emit TipSent(msg.sender, _target, msg.value);
    }

    // 提现功能
    function withdraw() public override nonReentrant {
        uint256 amount = balances[msg.sender];
        require(amount > 0, "No balance to withdraw");
        balances[msg.sender] = 0;
        emit Withdraw(msg.sender, amount);
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
    }

    // ERC20 打赏功能
    function tipUserERC20(address _target, address _token, uint256 _amount) public override {
        require(_amount > 0, "Tip amount must be greater than 0");
        require(_target != address(0), "Cannot tip address 0");
        require(_token != address(0), "Invalid token address");

        // 将代币从打赏者转移到合约
        bool success = IERC20(_token).transferFrom(msg.sender, address(this), _amount);
        require(success, "ERC20 transfer failed");

        // 记录被打赏者的余额
        erc20Balances[_token][_target] += _amount;
        emit TipERC20Sent(msg.sender, _target, _token, _amount);
    }

    // ERC20 提现功能
    function withdrawERC20(address _token) public override nonReentrant {
        require(_token != address(0), "Invalid token address");
        uint256 amount = erc20Balances[_token][msg.sender];
        require(amount > 0, "No ERC20 balance to withdraw");
        
        erc20Balances[_token][msg.sender] = 0;
        emit WithdrawERC20(msg.sender, _token, amount);
        
        // 将代币转移给提现者
        bool success = IERC20(_token).transfer(msg.sender, amount);
        require(success, "ERC20 transfer failed");
    }

    // 获取所有留言
    function getAllMessages() public view override returns (Message[] memory) {
        return allMessages;
    }

    // 新增：根据地址获取留言 (替代原来的 Mapping 查询)
    function getMessagesByUser(
        address user
    ) public view returns (Message[] memory) {
        uint256 count = 0;
        // 第一遍循环：计算数量
        for (uint i = 0; i < allMessages.length; i++) {
            if (allMessages[i].sender == user) {
                count++;
            }
        }

        // 第二遍循环：填充数组
        Message[] memory userMsgs = new Message[](count);
        uint256 j = 0;
        for (uint i = 0; i < allMessages.length; i++) {
            if (allMessages[i].sender == user) {
                userMsgs[j] = allMessages[i];
                j++;
            }
        }
        return userMsgs;
    }
}
