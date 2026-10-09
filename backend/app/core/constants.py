from enum import Enum

class PriorityEnum(str, Enum):
    P0 = "P0"
    P1 = "P1"
    P2 = "P2"

class PhasePressureThresholds:
    # Thresholds for priority calculation based on project phase pressure
    UAT_CLOSURE = 1.0
    QA_TRACKING = 0.88
    REQUIREMENT_ANALYSIS = 0.72
    COMMUNICATION = 0.55
    KICKOFF = 0.38
    DEFAULT = 0.65

class DeadlinePressureThresholds:
    # Thresholds for day-based priority calculation
    URGENT_THRESHOLD = 0.55
    HIGH_PRESSURE_THRESHOLD = 0.88
    EXTREME_PRESSURE_THRESHOLD = 0.95
    MODERATE_PRESSURE_THRESHOLD = 0.72
