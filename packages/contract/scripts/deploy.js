import { execSync } from 'child_process';

// 获取传入的模块名称参数
// npm run deploy -- <module_name>
// process.argv[2] 将是 <module_name>
let moduleName = process.argv[2];

console.log(process.argv);

if (!moduleName) {
  console.error('\x1b[31m%s\x1b[0m', 'Error: Please provide a module name.');
  console.error('Usage: npm run deploy <module_name>');
  console.error('Example: npm run deploy messageLeave');
  process.exit(1);
}

// 处理文件名，确保有 .ts 后缀（如果用户没输的话）
const fileName = moduleName.endsWith('.ts') ? moduleName : `${moduleName}.ts`;
const modulePath = `ignition/modules/${fileName}`;

console.log(`Deploying module: ${fileName}...`);

try {
  // 构建并执行 hardhat ignition deploy 命令
  // 使用 --network localhost，您可以根据需要修改或通过参数传入
  const cmd = `pnpm hardhat ignition deploy ${modulePath} --network localhost`;
  console.log(`Running command: ${cmd}`);
  
  execSync(cmd, { stdio: 'inherit' });
} catch (error) {
  console.error('\x1b[31m%s\x1b[0m', 'Deployment failed.');
  process.exit(1);
}
