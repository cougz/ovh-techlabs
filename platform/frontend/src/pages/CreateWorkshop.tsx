import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from 'react-query';
import {
  CalendarIcon,
  ClockIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

import { workshopApi } from '../services/api';
import { CreateWorkshopRequest } from '../types';

interface FormData {
  name: string;
  description: string;
  start_date: string;
  end_date: string;
}

interface FormErrors {
  name?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  general?: string;
}

const CreateWorkshop: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    start_date: '',
    end_date: ''
  });
  
  const [errors, setErrors] = useState<FormErrors>({});

  const createWorkshopMutation = useMutation(
    (data: CreateWorkshopRequest) => workshopApi.createWorkshop(data),
    {
      onSuccess: (workshop) => {
        queryClient.invalidateQueries('workshops');
        navigate(`/workshops/${workshop.id}`);
      },
      onError: (error: any) => {
        console.error('Failed to create workshop:', error);
        setErrors({
          general: error.response?.data?.detail || 'Failed to create workshop. Please try again.'
        });
      }
    }
  );

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Workshop name is required';
    } else if (formData.name.length < 3) {
      newErrors.name = 'Workshop name must be at least 3 characters';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Workshop name must be less than 100 characters';
    }
    
    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters';
    }
    
    if (!formData.start_date) {
      newErrors.start_date = 'Start date is required';
    }
    
    if (!formData.end_date) {
      newErrors.end_date = 'End date is required';
    }
    
    if (formData.start_date && formData.end_date) {
      const startDate = new Date(formData.start_date);
      const endDate = new Date(formData.end_date);
      const now = new Date();
      
      if (startDate < now) {
        newErrors.start_date = 'Start date cannot be in the past';
      }
      
      if (endDate <= startDate) {
        newErrors.end_date = 'End date must be after start date';
      }
      
      const duration = endDate.getTime() - startDate.getTime();
      const hours = duration / (1000 * 60 * 60);
      
      if (hours < 1) {
        newErrors.end_date = 'Workshop must be at least 1 hour long';
      }
      
      if (hours > 720) { // 30 days
        newErrors.end_date = 'Workshop cannot be longer than 30 days';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    const workshopData: CreateWorkshopRequest = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      start_date: new Date(formData.start_date).toISOString(),
      end_date: new Date(formData.end_date).toISOString()
    };
    
    createWorkshopMutation.mutate(workshopData);
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field-specific errors when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
    
    // Clear general errors when user modifies form
    if (errors.general) {
      setErrors(prev => ({ ...prev, general: undefined }));
    }
  };

  const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Set default dates (workshop starts in 1 hour, ends in 25 hours)
  React.useEffect(() => {
    const now = new Date();
    const startDate = new Date(now.getTime() + 60 * 60 * 1000); // +1 hour
    const endDate = new Date(now.getTime() + 25 * 60 * 60 * 1000); // +25 hours
    
    setFormData(prev => ({
      ...prev,
      start_date: formatDateForInput(startDate),
      end_date: formatDateForInput(endDate)
    }));
  }, []);

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create Workshop</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
          Set up a new workshop environment for your attendees
        </p>
      </div>

      <div className="max-w-2xl">
        {errors.general && (
          <div className="mb-6 bg-danger-50 border border-danger-200 rounded-md p-4">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-danger-400 mr-2 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-danger-800">Error</h4>
                <p className="text-sm text-danger-700 mt-1">{errors.general}</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Workshop Details</h3>
            </div>
            <div className="card-body space-y-6">
              {/* Workshop Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Workshop Name *
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm ${
                    errors.name ? 'border-danger-300 focus:border-danger-500 focus:ring-danger-500' : ''
                  }`}
                  placeholder="e.g., Kubernetes Fundamentals Workshop"
                  maxLength={100}
                />
                {errors.name && (
                  <p className="mt-2 text-sm text-danger-600">{errors.name}</p>
                )}
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Choose a descriptive name for your workshop
                </p>
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  rows={4}
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm ${
                    errors.description ? 'border-danger-300 focus:border-danger-500 focus:ring-danger-500' : ''
                  }`}
                  placeholder="Optional description of the workshop content, objectives, and target audience..."
                  maxLength={500}
                />
                {errors.description && (
                  <p className="mt-2 text-sm text-danger-600">{errors.description}</p>
                )}
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {formData.description.length}/500 characters
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Schedule</h3>
            </div>
            <div className="card-body space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Start Date */}
                <div>
                  <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Start Date & Time *
                  </label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                    <input
                      type="datetime-local"
                      id="start_date"
                      value={formData.start_date}
                      onChange={(e) => handleInputChange('start_date', e.target.value)}
                      className={`block w-full pl-10 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm ${
                        errors.start_date ? 'border-danger-300 focus:border-danger-500 focus:ring-danger-500' : ''
                      }`}
                    />
                  </div>
                  {errors.start_date && (
                    <p className="mt-2 text-sm text-danger-600">{errors.start_date}</p>
                  )}
                </div>

                {/* End Date */}
                <div>
                  <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    End Date & Time *
                  </label>
                  <div className="relative">
                    <ClockIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                    <input
                      type="datetime-local"
                      id="end_date"
                      value={formData.end_date}
                      onChange={(e) => handleInputChange('end_date', e.target.value)}
                      className={`block w-full pl-10 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm ${
                        errors.end_date ? 'border-danger-300 focus:border-danger-500 focus:ring-danger-500' : ''
                      }`}
                    />
                  </div>
                  {errors.end_date && (
                    <p className="mt-2 text-sm text-danger-600">{errors.end_date}</p>
                  )}
                </div>
              </div>

              <div className="bg-primary-50 border border-primary-200 rounded-md p-4">
                <div className="flex">
                  <InformationCircleIcon className="h-5 w-5 text-primary-400 mr-2 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-primary-800">Important Notes</h4>
                    <ul className="text-sm text-primary-700 mt-1 list-disc list-inside space-y-1">
                      <li>Workshop resources will be automatically deployed when the workshop starts</li>
                      <li>All resources will be cleaned up 72 hours after the workshop ends</li>
                      <li>Attendees can be added after creating the workshop</li>
                      <li>You can manually deploy or cleanup resources at any time</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => navigate('/workshops')}
              className="btn-secondary"
              disabled={createWorkshopMutation.isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={createWorkshopMutation.isLoading}
            >
              {createWorkshopMutation.isLoading ? 'Creating...' : 'Create Workshop'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateWorkshop;