
export enum UserRole {
  OWNER = 'OWNER',
  TEACHER = 'TEACHER',
  STUDENT = 'STUDENT'
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  password?: string;
  roll?: string;
  photo?: string;
  fatherName?: string;
  motherName?: string;
  guardianPhone?: string;
  phone?: string;
  email?: string;
  presentAddress?: string;
  academicYear?: string;
  sscResult?: string;
  hscResult?: string;
  monthlyFee?: number;
  batch?: string;
  status: 'active' | 'disabled';
  createdAt?: string; // YYYY-MM-DD
}

export interface Payment {
  id: string;
  studentId: string;
  amount: number;
  finePaid: number;
  extraCharge: number;
  month: string; // e.g., "2023-10"
  timestamp: number;
  type: 'FEES' | 'FINE' | 'BOTH' | 'ADJUSTMENT';
  method: string; // bKash, Nagad, Cash, Adjustment, etc.
  paymentType: 'PERSONAL' | 'AGENT' | 'OFFLINE';
  note?: string; // Reason for adjustment/deduction
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  trxId?: string;
  senderLastNumber?: string;
}

export interface Attendance {
  id: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  status: 'PRESENT' | 'ABSENT';
  markedBy: string;
}

export interface Result {
  id: string;
  studentId: string;
  type: 'Class Test' | 'Class Exam';
  subject: string;
  marks: number;
  totalMarks: number;
  date: string;
  timestamp: number;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  timestamp: number;
  author: string;
}

export interface PaymentMethod {
  id: string;
  name: string; // e.g. "Bkash"
  number: string; // e.g. "01773387091"
  instructions?: string;
  type?: 'PERSONAL' | 'AGENT';
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
}

export interface SystemSettings {
  absentFineEnabled: boolean;
  lateFeeEnabled: boolean;
  guardianSmsEnabled: boolean;
  allStudentFineEnabled: boolean; // NEW: Toggle viewing all students' fines
  monthlyFineUpdateEnabled: boolean; // NEW: Toggle monthly fine system
  paymentMethods: PaymentMethod[];
  disabledAttendanceDates: string[]; // YYYY-MM-DD
  fridayMarkingEnabled: boolean;
}

export interface AdmissionApplication {
  id: string;
  studentName: string;
  phone: string;
  schoolCollege: string;
  admissionClass: string;
  sscGPA?: string;
  sscRoll?: string;
  sscReg?: string;
  board?: string;
  department?: string;
  timestamp: number;
}
