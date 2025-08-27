from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict
from datetime import datetime, timedelta
from pydantic import BaseModel

from database import get_db
from models import Machine, ProductionRecord, ProductionRate, Connection
import asyncio

class ProductionOverview(BaseModel):
    total_machines: int
    active_machines: int
    total_connections: int
    total_items_per_minute: float

router = APIRouter()

class ProductionRateResponse(BaseModel):
    machine_id: int
    machine_name: str
    item_type: str
    rate_per_minute: float
    calculated_at: datetime

class ProductionHistoryRequest(BaseModel):
    machine_id: int
    item_type: str
    hours: int = 1

class ProductionHistoryResponse(BaseModel):
    timestamp: datetime
    quantity: int

class ProductionStatus(BaseModel):
    machine_id: int
    machine_name: str
    current_input: Dict[str, int]
    current_output: Dict[str, int]
    processing_status: str
    efficiency: float

# 生产速率计算
@router.get("/rates", response_model=List[ProductionRateResponse])
def get_production_rates(db: Session = Depends(get_db)):
    rates = db.query(ProductionRate).all()
    result = []
    
    for rate in rates:
        machine = db.query(Machine).filter(Machine.id == rate.machine_id).first()
        if machine:
            result.append(ProductionRateResponse(
                machine_id=rate.machine_id,
                machine_name=machine.name,
                item_type=rate.item_type,
                rate_per_minute=rate.rate_per_minute,
                calculated_at=rate.calculated_at
            ))
    
    return result

@router.get("/rates/{machine_id}", response_model=List[ProductionRateResponse])
def get_machine_production_rates(machine_id: int, db: Session = Depends(get_db)):
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")
    
    rates = db.query(ProductionRate).filter(ProductionRate.machine_id == machine_id).all()
    return [ProductionRateResponse(
        machine_id=rate.machine_id,
        machine_name=machine.name,
        item_type=rate.item_type,
        rate_per_minute=rate.rate_per_minute,
        calculated_at=rate.calculated_at
    ) for rate in rates]

# 生产历史数据
@router.get("/history/{machine_id}", response_model=List[ProductionHistoryResponse])
def get_production_history(
    machine_id: int, 
    item_type: str = None, 
    hours: int = 1, 
    db: Session = Depends(get_db)
):
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")
    
    start_time = datetime.utcnow() - timedelta(hours=hours)
    
    query = db.query(ProductionRecord).filter(
        ProductionRecord.machine_id == machine_id,
        ProductionRecord.timestamp >= start_time
    )
    
    if item_type:
        query = query.filter(ProductionRecord.item_type == item_type)
    
    records = query.order_by(ProductionRecord.timestamp).all()
    
    return [ProductionHistoryResponse(
        timestamp=record.timestamp,
        quantity=record.quantity
    ) for record in records]

# 实时生产状态
@router.get("/status", response_model=List[ProductionStatus])
def get_production_status(db: Session = Depends(get_db)):
    machines = db.query(Machine).filter(Machine.is_active == True).all()
    status_list = []
    
    for machine in machines:
        # 计算最近5分钟的生产数据
        recent_records = db.query(ProductionRecord).filter(
            ProductionRecord.machine_id == machine.id,
            ProductionRecord.timestamp >= datetime.utcnow() - timedelta(minutes=5)
        ).all()
        
        # 计算输入输出
        current_input = {}
        current_output = {}
        total_processed = 0
        
        for record in recent_records:
            if record.quantity > 0:
                if record.item_type in machine.output_items:
                    current_output[record.item_type] = current_output.get(record.item_type, 0) + record.quantity
                else:
                    current_input[record.item_type] = current_input.get(record.item_type, 0) + abs(record.quantity)
            total_processed += abs(record.quantity)
        
        # 计算效率
        expected_rate = 60 / machine.processing_time  # 每分钟理论产量
        actual_rate = total_processed / 5  # 最近5分钟平均产量
        efficiency = min(actual_rate / expected_rate * 100, 100) if expected_rate > 0 else 0
        
        # 处理状态
        if total_processed == 0:
            processing_status = "空闲"
        elif efficiency >= 80:
            processing_status = "高效运行"
        elif efficiency >= 50:
            processing_status = "正常运行"
        else:
            processing_status = "低效运行"
        
        status_list.append(ProductionStatus(
            machine_id=machine.id,
            machine_name=machine.name,
            current_input=current_input,
            current_output=current_output,
            processing_status=processing_status,
            efficiency=efficiency
        ))
    
    return status_list

# 计算生产速率（内部使用）
def calculate_production_rate(machine_id: int, item_type: str, db: Session):
    # 获取最近10分钟的生产记录
    recent_records = db.query(ProductionRecord).filter(
        ProductionRecord.machine_id == machine_id,
        ProductionRecord.item_type == item_type,
        ProductionRecord.timestamp >= datetime.utcnow() - timedelta(minutes=10)
    ).all()
    
    if not recent_records:
        return 0.0
    
    total_quantity = sum(record.quantity for record in recent_records)
    rate_per_minute = total_quantity / 10  # 10分钟平均值
    
    # 更新或创建生产速率记录
    existing_rate = db.query(ProductionRate).filter(
        ProductionRate.machine_id == machine_id,
        ProductionRate.item_type == item_type
    ).first()
    
    if existing_rate:
        existing_rate.rate_per_minute = rate_per_minute
        existing_rate.calculated_at = datetime.utcnow()
    else:
        new_rate = ProductionRate(
            machine_id=machine_id,
            item_type=item_type,
            rate_per_minute=rate_per_minute
        )
        db.add(new_rate)
    
    db.commit()
    return rate_per_minute

# 模拟生产数据生成（用于演示）
@router.post("/simulate/{machine_id}")
def simulate_production(machine_id: int, item_type: str, quantity: int, db: Session = Depends(get_db)):
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")
    
    record = ProductionRecord(
        machine_id=machine_id,
        item_type=item_type,
        quantity=quantity
    )
    db.add(record)
    db.commit()

    # 重新计算生产速率
    calculate_production_rate(machine_id, item_type, db)
    
    return {"message": "Production simulated successfully"}

# 生产概览
@router.get("/overview", response_model=ProductionOverview)
def get_production_overview(db: Session = Depends(get_db)):
    total_machines = db.query(Machine).count()
    active_machines = db.query(Machine).filter(Machine.is_active == True).count()
    total_connections = db.query(Connection).count()
    
    # 计算总生产速率
    total_rate = db.query(ProductionRate).all()
    total_items_per_minute = sum(rate.rate_per_minute for rate in total_rate)
    
    return ProductionOverview(
        total_machines=total_machines,
        active_machines=active_machines,
        total_connections=total_connections,
        total_items_per_minute=total_items_per_minute
    )