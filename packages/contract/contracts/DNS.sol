// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

contract DNS {
    struct Record {
        address owner;
        uint64 expiresAt;
    }
    mapping(string => Record) public records;
    mapping(address => string[]) public usernames;

    error UsernameExpired(address owner, uint64 expiresAt, string errorMessage);

    event registerEvent(address indexed owner, string indexed username, uint64 expiresAt);
    event renewalEvent(string indexed username, uint64 expiresAt);
    event transferEvent(address indexed oldOwner, address indexed newOwner, string indexed username);

    function register(string calldata username) public payable {
        require(msg.value >= 0.001 ether, "Name must be paid for 0.001 ether");
        require(
            bytes(username).length >= 3 && bytes(username).length <= 20,
            "Name must be between 3 and 20 characters"
        );
        require(_isAlphaNumeric(username), "Name can only contain numbers and letters");
        Record storage record = records[username];
        require(record.owner == address(0), "Name already taken");
        record.owner = msg.sender;
        record.expiresAt = uint64(block.timestamp + 365 days);
        usernames[msg.sender].push(username);
        emit registerEvent(msg.sender, username, uint64(block.timestamp + 365 days));
    }

    function transfer(string calldata username, address newOwner) public {
        Record storage record = records[username];
        require(record.owner != address(0), "Username not found");
        require(record.owner == msg.sender, "You are not the owner of this username");
        if (record.expiresAt <= block.timestamp) {
            revert UsernameExpired(
                record.owner,
                record.expiresAt,
                "Username expired You could call renewal function to renew it"
            );
        }
        record.owner = newOwner;
        usernames[newOwner].push(username);
        _removeUsername(usernames[msg.sender], username);
        emit transferEvent(msg.sender, newOwner, username);
    }

    function renewal(string calldata username) public payable {
        Record storage record = records[username];
        require(record.owner != address(0), "Username not found");
        require(record.owner == msg.sender, "You are not the owner of this username");
        require(record.expiresAt < block.timestamp, "Username not expired");
        require(msg.value >= 0.001 ether, "Name must be paid for 0.001 ether");
        record.expiresAt = uint64(block.timestamp + 365 days);
        emit renewalEvent(username, uint64(block.timestamp + 365 days));
    }

    function resolve(string calldata username) public view returns (address, uint64) {
        Record memory record = records[username];
        require(record.owner != address(0), "Username not found");
        if (record.expiresAt <= block.timestamp) {
            revert UsernameExpired(
                record.owner,
                record.expiresAt,
                "Username expired You could call renewal function to renew it"
            );
        }
        return (record.owner, record.expiresAt);
    }

    function getUsername(address owner) public view returns (string[] memory) {
        string[] memory _usernames = usernames[owner];
        require(_usernames.length > 0, "No username found");
        return _usernames;
    }

    function _removeUsername(string[] storage arr, string calldata username) private {
        uint256 len = arr.length;
        for (uint256 i = 0; i < len; i++) {
            if (keccak256(bytes(arr[i])) == keccak256(bytes(username))) {
                arr[i] = arr[len - 1];
                arr.pop();
                return;
            }
        }
    }

    function _isAlphaNumeric(string calldata username) private pure returns (bool) {
        bytes memory b = bytes(username);
        for (uint i = 0; i < b.length; i++) {
            bytes1 c = b[i];
            if (!((c >= "a" && c <= "z") || (c >= "0" && c <= "9"))) {
                return false;
            }
        }
        return true;
    }
}

/** 
 * ---

下面是详细的对比分析：

---

## 一、整体评价

**老师的合约设计更完善**，但你的合约也有自己的特色之处。以下逐项分析。

---

## 二、你的合约存在的问题

### 1. `renewal` 逻辑反了（严重 Bug）

```54:54:packages/contract/contracts/DNS.sol
require(record.expiresAt < block.timestamp, "Username not expired");
```

这行要求"必须已过期才能续费"，这完全不合理。用户应该在**到期之前**就能续费，否则域名一过期就无法续费了（因为注册检查 `owner == address(0)` 会失败，而续费检查又要求已过期）。老师的合约逻辑是正确的：**未过期才能续费**。

### 2. `mapping(string => Record)` 的 key 效率问题

你已经了解这个问题了，`string` 做 key 的 gas 成本比 `bytes32` 高。

### 3. `mapping(address => string[])` 的删除代价高昂

```10:10:packages/contract/contracts/DNS.sol
mapping(address => string[]) public usernames;
```

你允许一个地址注册多个用户名，`transfer` 时需要遍历整个数组删除元素（`_removeUsername`），如果一个地址注册了很多名字，这个 `for` 循环的 gas 会随着数组长度线性增长，存在**gas 耗尽风险**（DoS 攻击向量）。

老师用的是 `mapping(address => bytes32)`，一个地址只绑定一个名字，不存在这个问题。

### 4. 没有 `withdraw` 功能

合约收了 ETH 注册费之后，没有任何提取机制，ETH 永远锁在合约里。老师提供了 `withdraw` 函数给合约 owner 提取。

### 5. 没有 `isAvailable` 查询功能

没有提供给前端查询某个名字是否可注册的只读接口，用户体验较差。

### 6. `register` 未处理过期名字的重新注册

```26:26:packages/contract/contracts/DNS.sol
require(record.owner == address(0), "Name already taken");
```

只判断了 `owner == address(0)`，没有考虑**名字已过期但 owner 不为 0** 的情况。即某个名字注册了但到期了，其他人依然无法重新注册它，永久被占用。老师的合约正确处理了这种情况：

```solidity
// 老师的处理
if (reg.owner != address(0) && reg.expiry > block.timestamp) {
    revert NameNotAvailable(_name);
}
```

### 7. Event 命名不符合规范

```14:16:packages/contract/contracts/DNS.sol
event registerEvent(address indexed owner, string indexed username, uint64 expiresAt);
event renewalEvent(string indexed username, uint64 expiresAt);
event transferEvent(address indexed oldOwner, address indexed newOwner, string indexed username);
```

Solidity 约定 Event 名应以**大写字母开头**（PascalCase），如 `NameRegistered`、`NameRenewed`、`NameTransferred`，这是 Solidity 社区的编码规范。

### 8. `string indexed` 在 event 中是哈希，不可检索原始值

```14:14:packages/contract/contracts/DNS.sol
event registerEvent(address indexed owner, string indexed username, uint64 expiresAt);
```

`string` 类型的 indexed 参数在链上实际存储的是 `keccak256(username)`，链下监听时无法直接获取原始字符串（需要提前知道值才能匹配）。老师的做法是 indexed 存 `bytes32 nameHash`，同时非 indexed 存原始 `string name`，两者都能用。

### 9. `_isAlphaNumeric` 只支持小写，不支持大写字母

```94:94:packages/contract/contracts/DNS.sol
if (!((c >= "a" && c <= "z") || (c >= "0" && c <= "9"))) {
```

你的校验只允许小写字母和数字，不允许大写。老师的合约同时支持大小写。这不一定是 bug（取决于业务设计），但如果叫"alphanumeric"却不支持大写，命名和行为不一致。

---

## 三、你比老师好的地方

### 允许一个地址持有多个用户名

```10:10:packages/contract/contracts/DNS.sol
mapping(address => string[]) public usernames;
```

老师的合约一个地址只能绑定一个名字（`AlreadyHasName` 错误），而你允许一个地址注册多个用户名，这在某些场景下（比如企业用户）更灵活。

---

## 四、总结对比表

| 对比维度 | 你的合约 | 老师的合约 |
|---|---|---|
| mapping key 效率 | `string`（低效） | `bytes32`（高效） |
| 过期名字可重新注册 | 不支持（Bug） | 支持 |
| renewal 逻辑 | 反了（Bug） | 正确 |
| 提取费用 | 无 | 有 `withdraw` |
| 查询是否可注册 | 无 | 有 `isAvailable` |
| 单地址多用户名 | 支持 | 不支持 |
| 数组删除 gas 风险 | 存在 | 不存在 |
| Event 命名规范 | 不规范 | 规范 |
| custom error 使用 | 部分使用 | 全面使用 |
| 费用常量化 | 无常量 | 有 `REGISTRATION_FEE` 等常量 |

**结论**：老师的合约整体设计更好，特别是在安全性（gas DoS 防护）、正确性（renewal 逻辑、过期重注册）和工程规范（命名、常量）上更完善。你可以重点修复上面标注的几个 Bug，并参考老师的 `bytes32` key 方案重构存储结构。

---
 */