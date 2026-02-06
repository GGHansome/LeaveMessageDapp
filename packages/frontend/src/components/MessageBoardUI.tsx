import React from 'react';
import { Card, Input, Button, List, Typography, Space, Divider } from 'antd';

const { TextArea } = Input;
const { Title, Text } = Typography;

export interface MessageItem {
  index: number;
  sender: string;
  content: string;
}

interface MessageBoardUIProps {
  messageInput: string;
  onMessageInputChange: (value: string) => void;
  onLeaveMessage: () => void;
  isWriting: boolean;
  queryAddress: string;
  onQueryAddressChange: (value: string) => void;
  onQueryMessages: () => void;
  onQueryMyMessages: () => void;
  loading: boolean;
  messages: MessageItem[];
}

export const MessageBoardUI: React.FC<MessageBoardUIProps> = ({
  messageInput,
  onMessageInputChange,
  onLeaveMessage,
  isWriting,
  queryAddress,
  onQueryAddressChange,
  onQueryMessages,
  onQueryMyMessages,
  loading,
  messages,
}) => {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 20 }}>
      <Title level={2}>DApp 留言板</Title>
      
      <Card title="发送留言" style={{ marginBottom: 20 }}>
        <Space orientation="vertical" style={{ width: '100%' }}>
          <TextArea 
            rows={4} 
            value={messageInput} 
            onChange={(e) => onMessageInputChange(e.target.value)} 
            placeholder="输入你的留言..." 
          />
          <Button type="primary" onClick={onLeaveMessage} loading={isWriting}>
            发送留言
          </Button>
        </Space>
      </Card>

      <Card title="查询留言">
        <Space orientation="vertical" style={{ width: '100%' }}>
          <Space>
            <Input 
              placeholder="输入钱包地址 0x..." 
              value={queryAddress} 
              onChange={(e) => onQueryAddressChange(e.target.value)}
              style={{ width: 300 }}
            />
            <Button onClick={onQueryMessages} loading={loading}>
              查询留言
            </Button>
            <Button onClick={onQueryMyMessages} loading={loading}>
              查询我的留言
            </Button>
          </Space>

          <Divider />

          <List
            itemLayout="horizontal"
            dataSource={messages}
            loading={loading}
            renderItem={(item) => (
              <List.Item>
                <List.Item.Meta
                  title={<Text strong>第 {item.index + 1} 条留言 (来自: {item.sender})</Text>}
                  description={item.content}
                />
              </List.Item>
            )}
            locale={{ emptyText: '暂无数据' }}
          />
        </Space>
      </Card>
    </div>
  );
};
