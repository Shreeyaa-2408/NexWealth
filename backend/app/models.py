
from datetime import datetime, date
from typing import Optional

from sqlalchemy import (
    String,
    Float,
    DateTime,
    Date,
    ForeignKey,
    Boolean,
    Integer,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow
    )

    transactions = relationship(
        "Transaction",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    goals = relationship(
        "SavingsGoal",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    challenges = relationship(
        "Challenge",
        back_populates="user",
        cascade="all, delete-orphan"
    )


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        index=True
    )
    date: Mapped[date] = mapped_column(Date, default=date.today)
    description: Mapped[str] = mapped_column(String(255))
    category: Mapped[str] = mapped_column(
        String(80),
        default="Other"
    )
    amount: Mapped[float] = mapped_column(Float)
    type: Mapped[str] = mapped_column(String(20))

    user = relationship("User", back_populates="transactions")


class SavingsGoal(Base):
    __tablename__ = "savings_goals"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        index=True
    )
    title: Mapped[str] = mapped_column(String(120))
    target_amount: Mapped[float] = mapped_column(Float)
    saved_amount: Mapped[float] = mapped_column(
        Float,
        default=0
    )
    target_date: Mapped[Optional[date]] = mapped_column(
        Date,
        nullable=True
    )

    user = relationship("User", back_populates="goals")


class Challenge(Base):
    __tablename__ = "challenges"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        index=True
    )
    title: Mapped[str] = mapped_column(String(120))
    daily_amount: Mapped[float] = mapped_column(
        Float,
        default=50
    )
    duration_days: Mapped[int] = mapped_column(
        Integer,
        default=30
    )
    saved_amount: Mapped[float] = mapped_column(
        Float,
        default=0
    )
    active: Mapped[bool] = mapped_column(
        Boolean,
        default=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow
    )

    user = relationship("User", back_populates="challenges")


class ChallengeContribution(Base):
    __tablename__ = "challenge_contributions"

    id: Mapped[int] = mapped_column(primary_key=True)
    challenge_id: Mapped[int] = mapped_column(
        ForeignKey("challenges.id"),
        index=True
    )
    amount: Mapped[float] = mapped_column(Float)
    note: Mapped[str] = mapped_column(
        String(255),
        default="Daily contribution"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow
    )
