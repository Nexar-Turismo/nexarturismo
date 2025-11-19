import { Booking } from '@/types';
import { formatAddressForDisplay } from '@/lib/utils';

/**
 * Voucher Service for generating PDF vouchers
 * 
 * Note: This service requires jsPDF to be installed
 * Run: npm install jspdf
 */

interface VoucherData {
  booking: Booking;
  type: 'client' | 'publisher';
}

class VoucherService {
  /**
   * Load an image from the public directory
   */
  private async loadImage(imagePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject(new Error(`Failed to load image: ${imagePath}`));
      img.src = imagePath;
    });
  }

  /**
   * Load Montserrat font files and register them with jsPDF
   */
  private async loadMontserratFont(doc: any): Promise<void> {
    try {
      // Load Montserrat Regular
      const regularResponse = await fetch('/fonts/Montserrat-Regular.ttf');
      const regularArrayBuffer = await regularResponse.arrayBuffer();
      const regularBase64 = this.arrayBufferToBase64(regularArrayBuffer);
      doc.addFileToVFS('Montserrat-Regular.ttf', regularBase64);
      doc.addFont('Montserrat-Regular.ttf', 'Montserrat', 'normal');

      // Load Montserrat Bold
      const boldResponse = await fetch('/fonts/Montserrat-Bold.ttf');
      const boldArrayBuffer = await boldResponse.arrayBuffer();
      const boldBase64 = this.arrayBufferToBase64(boldArrayBuffer);
      doc.addFileToVFS('Montserrat-Bold.ttf', boldBase64);
      doc.addFont('Montserrat-Bold.ttf', 'Montserrat', 'bold');

      console.log('Montserrat font loaded successfully');
    } catch (error) {
      console.warn('Failed to load Montserrat font, using default font:', error);
    }
  }

  /**
   * Convert ArrayBuffer to base64 string
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Generate a PDF voucher for a booking
   */
  async generateVoucher(data: VoucherData): Promise<void> {
    try {
      // Dynamically import jsPDF to avoid SSR issues
      const { jsPDF } = await import('jspdf');
      
      const doc = new jsPDF();
      const { booking, type } = data;
      
      // Load Montserrat font
      await this.loadMontserratFont(doc);
      
      // Page dimensions
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      let yPosition = 20;
      
      // Helper function to add text with Montserrat font
      const addText = (text: string, fontSize: number = 12, isBold: boolean = false, align: 'left' | 'center' | 'right' = 'left', color: string = '#000000') => {
        doc.setFontSize(fontSize);
        doc.setTextColor(color);
        
        // Use Montserrat font (loaded from server), fallback to helvetica if not available
        try {
          if (isBold) {
            doc.setFont('Montserrat', 'bold');
          } else {
            doc.setFont('Montserrat', 'normal');
          }
        } catch (error) {
          console.warn('Montserrat font not available, using helvetica:', error);
          // Fallback to helvetica if Montserrat is not available
          if (isBold) {
            doc.setFont('helvetica', 'bold');
          } else {
            doc.setFont('helvetica', 'normal');
          }
        }
        
        if (align === 'center') {
          doc.text(text, pageWidth / 2, yPosition, { align: 'center' });
        } else if (align === 'right') {
          doc.text(text, pageWidth - margin, yPosition, { align: 'right' });
        } else {
          doc.text(text, margin, yPosition);
        }
        yPosition += 7;
      };
      
      const addSpace = (space: number = 5) => {
        yPosition += space;
      };
      
      const addLine = () => {
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 5;
      };
      
      // Add background image
      try {
        const backgroundImg = await this.loadImage('/img/voucher/background.png');
        // Calculate background dimensions maintaining aspect ratio (2481x2611px)
        // For A4 width (210mm ≈ 595px), height should be: 595 * (2611/2481) ≈ 626px
        const backgroundHeight = (pageWidth * 2611) / 2481;
        
        // Center the background vertically if it's taller than the page
        let backgroundY = 0;
        if (backgroundHeight > pageHeight) {
          backgroundY = (pageHeight - backgroundHeight) / 2;
        }
        
        doc.addImage(backgroundImg, 'PNG', 0, backgroundY, pageWidth, backgroundHeight);
      } catch (error) {
        console.warn('Background image not found, using default background');
        // Fallback: set a dark background
        doc.setFillColor(0, 0, 0);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
      }
      
      // Add header image
      try {
        const headerImg = await this.loadImage('/img/voucher/header.png');
        // Calculate header height maintaining aspect ratio (2481x473px)
        // For A4 width (210mm ≈ 595px), height should be: 595 * (473/2481) ≈ 113px
        const headerHeight = (pageWidth * 473) / 2481;
        doc.addImage(headerImg, 'PNG', 0, 0, pageWidth, headerHeight);
        yPosition = headerHeight + 20; // Start content after header
      } catch (error) {
        console.warn('Header image not found, using default header');
        // Fallback: create a simple header
        doc.setFillColor(135, 206, 235); // Light blue
        doc.rect(0, 0, pageWidth, 40, 'F');
        doc.setTextColor(0, 0, 0); // Black text for fallback
        yPosition = 15;
        addText('VOUCHER DE RESERVA', 20, true, 'center');
        yPosition = 28;
        addText('NexAR Turismo', 12, false, 'center');
        yPosition = 50;
      }
      
      // Set text color for content (black for better readability)
      doc.setTextColor(0, 0, 0);
      
      // Booking ID and Status
      addText(`Reserva #${booking.id.substring(0, 8).toUpperCase()}`, 14, true, 'left', '#000000');
      
      // Status badge
      const statusText = this.getStatusText(booking.status);
      const statusColor = this.getStatusColor(booking.status);
      doc.setFillColor(statusColor.r, statusColor.g, statusColor.b);
      doc.roundedRect(margin, yPosition - 5, 40, 8, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.text(statusText, margin + 20, yPosition, { align: 'center' });
      doc.setTextColor(0, 0, 0); // Black text for content
      yPosition += 10;
      
      addSpace(5);
      addLine();
      addSpace(5);
      
      // Service Information
      addText('INFORMACIÓN DEL SERVICIO', 14, true, 'left', '#000000');
      addSpace(3);
      addText(`Servicio: ${booking.post?.title || 'Publicación eliminada'}`, 11, false, 'left', '#000000');
      addText(`Categoría: ${booking.post?.category || 'N/A'}`, 11, false, 'left', '#000000');
      const locationText = booking.post?.address 
        ? formatAddressForDisplay(booking.post.address) 
        : 'Ubicación no disponible';
      addText(`Ubicación: ${locationText}`, 11, false, 'left', '#000000');
      
      addSpace(5);
      addLine();
      addSpace(5);
      
      // Dates and Guests
      addText('DETALLES DE LA RESERVA', 14, true, 'left', '#000000');
      addSpace(3);
      addText(`Fecha de inicio: ${this.formatDate(booking.startDate)}`, 11, false, 'left', '#000000');
      addText(`Fecha de fin: ${this.formatDate(booking.endDate)}`, 11, false, 'left', '#000000');
      addText(`Número de huéspedes: ${booking.guestCount}`, 11, false, 'left', '#000000');
      
      // Check In and Check Out times for accommodation posts
      if (booking.post?.specificFields?.checkIn || booking.post?.specificFields?.checkOut) {
        addSpace(3);
        addText('HORARIOS DE CHECK IN/OUT', 12, true, 'left', '#000000');
        addSpace(2);
        if (booking.post.specificFields.checkIn) {
          addText(`Check In: ${this.formatTime(booking.post.specificFields.checkIn as string)}`, 11, false, 'left', '#000000');
        }
        if (booking.post.specificFields.checkOut) {
          addText(`Check Out: ${this.formatTime(booking.post.specificFields.checkOut as string)}`, 11, false, 'left', '#000000');
        }
      }
      
      addSpace(5);
      addLine();
      addSpace(5);
      
      // Contact Information - varies by voucher type
      if (type === 'client') {
        // Show publisher/owner contact info for client
        addText('INFORMACIÓN DEL PRESTADOR', 14, true, 'left', '#000000');
        addSpace(3);
        if (booking.owner) {
          addText(`Nombre: ${booking.owner.name}`, 11, false, 'left', '#000000');
          addText(`Email: ${booking.owner.email}`, 11, false, 'left', '#000000');
          if (booking.owner.phone) {
            addText(`Teléfono: ${booking.owner.phone}`, 11, false, 'left', '#000000');
          }
        }
      } else {
        // Show client contact info for publisher
        addText('INFORMACIÓN DEL CLIENTE', 14, true, 'left', '#000000');
        addSpace(3);
        addText(`Nombre: ${booking.clientData.name}`, 11, false, 'left', '#000000');
        addText(`Email: ${booking.clientData.email}`, 11, false, 'left', '#000000');
        addText(`Teléfono: ${booking.clientData.phone}`, 11, false, 'left', '#000000');
        if (booking.clientData.notes) {
          addSpace(3);
          addText('Notas adicionales:', 11, true, 'left', '#000000');
          addText(booking.clientData.notes, 10, false, 'left', '#000000');
        }
      }
      
      addSpace(5);
      addLine();
      addSpace(5);
      
      // Payment Information
      addText('INFORMACIÓN DE PAGO', 14, true, 'left', '#000000');
      addSpace(3);
      addText(`Total: ${this.formatCurrency(booking.totalAmount, booking.currency)}`, 12, true, 'left', '#000000');
      addText(`Estado de pago: ${booking.status === 'paid' ? 'Pagado' : 'Pendiente'}`, 11, false, 'left', '#000000');
      
      if (booking.paidAt) {
        addText(`Fecha de pago: ${this.formatDate(booking.paidAt)}`, 11, false, 'left', '#000000');
      }
      
      if (booking.paymentData) {
        addText(`Método de pago: ${booking.paymentData.method || 'N/A'}`, 11, false, 'left', '#000000');
      }
      
      // Provider clarifications section for accommodation posts
      if (booking.post?.specificFields?.voucherText) {
        addSpace(5);
        addLine();
        addSpace(5);
        
        addText('ACLARACIONES DEL PRESTADOR', 14, true, 'left', '#000000');
        addSpace(3);
        addText(booking.post.specificFields.voucherText as string, 11, false, 'left', '#000000');
      }
      
      addSpace(10);
      
      // Add footer image
      try {
        const footerImg = await this.loadImage('/img/voucher/footer.png');
        // Calculate footer height maintaining aspect ratio (2481x426px)
        // For A4 width (210mm ≈ 595px), height should be: 595 * (426/2481) ≈ 102px
        const footerHeight = (pageWidth * 426) / 2481;
        const footerY = pageHeight - footerHeight;
        doc.addImage(footerImg, 'PNG', 0, footerY, pageWidth, footerHeight);
      } catch (error) {
        console.warn('Footer image not found, using default footer');
        // Fallback: create a simple footer
        doc.setFillColor(135, 206, 235); // Light blue
        const footerHeight = 40;
        const footerY = pageHeight - footerHeight;
        doc.rect(0, footerY, pageWidth, footerHeight, 'F');
        
        doc.setTextColor(0, 0, 0);
        yPosition = footerY + 15;
        addText(`Generado el: ${new Date().toLocaleString('es-ES')}`, 9, false, 'center', '#000000');
        yPosition += 5;
        addText('Este documento es un comprobante de su reserva', 9, false, 'center', '#000000');
        yPosition += 5;
        addText('NexAR Turismo - Plataforma de Turismo Argentina', 9, false, 'center', '#000000');
      }
      
      // Generate filename
      const filename = `voucher_${type}_${booking.id.substring(0, 8)}_${Date.now()}.pdf`;
      
      // Download the PDF
      doc.save(filename);
      
    } catch (error) {
      console.error('Error generating voucher:', error);
      throw new Error('Error al generar el voucher. Por favor, intenta nuevamente.');
    }
  }
  
  /**
   * Get status text in Spanish
   */
  private getStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      'requested': 'Solicitada',
      'accepted': 'Aceptada',
      'declined': 'Rechazada',
      'pending_payment': 'Pago Pendiente',
      'paid': 'Pagada',
      'cancelled': 'Cancelada',
      'completed': 'Completada'
    };
    return statusMap[status] || status;
  }
  
  /**
   * Get status color
   */
  private getStatusColor(status: string): { r: number; g: number; b: number } {
    const colorMap: Record<string, { r: number; g: number; b: number }> = {
      'requested': { r: 59, g: 130, b: 246 }, // blue
      'accepted': { r: 34, g: 197, b: 94 }, // green
      'declined': { r: 239, g: 68, b: 68 }, // red
      'pending_payment': { r: 245, g: 158, b: 11 }, // amber
      'paid': { r: 16, g: 185, b: 129 }, // emerald
      'cancelled': { r: 107, g: 114, b: 128 }, // gray
      'completed': { r: 139, g: 92, b: 246 } // purple
    };
    return colorMap[status] || { r: 107, g: 114, b: 128 };
  }
  
  /**
   * Format date
   */
  private formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  /**
   * Format currency
   */
  private formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }
  
  /**
   * Format time from HH:MM format to readable format
   */
  private formatTime(timeString: string): string {
    if (!timeString) return '';
    
    try {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours, 10);
      const minute = parseInt(minutes, 10);
      
      const time = new Date();
      time.setHours(hour, minute, 0, 0);
      
      return time.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } catch (error) {
      console.error('Error formatting time:', error);
      return timeString; // Return original string if formatting fails
    }
  }
}

export const voucherService = new VoucherService();
export default VoucherService;
