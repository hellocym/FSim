# 产线模拟器

一个基于拖拽的产线模拟器，使用Python FastAPI后端和React前端，支持实时生产数据监控。

## 功能特性

- 🎯 **拖拽式设计**：通过拖拽创建产线布局
- 🔗 **智能连线**：机器间自动建立连接关系
- 📊 **实时监控**：实时显示生产速率和效率
- 📈 **数据可视化**：使用Recharts展示生产趋势
- 🎨 **美观界面**：基于Ant Design的现代化UI
- ⚡ **实时通信**：WebSocket实时数据推送

## 技术栈

### 后端
- **FastAPI** - 高性能Python Web框架
- **SQLAlchemy** - ORM数据库操作
- **WebSocket** - 实时通信
- **SQLite** - 轻量级数据库

### 前端
- **React** - 用户界面框架
- **Ant Design** - UI组件库
- **G6** - 图可视化引擎
- **Recharts** - 图表库
- **Axios** - HTTP客户端

## 快速开始

### 环境要求
- Python 3.8+
- Node.js 16+
- npm或yarn

### 后端启动

```bash
# 进入后端目录
cd backend

# 创建虚拟环境
python -m venv venv

# 激活虚拟环境
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 启动服务
python main.py
```

后端服务将运行在 http://localhost:8000

### 前端启动

```bash
# 进入前端目录
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端服务将运行在 http://localhost:5173

## 使用说明

### 1. 创建产线
1. 打开"产线设计"页面
2. 从左侧机器库选择机器类型
3. 拖拽机器到画布上
4. 点击机器边缘的锚点进行连线

### 2. 查看生产数据
1. 切换到"生产图表"页面
2. 查看实时生产速率
3. 分析各机器的生产效率

### 3. 监控运行状态
1. 切换到"运行状态"页面
2. 查看所有机器的实时状态
3. 监控生产效率和输入输出

## API文档

### 机器管理
- `GET /api/machines/machines` - 获取所有机器
- `POST /api/machines/machines` - 创建新机器
- `PUT /api/machines/machines/{id}` - 更新机器
- `DELETE /api/machines/machines/{id}` - 删除机器

### 连接管理
- `GET /api/machines/connections` - 获取所有连接
- `POST /api/machines/connections` - 创建连接
- `DELETE /api/machines/connections/{id}` - 删除连接

### 生产数据
- `GET /api/production/rates` - 获取生产速率
- `GET /api/production/status` - 获取机器状态
- `GET /api/production/overview` - 获取系统概览

## 开发说明

### 项目结构
```
FSim/
├── backend/                 # 后端代码
│   ├── main.py             # 主应用
│   ├── models.py           # 数据模型
│   ├── routers/            # API路由
│   └── requirements.txt    # Python依赖
├── frontend/               # 前端代码
│   ├── src/
│   │   ├── components/     # React组件
│   │   ├── services/       # API服务
│   │   └── App.jsx         # 主应用
│   └── package.json        # Node.js依赖
└── README.md
```

### 数据模型

#### 机器(Machine)
- 名称、类型、位置坐标
- 输入输出容量
- 处理时间
- 输入输出物品类型

#### 连接(Connection)
- 源机器和目标机器
- 连接关系

#### 生产记录(ProductionRecord)
- 机器ID
- 物品类型
- 生产数量
- 时间戳

## 贡献指南

1. Fork项目
2. 创建功能分支
3. 提交更改
4. 创建Pull Request

## 许可证

MIT License