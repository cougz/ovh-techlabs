import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import WorkshopList from '../WorkshopList';
import { workshopApi } from '../../services/api';

// Mock the APIs
jest.mock('../../services/api');
const mockedWorkshopApi = workshopApi as jest.Mocked<typeof workshopApi>;

// Mock useWebSocket hook to simulate WebSocket behavior
jest.mock('../../hooks/useWebSocket', () => ({
  useWebSocket: ({ workshopId, onStatusUpdate }: any) => {
    const { useQueryClient } = require('react-query');
    const queryClient = useQueryClient();
    
    // Store the callback for testing
    (global as any).__testWebSocketCallback = (entityType: string, entityId: string, status: string) => {
      // Simulate what the real hook does after our fix
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
    attendee_count: 15,
    active_attendees: 10,
    created_at: '2025-07-21T15:58:41Z',
    updated_at: '2025-07-21T15:58:41Z',
  },
  {
    id: 'workshop-2',
    name: 'Development Workshop',
    description: 'Dev environment for testing',
    start_date: '2025-07-26T10:00:00Z',
    end_date: '2025-07-26T18:00:00Z',
    status: 'deploying' as const,
    attendee_count: 8,
    active_attendees: 0,
    created_at: '2025-07-22T15:58:41Z',
    updated_at: '2025-07-22T15:58:41Z',
  },
  {
    id: 'workshop-3',
    name: 'Training Workshop',
    description: 'Training environment',
    start_date: '2025-07-27T10:00:00Z',
    end_date: '2025-07-27T18:00:00Z',
    status: 'cleanup' as const,
    attendee_count: 20,
    active_attendees: 0,
    created_at: '2025-07-23T15:58:41Z',
    updated_at: '2025-07-23T15:58:41Z',
  }
];

describe('WorkshopList - Real-time WebSocket Updates', () => {
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

  it('should update workshop status in real-time via WebSocket', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <WorkshopList />
        </BrowserRouter>
      </QueryClientProvider>
    );

    // Wait for initial render
    await waitFor(() => {
      expect(screen.getByText('Development Workshop')).toBeInTheDocument();
      expect(screen.getByText('Deploying')).toBeInTheDocument();
    });

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

    // WorkshopList should update to show new status
    await waitFor(() => {
      // Should now show active status instead of deploying
      const activeBadges = screen.getAllByText('Active');
      expect(activeBadges.length).toBe(2); // workshop-1 and workshop-2 are now active
      
      // Deploying status should be gone
      expect(screen.queryByText('Deploying')).not.toBeInTheDocument();
    });

    // Verify attendee count also updated
    expect(screen.getByText('8 attendees • 8 active')).toBeInTheDocument();
  });

  it('should update when workshop cleanup completes', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <WorkshopList />
        </BrowserRouter>
      </QueryClientProvider>
    );

    // Wait for initial render
    await waitFor(() => {
      expect(screen.getByText('Training Workshop')).toBeInTheDocument();
      expect(screen.getByText('Cleanup')).toBeInTheDocument();
    });

    // Update mock to show cleanup completed
    const updatedWorkshops = [...mockWorkshops];
    updatedWorkshops[2] = { ...updatedWorkshops[2], status: 'completed' };
    mockedWorkshopApi.getWorkshops.mockResolvedValue(updatedWorkshops);

    // Simulate WebSocket update
    act(() => {
      if ((global as any).__testWebSocketCallback) {
        (global as any).__testWebSocketCallback('workshop', 'workshop-3', 'completed');
      }
    });

    // Status should update to completed
    await waitFor(() => {
      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.queryByText('Cleanup')).not.toBeInTheDocument();
    });
  });

  it('should update attendee counts in real-time', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <WorkshopList />
        </BrowserRouter>
      </QueryClientProvider>
    );

    // Wait for initial render
    await waitFor(() => {
      expect(screen.getByText('15 attendees • 10 active')).toBeInTheDocument();
    });

    // Update mock to reflect attendee changes
    const updatedWorkshops = [...mockWorkshops];
    updatedWorkshops[0] = {
      ...updatedWorkshops[0],
      active_attendees: 12, // 2 more attendees became active
    };
    mockedWorkshopApi.getWorkshops.mockResolvedValue(updatedWorkshops);

    // Simulate attendee status update
    act(() => {
      if ((global as any).__testWebSocketCallback) {
        (global as any).__testWebSocketCallback('attendee', 'attendee-456', 'active');
      }
    });

    // Attendee count should update
    await waitFor(() => {
      expect(screen.getByText('15 attendees • 12 active')).toBeInTheDocument();
    });
  });

  it('should handle workshop deletion via WebSocket', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <WorkshopList />
        </BrowserRouter>
      </QueryClientProvider>
    );

    // Wait for initial render with 3 workshops
    await waitFor(() => {
      expect(screen.getByText('Production Workshop')).toBeInTheDocument();
      expect(screen.getByText('Development Workshop')).toBeInTheDocument();
      expect(screen.getByText('Training Workshop')).toBeInTheDocument();
    });

    // Update mock to remove workshop-3
    const updatedWorkshops = mockWorkshops.filter(w => w.id !== 'workshop-3');
    mockedWorkshopApi.getWorkshops.mockResolvedValue(updatedWorkshops);

    // Simulate deletion via WebSocket
    act(() => {
      if ((global as any).__testWebSocketCallback) {
        (global as any).__testWebSocketCallback('workshop', 'workshop-3', 'deleted');
      }
    });

    // Workshop should disappear from the list
    await waitFor(() => {
      expect(screen.queryByText('Training Workshop')).not.toBeInTheDocument();
      expect(screen.getByText('Production Workshop')).toBeInTheDocument();
      expect(screen.getByText('Development Workshop')).toBeInTheDocument();
    });
  });

  it('should show real-time progress updates during deployment', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <WorkshopList />
        </BrowserRouter>
      </QueryClientProvider>
    );

    // Wait for initial render
    await waitFor(() => {
      expect(screen.getByText('Development Workshop')).toBeInTheDocument();
    });

    // Verify workshop-2 is deploying
    expect(screen.getByText('Deploying')).toBeInTheDocument();

    // Update mock to show partial deployment progress
    const updatedWorkshops = [...mockWorkshops];
    updatedWorkshops[1] = {
      ...updatedWorkshops[1],
      active_attendees: 4, // Half of the attendees are now active
    };
    mockedWorkshopApi.getWorkshops.mockResolvedValue(updatedWorkshops);

    // Simulate progress update
    act(() => {
      if ((global as any).__testWebSocketCallback) {
        (global as any).__testWebSocketCallback('attendee', 'attendee-789', 'active');
      }
    });

    // Should show partial deployment progress
    await waitFor(() => {
      expect(screen.getByText('8 attendees • 4 active')).toBeInTheDocument();
      // Status should still be deploying
      expect(screen.getByText('Deploying')).toBeInTheDocument();
    });
  });
});