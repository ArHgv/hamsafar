export type Currency = 'IRT' | 'IRR' | 'USD' | 'EUR';
export type TransportMode = 'car' | 'plane' | 'train' | 'bus' | 'mixed';
export type MemberRole = 'viewer' | 'planner' | 'treasurer' | 'admin';
export type Attendance = 'confirmed' | 'invited' | 'maybe' | 'declined';
export type ItemStatus = 'pending' | 'done' | 'cancelled';
export type DayPeriod = 'morning' | 'noon' | 'afternoon' | 'night';
export type ActivityKind = 'sight' | 'food' | 'experience' | 'transport' | 'rest';
export type ChecklistCategory =
  | 'documents'
  | 'clothing'
  | 'electronics'
  | 'medicine'
  | 'food'
  | 'hygiene'
  | 'camping'
  | 'photography'
  | 'child'
  | 'other';
export type ExpenseCategory =
  'transport' | 'food' | 'hotel' | 'ticket' | 'shopping' | 'entertainment' | 'fuel' | 'other';
export type LocationCategory =
  | 'stay'
  | 'restaurant'
  | 'airport'
  | 'station'
  | 'terminal'
  | 'fuel'
  | 'parking'
  | 'hospital'
  | 'atm'
  | 'sight';
export type SplitMode = 'equal' | 'custom' | 'percentage';
export type TripSection =
  | 'info'
  | 'members'
  | 'activities'
  | 'checklist'
  | 'expenses'
  | 'settlements'
  | 'locations'
  | 'transport';

export interface Attachment {
  id: string;
  name: string;
  mime: 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp';
  size: number;
  localId?: string;
  cloudPath?: string;
}
export interface Member {
  id: string;
  name: string;
  email?: string;
  userId?: string;
  role: MemberRole;
  attendance: Attendance;
  color: string;
}
export interface Activity {
  id: string;
  title: string;
  date: string;
  time?: string;
  duration: number;
  period: DayPeriod;
  kind: ActivityKind;
  status: ItemStatus;
  notes?: string;
  locationId?: string;
}
export interface ChecklistItem {
  id: string;
  name: string;
  category: ChecklistCategory;
  done: boolean;
  priority: 'low' | 'normal' | 'high';
  quantity: number;
  weight?: number;
  shared: boolean;
  assignedTo?: string;
}
export interface ExpenseShare {
  memberId: string;
  amount: number;
  percentage?: number;
}
export interface Expense {
  id: string;
  title: string;
  amount: number; // Integer minor units; IRT and IRR have scale 1, USD and EUR scale 100.
  payerId: string;
  category: ExpenseCategory;
  date: string;
  notes?: string;
  splitMode: SplitMode;
  shares: ExpenseShare[];
  receipt?: Attachment;
  createdAt: string;
}
export interface Settlement {
  id: string;
  fromId: string;
  toId: string;
  amount: number;
  date: string;
  notes?: string;
}
export interface SavedLocation {
  id: string;
  name: string;
  category: LocationCategory;
  latitude: number;
  longitude: number;
  address?: string;
  notes?: string;
}
export interface JourneyLeg {
  origin?: string;
  destination?: string;
  departureTime?: string;
  arrivalTime?: string;
  routeNumber?: string;
  terminal?: string;
  platform?: string;
  checkinTime?: string;
  ticket?: Attachment;
  notes?: string;
}
export interface Transport {
  mode: TransportMode;
  outbound: JourneyLeg;
  return: JourneyLeg;
  vehiclePlate?: string;
  fuelEstimate?: number;
  route?: string;
  stops?: string;
}
export interface Trip {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  currency: Currency;
  description?: string;
  cover: string;
  members: Member[];
  activities: Activity[];
  checklist: ChecklistItem[];
  expenses: Expense[];
  settlements: Settlement[];
  locations: SavedLocation[];
  transport: Transport;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
  archived?: boolean;
}
export interface Profile {
  id: string;
  name: string;
  email?: string;
}
export interface CloudTripRecord {
  id: string;
  data: Trip;
  revision: number;
  updated_at: string;
}
export interface Invitation {
  token: string;
  role: MemberRole;
  expires_at: string;
}
export interface SuggestedSettlement {
  fromId: string;
  toId: string;
  amount: number;
}
