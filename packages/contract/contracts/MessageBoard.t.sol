// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";

import {MessageBoard} from "./MessageBoard.sol";
import {MyToken} from "./MyToken.sol";
import {IMessageBoard} from "../interfaces/IMessageBoard.sol";

contract MessageBoardTest is Test {
    MessageBoard board;
    MyToken token;

    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    address tipper = makeAddr("tipper");

    event NewMessage(address indexed sender, string message);
    event TipSent(address indexed from, address indexed to, uint256 amount);
    event Withdraw(address indexed sender, uint256 amount);
    event TipERC20Sent(address indexed from, address indexed to, address indexed token, uint256 amount);
    event WithdrawERC20(address indexed sender, address indexed token, uint256 amount);

    function setUp() public {
        board = new MessageBoard();
        token = new MyToken(1000000 * 10**18);
    }

    function test_InitialMessage() public view {
        IMessageBoard.Message[] memory messages = board.getAllMessages();
        require(messages.length == 1, "should have 1 initial message");
        require(
            keccak256(bytes(messages[0].content)) ==
                keccak256(bytes("Hello ETH Pandas")),
            "initial content mismatch"
        );
        require(
            messages[0].sender == address(this),
            "initial sender should be test contract"
        );
        require(messages[0].timestamp > 0, "timestamp should be > 0");
    }

    function test_LeaveMessage_AppendsAndEmits() public {
        string memory content = "Hello World";

        vm.expectEmit(true, false, false, true, address(board));
        emit NewMessage(alice, content);

        vm.prank(alice);
        board.leaveMessage(content);

        IMessageBoard.Message[] memory messages = board.getAllMessages();
        require(messages.length == 2, "should append message");
        require(messages[1].sender == alice, "sender mismatch");
        require(
            keccak256(bytes(messages[1].content)) == keccak256(bytes(content)),
            "content mismatch"
        );
        require(messages[1].timestamp > 0, "timestamp should be > 0");
    }

    function test_GetMessagesByUser_FiltersCorrectly() public {
        vm.prank(alice);
        board.leaveMessage("A1");
        vm.prank(bob);
        board.leaveMessage("B1");
        vm.prank(alice);
        board.leaveMessage("A2");

        IMessageBoard.Message[] memory aliceMsgs = board.getMessagesByUser(
            alice
        );
        require(aliceMsgs.length == 2, "alice should have 2 messages");
        require(
            aliceMsgs[0].sender == alice && aliceMsgs[1].sender == alice,
            "sender should be alice"
        );
        require(
            keccak256(bytes(aliceMsgs[0].content)) == keccak256(bytes("A1")),
            "A1 mismatch"
        );
        require(
            keccak256(bytes(aliceMsgs[1].content)) == keccak256(bytes("A2")),
            "A2 mismatch"
        );

        IMessageBoard.Message[] memory bobMsgs = board.getMessagesByUser(bob);
        require(bobMsgs.length == 1, "bob should have 1 message");
        require(bobMsgs[0].sender == bob, "sender should be bob");
        require(
            keccak256(bytes(bobMsgs[0].content)) == keccak256(bytes("B1")),
            "B1 mismatch"
        );
    }

    function test_TipUser_RecordsBalanceAndEmits() public {
        uint256 tipAmount = 1 ether;
        vm.deal(tipper, 10 ether);

        vm.expectEmit(true, true, false, true, address(board));
        emit TipSent(tipper, alice, tipAmount);

        vm.prank(tipper);
        board.tipUser{value: tipAmount}(alice);

        require(board.balances(alice) == tipAmount, "balance should equal tip");
    }

    function test_TipUser_AccumulatesBalance() public {
        vm.deal(tipper, 10 ether);

        vm.prank(tipper);
        board.tipUser{value: 0.25 ether}(alice);
        vm.prank(tipper);
        board.tipUser{value: 0.75 ether}(alice);

        require(board.balances(alice) == 1 ether, "should accumulate tips");
    }

    function test_TipUser_RevertsOnZeroValue() public {
        vm.deal(tipper, 1 ether);

        vm.expectRevert(bytes("Tip amount must be greater than 0"));
        vm.prank(tipper);
        board.tipUser{value: 0}(alice);
    }

    function test_TipUser_RevertsOnZeroAddressTarget() public {
        vm.deal(tipper, 1 ether);

        vm.expectRevert(bytes("Cannot tip address 0"));
        vm.prank(tipper);
        board.tipUser{value: 1 ether}(address(0));
    }

    function test_Withdraw_RevertsWhenNoBalance() public {
        vm.expectRevert(bytes("No balance to withdraw"));
        vm.prank(alice);
        board.withdraw();
    }

    function test_Withdraw_TransfersAndZerosBalanceAndEmits() public {
        uint256 tipAmount = 1 ether;
        vm.deal(tipper, 10 ether);

        vm.prank(tipper);
        board.tipUser{value: tipAmount}(alice);
        require(
            board.balances(alice) == tipAmount,
            "precondition: balance recorded"
        );

        uint256 aliceBefore = alice.balance;

        // avoid gas price affecting balance assertions
        vm.txGasPrice(0);

        vm.expectEmit(true, false, false, true, address(board));
        emit Withdraw(alice, tipAmount);

        vm.prank(alice);
        board.withdraw();

        require(board.balances(alice) == 0, "balance should be zeroed");
        require(
            alice.balance == aliceBefore + tipAmount,
            "alice should receive funds"
        );

        // withdrawing again should fail
        vm.expectRevert(bytes("No balance to withdraw"));
        vm.prank(alice);
        board.withdraw();
    }

    function test_TipUserERC20_RecordsBalanceAndEmits() public {
        uint256 tipAmount = 100 * 10**18;
        token.transfer(tipper, tipAmount);

        vm.startPrank(tipper);
        token.approve(address(board), tipAmount);

        vm.expectEmit(true, true, true, true, address(board));
        emit TipERC20Sent(tipper, alice, address(token), tipAmount);

        board.tipUserERC20(alice, address(token), tipAmount);
        vm.stopPrank();

        require(board.erc20Balances(address(token), alice) == tipAmount, "ERC20 balance should equal tip");
        require(token.balanceOf(address(board)) == tipAmount, "Board should hold tokens");
    }

    function test_WithdrawERC20_TransfersAndZerosBalanceAndEmits() public {
        uint256 tipAmount = 100 * 10**18;
        token.transfer(tipper, tipAmount);

        vm.startPrank(tipper);
        token.approve(address(board), tipAmount);
        board.tipUserERC20(alice, address(token), tipAmount);
        vm.stopPrank();

        uint256 aliceBefore = token.balanceOf(alice);

        vm.expectEmit(true, true, false, true, address(board));
        emit WithdrawERC20(alice, address(token), tipAmount);

        vm.prank(alice);
        board.withdrawERC20(address(token));

        require(board.erc20Balances(address(token), alice) == 0, "ERC20 balance should be zeroed");
        require(token.balanceOf(alice) == aliceBefore + tipAmount, "Alice should receive tokens");
    }
}
