
import { Athlete, AppSettings, TestType } from './types';

export const APP_NAME = "LaserSpeed Pro";

// Serial Protocol Constants
export const SERIAL_BAUD_RATE = 460800;
export const FRAME_HEADER = 0x5C;
export const FRAME_LENGTH = 4;

// Visualization - Notion Palette
export const CHART_COLORS = {
  speed: "#37352F", // Main text color for primary line
  distance: "#9B9A97", // Gray for secondary
  grid: "#E9E9E7", // Very light gray
  text: "#787774", // Medium gray
  accent: "#E16259", // Notion Red/Orange
};

export const MOCK_ATHLETES: Athlete[] = [
  { id: '1', name: 'Usain B.', gender: 'Male', dob: '1986-08-21', primaryEvent: '100m', pb100m: 9.58 },
  { id: '2', name: 'Shelly-Ann F.', gender: 'Female', dob: '1986-12-27', primaryEvent: '100m', pb100m: 10.60 },
  { id: '3', name: 'Mondo D.', gender: 'Male', dob: '1999-11-10', primaryEvent: 'Pole Vault' },
];

export const DEFAULT_SETTINGS: AppSettings = {
  speedUnit: 'kph',
  distanceUnit: 'metric',
  dateFormat: 'DD.MM.YYYY'
};

export const UNIT_LABELS = {
  speed: {
    mps: 'm/s',
    kph: 'km/h',
    mph: 'mph'
  },
  distance: {
    metric: 'm',
    imperial: 'yd'
  }
};

export { TestType };

export const TEST_TYPES = {
  [TestType.FREE_RUN]: { label: "Free Run / Manual", description: "Start and stop manually." },
  [TestType.ACCELERATION]: { label: "Acceleration Test", description: "Measure time to specific distance from stop." },
  [TestType.FLY]: { label: "Fly Test", description: "Measure max speed segment with run-up." },
  [TestType.POLE_VAULT]: { label: "Pole Vault Run-up", description: "Track run-up velocity and log jump height." },
  [TestType.LONG_JUMP]: { label: "Long Jump", description: "Track approach speed and log jump distance." },
  [TestType.FORTY_YARD_DASH]: { label: "40 Yard Dash", description: "Auto-stops at 40 yards. Time measured from start." },
  [TestType.SIXTY_METER_RUN]: { label: "60 Meter Run", description: "Auto-stops at 60 meters. Time measured from start." },
};
