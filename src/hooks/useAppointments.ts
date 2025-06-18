
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentService } from '@/services/appointmentService';
import type { Appointment, CreateAppointmentData, UpdateAppointmentData } from '@/types/appointment';
import { toast } from '@/hooks/use-toast';

export const useAppointments = (leadId?: string) => {
  const queryClient = useQueryClient();

  const appointmentsQuery = useQuery({
    queryKey: leadId ? ['appointments', 'lead', leadId] : ['appointments', 'my'],
    queryFn: () => leadId 
      ? appointmentService.getAppointmentsByLead(leadId)
      : appointmentService.getMyAppointments(),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateAppointmentData) => appointmentService.createAppointment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast({
        title: "Appointment Scheduled",
        description: "The appointment has been successfully scheduled.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to schedule appointment.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAppointmentData }) => 
      appointmentService.updateAppointment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast({
        title: "Appointment Updated",
        description: "The appointment has been successfully updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update appointment.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => appointmentService.deleteAppointment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast({
        title: "Appointment Deleted",
        description: "The appointment has been successfully deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete appointment.",
        variant: "destructive",
      });
    },
  });

  return {
    appointments: appointmentsQuery.data || [],
    isLoading: appointmentsQuery.isLoading,
    error: appointmentsQuery.error,
    createAppointment: createMutation.mutate,
    isCreating: createMutation.isPending,
    updateAppointment: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    deleteAppointment: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
    refetch: appointmentsQuery.refetch,
  };
};

export const useAppointmentActions = () => {
  const queryClient = useQueryClient();

  const confirmMutation = useMutation({
    mutationFn: (id: string) => appointmentService.confirmAppointment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast({
        title: "Appointment Confirmed",
        description: "The appointment has been confirmed.",
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => 
      appointmentService.cancelAppointment(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast({
        title: "Appointment Cancelled",
        description: "The appointment has been cancelled.",
      });
    },
  });

  const completeMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) => 
      appointmentService.completeAppointment(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast({
        title: "Appointment Completed",
        description: "The appointment has been marked as completed.",
      });
    },
  });

  const noShowMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) => 
      appointmentService.markNoShow(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast({
        title: "Appointment Marked as No-Show",
        description: "The appointment has been marked as no-show.",
      });
    },
  });

  return {
    confirmAppointment: confirmMutation.mutate,
    cancelAppointment: cancelMutation.mutate,
    completeAppointment: completeMutation.mutate,
    markNoShow: noShowMutation.mutate,
    isConfirming: confirmMutation.isPending,
    isCancelling: cancelMutation.isPending,
    isCompleting: completeMutation.isPending,
    isMarkingNoShow: noShowMutation.isPending,
  };
};
