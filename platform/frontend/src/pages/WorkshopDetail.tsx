import React, { useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  CalendarIcon,
  UserGroupIcon,
  PlusIcon,
  TrashIcon,
  PlayIcon,
  StopIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  EllipsisVerticalIcon,
  ArrowLeftIcon,
  PencilIcon
} from '@heroicons/react/24/outline';

import { workshopApi, attendeeApi, deploymentApi } from '../services/api';
import { Workshop, Attendee, DeploymentLog } from '../types';
import DropdownMenu from '../components/DropdownMenu';
import DeploymentLogs from '../components/DeploymentLogs';

// Error boundary component for debugging
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('WorkshopDetail Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="p-8 text-center">
            <div className="text-red-500 text-lg font-semibold">Something went wrong</div>
            <div className="text-gray-600 mt-2">
              {this.state.error?.message || 'An error occurred in the workshop detail page'}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 btn-primary"
            >
              Reload Page
            </button>
          </div>
        )
      );
    }

    return <>{this.props.children}</>;
  }
}

const WorkshopDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Add debugging
  console.log('WorkshopDetail render - ID:', id);
  
  const [showAddAttendee, setShowAddAttendee] = useState(false);
  const [showActions, setShowActions] = useState<string | null>(null);
  const [newAttendee, setNewAttendee] = useState({ username: '', email: '' });
  const [deploymentProgress] = useState<Record<string, { progress: number; step: string }>>({});
  const attendeeTriggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Temporary: Disable WebSocket to test if it's the issue

  // Fetch workshop details
  const { data: workshop, isLoading: workshopLoading, error: workshopError } = useQuery<Workshop>(
    ['workshop', id],
    () => workshopApi.getWorkshop(id!),
    {
      enabled: !!id,
      refetchInterval: 5000, // Fixed 5-second interval to avoid circular dependency
    }
  );

  // Fetch attendees
  const { data: attendees = [], isLoading: attendeesLoading, refetch: refetchAttendees } = useQuery<Attendee[]>(
    ['attendees', id],
    () => attendeeApi.getWorkshopAttendees(id!),
    {
      enabled: !!id,
      refetchInterval: 3000, // Fixed 3-second interval
    }
  );

  // Fetch deployment logs for active deployments
  const { data: deploymentLogs = {} } = useQuery<Record<string, DeploymentLog[]>>(
    ['deployment-logs', id],
    async () => {
      if (!attendees.length) return {};
      
      const logsPromises = attendees.map(async (attendee) => {
        try {
          const logs = await deploymentApi.getAttendeeDeploymentLogs(attendee.id);
          return [attendee.id, logs];
        } catch (error) {
          return [attendee.id, []];
        }
      });
      
      const results = await Promise.all(logsPromises);
      return Object.fromEntries(results);
    },
    {
      enabled: !!id && attendees.length > 0,
      refetchInterval: 10000, // Fixed 10-second interval
    }
  );

  // Add attendee mutation
  const addAttendeeMutation = useMutation(
    (attendeeData: { username: string; email: string }) => 
      attendeeApi.createAttendee(id!, attendeeData),
    {
      onSuccess: () => {
        refetchAttendees();
        setNewAttendee({ username: '', email: '' });
        setShowAddAttendee(false);
      },
      onError: (error: any) => {
        console.error('Failed to add attendee:', error);
        alert('Failed to add attendee: ' + (error.response?.data?.detail || 'Unknown error'));
      }
    }
  );

  // Delete attendee mutation
  const deleteAttendeeMutation = useMutation(
    (attendeeId: string) => attendeeApi.deleteAttendee(attendeeId),
    {
      onSuccess: () => {
        refetchAttendees();
        setShowActions(null);
      },
      onError: (error: any) => {
        console.error('Failed to delete attendee:', error);
        alert('Failed to delete attendee: ' + (error.response?.data?.detail || 'Unknown error'));
      }
    }
  );

  // Deploy workshop mutation
  const deployWorkshopMutation = useMutation(
    () => workshopApi.deployWorkshop(id!),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['workshop', id]);
        refetchAttendees();
      },
      onError: (error: any) => {
        console.error('Failed to deploy workshop:', error);
        alert('Failed to deploy workshop: ' + (error.response?.data?.detail || 'Unknown error'));
      }
    }
  );

  // Cleanup workshop mutation
  const cleanupWorkshopMutation = useMutation(
    () => workshopApi.cleanupWorkshop(id!),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['workshop', id]);
        refetchAttendees();
      },
      onError: (error: any) => {
        console.error('Failed to cleanup workshop:', error);
        alert('Failed to cleanup workshop: ' + (error.response?.data?.detail || 'Unknown error'));
      }
    }
  );

  // Delete workshop mutation
  const deleteWorkshopMutation = useMutation(
    () => workshopApi.deleteWorkshop(id!),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('workshops');
        navigate('/workshops');
      },
      onError: (error: any) => {
        console.error('Failed to delete workshop:', error);
        alert('Failed to delete workshop: ' + (error.response?.data?.detail || 'Unknown error'));
      }
    }
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircleIcon className="h-5 w-5 text-success-500" />;
      case 'deploying':
        return <ClockIcon className="h-5 w-5 text-warning-500 animate-spin" />;
      case 'failed':
        return <ExclamationCircleIcon className="h-5 w-5 text-danger-500" />;
      case 'deleting':
        return <ClockIcon className="h-5 w-5 text-danger-500 animate-spin" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'active':
        return 'status-active';
      case 'deploying':
        return 'status-deploying';
      case 'failed':
        return 'status-failed';
      case 'deleting':
        return 'status-deleting';
      default:
        return 'status-planning';
    }
  };

  const handleAddAttendee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAttendee.username.trim() || !newAttendee.email.trim()) {
      alert('Please fill in all fields');
      return;
    }
    addAttendeeMutation.mutate(newAttendee);
  };

  const handleDeployWorkshop = () => {
    if (attendees.length === 0) {
      alert('Please add attendees before deploying the workshop');
      return;
    }
    if (window.confirm(`Deploy workshop resources for ${attendees.length} attendees?`)) {
      deployWorkshopMutation.mutate();
    }
  };

  const handleCleanupWorkshop = () => {
    if (window.confirm('This will destroy all workshop resources. Are you sure?')) {
      cleanupWorkshopMutation.mutate();
    }
  };

  const handleDeleteWorkshop = () => {
    const activeAttendees = attendees.filter(a => ['active', 'deploying'].includes(a.status));
    if (activeAttendees.length > 0) {
      alert('Cannot delete workshop with active deployments. Please cleanup resources first.');
      return;
    }
    if (window.confirm('This will permanently delete the workshop. Are you sure?')) {
      deleteWorkshopMutation.mutate();
    }
  };

  // Handle missing ID
  if (!id) {
    return (
      <div className="animate-fade-in">
        <div className="card">
          <div className="card-body">
            <div className="text-center py-8">
              <ExclamationCircleIcon className="mx-auto h-12 w-12 text-danger-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Invalid Workshop ID</h3>
              <p className="mt-1 text-sm text-gray-500">
                No workshop ID provided in the URL.
              </p>
              <div className="mt-6">
                <Link to="/workshops" className="btn-primary">
                  Back to Workshops
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (workshopLoading) {
    return (
      <div className="animate-fade-in">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (workshopError || !workshop) {
    return (
      <div className="animate-fade-in">
        <div className="mb-8">
          <Link
            to="/workshops"
            className="inline-flex items-center text-sm text-primary-600 hover:text-primary-500 mb-4"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Back to Workshops
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Workshop Not Found</h1>
        </div>
        
        <div className="card">
          <div className="card-body">
            <div className="text-center py-8">
              <ExclamationCircleIcon className="mx-auto h-12 w-12 text-danger-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Workshop not found</h3>
              <p className="mt-1 text-sm text-gray-500">
                The workshop you're looking for doesn't exist or has been deleted.
              </p>
              <div className="mt-6">
                <Link to="/workshops" className="btn-primary">
                  Back to Workshops
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const activeAttendees = attendees.filter(a => a.status === 'active').length;
  const failedAttendees = attendees.filter(a => a.status === 'failed').length;

  return (
    <ErrorBoundary>
      <div className="animate-fade-in">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/workshops"
            className="inline-flex items-center text-sm text-primary-600 hover:text-primary-500 mb-4"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Back to Workshops
          </Link>
          
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-3">
                {getStatusIcon(workshop.status)}
                <h1 className="text-2xl font-bold text-gray-900 truncate">{workshop.name}</h1>
                <span className={`${getStatusClass(workshop.status)} whitespace-nowrap flex-shrink-0`}>
                  {workshop.status}
                </span>
              </div>
              {workshop.description && (
                <p className="mt-2 text-gray-600">{workshop.description}</p>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-3 flex-shrink-0">
              {workshop.status === 'planning' && attendees.length > 0 && (
                <button
                  onClick={handleDeployWorkshop}
                  disabled={deployWorkshopMutation.isLoading}
                  className="btn-primary whitespace-nowrap"
                >
                  <PlayIcon className="h-4 w-4 mr-2" />
                  {deployWorkshopMutation.isLoading ? 'Deploying...' : 'Deploy Workshop'}
                </button>
              )}
              
              {(workshop.status === 'active' || workshop.status === 'completed') && (
                <button
                  onClick={handleCleanupWorkshop}
                  disabled={cleanupWorkshopMutation.isLoading}
                  className="btn-danger whitespace-nowrap"
                >
                  <StopIcon className="h-4 w-4 mr-2" />
                  {cleanupWorkshopMutation.isLoading ? 'Cleaning up...' : 'Cleanup Resources'}
                </button>
              )}
              
              <button
                onClick={handleDeleteWorkshop}
                disabled={deleteWorkshopMutation.isLoading}
                className="btn-danger whitespace-nowrap"
              >
                <TrashIcon className="h-4 w-4 mr-2" />
                {deleteWorkshopMutation.isLoading ? 'Deleting...' : 'Delete Workshop'}
              </button>
            </div>
          </div>
        </div>

        {/* Workshop Info */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <CalendarIcon className="h-8 w-8 text-primary-500 mr-3" />
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Schedule</h3>
                  <p className="text-sm text-gray-600">
                    {formatDate(workshop.start_date)}
                    <br />
                    <span className="text-xs">to</span> {formatDate(workshop.end_date)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <UserGroupIcon className="h-8 w-8 text-success-500 mr-3" />
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Attendees</h3>
                  <p className="text-sm text-gray-600">
                    {attendees.length} total
                    {activeAttendees > 0 && (
                      <span className="text-success-600"> • {activeAttendees} active</span>
                    )}
                    {failedAttendees > 0 && (
                      <span className="text-danger-600"> • {failedAttendees} failed</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <CheckCircleIcon className="h-8 w-8 text-warning-500 mr-3" />
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Status</h3>
                  <p className="text-sm text-gray-600">
                    {workshop.status === 'planning' && 'Ready to deploy'}
                    {workshop.status === 'deploying' && 'Deployment in progress'}
                    {workshop.status === 'active' && 'Workshop running'}
                    {workshop.status === 'completed' && 'Workshop completed'}
                    {workshop.status === 'failed' && 'Deployment failed'}
                    {workshop.status === 'deleting' && 'Cleanup in progress'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Attendees Section */}
        <div className="card">
          <div className="card-header">
            <div className="flex justify-between items-center">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Attendees ({attendees.length})
              </h3>
              <button
                onClick={() => setShowAddAttendee(true)}
                className="btn-primary"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Attendee
              </button>
            </div>
          </div>
          
          <div className="card-body">
            {/* Add Attendee Form */}
            {showAddAttendee && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <form onSubmit={handleAddAttendee} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Username *
                      </label>
                      <input
                        type="text"
                        value={newAttendee.username}
                        onChange={(e) => setNewAttendee(prev => ({ ...prev, username: e.target.value }))}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        placeholder="e.g., john.doe"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email *
                      </label>
                      <input
                        type="email"
                        value={newAttendee.email}
                        onChange={(e) => setNewAttendee(prev => ({ ...prev, email: e.target.value }))}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        placeholder="john.doe@example.com"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddAttendee(false);
                        setNewAttendee({ username: '', email: '' });
                      }}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={addAttendeeMutation.isLoading}
                      className="btn-primary"
                    >
                      {addAttendeeMutation.isLoading ? 'Adding...' : 'Add Attendee'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Attendees List */}
            {attendeesLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse flex items-center space-x-4">
                    <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : attendees.length === 0 ? (
              <div className="text-center py-8">
                <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No attendees</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Add attendees to get started with your workshop.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {attendees.map((attendee) => (
                  <div key={attendee.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-4">
                      {getStatusIcon(attendee.status)}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-medium text-gray-900">{attendee.username}</h4>
                          <span className={`${getStatusClass(attendee.status)} text-xs`}>
                            {attendee.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">{attendee.email}</p>
                        {attendee.ovh_project_id && (
                          <p className="text-xs text-gray-400">
                            Project: {attendee.ovh_project_id}
                          </p>
                        )}
                        
                        {/* Real-time deployment progress */}
                        {deploymentProgress[attendee.id] && (
                          <div className="mt-2">
                            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                              <span>{deploymentProgress[attendee.id].step}</span>
                              <span>{deploymentProgress[attendee.id].progress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${deploymentProgress[attendee.id].progress}%` }}
                              ></div>
                            </div>
                          </div>
                        )}

                        {/* Deployment logs */}
                        <ErrorBoundary fallback={<div className="text-xs text-gray-400">Logs unavailable</div>}>
                          <DeploymentLogs
                            logs={deploymentLogs[attendee.id] || []}
                            isLoading={false}
                          />
                        </ErrorBoundary>
                      </div>
                    </div>
                    
                    <div>
                      <button
                        ref={(el) => { attendeeTriggerRefs.current[attendee.id] = el; }}
                        onClick={() => setShowActions(showActions === attendee.id ? null : attendee.id)}
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-50"
                      >
                        <EllipsisVerticalIcon className="h-5 w-5" />
                      </button>
                      
                      <ErrorBoundary fallback={<div>Menu error</div>}>
                        <DropdownMenu
                          isOpen={showActions === attendee.id}
                          onClose={() => setShowActions(null)}
                          trigger={{ current: attendeeTriggerRefs.current[attendee.id] }}
                        >
                          <div className="py-1">
                            <Link
                              to={`/attendees/${attendee.id}`}
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              onClick={() => setShowActions(null)}
                            >
                              <PencilIcon className="h-4 w-4 mr-2" />
                              View Details
                            </Link>
                            
                            {attendee.status !== 'deleting' && (
                              <button
                                onClick={() => {
                                  if (window.confirm(`Remove ${attendee.username} from the workshop?`)) {
                                    deleteAttendeeMutation.mutate(attendee.id);
                                  }
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-danger-600 hover:bg-danger-50"
                              >
                                <TrashIcon className="h-4 w-4 mr-2" />
                                Remove Attendee
                              </button>
                            )}
                          </div>
                        </DropdownMenu>
                      </ErrorBoundary>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default WorkshopDetail;