import React from 'react';
import { Card, Typography } from 'antd';
import { 
  SettingOutlined, 
  ImportOutlined
} from '@ant-design/icons';

const { Title } = Typography;

const MachinePalette = ({ onAddMachine }) => {
  const machineTypes = [
    {
      type: 'machine',
      name: '机器',
      icon: <SettingOutlined />,
      description: '处理和加工物品',
      color: '#91d5ff',
    },
    {
      type: 'source',
      name: '源',
      icon: <ImportOutlined />,
      description: '提供原材料',
      color: '#ffd666',
    },
  ];

  const handleDragStart = (e, machineType) => {
    e.dataTransfer.setData('machineType', machineType);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <Card title="组件库" size="small" style={{ height: '100%' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {machineTypes.map((machine) => (
          <div
            key={machine.type}
            draggable
            onDragStart={(e) => {
              e.target.style.cursor = 'grabbing';
              handleDragStart(e, machine.type);
            }}
            onDragEnd={(e) => {
              e.target.style.cursor = 'grab';
            }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '16px',
              backgroundColor: machine.color,
              borderRadius: '8px',
              border: '2px dashed #d9d9d9',
              cursor: 'grab',
              transition: 'all 0.3s ease',
              userSelect: 'none',
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'scale(1.05)';
              e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'scale(1)';
              e.target.style.boxShadow = 'none';
            }}
          >
            <div style={{ fontSize: '32px', color: '#000', marginBottom: '8px' }}>
              {machine.icon}
            </div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#000' }}>
              {machine.name}
            </div>
          </div>
        ))}
      </div>
      
      <div style={{ marginTop: 16, fontSize: 12, color: '#666' }}>
        <p>拖拽上方图标到画布添加机器</p>
        <p>拖拽机器调整位置</p>
        <p>点击机器边缘的锚点进行连线</p>
        <p>双击机器可以删除</p>
      </div>
    </Card>
  );
};

export default MachinePalette;