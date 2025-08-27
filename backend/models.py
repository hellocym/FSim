from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class Machine(Base):
    __tablename__ = "machines"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    type = Column(String)  # 机器类型
    x = Column(Float)  # 画布上的X坐标
    y = Column(Float)  # 画布上的Y坐标
    input_capacity = Column(Integer)  # 输入容量
    output_capacity = Column(Integer)  # 输出容量
    processing_time = Column(Float)  # 处理时间（秒）
    input_items = Column(JSON)  # 输入物品类型列表
    output_items = Column(JSON)  # 输出物品类型列表
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # 关系
    connections = relationship("Connection", back_populates="source_machine", foreign_keys="Connection.source_machine_id")
    production_records = relationship("ProductionRecord", back_populates="machine")

class Connection(Base):
    __tablename__ = "connections"
    
    id = Column(Integer, primary_key=True, index=True)
    source_machine_id = Column(Integer, ForeignKey("machines.id"))
    target_machine_id = Column(Integer, ForeignKey("machines.id"))
    source_output_index = Column(Integer, default=0)  # 源机器输出索引
    target_input_index = Column(Integer, default=0)  # 目标机器输入索引
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # 关系
    source_machine = relationship("Machine", back_populates="connections", foreign_keys=[source_machine_id])
    target_machine = relationship("Machine", foreign_keys=[target_machine_id])

class ItemType(Base):
    __tablename__ = "item_types"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    color = Column(String)  # 物品颜色，用于前端显示
    description = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

class ProductionRecord(Base):
    __tablename__ = "production_records"
    
    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(Integer, ForeignKey("machines.id"))
    item_type = Column(String)
    quantity = Column(Integer)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # 关系
    machine = relationship("Machine", back_populates="production_records")

class ProductionRate(Base):
    __tablename__ = "production_rates"
    
    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(Integer, ForeignKey("machines.id"))
    item_type = Column(String)
    rate_per_minute = Column(Float)  # 每分钟生产速率
    calculated_at = Column(DateTime, default=datetime.utcnow)