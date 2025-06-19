
import React from 'react';
import { useParams } from 'react-router-dom';
import PublicAppointmentBooking from '@/components/appointments/PublicAppointmentBooking';
import { Card, CardContent } from '@/components/ui/card';

const PublicAppointmentBookingPage = () => {
  const { leadId } = useParams<{ leadId?: string }>();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Schedule Your Appointment
          </h1>
          <p className="text-gray-600">
            Choose a convenient time for your visit with our team
          </p>
        </div>

        <PublicAppointmentBooking
          leadId={leadId}
          onSuccess={(appointmentId) => {
            console.log('Appointment created:', appointmentId);
          }}
        />

        <Card className="mt-8">
          <CardContent className="p-6 text-center">
            <h3 className="font-semibold text-gray-900 mb-2">Need Help?</h3>
            <p className="text-sm text-gray-600 mb-4">
              If you have any questions or need to make changes to your appointment, 
              please don't hesitate to contact us.
            </p>
            <div className="space-y-2 text-sm">
              <p><strong>Phone:</strong> (555) 123-4567</p>
              <p><strong>Email:</strong> appointments@dealership.com</p>
              <p><strong>Hours:</strong> Mon-Fri 9:00 AM - 6:00 PM</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PublicAppointmentBookingPage;
