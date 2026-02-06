import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider, useConnect, useDisconnect, useConnection, useConnectors } from 'wagmi'
import { config } from './wagmi'
import { MessageBoard } from './business/MessageBoard'
import { Button, Layout, theme } from 'antd'
import './App.css'

const { Header, Content, Footer } = Layout;
const queryClient = new QueryClient()

function ConnectWallet() {
  const { address, isConnected } = useConnection()
  const { mutate: connect } = useConnect()
  const connectors = useConnectors()
  const { mutate: disconnect } = useDisconnect()

  if (isConnected) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ color: 'white' }}>{address?.slice(0, 6)}...{address?.slice(-4)}</span>
        <Button onClick={() => disconnect()}>断开连接</Button>
      </div>
    )
  }

  return (
    <div>
      {connectors.map((connector) => (
        <Button 
          key={connector.uid} 
          onClick={() => connect({ connector })}
          type="primary"
        >
          {connector.name}
        </Button>
      ))}
    </div>
  )
}

function AppContent() {
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ color: 'white', fontSize: '1.2rem', fontWeight: 'bold' }}>Web3 Message Board</div>
        <ConnectWallet />
      </Header>
      <Content style={{ padding: '0 48px', marginTop: '24px' }}>
        <div
          style={{
            background: colorBgContainer,
            minHeight: 280,
            padding: 24,
            borderRadius: borderRadiusLG,
          }}
        >
          <MessageBoard />
        </div>
      </Content>
      <Footer style={{ textAlign: 'center' }}>
        Message DApp ©{new Date().getFullYear()} Created with Ant Design & Wagmi
      </Footer>
    </Layout>
  )
}

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <AppContent />
      </QueryClientProvider>
    </WagmiProvider>
  )
}

export default App
