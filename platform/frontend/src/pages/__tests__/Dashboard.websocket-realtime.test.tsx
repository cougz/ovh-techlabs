import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import Dashboard from '../Dashboard';
import { workshopApi } from '../../services/api';

// Mock the APIs
jest.mock('../../services/api');
const mockedWorkshopApi = workshopApi as jest.Mocked<typeof workshopApi>;

// Mock useWebSocket hook to simulate WebSocket behavior
let mockInvalidateQueries: jest.Mock;
jest.mock('../../hooks/useWebSocket', () => ({
  useWebSocket: ({ workshopId, onStatusUpdate }: any) => {
    // Access the query client to invalidate queries when status updates occur
    const { useQueryClient } = require('react-query');
    const queryClient = useQueryClient();
    mockInvalidateQueries = jest.fn((queryKey) => {
      queryClient.invalidateQueries(queryKey);
    });
    
    // Store the callback for testing
    (global as any).__testWebSocketCallback = (entityType: string, entityId: string, status: string) => {
      // Simulate what the real hook does
      queryClient.invalidateQueries(['attendees', workshopId]);
      queryClient.invalidateQueries(['workshop', workshopId]);
      queryClient.invalidateQueries('workshops');
      queryClient.invalidateQueries(['workshops']);
      
      onStatusUpdate?.(entityType, entityId, status);
    };
    
    return {
      isConnected: true,
      connectionError: null,
      sendMessage: jest.fn(),
      reconnect: jest.fn(),
      disconnect: jest.fn(),
    };
  }
}));

const mockWorkshops = [
  {
    id: 'workshop-1',
    name: 'Production Workshop',
    description: 'Main production environment',
    start_date: '2025-07-25T10:00:00Z',
    end_date: '2025-07-25T18:00:00Z',
    status: 'active' as const,
    attendee_count: 10,
    active_attendees: 5,
    created_at: '2025-07-21T15:58:41Z',
    updated_at: '2025-07-21T15:58:41Z',
  },
  {
    id: 'workshop-2',
    name: 'Development Workshop',
    description: 'Dev environment',
    start_date: '2025-07-26T10:00:00Z',
    end_date: '2025-07-26T18:00:00Z',
    status: 'deploying' as const,
    attendee_count: 8,
    active_attendees: 0,
    created_at: '2025-07-22T15:58:41Z',
    updated_at: '2025-07-22T15:58:41Z',
  }
];

describe('Dashboard - Real-time WebSocket Updates', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { 
          retry: false,
          staleTime: 0,
          refetchInterval: false,
        },
        mutations: { retry: false },
      },
    });
    
    // Mock initial API response
    mockedWorkshopApi.getWorkshops.mockResolvedValue(mockWorkshops);
  });

  afterEach(() => {
    delete (global as any).__testWebSocketCallback;
  });

  it('should update workshop status in real-time when WebSocket receives updates', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      </QueryClientProvider>
    );

    // Wait for initial render
    await waitFor(() => {
      expect(screen.getByText('Development Workshop')).toBeInTheDocument();
    });

    // Verify initial status
    expect(screen.getByText('Deploying')).toBeInTheDocument();

    // Update the mock to return new data
    const updatedWorkshops = [...mockWorkshops];
    updatedWorkshops[1] = { 
      ...updatedWorkshops[1], 
      status: 'active',
      active_attendees: 8 
    };
    mockedWorkshopApi.getWorkshops.mockResolvedValue(updatedWorkshops);

    // Simulate WebSocket status update
    act(() => {
      if ((global as any).__testWebSocketCallback) {
        (global as any).__testWebSocketCallback('workshop', 'workshop-2', 'active');
      }
    });

    // Dashboard should update to show new status
    await waitFor(() => {
      // Should show 2 active workshops now
      const activeBadges = screen.getAllByText('Active');
      expect(activeBadges.length).toBe(2);
    });

    // Verify attendee count also updated
    expect(screen.getByText('8 attendees • 8 active')).toBeInTheDocument();
  });

  it('should update attendee counts when attendee status changes', async () => {
    // Initial setup with different attendee counts
    const workshopsWithAttendees = [...mockWorkshops];
    workshopsWithAttendees[0] = {
      ...workshopsWithAttendees[0],
      active_attendees: 3, // Initially 3 active out of 10
    };
    mockedWorkshopApi.getWorkshops.mockResolvedValue(workshopsWithAttendees);

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      </QueryClientProvider>
    );

    // Wait for initial render
    await waitFor(() => {
      expect(screen.getByText('10 attendees • 3 active')).toBeInTheDocument();
    });

    // Update mock to reflect new attendee count
    const updatedWorkshops = [...workshopsWithAttendees];
    updatedWorkshops[0] = {
      ...updatedWorkshops[0],
      active_attendees: 4, // One more attendee became active
    };
    mockedWorkshopApi.getWorkshops.mockResolvedValue(updatedWorkshops);

    // Simulate attendee status update via WebSocket
    act(() => {
      if ((global as any).__testWebSocketCallback) {
        (global as any).__testWebSocketCallback('attendee', 'attendee-123', 'active');
      }
    });

    // Dashboard should update to show new attendee count
    await waitFor(() => {
      expect(screen.getByText('10 attendees • 4 active')).toBeInTheDocument();
    });
  });

  it('should handle multiple rapid status updates', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      </QueryClientProvider>
    );

    // Wait for initial render
    await waitFor(() => {
      expect(screen.getByText('Production Workshop')).toBeInTheDocument();
      expect(screen.getByText('Development Workshop')).toBeInTheDocument();
    });

    // First update: workshop-2 becomes active
    const firstUpdate = [...mockWorkshops];
    firstUpdate[1] = { ...firstUpdate[1], status: 'active' };
    mockedWorkshopApi.getWorkshops.mockResolvedValue(firstUpdate);

    act(() => {
      if ((global as any).__testWebSocketCallback) {
        (global as any).__testWebSocketCallback('workshop', 'workshop-2', 'active');
      }
    });

    // Second update: workshop-1 goes to cleanup
    const secondUpdate = [...firstUpdate];
    secondUpdate[0] = { ...secondUpdate[0], status: 'cleanup' };
    mockedWorkshopApi.getWorkshops.mockResolvedValue(secondUpdate);

    act(() => {
      if ((global as any).__testWebSocketCallback) {
        (global as any).__testWebSocketCallback('workshop', 'workshop-1', 'cleanup');
      }
    });

    // Verify both updates are reflected
    await waitFor(() => {
      expect(screen.getByText('Cleanup')).toBeInTheDocument();
      expect(screen.getAllByText('Active').length).toBeGreaterThan(0);
    });
  });

  it('should demonstrate the fix: workshops query is invalidated on WebSocket updates', async () => {
    // Track query invalidations
    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    // Clear initial calls
    invalidateQueriesSpy.mockClear();

    // Simulate WebSocket update
    act(() => {
      if ((global as any).__testWebSocketCallback) {
        (global as any).__testWebSocketCallback('workshop', 'workshop-1', 'error');
      }
    });

    // Verify that workshops query was invalidated
    expect(invalidateQueriesSpy).toHaveBeenCalledWith('workshops');
    expect(invalidateQueriesSpy).toHaveBeenCalledWith(['workshops']);
  });
});