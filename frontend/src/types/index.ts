export interface ApiResponse<T> {
  data?: T;
  error?: { code: string; message: string; details?: unknown };
  meta?: PageMeta;
}

export interface PageMeta {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  userId: string;
  tenantId: string;
  name: string;
  email: string;
  roles: string[];
  permissions: string[];
}

export interface TenantProfile {
  id: string;
  name: string;
  subdomainSlug: string;
  plan: string;
  status: string;
  gstin?: string;
  pan?: string;
  address?: string;
  logoUrl?: string;
  settings?: Record<string, unknown>;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  status: string;
  roles: string[];
  employeeId?: string;
  lastLoginAt?: string;
  createdAt: string;
}

export interface Role {
  id: string;
  name: string;
  systemRole: boolean;
  permissions: string[];
}

export interface Client {
  id: string;
  name: string;
  type: string;
  gstin?: string;
  pan?: string;
  billingAddress?: Record<string, string>;
  industrySegment?: string;
  createdAt: string;
}

export interface Lead {
  id: string;
  clientId?: string;
  title: string;
  source?: string;
  projectType?: string;
  estimatedValue?: number;
  stage: string;
  location?: string;
  assignedTo?: string;
  notes?: string;
  createdAt: string;
}

export interface Vendor {
  id: string;
  name: string;
  category?: string;
  specialty?: string;
  gstin?: string;
  pan?: string;
  address?: string;
  phone?: string;
  email?: string;
  status: string;
  createdAt: string;
}

export interface WorkOrder {
  id: string;
  vendorId: string;
  vendorName: string;
  projectId?: string;
  woNumber: string;
  scope?: string;
  value?: number;
  paymentTerms?: string;
  startDate?: string;
  endDate?: string;
  status: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PurchaseOrder {
  id: string;
  workOrderId?: string;
  poNumber: string;
  lineItems?: Record<string, unknown>;
  gstAmount?: number;
  total: number;
  status: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ProjectMilestone {
  id: string;
  name: string;
  targetDate?: string;
  actualDate?: string;
  status: string;
  deliverables?: string;
  createdAt: string;
}

export interface ProjectPhase {
  id: string;
  name: string;
  displayOrder: number;
  startDate?: string;
  endDate?: string;
  milestones: ProjectMilestone[];
  createdAt: string;
}

export interface Project {
  id: string;
  clientId?: string;
  leadId?: string;
  name: string;
  type?: string;
  location?: string;
  siteAddress?: string;
  startDate?: string;
  targetEndDate?: string;
  value?: number;
  status: string;
  createdAt: string;
  updatedAt?: string;
  phases?: ProjectPhase[];
}

export interface Task {
  id: string;
  projectId: string;
  milestoneId?: string;
  title: string;
  description?: string;
  assigneeId?: string;
  priority: string;
  status: string;
  dueDate?: string;
  createdAt: string;
}

export interface Invoice {
  id: string;
  clientId: string;
  projectId?: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  sacCode?: string;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  status: string;
  createdAt: string;
  updatedAt?: string;
}

export interface VendorBill {
  id: string;
  vendorId: string;
  workOrderId?: string;
  billNumber: string;
  amount: number;
  gstAmount?: number;
  tdsSection?: string;
  tdsRate?: number;
  tdsAmount?: number;
  dueDate: string;
  status: string;
  paidAt?: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  projectId?: string;
  category: string;
  amount: number;
  expenseDate: string;
  description?: string;
  receiptStorageKey?: string;
  createdBy?: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  paymentDate: string;
  mode?: string;
  reference?: string;
  notes?: string;
  createdAt: string;
}

export interface ProjectBudgetLine {
  id: string;
  category: string;
  budgetedAmount: number;
  actualAmount: number;
}

export interface ProjectBudget {
  projectId: string;
  lines: ProjectBudgetLine[];
  totalBudgeted: number;
  totalActual: number;
}

export interface Employee {
  id: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  employeeCode?: string;
  name: string;
  designation?: string;
  department?: string;
  dateOfJoining?: string;
  phone?: string;
  personalEmail?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  status: string;
  createdAt: string;
}

export interface DashboardData {
  activeProjectCount: number;
  pipelineValue: number;
  outstandingReceivables: number;
  pendingPayables: number;
  employeeCount: number;
  openLeadCount: number;
  overdueInvoiceCount: number;
  totalRevenue: number;
  totalExpenses: number;
  totalVendorCosts: number;
  pendingLeaveRequests: number;
  activeVendorCount: number;
}

export interface LeaveType {
  id: string;
  name: string;
  annualQuota: number;
  carryForwardLimit: number;
}

/** Matches `AttendanceResponse` from the API */
export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  status: string;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Matches `LeaveResponse` from the API */
export interface LeaveRequestRecord {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  days: number | string;
  reason?: string | null;
  status: string;
  approvedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Matches `ReimbursementResponse` from the API */
export interface ReimbursementRecord {
  id: string;
  employeeId: string;
  category: string;
  amount: number;
  description?: string | null;
  receiptStorageKey?: string | null;
  status: string;
  approvedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Matches `TenantResponse` for profile GET/PUT flows */
export interface TenantProfileResponse {
  id: string;
  name: string;
  subdomainSlug: string;
  plan: string;
  status: string;
  gstin?: string | null;
  pan?: string | null;
  address?: string | null;
  logoUrl?: string | null;
  settings?: Record<string, unknown> | null;
  createdAt: string;
  googleDriveConnected?: boolean;
  googleDriveConnectedEmail?: string | null;
  /** Tenant's Google OAuth web client ID (not secret). */
  googleOauthClientId?: string | null;
  /** True when client ID and encrypted client secret are stored for this workspace. */
  googleDriveOauthConfigured?: boolean;
}

export interface Contact {
  id: string;
  clientId: string;
  name: string;
  designation?: string;
  email?: string;
  phone?: string;
  role?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Activity {
  id: string;
  entityType: string;
  entityId: string;
  type: string;
  description?: string;
  date: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface LeadStage {
  id: string;
  name: string;
  displayOrder: number;
}

export interface VendorScorecard {
  id: string;
  vendorId?: string;
  projectId?: string;
  qualityRating: number;
  timelinessRating: number;
  costRating: number;
  notes?: string;
  createdAt: string;
}

export interface ProjectDocument {
  id: string;
  projectId?: string;
  fileName: string;
  folderPath?: string;
  storageKey: string;
  version: number;
  uploadedBy?: string;
  createdAt: string;
}

export interface ResourceAssignment {
  id: string;
  projectId?: string;
  userId: string;
  role?: string;
  startDate?: string;
  endDate?: string;
  createdAt: string;
}

export interface TaskComment {
  id: string;
  taskId?: string;
  authorId?: string;
  content: string;
  createdAt: string;
}

export interface Holiday {
  id: string;
  name: string;
  date: string;
  type: string;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  tenantId: string;
  userId?: string;
  entityType: string;
  entityId?: string;
  action: string;
  changes?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
}

export interface ClientHistory {
  projects: { id: string; name: string; status: string; value: number }[];
  invoices: { invoiceNumber: string; total: number; status: string; date: string }[];
  leads: { id: string; title: string; stage: string; estimatedValue: number }[];
  totalInvoiced: number;
  totalPaid: number;
}

export type ContractPartyKind = "FIRM" | "CLIENT" | "VENDOR";
export type ContractRevisionSource = "LLM" | "MANUAL" | "IMPORT";

export interface ContractParty {
  id: string;
  partyKind: ContractPartyKind;
  clientId?: string;
  vendorId?: string;
  displayName?: string;
  contactEmail?: string;
}

export interface ContractRevision {
  id: string;
  revisionNumber: number;
  body: string;
  source: ContractRevisionSource;
  userPrompt?: string;
  model?: string;
  systemPromptSnapshot?: string;
  createdBy?: string;
  createdAt: string;
}

export interface ContractSignedDocument {
  id: string;
  revisionId?: string;
  fileName: string;
  storageKey: string;
  uploadedBy?: string;
  uploadedAt: string;
}

export interface ContractSendLogEntry {
  id: string;
  revisionId?: string;
  subject?: string;
  recipientEmails: string;
  status: string;
  errorMessage?: string;
  sentBy?: string;
  createdAt: string;
}

export interface ContractSummary {
  id: string;
  title: string;
  status: string;
  projectId?: string;
  latestRevisionNumber?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface ContractDetail {
  id: string;
  title: string;
  status: string;
  projectId?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
  parties: ContractParty[];
  revisions: ContractRevision[];
  signedDocuments: ContractSignedDocument[];
  sendLog: ContractSendLogEntry[];
}

export interface TenantContractAiConfig {
  defaultSystemPrompt?: string;
  defaultModel: string;
  apiKeyConfigured: boolean;
  apiKeyLastFour?: string;
}

export interface TenantOutboundEmailConfig {
  smtpHost: string;
  smtpPort: number;
  smtpUsername: string;
  fromEmail: string;
  starttlsEnabled: boolean;
  smtpSsl: boolean;
  passwordConfigured: boolean;
}
