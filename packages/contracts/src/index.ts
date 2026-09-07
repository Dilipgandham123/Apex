export type HealthResponse = {
  status: "ok";
  service: "api";
};

export type RoleKey = "SUPER_ADMIN" | "SCHOOL_ADMIN" | "STAFF" | "CUSTOMER";

export type AuthenticatedUser = {
  id: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  role: RoleKey;
  schoolId: string | null;
};

export type AuthResponse = {
  accessToken: string;
  sessionId: string;
  expiresInSeconds: number;
  user: AuthenticatedUser;
};

export type TransmissionType = "MANUAL" | "AUTOMATIC";

export type Course = {
  id: string;
  code: string;
  name: string;
  transmission: TransmissionType;
  price: string;
  classCount: number;
  targetKmPerClass: string;
  durationDays: number;
  active: boolean;
};

export type CustomerEnrollmentResult = {
  customer: { id: string; customerCode: string; user: { displayName: string; phone: string } };
  enrollment: { id: string; status: "NOT_STARTED"; firstLessonAt: null; deadlineAt: null };
  pendingAmount: number;
};

export type VehicleStatus = "AVAILABLE" | "MAINTENANCE" | "INACTIVE";
export type StaffStatus = "ACTIVE" | "INACTIVE";

export type Vehicle = {
  id: string;
  registrationNumber: string;
  make: string;
  model: string;
  transmission: TransmissionType;
  status: VehicleStatus;
  odometerKm: string;
  insuranceExpiresAt: string | null;
  pucExpiresAt: string | null;
  driverAssignments: Array<{ staff: { id: string; staffCode: string; user: { displayName: string } } }>;
  issues: Array<{ id: string; severity: "LOW" | "MEDIUM" | "HIGH"; description: string; status: "OPEN" }>;
};

export type StaffProfile = {
  id: string;
  staffCode: string;
  status: StaffStatus;
  licenceNumber: string;
  licenceExpiresAt: string;
  canDriveManual: boolean;
  canDriveAutomatic: boolean;
  user: { displayName: string; email: string; active: boolean };
  vehicleAssignments: Array<{ vehicleId: string; vehicle: Vehicle }>;
};

export type LessonStatus = "ACTIVE" | "COMPLETED" | "COMPLETED_WITH_SHORTFALL";

export type LessonCustomerSearchResult = {
  customerId: string;
  customerCode: string;
  displayName: string;
  phone: string;
  enrollmentId: string;
  courseName: string;
  classesCompleted: number;
  classesTotal: number;
  targetKm: string;
  pendingKm: string;
  deadlineAt: string | null;
};

export type TrainingEnrollment = {
  id: string;
  status: "ACTIVE" | "EXPIRED";
  courseNameSnapshot: string;
  classCountSnapshot: number;
  firstLessonAt: string;
  deadlineAt: string;
  pendingKm: string;
  completedKm: string;
  daysRemaining: number;
  customer: { customerCode: string; user: { displayName: string; phone: string } };
  lessons: Array<{ id: string; classNumber: number; coveredKm: string; staff: { user: { displayName: string } } }>;
  kilometreEntries: Array<{ id: string; type: "SHORTFALL" | "RECOVERY" | "ADJUSTMENT"; amountKm: string; adjustmentKm: string | null; shortfallLessonId: string | null; recoveryLessonId: string | null; reason: string | null; createdAt: string }>;
  deadlineExtensions: Array<{ id: string; previousDeadline: string; newDeadline: string; reason: string; createdAt: string }>;
};

export type CustomerOverview = {
  customer: { customerCode: string; displayName: string; phone: string };
  enrollment: { id: string; status: "NOT_STARTED" | "ACTIVE" | "COMPLETED" | "EXPIRED" | "CANCELLED"; courseName: string; classesTotal: number; classesCompleted: number; classesRemaining: number; targetKmPerClass: string; firstLessonAt: string | null; deadlineAt: string | null; daysRemaining: number | null; completedKm: string; pendingKm: string; price: string; discount: string; totalPayable: string; paid: string; pendingAmount: string };
  lessons: Array<{ id: string; classNumber: number; status: LessonStatus; normalTargetKm: string; pendingKmBefore: string; totalTargetKm: string; startOdometerKm: string; endOdometerKm: string | null; coveredKm: string | null; shortfallKm: string | null; customerSummary: string | null; startedAt: string; endedAt: string | null; staff: { staffCode: string; user: { displayName: string } }; vehicle: { registrationNumber: string; make: string; model: string }; skills: Array<{ name: string }> }>;
  kilometreEntries: Array<{ id: string; type: "SHORTFALL" | "RECOVERY" | "ADJUSTMENT"; amountKm: string; adjustmentKm: string | null; reason: string | null; createdAt: string; shortfallLesson: { classNumber: number; staff: { user: { displayName: string } } } | null; recoveryLesson: { classNumber: number; staff: { user: { displayName: string } } } | null }>;
  deadlineExtensions: Array<{ previousDeadline: string; newDeadline: string; reason: string; createdAt: string }>;
};

export type PaymentRecord = { id: string; amount: string; refundedAmount: string; method: "OPENING_BALANCE" | "CASH" | "UPI" | "RAZORPAY"; status: "PENDING" | "VERIFIED" | "FAILED" | "PARTIALLY_REFUNDED" | "REFUNDED"; receiptNumber: string; reference: string | null; note: string | null; verifiedAt: string | null; createdAt: string; refunds: Array<{ id: string; amount: string; status: "PENDING" | "PROCESSED" | "FAILED"; reason: string; createdAt: string }> };
export type AdminPaymentEnrollment = { id: string; courseNameSnapshot: string; totalPayable: string; paidAmount: string; pendingAmount: string; customer: { customerCode: string; user: { displayName: string; phone: string } }; payments: PaymentRecord[] };
export type CustomerPayments = { paidAmount: string; pendingAmount: string; payments: PaymentRecord[] };

export type ComplaintStatus = "SUBMITTED" | "IN_REVIEW" | "WAITING_CUSTOMER" | "RESOLVED" | "CLOSED";
export type ComplaintMessage = { id: string; body: string; visibility: "PUBLIC" | "PRIVATE"; createdAt: string; author: { id: string; displayName: string } };
export type Complaint = {
  id: string; subject: string; description: string; status: ComplaintStatus; priority: "LOW" | "NORMAL" | "HIGH" | "URGENT"; resolutionOutcome: string | null; resolvedAt: string | null; createdAt: string; updatedAt: string;
  customer?: { displayName: string; phone: string | null }; enrollment?: { courseNameSnapshot: string; customer: { customerCode: string } };
  lesson: { id: string; classNumber: number } | null; staff: { id: string; staffCode: string; user: { displayName: string } } | null; vehicle: { id: string; registrationNumber: string; make: string; model: string } | null; payment: { id: string; receiptNumber: string; amount: string } | null;
  attachments: Array<{ id: string; url: string; fileName: string; mimeType: string; sizeBytes: number }>;
  messages: ComplaintMessage[];
};
export type ComplaintContext = { enrollmentId: string; lessons: Array<{ id: string; classNumber: number; startedAt: string; staff: { id: string; staffCode: string; user: { displayName: string } }; vehicle: { id: string; registrationNumber: string; make: string; model: string } }>; payments: Array<{ id: string; receiptNumber: string; amount: string; method: string; createdAt: string }> };

export type DashboardEnrollment = { id: string; customerCode: string; customerName: string; phone: string; courseName: string; status: string; classesCompleted: number; classesTotal: number; kilometres: string; pendingKm: string; paidAmount: string; pendingAmount: string; deadlineAt: string | null };
export type AdminDashboard = { generatedAt: string; operations: { activeLessons: number; availableDrivers: number; availableVehicles: number; customersToday: number; classesToday: number; kilometresToday: string }; activeLessons: Array<{ id: string; classNumber: number; startedAt: string; customer: { customerCode: string; user: { displayName: string } }; staff: { user: { displayName: string } }; vehicle: { registrationNumber: string } }>; exceptions: { pendingKilometres: DashboardEnrollment[]; expiring: DashboardEnrollment[]; expired: DashboardEnrollment[]; pendingPayments: DashboardEnrollment[]; openComplaints: Array<{ id: string; subject: string; status: string; createdAt: string; customer: { displayName: string } }>; vehicleWarnings: Array<{ id: string; registrationNumber: string; status: string; openIssues: number; insuranceExpiresAt: string | null; pucExpiresAt: string | null }> }; totals: { pendingKilometres: string; pendingPayments: string; openComplaints: number; vehicleWarnings: number } };
export type StaffDashboard = { generatedAt: string; staff: { displayName: string; staffCode: string }; vehicle: ({ registrationNumber: string; make: string; model: string; odometerKm: string; issues: Array<{ id: string }> }) | null; activeLesson: ({ id: string; classNumber: number; startedAt: string; customer: { customerCode: string; user: { displayName: string } }; vehicle: { registrationNumber: string } }) | null; today: { customers: number; classes: number; kilometres: string; shortfallClasses: number }; recentLessons: Array<{ id: string; classNumber: number; status: LessonStatus; coveredKm: string | null; shortfallKm: string | null; endedAt: string | null; customer: { customerCode: string; user: { displayName: string } }; vehicle: { registrationNumber: string } }> };
export type OperationalReport = { generatedAt: string; summary: { customers: number; completedCustomers: number; lessons: number; kilometres: string; revenue: string; pendingPayments: string; openComplaints: number }; customerRows: DashboardEnrollment[]; lessonRows: Array<{ id: string; classNumber: number; status: LessonStatus; coveredKm: string | null; shortfallKm: string | null; endedAt: string | null; customer: { customerCode: string; user: { displayName: string } }; staff: { user: { displayName: string } }; vehicle: { registrationNumber: string } }>; lessonsByDay: ReportAggregate[]; kilometresByDriver: ReportAggregate[]; kilometresByVehicle: ReportAggregate[]; kilometresByCustomer: ReportAggregate[]; staffRows: Array<{ id: string; staffCode: string; status: string; user: { displayName: string }; vehicleAssignments: Array<{ vehicle: { registrationNumber: string } }> }>; vehicleRows: Array<{ id: string; registrationNumber: string; status: string; odometerKm: string; issues: Array<{ id: string }>; driverAssignments: Array<{ staff: { user: { displayName: string } } }> }>; paymentRows: PaymentRecord[]; paymentMethods: ReportAggregate[]; complaintRows: Array<{ id: string; subject: string; status: ComplaintStatus; priority: string; createdAt: string; resolvedAt: string | null; customer: { displayName: string } }>; complaintStatuses: ReportAggregate[]; averageResolutionHours: number | null; deadlineExtensions: number };
export type ReportAggregate = { name: string; count: number; amount: string };

export type Lesson = {
  id: string;
  classNumber: number;
  status: LessonStatus;
  normalTargetKm: string;
  pendingKmBefore: string;
  totalTargetKm: string;
  startOdometerKm: string;
  endOdometerKm: string | null;
  coveredKm: string | null;
  shortfallKm: string | null;
  customerSummary: string | null;
  privateNote: string | null;
  startedAt: string;
  endedAt: string | null;
  customer: { customerCode: string; user: { displayName: string; phone: string } };
  enrollment: { id: string; courseNameSnapshot: string; classCountSnapshot: number };
  vehicle: { id: string; registrationNumber: string; make: string; model: string };
  staff: { user: { displayName: string } };
  skills: Array<{ id: string; name: string }>;
};
