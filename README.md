# LeaveMessage Dapp 项目

一个去中心化的留言板应用，基于以太坊智能合约和 React 前端构建。

## 项目结构

本项目使用 pnpm workspace 管理，包含两个子项目：

- `packages/contract/` - 智能合约项目
- `packages/frontend/` - React 前端项目

## 开发日志

### 2026年2月2日
- 完成 messageLeave 智能合约的开发
- 在 Remix 上部署合约并进行测试
- 完成本地测试验证

### 2026年2月3日
- 完成 messageLeave Dapp 前端开发
- 将 messageLeave 合约部署到测试链
- 实现前端与测试链合约的交互功能
- 验证 Dapp 与合约的完整交互流程

### 2026年2月4日
- 重构项目结构，采用 monorepo 架构
- 使用 pnpm workspace 将合约和前端项目分离
- 优化项目目录组织，提高代码可维护性

### 2026年2月6日
- 前端重构：将 `MessageBoard` 组件拆分为业务逻辑层 (`business/MessageBoard.tsx`) 和 UI 展示层 (`components/MessageBoardUI.tsx`)，实现逻辑与视图分离。
- 合约部署：通过 Hardhat 进行本地链部署，并将合约部署至本地链上进行测试。
- 多链支持：前端通过 Wagmi 实现多链连接支持。
- 配置更新：更新 ABI 文件及 Wagmi 配置。

### 2026年2月11日
- **合约功能增强**:
  - 新增 `tipUser` 打赏功能，支持用户向留言者发送 ETH 打赏。
  - 新增 `withdraw` 提现功能，允许用户提取收到的打赏金额。
  - 引入 `IMessageBoard` 接口，规范合约结构。
- **前端交互更新**:
  - UI 新增"可提现余额"展示及提现按钮。
  - 留言列表项新增"打赏"按钮，支持自定义打赏金额。
  - 完成打赏与提现功能的合约交互对接。

## 快速开始

### 安装依赖
```bash
pnpm install
```

### 合约开发
```bash
cd packages/contract
pnpm install
# 编译合约
pnpm hardhat compile
# 运行测试
pnpm hardhat test
```

### 前端开发
```bash
cd packages/frontend
pnpm install
# 启动开发服务器
pnpm dev
```

## 技术栈

- **智能合约**: Solidity, Hardhat
- **前端**: React, TypeScript, Vite, Wagmi
- **包管理**: pnpm workspace
