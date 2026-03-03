import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { parseEther } from "viem";

export default buildModule("MessageLeaveModule", (m) => {
  const messageLeave = m.contract("MessageBoard");
  const myToken = m.contract("MyToken", [parseEther("1000000")]);

  m.call(messageLeave, "leaveMessage", ["Hello ETH Pandas"]);

  return { messageLeave, myToken };
});