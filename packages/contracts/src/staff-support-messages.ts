export type StaffSupportMessageStatus = "PENDING" | "OPEN" | "CLOSED";

export type SupportChatSenderType = "CUSTOMER" | "STAFF";

export interface StaffSupportMessageNavCountsContract {
  /** Gözləyən (PENDING) dəstək söhbətlərinin sayı — sidebar badge. */
  pending: number;
}

export interface SupportChatMessageContract {
  id: string;
  threadId: string;
  senderType: SupportChatSenderType;
  staffUserId: string | null;
  staffDisplayName: string | null;
  body: string;
  createdAt: string;
}

export interface StaffSupportMessageSummaryContract {
  id: string;
  status: StaffSupportMessageStatus;
  name: string;
  phone: string;
  email: string | null;
  body: string;
  lastMessagePreview: string;
  lastMessageAt: string;
  pagePath: string | null;
  customerId: string | null;
  customerName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StaffSupportThreadDetailContract
  extends StaffSupportMessageSummaryContract {
  messages: SupportChatMessageContract[];
}

export type SupportChatRealtimeEvent =
  | {
      type: "message";
      threadId: string;
      message: SupportChatMessageContract;
    }
  | {
      type: "thread";
      threadId: string;
      thread: StaffSupportMessageSummaryContract;
    }
  | {
      type: "status";
      threadId: string;
      status: StaffSupportMessageStatus;
    };
