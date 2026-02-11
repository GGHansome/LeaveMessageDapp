import { useState, useEffect } from 'react';
import { useConnection, useWriteContract, usePublicClient, useChainId, useReadContract } from 'wagmi';
import { message as antMessage } from 'antd';
import { formatEther, parseEther } from 'viem';
import { messageBoardAbi, messageBoardAddresses } from '../abi';
import { MessageBoardUI, type MessageItem } from '../components/MessageBoardUI';

// Define the structure returned by the contract
interface ContractMessage {
  sender: string;
  content: string;
  timestamp: bigint;
}

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
  const [viewMode, setViewMode] = useState<'ALL' | 'FILTERED'>('ALL'); // 新增状态
  
  // New state
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isTipping, setIsTipping] = useState(false);

  // Fetch Balance using useReadContract
  const { data: balanceData, refetch: refetchBalance } = useReadContract({
    address: messageBoardAddress,
    abi: messageBoardAbi,
    functionName: 'balances',
    args: address ? [address] : undefined,
    query: {
        enabled: !!address && !!messageBoardAddress,
    }
  });

  const { data: allMessagesData, refetch: refetchAllMessages } = useReadContract({
    address: messageBoardAddress,
    abi: messageBoardAbi,
    functionName: 'getAllMessages',
    query: {
      enabled: !!messageBoardAddress,
    }
  });

  useEffect(() => {
    if (allMessagesData) {
      const formattedMessages: MessageItem[] = (allMessagesData as unknown as ContractMessage[]).map((msg, index) => ({
        index: index,
        sender: msg.sender,
        content: msg.content,
      }));
      
      // 如果处于 "ALL" 模式，使用 formattedMessages 更新 UI
      if (viewMode === 'ALL') {
        setMessages(formattedMessages);
      }
    }
  }, [allMessagesData, viewMode]); // 依赖 viewMode 而不是 queryAddress

  const balance = balanceData ? formatEther(balanceData) : '0';

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
      setTimeout(() => refetchAllMessages(), 5000);
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
    // 设置为 FILTERED 模式
    setViewMode('FILTERED');

    try {
        if (!publicClient) throw new Error("Public client not initialized");

      // 1. Fetch messages using the new optimized function
      const messagesData = await publicClient.readContract({
        address: messageBoardAddress,
        abi: messageBoardAbi,
        functionName: 'getMessagesByUser',
        args: [targetAddr as `0x${string}`],
      }) as ContractMessage[]; // Type assertion here

      // messagesData is an array of structs: [{sender, content, timestamp}, ...]
      // We map it to the UI format
      const loadedMessages: MessageItem[] = messagesData.map((msg, index) => ({
        index: index,
        sender: msg.sender,
        content: msg.content,
      }));

      if (loadedMessages.length === 0) {
        antMessage.info('该地址没有留言');
        setMessages([]);
      } else {
        setMessages(loadedMessages);
        antMessage.success(`查询成功，共找到 ${loadedMessages.length} 条留言`);
      }

    } catch (error) {
      console.error(error);
      antMessage.error('查询留言失败');
    } finally {
      setLoading(false);
    }
  };

  const handleShowAll = () => {
    setViewMode('ALL');
    setQueryAddress('');
    refetchAllMessages();
    // 触发 effect 更新
  };

  const handleQueryMyMessages = () => {
    if (address) {
      setQueryAddress(address);
      fetchMessages(address);
    } else {
      antMessage.warning('请先连接钱包');
    }
  };

  const handleTipUser = async (target: string, amount: string) => {
    if (!isConnected) {
       antMessage.warning('请先连接钱包');
       return;
   }
   if (!messageBoardAddress) {
       antMessage.error('Contract not found');
       return;
   }
   setIsTipping(true);
   try {
       await writeContractAsync({
           address: messageBoardAddress,
           abi: messageBoardAbi,
           functionName: 'tipUser',
           args: [target as `0x${string}`],
           value: parseEther(amount),
       });
       antMessage.success('打赏成功！等待确认...');
       // 为了保险起见，这里本来可以刷新余额，但实际上，打赏通常只是减少发送者自己钱包的原生ETH余额，
       // 并不会影响其在合约中的余额（除非合约机制有特殊设计）。
       // 注意，balances[target] += msg.value 表示收款人的合约余额增加，
       // 而打赏人（sender）的合约余额并不会变化，打赏的钱是直接从钱包发送，不经过sender在合约的余额。
       // 所以，这里其实不需要刷新打赏人（发送人）的合约余额，只是有时候为了显示最新状态刷一下也没坏处。
       // 如果将来支持“从合约余额里给别人打赏”（目前未实现），那就需要刷新余额了。
   } catch (error) {
       console.error(error);
       antMessage.error('打赏失败');
   } finally {
       setIsTipping(false);
   }
 };

 const handleWithdraw = async () => {
    if (!isConnected) {
       antMessage.warning('请先连接钱包');
       return;
   }
    if (!messageBoardAddress) {
       antMessage.error('Contract not found');
       return;
   }
   setIsWithdrawing(true);
   try {
        await writeContractAsync({
           address: messageBoardAddress,
           abi: messageBoardAbi,
           functionName: 'withdraw',
       });
       antMessage.success('提现申请已提交！');
       // Refresh balance after a delay
       setTimeout(() => refetchBalance(), 5000);
   } catch (error) {
       console.error(error);
       antMessage.error('提现失败');
   } finally {
       setIsWithdrawing(false);
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
      onShowAll={handleShowAll}
      loading={loading}
      messages={messages}
      balance={balance}
      onWithdraw={handleWithdraw}
      isWithdrawing={isWithdrawing}
      onTip={handleTipUser}
      isTipping={isTipping}
    />
  );
}
