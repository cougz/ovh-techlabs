import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { 
  AcademicCapIcon, 
  UserGroupIcon, 
  CloudIcon, 
  CheckCircleIcon,
  ClockIcon,
  PlusIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

import { workshopApi } from '../services/api';
import { WorkshopSummary } from '../types';

const Dashboard: React.FC = () => {
  const { data: workshops = [], isLoading } = useQuery<WorkshopSummary[]>(
    'workshops',
    () => workshopApi.getWorkshops({ limit: 10 }),
    {
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  // Calculate statistics
  const stats = React.useMemo(() => {
    const totalWorkshops = workshops.length;
    const activeWorkshops = workshops.filter(w => w.status === 'active').length;
    const totalAttendees = workshops.reduce((sum, w) => sum + w.attendee_count, 0);
    const activeAttendees = workshops.reduce((sum, w) => sum + w.active_attendees, 0);

    return {
      totalWorkshops,
      activeWorkshops,
      totalAttendees,
      activeAttendees,
    };
  }, [workshops]);

  const statCards = [
    {
      name: 'Total Workshops',
      value: stats.totalWorkshops,
      icon: AcademicCapIcon,
      color: 'bg-primary-500',
    },
    {
      name: 'Active Workshops',
      value: stats.activeWorkshops,
      icon: CloudIcon,
      color: 'bg-success-500',
    },
    {
      name: 'Total Attendees',
      value: stats.totalAttendees,
      icon: UserGroupIcon,
      color: 'bg-warning-500',
    },
    {
      name: 'Active Attendees',
      value: stats.activeAttendees,
      icon: CheckCircleIcon,
      color: 'bg-danger-500',
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircleIcon className="h-5 w-5 text-success-500" />;
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-primary-500" />;
      case 'deploying':
        return <ClockIcon className="h-5 w-5 text-warning-500" />;
      case 'failed':
        return <XMarkIcon className="h-5 w-5 text-danger-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'active':
        return 'status-active';
      case 'completed':
        return 'status-completed';
      case 'deploying':
        return 'status-deploying';
      case 'failed':
        return 'status-failed';
      default:
        return 'status-planning';
    }
  };

  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Workshop environment overview and statistics
          </p>
        </div>
        
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card">
              <div className="card-body">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Workshop environment overview and statistics
            </p>
          </div>
          <Link
            to="/workshops/new"
            className="btn-primary"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            New Workshop
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-12">
        {statCards.map((item) => (
          <div key={item.name} className="card">
            <div className="card-body">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`p-3 rounded-md ${item.color}`}>
                    <item.icon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-300 truncate">
                      {item.name}
                    </dt>
                    <dd className="text-2xl font-bold text-gray-900 dark:text-white">
                      {item.value}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Workshops */}
      <div className="card">
        <div className="card-header">
          <div className="flex justify-between items-center">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">
              Recent Workshops
            </h3>
            <Link
              to="/workshops"
              className="text-sm text-primary-600 hover:text-primary-500"
            >
              View all
            </Link>
          </div>
        </div>
        <div className="card-body">
          {workshops.length === 0 ? (
            <div className="text-center py-8">
              <AcademicCapIcon 
                className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-300" 
                data-testid="empty-state-icon"
              />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No workshops</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-300">
                Get started by creating a new workshop.
              </p>
              <div className="mt-6">
                <Link
                  to="/workshops/new"
                  className="btn-primary"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  New Workshop
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden">
              <ul className="divide-y divide-gray-200 dark:divide-gray-600">
                {workshops.slice(0, 5).map((workshop) => (
                  <li key={workshop.id} className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          {getStatusIcon(workshop.status)}
                        </div>
                        <div className="ml-4">
                          <div className="flex items-center">
                            <Link
                              to={`/workshops/${workshop.id}`}
                              className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-primary-600"
                            >
                              {workshop.name}
                            </Link>
                            <span className={`ml-2 ${getStatusClass(workshop.status)}`}>
                              {workshop.status}
                            </span>
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {workshop.attendee_count} attendees • {workshop.active_attendees} active
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(workshop.start_date).toLocaleDateString()}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;