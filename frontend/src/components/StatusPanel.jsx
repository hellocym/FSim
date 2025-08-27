import React, { useState, useEffect } from 'react';
import { Card, Table, Progress, Tag, Space, Statistic, Row, Col, Typography } from 'antd';
const { Text } = Typography;
import { CheckCircleOutlined, CloseCircleOutlined, SyncOutlined } from '@ant-design/icons';
import { productionAPI } from '../services/api';

const StatusPanel = () => {
  const [statusData, setStatusData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState(null);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const [statusRes, overviewRes] = await Promise.all([
        productionAPI.getStatus(),
        productionAPI.getOverview()
      ]);
      setStatusData(statusRes.data);
      setOverview(overviewRes.data);
    } catch (error) {
      console.error('获取状态失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case '高效运行': return 'success';
      case '正常运行': return 'processing';
      case '低效运行': return 'warning';
      case '空闲': return 'default';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case '高效运行': return <CheckCircleOutlined />;
      case '正常运行': return <SyncOutlined spin />;
      case '低效运行': return <SyncOutlined spin />;
      case '空闲': return <CloseCircleOutlined />;
      default: return <CloseCircleOutlined />;
    }
  };

  const columns = [
    {
      title: '机器名称',
      dataIndex: 'machine_name',
      key: 'machine_name',
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: '运行状态',
      dataIndex: 'processing_status',
      key: 'processing_status',
      render: (status) => (
        <Tag color={getStatusColor(status)} icon={getStatusIcon(status)}>
          {status}
        </Tag>
      ),
    },
    {
      title: '效率',
      dataIndex: 'efficiency',
      key: 'efficiency',
      render: (efficiency) => (
        <Progress 
          percent={Math.round(efficiency)} 
          size="small"
          status={efficiency >= 80 ? 'success' : efficiency >= 50 ? 'normal' : 'exception'}
        />
      ),
    },
    {
      title: '当前输入',
      key: 'current_input',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          {Object.entries(record.current_input).map(([item, count]) => (
            <Tag key={item} color="blue">
              {item}: {count}
            </Tag>
          ))}
          {Object.keys(record.current_input).length === 0 && (
            <Text type="secondary">无输入</Text>
          )}
        </Space>
      ),
    },
    {
      title: '当前输出',
      key: 'current_output',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          {Object.entries(record.current_output).map(([item, count]) => (
            <Tag key={item} color="green">
              {item}: {count}
            </Tag>
          ))}
          {Object.keys(record.current_output).length === 0 && (
            <Text type="secondary">无输出</Text>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      {overview && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="总机器数"
                value={overview.total_machines}
                valueStyle={{ color: '#3f8600' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="活跃机器"
                value={overview.active_machines}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="总连接数"
                value={overview.total_connections}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="总生产速率"
                value={overview.total_items_per_minute?.toFixed(1)}
                suffix="/min"
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      <Card 
        title="机器运行状态" 
        extra={
          <Space>
            <Tag color="success">高效运行: ≥80%</Tag>
            <Tag color="processing">正常运行: 50-79%</Tag>
            <Tag color="warning">低效运行: {'<50%'}</Tag>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={statusData}
          loading={loading}
          rowKey="machine_id"
          pagination={false}
          size="middle"
        />
      </Card>

      {overview && overview.hourly_production && (
        <Card title="最近1小时生产统计" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            {Object.entries(overview.hourly_production).map(([item, count]) => (
              <Col key={item} span={6}>
                <Card size="small">
                  <Statistic
                    title={item}
                    value={count}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Card>
              </Col>
            ))}
          </Row>
        </Card>
      )}
    </div>
  );
};

export default StatusPanel;