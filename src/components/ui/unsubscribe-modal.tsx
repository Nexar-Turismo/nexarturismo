'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, X, Loader2 } from 'lucide-react';

interface UnsubscribeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isLoading?: boolean;
}

export default function UnsubscribeModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  isLoading = false 
}: UnsubscribeModalProps) {
  if (!isOpen) return null;

  const handleConfirm = async () => {
    try {
      await onConfirm();
    } catch (error) {
      console.error('Error during unsubscribe:', error);
      // Error handling is done in the parent component
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center text-red-600">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Confirmar Baja de Suscripción
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isLoading}
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm leading-relaxed">
              <strong>Estás por darte de baja de tu plan actual, esta acción no es reversible.</strong> 
              Una vez dado de baja tu plan toda tu información de prestador (publicaciones, reservas, comentarios, etc.) 
              serán borrados de la base de datos y si en algún momento deseas volver a subscribirte deberás cargar todo nuevamente.
            </p>
          </div>

          <div className="flex space-x-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                'Confirmar Baja'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
