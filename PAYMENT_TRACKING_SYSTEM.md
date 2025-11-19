# 💳 Payment Tracking System

## Overview

The Payment Tracking System provides comprehensive subscription and payment management across the platform. It tracks all MercadoPago payments, manages subscription status, and provides detailed views for both publishers and administrators.

## 🎯 Key Features

### **For Publishers:**
- ✅ **"Mi Plan" Dashboard** - View current subscription status and payment history
- ✅ **Payment Statistics** - Total payments, amounts, and success rates
- ✅ **Real-time Updates** - Subscription status updates automatically
- ✅ **Payment History** - Complete transaction history with status details

### **For Superadmin:**
- ✅ **User Detail Pages** - Comprehensive user information and payment history
- ✅ **Payment Analytics** - System-wide payment statistics and trends
- ✅ **Subscription Management** - View and manage all user subscriptions
- ✅ **Transaction Monitoring** - Track all payments across the platform

## 🏗️ System Architecture

### **Components:**

#### **1. Payment Tracking Service** (`paymentTrackingService.ts`)
- **Payment Records** - Complete payment transaction tracking
- **Subscription Management** - Active subscription status and history
- **Webhook Processing** - Real-time payment status updates from MercadoPago
- **Statistics Generation** - Payment analytics and reporting

#### **2. Enhanced Firebase Service** (`firebaseService.ts`)
- **Payments Collection** - Dedicated payment records storage
- **Subscriptions Collection** - User subscription data with MercadoPago integration
- **Advanced Queries** - Search by user, MercadoPago ID, status, etc.

#### **3. Publisher Dashboard** (`mi-plan/page.tsx`)
- **Subscription Status** - Current plan information and billing details
- **Payment History** - Complete transaction history with filtering
- **Statistics Cards** - Visual payment metrics and success rates
- **Real-time Refresh** - Manual and automatic data updates

#### **4. Admin User Details** (`users/[id]/page.tsx`)
- **User Profile** - Complete user information and role management
- **Subscription Details** - Active subscription status and billing information
- **Payment Analytics** - User-specific payment statistics and trends
- **Transaction History** - Detailed payment records with status tracking

#### **5. Enhanced Webhook** (`subscription-webhook/route.ts`)
- **Payment Processing** - Automatic payment record creation and updates
- **Subscription Updates** - Real-time subscription status changes
- **Data Synchronization** - Keeps Firebase in sync with MercadoPago

## 📊 Database Structure

### **Payments Collection** (`payments`)
```typescript
interface PaymentRecord {
  id: string;
  userId: string;
  subscriptionId?: string;
  mercadoPagoPaymentId: string;
  mercadoPagoSubscriptionId?: string;
  amount: number;
  currency: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'refunded';
  statusDetail: string;
  paymentMethod: string;
  paymentMethodId?: string;
  transactionId?: string;
  externalReference?: string;
  description: string;
  createdAt: Date;
  processedAt?: Date;
  metadata: {
    mercadoPagoData: any;
    userAgent?: string;
    ipAddress?: string;
  };
}
```

### **User Subscriptions Collection** (`userSubscriptions`)
```typescript
interface SubscriptionRecord {
  id: string;
  userId: string;
  planId: string;
  planName: string;
  mercadoPagoSubscriptionId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'active' | 'cancelled' | 'paused' | 'expired';
  mercadoPagoStatus: string;
  billingCycle: string;
  frequency: number;
  frequencyType: 'days' | 'months';
  startDate: Date;
  endDate?: Date;
  nextBillingDate?: Date;
  paymentHistory: string[]; // Array of payment record IDs
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  metadata: {
    mercadoPagoData: any;
  };
}
```

## 🔄 Payment Flow

### **1. Subscription Creation**
```
User subscribes → MercadoPago PreApprovalPlan created → 
Subscription record saved to Firebase → User roles updated → 
Publisher dashboard shows active status
```

### **2. Payment Processing**
```
MercadoPago processes payment → Webhook notification sent → 
Payment record created/updated in Firebase → Subscription status updated → 
User roles managed → Dashboard refreshed
```

### **3. Payment History Tracking**
```
Every payment → Recorded in payments collection → 
Linked to subscription → Statistics updated → 
Dashboard displays updated information
```

## 🎨 User Interfaces

### **Publisher "Mi Plan" Dashboard**

#### **Subscription Status Card:**
- **Plan Information** - Current plan name, price, and billing cycle
- **Status Badge** - Visual status indicator (active, pending, cancelled)
- **Billing Details** - Start date, next billing date, and renewal information
- **Action Buttons** - Refresh data and manage subscription

#### **Payment Statistics:**
- **Total Payments** - Number of completed transactions
- **Total Amount** - Sum of all payments in user's currency
- **Success Rate** - Percentage of successful payments
- **Pending Payments** - Currently processing transactions

#### **Payment History:**
- **Transaction List** - Chronological list of all payments
- **Status Indicators** - Visual status with icons and colors
- **Payment Details** - Amount, method, date, and MercadoPago ID
- **Search & Filter** - Find specific transactions quickly

### **Admin User Detail Page**

#### **User Information:**
- **Profile Data** - Name, email, phone, registration date
- **Role Management** - Current roles with visual indicators
- **Account Status** - Active/inactive and email verification status

#### **Subscription Management:**
- **Active Subscription** - Current plan details and billing information
- **Status Tracking** - Real-time subscription status updates
- **Billing History** - Complete payment and billing timeline

#### **Payment Analytics:**
- **User Statistics** - Payment counts, amounts, and success rates
- **Transaction History** - Detailed payment records with full metadata
- **Performance Metrics** - Payment trends and user behavior analysis

## 🛠️ Technical Implementation

### **1. Payment Tracking Service**

**Key Methods:**
```typescript
class PaymentTrackingService {
  // Create payment record from MercadoPago data
  async createPaymentRecord(paymentData): Promise<string>
  
  // Update payment status
  async updatePaymentRecord(paymentId: string, updates): Promise<void>
  
  // Process webhook notifications
  async processPaymentWebhook(mercadoPagoData): Promise<void>
  
  // Get user payment statistics
  async getUserPaymentStats(userId: string): Promise<PaymentStats>
  
  // Handle approved payments
  private async handleApprovedPayment(paymentRecord): Promise<void>
}
```

**Webhook Processing:**
```typescript
async processPaymentWebhook(mercadoPagoData: any): Promise<void> {
  // Check if payment already exists
  let paymentRecord = await this.getPaymentByMercadoPagoId(mercadoPagoData.id);
  
  if (!paymentRecord) {
    // Create new payment record
    const paymentData = this.mapMercadoPagoData(mercadoPagoData);
    const paymentId = await this.createPaymentRecord(paymentData);
  } else {
    // Update existing payment record
    await this.updatePaymentRecord(paymentRecord.id, updates);
  }
  
  // Update subscription if payment approved
  if (mercadoPagoData.status === 'approved') {
    await this.handleApprovedPayment(paymentRecord);
  }
}
```

### **2. Firebase Integration**

**Enhanced Collections:**
```typescript
// Payments collection operations
firebaseDB.payments = {
  async create(paymentData): Promise<string>
  async getById(paymentId: string): Promise<PaymentRecord | null>
  async update(paymentId: string, updates): Promise<void>
  async getByUserId(userId: string): Promise<PaymentRecord[]>
  async getByMercadoPagoId(mercadoPagoPaymentId: string): Promise<PaymentRecord | null>
}

// Enhanced subscriptions collection
firebaseDB.subscriptions = {
  async getByMercadoPagoId(mercadoPagoSubscriptionId: string): Promise<SubscriptionRecord | null>
  // ... existing methods
}
```

### **3. Dashboard Components**

**Mi Plan Dashboard:**
```typescript
export default function MiPlanPage() {
  const { user, refreshUser } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [paymentStats, setPaymentStats] = useState<PaymentStats>({});

  useEffect(() => {
    if (user?.id) {
      loadUserData();
    }
  }, [user?.id]);

  const loadUserData = async () => {
    // Load subscription data
    const subscriptionData = await subscriptionService.getUserActiveSubscription(user.id);
    
    // Load payment history
    const paymentHistory = await paymentTrackingService.getUserPayments(user.id);
    
    // Load payment statistics
    const stats = await paymentTrackingService.getUserPaymentStats(user.id);
  };
}
```

## 📈 Payment Statistics

### **User-Level Statistics:**
- **Total Payments** - Count of all payment attempts
- **Total Amount** - Sum of all successful payments
- **Success Rate** - Percentage of approved payments
- **Pending Payments** - Currently processing transactions
- **Failed Payments** - Rejected or cancelled payments

### **System-Level Analytics:**
- **Revenue Tracking** - Total platform revenue
- **Payment Methods** - Popular payment methods
- **Success Rates** - Overall payment success metrics
- **User Behavior** - Payment patterns and trends

## 🔄 Real-time Updates

### **Webhook Integration:**
```typescript
// MercadoPago webhook processing
if (type === 'payment') {
  const paymentDetails = await getPaymentDetails(paymentId);
  
  // Process payment using tracking service
  await paymentTrackingService.processPaymentWebhook(paymentDetails);
  
  // Update subscription status
  await processSubscriptionPayment(paymentDetails);
}
```

### **Automatic Refresh:**
- **Dashboard Updates** - Real-time subscription status changes
- **Payment Status** - Live payment processing updates
- **Statistics Refresh** - Updated metrics after each payment
- **User Role Management** - Automatic role updates based on subscription

## 🧪 Testing Scenarios

### **1. Payment Processing Tests**
```typescript
// Test: Payment webhook processing
const mockPaymentData = {
  id: '123456789',
  status: 'approved',
  transaction_amount: 5000,
  currency_id: 'ARS',
  payment_method: { type: 'credit_card' }
};

await paymentTrackingService.processPaymentWebhook(mockPaymentData);
expect(paymentRecord.status).toBe('approved');
expect(paymentRecord.amount).toBe(5000);
```

### **2. Subscription Management Tests**
```typescript
// Test: Subscription status updates
const subscription = await subscriptionService.getUserActiveSubscription(userId);
expect(subscription.status).toBe('active');

// Test: Payment history linking
const payments = await paymentTrackingService.getUserPayments(userId);
expect(payments.length).toBeGreaterThan(0);
expect(subscription.paymentHistory).toContain(payments[0].id);
```

### **3. Dashboard Integration Tests**
```typescript
// Test: Mi Plan dashboard data loading
const { subscription, payments, stats } = await loadUserData();
expect(subscription).toBeDefined();
expect(payments).toBeInstanceOf(Array);
expect(stats.totalPayments).toBeGreaterThanOrEqual(0);
```

## 🚀 Usage Examples

### **1. Publisher Dashboard Usage**
```typescript
// Access Mi Plan dashboard
const { user } = useAuth();
if (user && hasRole('publisher')) {
  // Navigate to Mi Plan
  router.push('/mi-plan');
}
```

### **2. Admin User Management**
```typescript
// Access user details from admin panel
const navigateToUserDetails = (userId: string) => {
  window.location.href = `/users/${userId}`;
};
```

### **3. Payment Statistics**
```typescript
// Get user payment statistics
const stats = await paymentTrackingService.getUserPaymentStats(userId);
console.log('Payment Statistics:', {
  totalPayments: stats.totalPayments,
  totalAmount: stats.totalAmount,
  successRate: (stats.successfulPayments / stats.totalPayments) * 100
});
```

## 🔮 Future Enhancements

### **Planned Features:**
- **Payment Analytics Dashboard** - Advanced reporting and insights
- **Automated Billing** - Recurring payment management
- **Payment Method Management** - Save and manage payment methods
- **Refund Processing** - Handle refunds and cancellations
- **Tax Reporting** - Generate tax reports and invoices
- **Multi-currency Support** - Support for multiple currencies
- **Payment Notifications** - Email/SMS notifications for payment events

---

## ✅ Implementation Status

- ✅ **Payment Tracking Service** - Complete
- ✅ **Firebase Integration** - Complete
- ✅ **Publisher Dashboard** - Complete
- ✅ **Admin User Details** - Complete
- ✅ **Webhook Integration** - Complete
- ✅ **Payment Statistics** - Complete
- ✅ **Real-time Updates** - Complete
- 🔄 **Testing & Validation** - In Progress

The Payment Tracking System is now fully implemented and provides comprehensive subscription and payment management across the platform! 🚀

## 🎯 Key Benefits

1. **Complete Payment Visibility** - Track all transactions and subscription status
2. **Real-time Updates** - Instant status changes via webhook integration
3. **User-friendly Dashboards** - Intuitive interfaces for both users and admins
4. **Comprehensive Analytics** - Detailed payment statistics and trends
5. **Scalable Architecture** - Easy to extend with new features
6. **Data Integrity** - Reliable payment record management and synchronization
