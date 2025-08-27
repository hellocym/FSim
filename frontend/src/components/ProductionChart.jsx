import React, { useState, useEffect } from 'react';
import { Card, Select, Row, Col, Space, Typography } from 'antd';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { productionAPI } from '../services/api';
import { createWebSocket } from '../services/api';

const { Option } = Select;
const { Title, Text } = Typography;

const ProductionChart = () => {
  const [machines, setMachines] = useState([]);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [selectedItem, setSelectedItem] = useState('all');
  const [realtimeData, setRealtimeData] = useState([]);
  const [hourlyData, setHourlyData] = useState([]);
  const [ratesData, setRatesData] = useState([]);

  useEffect(() => {
    fetchInitialData();
    const ws = createWebSocket('/ws/rates');
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'rates_update') {
        setRatesData(data.rates);
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    if (selectedMachine) {
      fetchMachineHistory();
    }
  }, [selectedMachine, selectedItem]);

  const fetchInitialData = async () => {
    try {
      const [machinesRes, ratesRes] = await Promise.all([
        productionAPI.getStatus(),
        productionAPI.getRates(),
      ]);
      
      setMachines(machinesRes.data);
      setRatesData(ratesRes.data);
      
      // 生成实时数据
      generateRealtimeData(ratesRes.data);
    } catch (error) {
      console.error('获取初始数据失败:', error);
    }
  };

  const fetchMachineHistory = async () => {
    if (!selectedMachine) return;
    
    try {
      const response = await productionAPI.getHistory(
        selectedMachine, 
        selectedItem === 'all' ? null : selectedItem, 
        1
      );
      setHourlyData(response.data);
    } catch (error) {
      console.error('获取历史数据失败:', error);
    }
  };

  const generateRealtimeData = (rates) => {
    const data = rates.map(rate => ({
      machine: rate.machine_name,
      item: rate.item_type,
      rate: rate.rate_per_minute,
      time: new Date(rate.calculated_at).toLocaleTimeString('zh-CN'),
    }));
    setRealtimeData(data);
  };

  const getUniqueItems = () => {
    const items = new Set();
    ratesData.forEach(rate => items.add(rate.item_type));
    return Array.from(items);
  };

  const getMachineItems = (machineId) => {
    const items = new Set();
    ratesData
      .filter(rate => rate.machine_id === machineId)
      .forEach(rate => items.add(rate.item_type));
    return Array.from(items);
  };

  const chartData = realtimeData.reduce((acc, item) => {
    const existing = acc.find(d => d.time === item.time);
    if (existing) {
      existing[item.machine] = item.rate;
    } else {
      acc.push({
        time: item.time,
        [item.machine]: item.rate,
      });
    }
    return acc;
  }, []);

  const barChartData = ratesData.reduce((acc, rate) => {
    const existing = acc.find(item => item.item === rate.item_type);
    if (existing) {
      existing.total += rate.rate_per_minute;
    } else {
      acc.push({
        item: rate.item_type,
        total: rate.rate_per_minute,
      });
    }
    return acc;
  }, []);

  return (
    <div>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Row gutter={16}>
          <Col span={12}>
            <Card title="实时生产速率" extra={
              <Space>
                <Select
                  placeholder="选择机器"
                  style={{ width: 120 }}
                  value={selectedMachine}
                  onChange={setSelectedMachine}
                  allowClear
                >
                  {machines.map(machine => (
                    <Option key={machine.machine_id} value={machine.machine_id}>
                      {machine.machine_name}
                    </Option>
                  ))}
                </Select>
                <Select
                  placeholder="选择物品"
                  style={{ width: 120 }}
                  value={selectedItem}
                  onChange={setSelectedItem}
                >
                  <Option value="all">全部</Option>
                  {getUniqueItems().map(item => (
                    <Option key={item} value={item}>{item}</Option>
                  ))}
                </Select>
              </Space>
            }>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {machines.map((machine, index) => (
                    <Line
                      key={machine.machine_id}
                      type="monotone"
                      dataKey={machine.machine_name}
                      stroke={`hsl(${index * 60}, 70%, 50%)`}
                      strokeWidth={2}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </Col>
          
          <Col span={12}>
            <Card title="物品生产总量">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="item" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="total" fill="#1890ff" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={24}>
            <Card title="机器生产详情">
              <ResponsiveContainer width="100%" height={400}>
                <LineChart>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {ratesData.map((rate, index) => (
                    <Line
                      key={`${rate.machine_id}-${rate.item_type}`}
                      type="monotone"
                      dataKey="rate"
                      data={[
                        { time: rate.machine_name, rate: rate.rate_per_minute },
                      ]}
                      name={`${rate.machine_name} - ${rate.item_type}`}
                      stroke={`hsl(${index * 30}, 70%, 50%)`}
                      strokeWidth={2}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={24}>
            <Card title="生产统计">
              <Row gutter={16}>
                {ratesData.map(rate => (
                  <Col key={`${rate.machine_id}-${rate.item_type}`} span={6}>
                    <Card size="small" title={`${rate.machine_name}`}>
                      <Text strong>{rate.item_type}</Text>
                      <br />
                      <Text type="success">
                        {rate.rate_per_minute.toFixed(2)} /分钟
                      </Text>
                    </Card>
                  </Col>
                ))}
              </Row>
            </Card>
          </Col>
        </Row>
      </Space>
    </div>
  );
};

export default ProductionChart;