
export enum ViewState {
  LOGIN = 'LOGIN',
  DASHBOARD = 'DASHBOARD',
  SESSION_SETUP = 'SESSION_SETUP',
  LIVE_RUN = 'LIVE_RUN',
  ANALYSIS = 'ANALYSIS',
  COMPARISON = 'COMPARISON',
  ATHLETES = 'ATHLETES',
  ATHLETE_DETAIL = 'ATHLETE_DETAIL',
  HISTORY = 'HISTORY',
  SESSION_DETAIL = 'SESSION_DETAIL',
  SENSOR_CHECK = 'SENSOR_CHECK',
  SETTINGS = 'SETTINGS',
  LEADERBOARD = 'LEADERBOARD',
  ANALYTICS = 'ANALYTICS',
  GUIDE = 'GUIDE'
}

export enum TestType {
  FREE_RUN = 'FREE_RUN',
  ACCELERATION = 'ACCELERATION',
  FLY = 'FLY',
  POLE_VAULT = 'POLE_VAULT',
  LONG_JUMP = 'LONG_JUMP',
  FORTY_YARD_DASH = 'FORTY_YARD_DASH',
  SIXTY_METER_RUN = 'SIXTY_METER_RUN'
}

export interface Athlete {
  id: string;
  name: string;
  email?: string;
  gender?: 'Male' | 'Female' | 'Other';
  dob?: string; // ISO Date string YYYY-MM-DD
  primaryEvent?: string; // e.g. "100m", "Long Jump"
  pb100m?: number; // seconds
}

export interface DataPoint {
  timestamp: number; // milliseconds from start
  distance: number; // meters
  speed: number; // m/s
}

export interface TestConfig {
  type: TestType;
  targetDistance?: number; // For Acceleration (e.g., 30m)
  flyDistance?: number; // Length of fly zone (e.g., 30m)
  runUpDistance?: number; // Distance before fly zone starts (e.g., 20m)
  boardLocation?: number; // Distance from laser to the takeoff board/box (meters)
}

export interface JumpResult {
  successful?: boolean; // For PV (Make/Miss)
  resultMetric: number; // Height for PV, Distance for LJ (meters)
  boardLocation?: number; // The calibrated location of the board
  takeoffLocation?: number; // The actual location where the athlete took off (PV auto-detect)
  stepCount?: number; // Number of steps in approach
}

export interface RunSession {
  id: string;
  athleteId: string;
  date: string;
  data: DataPoint[];
  config: TestConfig;
  notes?: string;
  aiFeedback?: string;
  jumpResult?: JumpResult;
}

export interface TrainingSession {
  id: string;
  date: string;
  name: string;
  athleteIds: string[];
  runs: RunSession[];
  status: 'ACTIVE' | 'COMPLETED';
}

export type ParityType = 'none' | 'even' | 'odd';

export interface SerialConfig {
  baudRate: number;
  dataBits: number;
  stopBits: number;
  parity: ParityType;
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export type SpeedUnit = 'mps' | 'kph' | 'mph';
export type DistanceUnit = 'metric' | 'imperial';
export type DateFormat = 'MM.DD.YYYY' | 'DD.MM.YYYY' | 'YYYY-MM-DD';

export interface AppSettings {
  speedUnit: SpeedUnit;
  distanceUnit: DistanceUnit;
  dateFormat: DateFormat;
}

export interface LeaderboardEntry {
  id: string;
  testType: 'FORTY_YARD_DASH' | 'ACCELERATION_30M' | 'FLY_30M' | 'SIXTY_METER_RUN';
  athleteId: string;
  athleteName: string;
  athleteGender?: 'Male' | 'Female' | 'Other';
  userId: string;
  postedBy: 'coach' | 'athlete';
  time: number;
  date: string;
  sessionId: string;
  runId: string;
  createdAt: string;
}
