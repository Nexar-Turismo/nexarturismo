import { CancellationPolicy } from '@/types';

export interface CancellationPenalty {
  penaltyAmount: number;
  penaltyType: 'Fijo' | 'Porcentaje';
  penaltyPercentage?: number;
  daysBeforeBooking: number;
  applicablePolicy: CancellationPolicy | null;
}

/**
 * Calculate cancellation penalty based on policies and days before booking
 */
export function calculateCancellationPenalty(
  policies: CancellationPolicy[],
  totalAmount: number,
  bookingStartDate: Date,
  cancellationDate: Date = new Date()
): CancellationPenalty {
  // Calculate days before booking
  const timeDiff = bookingStartDate.getTime() - cancellationDate.getTime();
  const daysBeforeBooking = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

  // Sort policies by days_quantity (ascending) to find the most restrictive applicable policy
  const sortedPolicies = [...policies].sort((a, b) => a.days_quantity - b.days_quantity);

  // Find the applicable policy (the one with the highest days_quantity that is still applicable)
  let applicablePolicy: CancellationPolicy | null = null;
  for (const policy of sortedPolicies) {
    if (daysBeforeBooking <= policy.days_quantity) {
      applicablePolicy = policy;
    }
  }

  // If no policy applies, no penalty
  if (!applicablePolicy) {
    return {
      penaltyAmount: 0,
      penaltyType: 'Fijo',
      daysBeforeBooking,
      applicablePolicy: null
    };
  }

  // Calculate penalty amount
  let penaltyAmount = 0;
  if (applicablePolicy.cancellation_type === 'Fijo') {
    penaltyAmount = applicablePolicy.cancellation_amount;
  } else if (applicablePolicy.cancellation_type === 'Porcentaje') {
    penaltyAmount = (totalAmount * applicablePolicy.cancellation_amount) / 100;
  }

  return {
    penaltyAmount: Math.round(penaltyAmount * 100) / 100, // Round to 2 decimal places
    penaltyType: applicablePolicy.cancellation_type,
    penaltyPercentage: applicablePolicy.cancellation_type === 'Porcentaje' ? applicablePolicy.cancellation_amount : undefined,
    daysBeforeBooking,
    applicablePolicy
  };
}

/**
 * Format penalty amount for display
 */
export function formatPenaltyAmount(penalty: CancellationPenalty, currency: string): string {
  if (penalty.penaltyAmount === 0) {
    return 'Sin penalización';
  }

  const formattedAmount = new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: currency
  }).format(penalty.penaltyAmount);

  if (penalty.penaltyType === 'Porcentaje' && penalty.penaltyPercentage) {
    return `${formattedAmount} (${penalty.penaltyPercentage}% del total)`;
  }

  return formattedAmount;
}

/**
 * Generate penalty description text
 */
export function generatePenaltyDescription(penalty: CancellationPenalty, currency: string): string {
  if (penalty.penaltyAmount === 0) {
    const moreThanText =
      penalty.daysBeforeBooking >= 9999
        ? 'en cualquier momento'
        : `más de ${penalty.daysBeforeBooking} días de anticipación`;
    return `Cancelación sin penalización (${moreThanText})`;
  }

  const formattedAmount = formatPenaltyAmount(penalty, currency);
  
  if (penalty.applicablePolicy) {
    return `Cancelación ${penalty.applicablePolicy.days_quantity >= 9999 ? 'en cualquier momento' : `con ${penalty.applicablePolicy.days_quantity} días o menos de anticipación`}: ${formattedAmount} de penalización`;
  }

  return `Penalización de cancelación: ${formattedAmount}`;
}
