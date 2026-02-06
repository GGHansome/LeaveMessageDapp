import { useState } from 'react';
import { useConnection, useWriteContract, usePublicClient, useChainId } from 'wagmi';
import { message as antMessage } from 'antd';
import { messageBoardAbi, messageBoardAddresses } from '../abi';
import { MessageBoardUI, type MessageItem } from '../components/MessageBoardUI';

export function MessageBoard() {
  const { address, isConnected } = useConnection();
  const { mutateAsync: writeContractAsync, isPending: isWriting } = useWriteContract();
  const publicClient = usePublicClient();
  const chainId = useChainId();
  
  // 获取当前链的合约地址，如果没有则默认使用 Sepolia 地址或者 undefined
  const messageBoardAddress = messageBoardAddresses[chainId as keyof typeof messageBoardAddresses] || messageBoardAddresses[11155111]; 

  const [messageInput, setMessageInput] = useState('');
  const [queryAddress, setQueryAddress] = useState('');
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Leave a message
  const handleLeaveMessage = async () => {
    if (!messageInput) {
      antMessage.warning('请输入留言内容');
      return;
    }
    if (!isConnected) {
      antMessage.warning('请先连接钱包');
      return;
    }

    if (!messageBoardAddress) {
        antMessage.error('当前网络不支持该合约');
        return;
    }

    try {
      await writeContractAsync({
        address: messageBoardAddress,
        abi: messageBoardAbi,
        functionName: 'leaveMessage',
        args: [messageInput],
      });
      antMessage.success('留言发送成功！等待交易确认...');
      setMessageInput('');
    } catch (error) {
      console.error(error);
      antMessage.error('留言发送失败');
    }
  };

  // Fetch messages for a specific address
  const fetchMessages = async (targetAddr: string) => {
    if (!targetAddr) {
      antMessage.warning('请输入要查询的地址');
      return;
    }
    
    // Simple address validation
    if (!targetAddr.startsWith('0x') || targetAddr.length !== 42) {
         antMessage.warning('请输入有效的以太坊地址');
         return;
    }

    setLoading(true);
    setMessages([]);

    try {
        if (!publicClient) throw new Error("Public client not initialized");

      // 1. Get message count
      const count = await publicClient.readContract({
        address: messageBoardAddress,
        abi: messageBoardAbi,
        functionName: 'getMessageCount',
        args: [targetAddr as `0x${string}`],
      });

      const messageCount = Number(count);
      
      if (messageCount === 0) {
        antMessage.info('该地址没有留言');
        setLoading(false);
        return;
      }


      // 2. Fetch all messages
      
      /* 
      // 备选方案：使用 multicall 以获得更好的性能
      // 为所有索引准备合约调用
      const calls = [];
      for (let i = 0; i < messageCount; i++) {
        calls.push({
            address: messageBoardAddress,
            abi: messageBoardAbi,
            functionName: 'getMessage',
            args: [targetAddr as `0x${string}`, BigInt(i)]
        } as const);
      }

      // 执行 multicall
      const multicallResults = await publicClient.multicall({
        contracts: calls
      });

      // 映射结果
      const loadedMessagesMulticall: MessageItem[] = multicallResults.map((result, index) => ({
        index: index,
        sender: targetAddr,
        content: result.status === 'success' ? result.result as string : '获取留言失败'
      }));
      // setMessages(loadedMessagesMulticall);
      // return;
      */

      // 如果可能执行 multicall，或者并行请求
      // wagmi publicClient.multicall 很棒，但为了简单起见，我们坚持使用 readContract，或者如果是简单的请求则使用并行 promises
      // 实际上，如果支持的话，publicClient.multicall 的性能更好，但为了安全起见，我们在没有显式 multicall 配置的标准 RPC 下使用并行 readContract，
      // 尽管 viem 处理得很好。
      // 在这个例子中，除非我们想显式使用 multicall，否则为了简单和清晰，我们使用 Promise.all 进行单独读取。
      
      const results = await Promise.all(
        Array.from({ length: messageCount }, (_, i) => 
            publicClient.readContract({
                address: messageBoardAddress,
                abi: messageBoardAbi,
                functionName: 'getMessage',
                args: [targetAddr as `0x${string}`, BigInt(i)]
            })
        )
      );

      const loadedMessages: MessageItem[] = results.map((msg, index) => ({
        index: index,
        sender: targetAddr,
        content: msg as string,
      }));

      setMessages(loadedMessages);
      antMessage.success(`查询成功，共找到 ${messageCount} 条留言`);

    } catch (error) {
      console.error(error);
      antMessage.error('查询留言失败');
    } finally {
      setLoading(false);
    }
  };

  const handleQueryMyMessages = () => {
    if (address) {
      setQueryAddress(address);
      fetchMessages(address);
    } else {
      antMessage.warning('请先连接钱包');
    }
  };

  return (
    <MessageBoardUI
      messageInput={messageInput}
      onMessageInputChange={setMessageInput}
      onLeaveMessage={handleLeaveMessage}
      isWriting={isWriting}
      queryAddress={queryAddress}
      onQueryAddressChange={setQueryAddress}
      onQueryMessages={() => fetchMessages(queryAddress)}
      onQueryMyMessages={handleQueryMyMessages}
      loading={loading}
      messages={messages}
    />
  );
}
