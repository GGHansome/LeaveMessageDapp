import React, { useState } from 'react';
import { Card, Input, Button, List, Typography, Space, Divider, Modal, InputNumber, Statistic, Row, Col } from 'antd';

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
  onShowAll: () => void; // New prop
  loading: boolean;
  messages: MessageItem[];
  // New props
  balance: string;
  onWithdraw: () => void;
  isWithdrawing: boolean;
  onTip: (target: string, amount: string) => void;
  isTipping: boolean;
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
  onShowAll,
  loading,
  messages,
  balance,
  onWithdraw,
  isWithdrawing,
  onTip,
  isTipping,
}) => {
  const [tipModalVisible, setTipModalVisible] = useState(false);
  const [tipTarget, setTipTarget] = useState('');
  const [tipAmount, setTipAmount] = useState<string>('0.01');

  const handleOpenTipModal = (target: string) => {
    setTipTarget(target);
    setTipAmount('0.01');
    setTipModalVisible(true);
  };

  const handleConfirmTip = () => {
    onTip(tipTarget, tipAmount);
    setTipModalVisible(false);
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 20 }}>
      <Row justify="space-between" align="middle">
        <Col>
          <Title level={2}>DApp 留言板</Title>
        </Col>
        <Col>
          <Card size="small" style={{ width: 300 }}>
            <Statistic
              title="可提现余额 (ETH)"
              value={balance}
              precision={4}
              suffix={
                <Button 
                  type="primary" 
                  size="small" 
                  onClick={onWithdraw} 
                  loading={isWithdrawing}
                  disabled={!balance || balance === '0' || balance === '0.0'}
                >
                  提现
                </Button>
              }
            />
          </Card>
        </Col>
      </Row>
      
      <Card title="发送留言" style={{ marginBottom: 20, marginTop: 20 }}>
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
            <Button onClick={onShowAll} loading={loading}>
              显示全部
            </Button>
          </Space>

          <Divider />

          <List
            itemLayout="horizontal"
            dataSource={messages}
            loading={loading}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <Button type="link" onClick={() => handleOpenTipModal(item.sender)}>
                    打赏
                  </Button>
                ]}
              >
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

      <Modal
        title={`打赏给 ${tipTarget}`}
        open={tipModalVisible}
        onOk={handleConfirmTip}
        onCancel={() => setTipModalVisible(false)}
        confirmLoading={isTipping}
      >
        <p>请输入打赏金额 (ETH):</p>
        <InputNumber
          style={{ width: '100%' }}
          min="0"
          step="0.001"
          stringMode
          value={tipAmount}
          onChange={(val) => setTipAmount(val || '0')}
          suffix="lolhostETH"
        />
      </Modal>
    </div>
  );
};
