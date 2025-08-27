import React, { useEffect, useRef, useState } from 'react';
import { Card, Row, Col, Button, Space } from 'antd';
import { DeleteOutlined, SettingOutlined, ImportOutlined } from '@ant-design/icons';
import { Graph } from '@antv/g6';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import MachinePalette from './MachinePalette';
import { machineAPI, connectionAPI } from '../services/api';

const Canvas = () => {
  const containerRef = useRef(null);
  const graphRef = useRef(null);
  const [machines, setMachines] = useState([]);
  const [connections, setConnections] = useState([]);

  useEffect(() => {
    // 延迟初始化，确保DOM完全渲染
    const timer = setTimeout(() => {
      initializeGraph();
      fetchData();
    }, 100);

    // 监听窗口大小变化
    const handleResize = () => {
      if (graphRef.current && !graphRef.current.destroyed && containerRef.current) {
        const width = containerRef.current.clientWidth || 800;
        const height = containerRef.current.clientHeight || 600;
        // G6 v5 使用 resize 方法
        if (typeof graphRef.current.resize === 'function') {
          graphRef.current.resize(width, height);
        } else if (typeof graphRef.current.changeSize === 'function') {
          graphRef.current.changeSize(width, height);
        }
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      if (graphRef.current && !graphRef.current.destroyed) {
        graphRef.current.destroy();
        graphRef.current = null;
      }
    };
  }, []);

  const fetchData = async () => {
    try {
      console.log('开始获取机器和连接数据...');
      const [machinesRes, connectionsRes] = await Promise.all([
        machineAPI.getAll(),
        connectionAPI.getAll()
      ]);
      
      console.log('获取到的机器数据:', machinesRes.data);
      console.log('获取到的连接数据:', connectionsRes.data);
      
      setMachines(machinesRes.data);
      setConnections(connectionsRes.data);
      
      if (graphRef.current) {
        console.log('开始更新图表数据...');
        updateGraphData(machinesRes.data, connectionsRes.data);
      } else {
        console.warn('图表引用不存在，无法更新数据');
      }
    } catch (error) {
      console.error('获取数据失败:', error);
    }
  };

  const initializeGraph = () => {
    if (!containerRef.current) return;
    
    // 如果图表已经存在且未销毁，则不重新初始化
    if (graphRef.current && !graphRef.current.destroyed) {
      console.log('图表已存在，跳过重新初始化');
      return;
    }

    // 确保容器已经渲染完成，获取正确的尺寸
    const width = containerRef.current.clientWidth || 800;
    const height = containerRef.current.clientHeight || 600;
    
    console.log('初始化图表，容器尺寸:', { width, height });

    const graph = new Graph({
      container: containerRef.current,
      width,
      height,
      // 不设置layout，让G6使用默认的无布局模式
      // 禁用自动适配
      autoFit: false,
      fitView: false,
      fitCenter: false,
      behaviors: [
        'drag-element',
        'drag-canvas', 
        'zoom-canvas',
        'drag-node',
        'click-select'
      ],
      plugins: [
        {
          type: 'grid-line',
          follow: false,
        },
      ],
      node: {
        type: 'rect',
        style: {
          lineWidth: 2,
          radius: 8,
          labelFill: '#000',
          labelPlacement: 'bottom',
          labelOffsetY: 15,
          labelFontSize: 12,
          labelBackgroundFill: 'rgba(255, 255, 255, 0.8)',
          labelBackgroundRadius: 4,
          labelBackgroundPadding: [2, 4],
        },
      },
      edge: {
        style: {
          stroke: '#e2e2e2',
          lineWidth: 1,
        },
      },
    });
    
    console.log('G6图表配置:', {
       width,
       height,
       layout: 'none',
       autoFit: false,
       fitView: false,
       fitCenter: false
     });

    // 图表事件监听
    
    // 监听元素拖拽结束事件
    // 监听节点拖拽结束事件
    graph.on('node:dragend', async (e) => {
      const { target } = e;
      console.log('拖拽结束事件:', e);
      
      if (!target || target.type !== 'node') {
        return;
      }
      
      const nodeId = target.id;
      console.log(`拖拽结束，节点ID: ${nodeId}`);
      
      // 尝试多种方式获取拖拽后的位置
      let x, y;
      
      // 方法1: 从事件对象中获取
      if (e.x !== undefined && e.y !== undefined) {
        x = e.x;
        y = e.y;
        console.log('从事件对象获取坐标:', { x, y });
      }
      
      // 方法2: 从target中获取
      if ((x === undefined || y === undefined) && target.style) {
        x = target.style.x;
        y = target.style.y;
        console.log('从target.style获取坐标:', { x, y });
      }
      
      // 方法3: 从getNodeData获取
      if (x === undefined || y === undefined) {
        const nodeData = graph.getNodeData(nodeId);
        x = nodeData?.style?.x;
        y = nodeData?.style?.y;
        console.log('从getNodeData获取坐标:', { x, y });
        console.log('完整节点数据:', nodeData);
      }
      
      // 方法4: 从图表的节点位置获取
      if (x === undefined || y === undefined) {
        try {
          const nodePosition = graph.getNodePosition(nodeId);
          if (nodePosition) {
            x = nodePosition.x;
            y = nodePosition.y;
            console.log('从getNodePosition获取坐标:', { x, y });
          }
        } catch (err) {
          console.warn('getNodePosition方法不可用:', err.message);
        }
      }
      
      console.log(`最终获取的拖拽结束坐标: (${x}, ${y})`);
      
      if (x === undefined || y === undefined || isNaN(x) || isNaN(y)) {
        console.warn('无法获取有效的拖拽后坐标');
        return;
      }
      
      console.log(`准备更新机器 ${nodeId} 位置: (${x}, ${y})`);
      
      try {
        const response = await machineAPI.update(nodeId, {
          x: Number(x),
          y: Number(y),
        });
        console.log(`机器 ${nodeId} 位置已更新: (${x}, ${y})`, response.data);
      } catch (error) {
        console.error('更新机器位置失败:', error);
        if (error.response) {
          console.error('响应错误:', error.response.status, error.response.data);
        }
      }
    });

    // G6 v5 连线功能暂时禁用，后续实现
    // graph.on('aftercreateedge', async (e) => {
    //   // 连线逻辑
    // });

    // 添加双击删除机器功能
    graph.on('node:dblclick', async (e) => {
      console.log('双击删除事件触发:', e);
      
      // 获取节点ID - G6 v5中通常在e.itemId中
      const nodeId = e.itemId || e.target?.id || e.item?.id;
      
      if (!nodeId) {
        console.warn('无法获取节点ID');
        return;
      }
      
      console.log('双击删除节点ID:', nodeId);
      
      // 获取节点数据
      const nodeData = graph.getNodeData(nodeId);
      if (!nodeData) {
        console.warn('无法获取节点数据');
        return;
      }
      
      const machineName = nodeData.label || nodeData.data?.machineData?.name || '未知机器';
      
      // 确认删除
      if (window.confirm(`确定要删除机器 "${machineName}" 吗？`)) {
        try {
          console.log('开始删除机器:', nodeId);
          await machineAPI.delete(nodeId);
          console.log('机器删除成功，刷新数据');
          fetchData();
        } catch (error) {
          console.error('删除机器失败:', error);
        }
      }
    });

    graphRef.current = graph;
    
    console.log('图表初始化完成，开始设置空数据');
    // 初始化空图表
    graph.setData({ nodes: [], edges: [] });
    graph.render();
    console.log('图表渲染完成');
  };

  const updateGraphData = (machines, connections) => {
    if (!graphRef.current || graphRef.current.destroyed) {
      console.warn('图表已销毁或不存在，无法更新数据');
      return;
    }

    console.log('正在处理机器数据，机器数量:', machines.length);
    
    const nodes = machines.map(machine => {
      console.log(`=== 处理机器 ${machine.id} ===`);
      console.log('原始机器数据:', machine);
      console.log('机器坐标:', { x: machine.x, y: machine.y, type: typeof machine.x, typeY: typeof machine.y });
      
      const finalX = machine.x !== undefined && machine.x !== null ? machine.x : 200;
      const finalY = machine.y !== undefined && machine.y !== null ? machine.y : 150;
      
      console.log('最终节点坐标:', { x: finalX, y: finalY });
      
      const node = {
        id: machine.id.toString(),
        type: 'rect',
        label: machine.name,
        data: {
          machineData: machine,
        },
        style: {
          x: finalX,
          y: finalY,
          fill: getMachineColor(machine.type),
          stroke: getMachineStroke(machine.type),
          lineWidth: 2,
          radius: 8,
          width: 160,
          height: 120,
          iconText: getMachineIcon(machine.type),
          iconFill: '#000',
          iconFontSize: 24,
          labelText: machine.name,
          labelBackgroundFill: 'rgba(255, 255, 255, 0.8)',
          labelBackgroundRadius: 4,
          labelBackgroundPadding: [2, 4],
          labelFontSize: 12,
          labelFill: '#000',
          labelPlacement: 'bottom',
          labelOffsetY: 0,
        },
        
      };
      
      console.log(`机器 ${machine.id} (${machine.name}) 最终节点:`, node);
      return node;
    });

    const edges = connections.map(conn => ({
      id: conn.id.toString(),
      source: conn.source_machine_id.toString(),
      target: conn.target_machine_id.toString(),
    }));

    console.log('准备设置图表数据 - 节点数量:', nodes.length, '边数量:', edges.length);
    console.log('节点数据:', nodes);

    try {
      if (graphRef.current && !graphRef.current.destroyed) {
        console.log('开始设置图表数据...');
        graphRef.current.setData({ nodes, edges });
        console.log('开始渲染图表...');
        graphRef.current.render();
        
        // 注释掉fitView调用，保持机器在指定位置
        // fitView会重新调整节点位置，导致机器不在拖拽放置的位置
        // if (nodes.length > 0) {
        //   console.log('调整视图以适应所有节点...');
        //   try {
        //     graphRef.current.fitView({
        //       padding: [50, 50, 50, 50],
        //       rules: {
        //         direction: 'both',
        //         ratioRule: 'max'
        //       }
        //     });
        //     console.log('视图调整完成');
        //   } catch (fitError) {
        //     console.warn('视图调整失败:', fitError);
        //   }
        // }
        
        console.log('图表数据设置完成，保持节点在指定位置');
        console.log('图表更新完成');
      }
    } catch (error) {
      console.error('更新图表数据失败:', error);
    }
  };

  const getMachineColor = (type) => {
    const colors = {
      'machine': '#91d5ff',
      'source': '#ffd666',
      // 保持向后兼容
      'input': '#ffd666',
      'processor': '#91d5ff',
      'output': '#b7eb8f',
      'storage': '#ffccc7',
    };
    return colors[type] || '#91d5ff';
  };

  const getMachineStroke = (type) => {
    const strokes = {
      'machine': '#40a9ff',
      'source': '#faad14',
      // 保持向后兼容
      'input': '#faad14',
      'processor': '#40a9ff',
      'output': '#52c41a',
      'storage': '#ff4d4f',
    };
    return strokes[type] || '#40a9ff';
  };

  const getMachineIcon = (type) => {
    const icons = {
      'machine': '⚙️',
      'source': '📥',
      // 保持向后兼容
      'input': '📥',
      'processor': '⚙️',
      'output': '📤',
      'storage': '📦',
    };
    return icons[type] || '⚙️';
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    const machineType = e.dataTransfer.getData('machineType');
    if (!machineType) {
      console.log('没有获取到机器类型');
      return;
    }

    console.log('=== 拖拽事件开始 ===');
    console.log('机器类型:', machineType);

    // 获取画布容器的位置信息
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    
    console.log('原始鼠标坐标:', { clientX: e.clientX, clientY: e.clientY });
    console.log('容器边界信息:', { left: rect.left, top: rect.top, width: rect.width, height: rect.height });
    console.log('计算的容器相对坐标:', { x: clientX, y: clientY });
    
    // 直接使用容器相对坐标
    let canvasX = clientX;
    let canvasY = clientY;
    
    // 确保坐标是有效数字，但保持0值
    canvasX = isNaN(Number(canvasX)) ? 0 : Number(canvasX);
    canvasY = isNaN(Number(canvasY)) ? 0 : Number(canvasY);
    
    console.log('最终将使用的坐标:', { x: canvasX, y: canvasY });
    
    // 验证坐标是否合理
    if (canvasX < 0 || canvasY < 0 || canvasX > rect.width || canvasY > rect.height) {
      console.warn('坐标超出容器范围:', { x: canvasX, y: canvasY, containerSize: { width: rect.width, height: rect.height } });
    }

    try {
      const newMachine = {
        name: `新${machineType === 'machine' ? '机器' : '源'}${machines.length + 1}`,
        type: machineType,
        x: canvasX,
        y: canvasY,
        input_capacity: 10,
        output_capacity: 10,
        processing_time: 5,
        input_items: machineType === 'source' ? [] : ['原料'],
        output_items: machineType === 'source' ? ['原料'] : ['产品'],
      };

      console.log('发送的机器数据:', JSON.stringify(newMachine, null, 2));

      console.log('准备创建机器:', newMachine);
      const response = await machineAPI.create(newMachine);
      console.log('机器创建成功:', response.data);
      
      await fetchData();
      console.log(`机器已添加到位置: (${canvasX}, ${canvasY})`);
    } catch (error) {
      console.error('添加机器失败:', error);
      if (error.response) {
        console.error('响应错误:', error.response.status, error.response.data);
      } else if (error.request) {
        console.error('请求错误:', error.request);
      } else {
        console.error('其他错误:', error.message);
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleAddMachine = async (machineType) => {
    try {
      const newMachine = {
        name: `新机器${machines.length + 1}`,
        type: machineType,
        x: 300 + Math.random() * 200,
        y: 200 + Math.random() * 200,
        input_capacity: 10,
        output_capacity: 10,
        processing_time: 5,
        input_items: ['原料'],
        output_items: ['产品'],
      };

      const response = await machineAPI.create(newMachine);
      await fetchData();
    } catch (error) {
      console.error('添加机器失败:', error);
    }
  };

  const handleDeleteAllMachines = async () => {
    if (window.confirm(`确定要删除所有 ${machines.length} 台机器吗？此操作不可撤销。`)) {
      try {
        await machineAPI.deleteAll();
        
        // 清空本地状态
        setMachines([]);
        setConnections([]);
        
        // 清空图表
        if (graphRef.current && !graphRef.current.destroyed) {
          graphRef.current.setData({ nodes: [], edges: [] });
          graphRef.current.render();
        }
        
        // 重新获取数据确保同步
        await fetchData();
      } catch (error) {
        console.error('删除所有机器失败:', error);
      }
    }
  };

  const handleFitView = () => {
    if (!graphRef.current || graphRef.current.destroyed) {
      console.warn('图表不存在，无法调整视图');
      return;
    }

    try {
      if (machines.length > 0) {
        // 如果有机器，适配所有机器
        graphRef.current.fitView({
          padding: [50, 50, 50, 50], // 上右下左边距
          rules: {
            direction: 'both', // 水平和垂直方向都适配
            ratioRule: 'min', // 使用最小比例
          }
        });
        console.log('视图已适配所有机器');
      } else {
        // 如果没有机器，重置到中心
        graphRef.current.fitCenter();
        console.log('视图已重置到中心');
      }
    } catch (error) {
      console.error('调整视图失败:', error);
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <Row gutter={16} style={{ height: '100%', margin: 0 }}>
        <Col span={4}>
          <MachinePalette onAddMachine={handleAddMachine} />
        </Col>
        <Col span={20}>
          <Card 
            title="产线画布" 
            style={{ height: '100%' }}
            styles={{ body: { padding: 0, height: 'calc(100% - 57px)' } }}
            extra={
              <Space>
                <span>拖拽机器到画布，点击锚点连线，双击机器删除</span>
                <Button 
                  type="default" 
                  icon={<SettingOutlined />}
                  onClick={handleFitView}
                  size="small"
                >
                  自动适配视图
                </Button>
                <Button 
                  type="primary" 
                  danger 
                  icon={<DeleteOutlined />}
                  onClick={handleDeleteAllMachines}
                  size="small"
                >
                  清空所有机器 ({machines.length})
                </Button>
              </Space>
            }
          >
            <div 
              ref={containerRef} 
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              style={{ 
                width: '100%', 
                height: '100%', 
                minHeight: '600px',
                position: 'relative',
                overflow: 'hidden'
              }} 
            />
          </Card>
        </Col>
      </Row>
    </DndProvider>
  );
};

export default Canvas;