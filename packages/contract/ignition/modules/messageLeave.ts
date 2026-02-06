import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("MessageLeaveModule", (m) => {
  const messageLeave = m.contract("MessageBoard");

  m.call(messageLeave, "leaveMessage", ["Hello ETH Pandas"]);

  return { messageLeave };
});