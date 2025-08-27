import React, { useState, useEffect } from 'react';
import { Layout, Menu, Typography, Button, Space, Card, Row, Col } from 'antd';
import { PlaySquareOutlined, PauseCircleOutlined, ReloadOutlined, BarChartOutlined } from '@ant-design/icons';
import Canvas from './components/Canvas';
import MachinePalette from './components/MachinePalette';
import ProductionChart from './components/ProductionChart';
import StatusPanel from './components/StatusPanel';
import { productionAPI } from './services/api';
import './App.css';

const { Header, Content, Sider } = Layout;
const { Title } = Typography;

const App = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [selectedKey, setSelectedKey] = useState('canvas');
  const [isRunning, setIsRunning] = useState(false);
  const [productionData, setProductionData] = useState(null);

  useEffect(() => {
    fetchProductionOverview();
    
    // 设置定时器定期更新生产概览数据
    const interval = setInterval(fetchProductionOverview, 2000); // 每2秒更新一次
    
    return () => clearInterval(interval);
  }, []);

  const fetchProductionOverview = async () => {
    try {
      const response = await productionAPI.getOverview();
      setProductionData(response.data);
    } catch (error) {
      console.error('获取生产概览失败:', error);
    }
  };

  const handleStartSimulation = () => {
    setIsRunning(true);
    // 这里可以添加启动模拟的逻辑
  };

  const handleStopSimulation = () => {
    setIsRunning(false);
    // 这里可以添加停止模拟的逻辑
  };

  const handleReset = () => {
    setIsRunning(false);
    // 这里可以添加重置模拟的逻辑
  };

  const renderContent = () => {
    switch (selectedKey) {
      case 'canvas':
        return <Canvas />;
      case 'charts':
        return <ProductionChart />;
      case 'status':
        return <StatusPanel />;
      default:
        return <Canvas />;
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', width: '100%' }}>
      <Header style={{ background: '#fff', padding: '0', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%', padding: '0 16px' }}>
          <Title level={3} style={{ margin: 0, color: '#1890ff' }}>
            产线模拟器
          </Title>
          <Space>
            <Button
              type="primary"
              icon={<PlaySquareOutlined />}
              onClick={handleStartSimulation}
              disabled={isRunning}
            >
              开始模拟
            </Button>
            <Button
              icon={<PauseCircleOutlined />}
              onClick={handleStopSimulation}
              disabled={!isRunning}
            >
              暂停模拟
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleReset}
            >
              重置
            </Button>
          </Space>
        </div>
      </Header>

      <Layout>
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          width={200}
          style={{ background: '#fff' }}
        >
          <Menu
            mode="inline"
            selectedKeys={[selectedKey]}
            onClick={({ key }) => setSelectedKey(key)}
            style={{ height: '100%', borderRight: 0 }}
            items={[
              {
                key: 'canvas',
                icon: <BarChartOutlined />,
                label: '产线设计',
              },
              {
                key: 'charts',
                icon: <BarChartOutlined />,
                label: '生产图表',
              },
              {
                key: 'status',
                icon: <BarChartOutlined />,
                label: '运行状态',
              },
            ]}
          />
        </Sider>

        <Layout style={{ padding: '24px', minHeight: 'calc(100vh - 64px)' }}>
          <Content style={{ background: '#fff', padding: 24, margin: 0, minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
            {productionData && (
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={6}>
                  <Card title="总机器数" size="small">
                    <Title level={2} style={{ margin: 0, color: '#1890ff' }}>
                      {productionData.total_machines}
                    </Title>
                  </Card>
                </Col>
                <Col span={6}>
                  <Card title="总连接数" size="small">
                    <Title level={2} style={{ margin: 0, color: '#52c41a' }}>
                      {productionData.total_connections}
                    </Title>
                  </Card>
                </Col>
                <Col span={6}>
                  <Card title="活跃机器" size="small">
                    <Title level={2} style={{ margin: 0, color: '#faad14' }}>
                      {productionData.active_machines}
                    </Title>
                  </Card>
                </Col>
                <Col span={6}>
                  <Card title="总生产速率" size="small">
                    <Title level={2} style={{ margin: 0, color: '#722ed1' }}>
                      {productionData.total_items_per_minute?.toFixed(1)}/min
                    </Title>
                  </Card>
                </Col>
              </Row>
            )}
            
            <div style={{ flex: 1, height: '100%' }}>
              {renderContent()}
            </div>
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
};

export default App;