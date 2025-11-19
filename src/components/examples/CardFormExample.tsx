'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import CardNumberInput from '@/components/ui/CardNumberInput';
import { Input } from '@/components/ui/input';

export default function CardFormExample() {
  const [formData, setFormData] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: '',
    email: ''
  });

  const handleCardNumberChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      cardNumber: value // This will be the clean value without spaces
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('Form submitted with clean card number:', formData.cardNumber);
    console.log('Card number length:', formData.cardNumber.length);
    console.log('Full form data:', formData);
    
    // The cardNumber will be clean (no spaces) and ready to send to your API
    // Example: "1234567890123456" instead of "1234 5678 9012 3456"
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Payment Form Example</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="cardNumber">Card Number</Label>
              <CardNumberInput
                value={formData.cardNumber}
                onChange={handleCardNumberChange}
                placeholder="1234 5678 9012 3456"
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Clean value: {formData.cardNumber || 'No input yet'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="expiryDate">Expiry Date</Label>
                <Input
                  id="expiryDate"
                  type="text"
                  placeholder="MM/YY"
                  value={formData.expiryDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, expiryDate: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="cvv">CVV</Label>
                <Input
                  id="cvv"
                  type="text"
                  placeholder="123"
                  value={formData.cvv}
                  onChange={(e) => setFormData(prev => ({ ...prev, cvv: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="cardholderName">Cardholder Name</Label>
              <Input
                id="cardholderName"
                type="text"
                placeholder="John Doe"
                value={formData.cardholderName}
                onChange={(e) => setFormData(prev => ({ ...prev, cardholderName: e.target.value }))}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="mt-1"
              />
            </div>

            <Button type="submit" className="w-full">
              Submit Payment
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
