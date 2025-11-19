# MercadoPago Plans Auto-Synchronization

## Overview

The platform now automatically synchronizes subscription plans with MercadoPago whenever they are created, updated, or deleted. This ensures that your MercadoPago account always reflects the current state of your plans without manual intervention.

## How It Works

### Automatic Synchronization

Every plan operation automatically triggers a sync with MercadoPago:

1. **Create Plan** → Automatically creates the plan in MercadoPago
2. **Update Plan** → Automatically updates the plan in MercadoPago
3. **Delete Plan** → Automatically deletes the plan from MercadoPago
4. **Toggle Active Status** → Automatically updates the plan status in MercadoPago

### Non-Blocking Sync

The synchronization is **non-blocking**, which means:
- ✅ Your plan operation will succeed even if MercadoPago sync fails
- ⚠️ Sync errors are logged but don't prevent the operation
- 🔄 You can manually resync plans later if needed

## Credentials Used

Plans synchronization uses the **MercadoPago Suscripción** credentials configured in Settings:

```
Settings → MercadoPago Suscripción
```

**Important:** Make sure these credentials are:
- ✅ Configured with valid Public Key and Access Token
- ✅ Marked as **Active** (checkbox enabled)
- ✅ From an account with proper subscription permissions

## Technical Implementation

### Updated Components

#### 1. Firebase Service (`firebaseService.ts`)

All plan CRUD operations now include automatic sync:

```typescript
plans: {
  async create() { ... sync ... }
  async update() { ... sync ... }
  async delete() { ... sync with deletion ... }
  async toggleActive() { ... sync ... }
}
```

#### 2. API Endpoints

Three endpoints handle the synchronization:

- **`POST /api/mercadopago/sync-plan`** - Sync a single plan
- **`POST /api/mercadopago/delete-plan`** - Delete a plan from MercadoPago
- **`POST /api/mercadopago/sync-plans`** - Manually sync all plans

#### 3. Plans Service (`mercadoPagoPlansService.ts`)

Updated to:
- ✅ Properly convert billing cycles (daily → day, monthly → month, etc.)
- ✅ Use `mercadoPagoPlanId` if available for updates
- ✅ Handle create/update logic automatically

## Data Flow

### When Creating a Plan:

```
User submits plan form
    ↓
Save plan to Firebase
    ↓
[SUCCESS] Plan created in Firebase
    ↓
Auto-trigger MercadoPago sync
    ↓
Call /api/mercadopago/sync-plan
    ↓
Create plan in MercadoPago
    ↓
Save mercadoPagoPlanId to Firebase
    ↓
[COMPLETE] Plan fully synchronized
```

### When Updating a Plan:

```
User updates plan
    ↓
Update plan in Firebase
    ↓
[SUCCESS] Plan updated in Firebase
    ↓
Auto-trigger MercadoPago sync
    ↓
Call /api/mercadopago/sync-plan
    ↓
Update existing plan in MercadoPago
    (or create if update fails)
    ↓
[COMPLETE] Plan fully synchronized
```

### When Deleting a Plan:

```
User deletes plan
    ↓
Get mercadoPagoPlanId from Firebase
    ↓
Delete plan from Firebase
    ↓
[SUCCESS] Plan deleted from Firebase
    ↓
If has mercadoPagoPlanId:
    Auto-trigger MercadoPago deletion
    ↓
    Call /api/mercadopago/delete-plan
    ↓
    Delete plan from MercadoPago
    ↓
[COMPLETE] Plan fully removed
```

## Plan Data Mapping

### Platform → MercadoPago

| Platform Field | MercadoPago Field | Notes |
|---------------|-------------------|-------|
| `name` | `name` | Plan name |
| `description` | `description` | Plan description |
| `price` | `amount` | Plan price |
| `currency` | `currency` | Currency code (e.g., ARS) |
| `billingCycle` | `frequency.type` | Converted (monthly → month) |
| `id` | `external_reference` | Links back to platform plan |
| `mercadoPagoPlanId` | `id` | MercadoPago plan ID (stored after sync) |

### Billing Cycle Conversion

```typescript
Platform      → MercadoPago
------------------------
daily         → day
weekly        → week
monthly       → month
yearly        → year
```

## Error Handling

### Graceful Degradation

If MercadoPago sync fails, the operation still succeeds in the platform:

```
✅ Plan created in Firebase (operation succeeds)
❌ MercadoPago sync failed (logged as warning)
→ User sees success message
→ Manual sync can be attempted later
```

### Error Scenarios Handled

1. **Credentials Not Configured**
   - Operation: ✅ Succeeds
   - Sync: ❌ Skipped
   - Log: `⚠️ MercadoPago credentials not configured`

2. **Credentials Inactive**
   - Operation: ✅ Succeeds
   - Sync: ❌ Skipped
   - Log: `⚠️ MercadoPago credentials inactive`

3. **MercadoPago API Error**
   - Operation: ✅ Succeeds
   - Sync: ❌ Failed
   - Log: `⚠️ Failed to sync plan with MercadoPago: [error details]`

4. **Network Error**
   - Operation: ✅ Succeeds
   - Sync: ❌ Failed (will retry on next update)
   - Log: `⚠️ Network error during sync`

## Manual Synchronization

If automatic sync fails or you need to force a resync:

### From the UI

1. Navigate to **Plans** page
2. Click **"Sync with MercadoPago"** button
3. Wait for sync to complete
4. Check results for any errors

### Via API

```bash
# Sync all plans
curl -X POST http://localhost:3000/api/mercadopago/sync-plans \
  -H "Content-Type: application/json"

# Sync a single plan
curl -X POST http://localhost:3000/api/mercadopago/sync-plan \
  -H "Content-Type: application/json" \
  -d '{"planId": "plan_id_here"}'
```

## Console Logs

The system provides detailed logging for monitoring:

### Successful Sync

```
✅ Plan synced with MercadoPago: plan_abc123
```

### Sync Warning (non-critical)

```
⚠️ Failed to sync plan with MercadoPago (non-blocking): [error details]
```

### Sync Operation Start

```
🔄 [MercadoPago Sync Plan] Starting sync for plan: plan_abc123
```

### Plan Created in MercadoPago

```
➕ [MercadoPago Sync Plan] Creating new plan
✅ [MercadoPago Sync Plan] Plan created successfully
```

### Plan Updated in MercadoPago

```
📝 [MercadoPago Sync Plan] Updating existing plan: mp_plan_xyz
✅ [MercadoPago Sync Plan] Plan updated successfully
```

### Plan Deleted from MercadoPago

```
🗑️ [MercadoPago Delete Plan] Deleting plan from MercadoPago: mp_plan_xyz
✅ [MercadoPago Delete Plan] Plan deleted successfully
```

## Database Schema Updates

### Plan Document Structure

```typescript
{
  id: string;                          // Firebase document ID
  name: string;
  description: string;
  price: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly' | 'weekly' | 'daily';
  features: string[];
  maxPosts: number;
  maxBookings: number;
  isActive: boolean;
  isVisible: boolean;
  mercadoPagoPlanId?: string;          // ✨ MercadoPago plan ID (auto-populated)
  mercadoPagoPreferenceId?: string;    // MercadoPago preference ID
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}
```

### New Field: `mercadoPagoPlanId`

- **Type:** `string` (optional)
- **Purpose:** Stores the MercadoPago plan ID after sync
- **Auto-populated:** Yes, after successful sync
- **Usage:** Used for updates and deletions in MercadoPago

## Testing the Integration

### Prerequisites

1. ✅ Configure MercadoPago Suscripción credentials
2. ✅ Ensure credentials are marked as Active
3. ✅ Have a test MercadoPago account

### Test Scenarios

#### Test 1: Create Plan

```
1. Navigate to Plans page
2. Click "Create Plan"
3. Fill in plan details
4. Submit form
5. ✅ Check: Plan appears in plans list
6. ✅ Check: Console shows sync success
7. ✅ Check: Plan has mercadoPagoPlanId in Firebase
8. ✅ Check: Plan exists in MercadoPago dashboard
```

#### Test 2: Update Plan

```
1. Click "Edit" on an existing plan
2. Change plan name and price
3. Submit form
4. ✅ Check: Changes reflected in platform
5. ✅ Check: Console shows sync success
6. ✅ Check: Changes reflected in MercadoPago
```

#### Test 3: Delete Plan

```
1. Click "Delete" on a plan
2. Confirm deletion
3. ✅ Check: Plan removed from platform
4. ✅ Check: Console shows deletion success
5. ✅ Check: Plan removed from MercadoPago
```

#### Test 4: Toggle Active Status

```
1. Toggle plan active status
2. ✅ Check: Status updated in platform
3. ✅ Check: Console shows sync success
4. ✅ Check: Status synced to MercadoPago
```

#### Test 5: Credentials Not Configured

```
1. Ensure MercadoPago Suscripción credentials are not set
2. Create a plan
3. ✅ Check: Plan still created in platform
4. ⚠️ Check: Warning logged about missing credentials
5. ✅ Check: User sees success message
```

#### Test 6: Manual Sync

```
1. Create several plans with credentials disabled
2. Enable MercadoPago Suscripción credentials
3. Click "Sync with MercadoPago"
4. ✅ Check: All plans synced successfully
5. ✅ Check: mercadoPagoPlanId populated for all
```

## Troubleshooting

### Plan Not Syncing

**Problem:** Plan created but no `mercadoPagoPlanId`

**Solutions:**
1. Check MercadoPago Suscripción credentials are configured
2. Check credentials are marked as Active
3. Check browser console for sync errors
4. Check server logs for detailed error messages
5. Try manual sync from Plans page

### Sync Fails with "Credentials not configured"

**Problem:** Credentials error during sync

**Solutions:**
1. Go to Settings → MercadoPago Suscripción
2. Enter valid Public Key and Access Token
3. Check "Activate" checkbox
4. Save configuration
5. Retry plan creation or manual sync

### Plan Updates Not Reflected in MercadoPago

**Problem:** Plan updated in platform but not in MercadoPago

**Solutions:**
1. Check if plan has `mercadoPagoPlanId`
2. If not, run manual sync to establish link
3. Check MercadoPago API credentials are valid
4. Check server logs for sync errors
5. Try manual sync from Plans page

### Deletion Fails

**Problem:** Plan deleted from platform but still in MercadoPago

**Solutions:**
1. This is expected if plan had no `mercadoPagoPlanId`
2. Manually delete from MercadoPago dashboard
3. Or note the mercadoPagoPlanId and use API:
   ```bash
   curl -X POST http://localhost:3000/api/mercadopago/delete-plan \
     -H "Content-Type: application/json" \
     -d '{"mercadoPagoPlanId": "mp_plan_id_here"}'
   ```

## Migration Guide

### Existing Plans

If you have existing plans created before this auto-sync feature:

1. **Configure Credentials** (if not already done)
   - Settings → MercadoPago Suscripción
   - Enter Public Key and Access Token
   - Enable "Active" checkbox

2. **Manual Sync All Plans**
   - Go to Plans page
   - Click "Sync with MercadoPago"
   - Wait for completion

3. **Verify Sync**
   - Check each plan has `mercadoPagoPlanId`
   - Verify plans appear in MercadoPago dashboard
   - Test updates work correctly

### New Installation

For new installations:
1. Configure MercadoPago Suscripción credentials first
2. Create plans normally
3. Auto-sync will handle everything automatically

## Best Practices

### 1. Configure Credentials First

Always configure MercadoPago Suscripción credentials before creating plans:
```
✅ Configure credentials → Create plans
❌ Create plans → Configure credentials later
```

### 2. Monitor Sync Success

Check console logs after plan operations:
```
✅ Look for: "Plan synced with MercadoPago"
⚠️ Look for: "Failed to sync plan" warnings
```

### 3. Use Manual Sync When Needed

If you see sync warnings:
```
1. Fix any credential issues
2. Run manual sync from Plans page
3. Verify all plans have mercadoPagoPlanId
```

### 4. Test in Development First

Before using in production:
```
1. Use test MercadoPago credentials
2. Create/update/delete test plans
3. Verify sync works correctly
4. Check MercadoPago test dashboard
```

### 5. Keep Credentials Active

Ensure credentials remain active:
```
✅ Regularly verify credentials are active
✅ Update credentials before they expire
✅ Monitor for sync errors in logs
```

## API Reference

### POST /api/mercadopago/sync-plan

Sync a single plan with MercadoPago.

**Request:**
```json
{
  "planId": "plan_firebase_id"
}
```

**Response:**
```json
{
  "success": true,
  "mercadoPagoPlanId": "mp_plan_123",
  "message": "Plan synced successfully with MercadoPago"
}
```

### POST /api/mercadopago/delete-plan

Delete a plan from MercadoPago.

**Request:**
```json
{
  "mercadoPagoPlanId": "mp_plan_123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Plan deleted successfully from MercadoPago"
}
```

### POST /api/mercadopago/sync-plans

Sync all plans with MercadoPago.

**Request:** None (empty body)

**Response:**
```json
{
  "message": "Plans synchronized successfully",
  "success": 5,
  "errors": 0,
  "results": [
    { "planId": "plan_1", "status": "success" },
    { "planId": "plan_2", "status": "success" }
  ]
}
```

## Security Considerations

1. **Credentials Protection**
   - Access tokens never exposed to frontend
   - All sync operations happen server-side
   - API endpoints don't require authentication (internal use)

2. **Non-Blocking Operations**
   - Failed sync doesn't expose sensitive errors to users
   - Detailed errors only logged server-side

3. **Audit Trail**
   - All sync operations logged with timestamps
   - Success and failure states tracked
   - Can review logs for compliance

## Future Enhancements

Potential improvements for the future:

- [ ] Retry mechanism for failed syncs
- [ ] Sync status indicator in UI
- [ ] Webhook for MercadoPago → Platform updates
- [ ] Bulk operations with progress indicator
- [ ] Sync history/audit log in database
- [ ] Email notifications for sync failures
- [ ] Dashboard widget showing sync health

## Related Documentation

- `MERCADOPAGO_CREDENTIALS_UPDATE.md` - Credentials configuration
- `MERCADOPAGO_OAUTH_SETUP.md` - OAuth setup (deprecated)
- `QUICKSTART_OAUTH.md` - Quick start guide

## Support

If you encounter issues:

1. Check server console logs
2. Check browser console
3. Verify credentials configuration
4. Try manual sync
5. Review this documentation
6. Check MercadoPago API status

