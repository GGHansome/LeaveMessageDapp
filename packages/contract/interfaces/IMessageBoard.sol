// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IMessageBoard {
    // 结构体定义在接口中，方便外部引用
    struct Message {
        address sender;
        string content;
        uint256 timestamp;
    }

    // 事件
    event NewMessage(address indexed sender, string message);
    event TipSent(address indexed from, address indexed to, uint256 amount);
    event Withdraw(address indexed sender, uint256 amount);

    // 函数接口
    function leaveMessage(string memory _msg) external;
    function tipUser(address _target) external payable;
    function withdraw() external;
    function getAllMessages() external view returns (Message[] memory);
    function getMessagesByUser(address user) external view returns (Message[] memory);
}
