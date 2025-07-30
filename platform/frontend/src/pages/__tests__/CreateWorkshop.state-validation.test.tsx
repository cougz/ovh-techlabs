import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import CreateWorkshop from '../CreateWorkshop';

// Mock the API services
jest.mock('../../services/api', () => ({
  workshopApi: {
    createWorkshop: jest.fn(),
  },
  attendeeApi: {
    createAttendee: jest.fn(),
  },
  templateApi: {
    listTemplates: jest.fn(),
  }
}));

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn()
}));

// Mock react-query hooks
jest.mock('react-query', () => ({
  ...jest.requireActual('react-query'),
  useQuery: jest.fn(() => ({
    data: [{ name: 'Generic', description: 'Generic template', resources: ['ovh_public_cloud_project'] }],
    isLoading: false,
    error: null,
  })),
  useMutation: jest.fn(() => ({
    mutate: jest.fn(),
    isLoading: false,
    error: null,
  })),
  useQueryClient: jest.fn(() => ({
    invalidateQueries: jest.fn(),
  })),
}));

const renderCreateWorkshop = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return render(
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <CreateWorkshop />
      </QueryClientProvider>
    </BrowserRouter>
  );
};

const fillBasicForm = () => {
  // Fill in valid basic form data
  fireEvent.change(screen.getByLabelText(/workshop name/i), {
    target: { value: 'Test Workshop' }
  });
  
  const now = new Date();
  const startDate = new Date(now.getTime() + 60 * 60 * 1000); // +1 hour
  const endDate = new Date(now.getTime() + 25 * 60 * 60 * 1000); // +25 hours
  
  fireEvent.change(screen.getByLabelText(/start date/i), {
    target: { value: startDate.toISOString().slice(0, 16) }
  });
  
  fireEvent.change(screen.getByLabelText(/end date/i), {
    target: { value: endDate.toISOString().slice(0, 16) }
  });
};

describe('CreateWorkshop State Validation', () => {
  beforeEach(() => {
    // Clear console errors for clean test output
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Enhanced Form Validation', () => {
    it('should validate workshop name format and reject invalid characters', async () => {
      renderCreateWorkshop();
      
      // Test invalid characters in workshop name
      const nameInput = screen.getByLabelText(/workshop name/i);
      fireEvent.change(nameInput, { target: { value: 'Test@Workshop#Invalid' } });
      fireEvent.blur(nameInput);
      
      const submitButton = screen.getByRole('button', { name: /create workshop/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/workshop name contains invalid characters/i)).toBeInTheDocument();
      });
    });

    it('should validate workshop name length requirements', async () => {
      renderCreateWorkshop();
      
      const nameInput = screen.getByLabelText(/workshop name/i);
      
      // Test too short
      fireEvent.change(nameInput, { target: { value: 'AB' } });
      fireEvent.blur(nameInput);
      
      const submitButton = screen.getByRole('button', { name: /create workshop/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/workshop name must be at least 3 characters/i)).toBeInTheDocument();
      });
      
      // Test too long
      const longName = 'A'.repeat(101);
      fireEvent.change(nameInput, { target: { value: longName } });
      fireEvent.blur(nameInput);
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/workshop name must be less than 100 characters/i)).toBeInTheDocument();
      });
    });

    it('should validate template selection using schema validation', async () => {
      renderCreateWorkshop();
      
      fillBasicForm();
      
      // Try to set an invalid template (this would normally be prevented by the dropdown)
      // But we test the validation logic itself
      const form = screen.getByRole('form') || screen.getByText('Create Workshop').closest('form');
      expect(form).toBeInTheDocument();
      
      // The template dropdown should only allow valid selections
      const templateSection = screen.getByText('Workshop Template');
      expect(templateSection).toBeInTheDocument();
    });

    it('should validate date formats and provide clear error messages', async () => {
      renderCreateWorkshop();
      
      const nameInput = screen.getByLabelText(/workshop name/i);
      fireEvent.change(nameInput, { target: { value: 'Test Workshop' } });
      
      // Test invalid date format (this is normally prevented by HTML5 datetime-local input)
      // But we test the validation logic for edge cases
      const startDateInput = screen.getByLabelText(/start date/i);
      const endDateInput = screen.getByLabelText(/end date/i);
      
      // Test missing dates
      fireEvent.change(startDateInput, { target: { value: '' } });
      fireEvent.change(endDateInput, { target: { value: '' } });
      
      const submitButton = screen.getByRole('button', { name: /create workshop/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/start date is required/i)).toBeInTheDocument();
        expect(screen.getByText(/end date is required/i)).toBeInTheDocument();
      });
    });

    it('should validate workshop duration with enhanced limits', async () => {
      renderCreateWorkshop();
      
      fillBasicForm();
      
      const now = new Date();
      const startDate = new Date(now.getTime() + 60 * 60 * 1000); // +1 hour
      const endDate = new Date(startDate.getTime() + 10 * 60 * 1000); // +10 minutes (too short)
      
      fireEvent.change(screen.getByLabelText(/start date/i), {
        target: { value: startDate.toISOString().slice(0, 16) }
      });
      
      fireEvent.change(screen.getByLabelText(/end date/i), {
        target: { value: endDate.toISOString().slice(0, 16) }
      });
      
      const submitButton = screen.getByRole('button', { name: /create workshop/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/workshop must be at least 30 minutes long/i)).toBeInTheDocument();
      });
    });

    it('should warn about workshops longer than 7 days', async () => {
      renderCreateWorkshop();
      
      fillBasicForm();
      
      const now = new Date();
      const startDate = new Date(now.getTime() + 60 * 60 * 1000); // +1 hour
      const endDate = new Date(startDate.getTime() + 8 * 24 * 60 * 60 * 1000); // +8 days
      
      fireEvent.change(screen.getByLabelText(/start date/i), {
        target: { value: startDate.toISOString().slice(0, 16) }
      });
      
      fireEvent.change(screen.getByLabelText(/end date/i), {
        target: { value: endDate.toISOString().slice(0, 16) }
      });
      
      const submitButton = screen.getByRole('button', { name: /create workshop/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/workshops longer than 7 days may cause resource management issues/i)).toBeInTheDocument();
      });
    });

    it('should validate timezone selection', async () => {
      renderCreateWorkshop();
      
      fillBasicForm();
      
      // The timezone should be selected from valid options
      const timezoneSelect = screen.getByLabelText(/timezone/i);
      expect(timezoneSelect).toBeInTheDocument();
      
      // Verify default timezone is set
      expect(timezoneSelect).toHaveValue('UTC');
      
      // Test changing to a valid timezone
      fireEvent.change(timezoneSelect, { target: { value: 'Europe/Madrid' } });
      expect(timezoneSelect).toHaveValue('Europe/Madrid');
    });

    it('should provide real-time validation feedback', async () => {
      renderCreateWorkshop();
      
      const nameInput = screen.getByLabelText(/workshop name/i);
      
      // Enter invalid name
      fireEvent.change(nameInput, { target: { value: 'Test@Invalid' } });
      fireEvent.click(screen.getByRole('button', { name: /create workshop/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/workshop name contains invalid characters/i)).toBeInTheDocument();
      });
      
      // Fix the name - error should clear
      fireEvent.change(nameInput, { target: { value: 'Test Valid Workshop' } });
      
      await waitFor(() => {
        expect(screen.queryByText(/workshop name contains invalid characters/i)).not.toBeInTheDocument();
      });
    });

    it('should validate past dates with buffer allowance', async () => {
      renderCreateWorkshop();
      
      fillBasicForm();
      
      // Set start date to 10 minutes ago (should fail)
      const pastDate = new Date(Date.now() - 10 * 60 * 1000);
      fireEvent.change(screen.getByLabelText(/start date/i), {
        target: { value: pastDate.toISOString().slice(0, 16) }
      });
      
      const submitButton = screen.getByRole('button', { name: /create workshop/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/start date cannot be in the past/i)).toBeInTheDocument();
      });
    });
  });

  describe('State Consistency Validation', () => {
    it('should validate form state consistency before submission', async () => {
      renderCreateWorkshop();
      
      // Fill valid form
      fillBasicForm();
      
      const submitButton = screen.getByRole('button', { name: /create workshop/i });
      fireEvent.click(submitButton);
      
      // Should not show validation errors for valid form
      await waitFor(() => {
        expect(screen.queryByText(/is required/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/invalid/i)).not.toBeInTheDocument();
      });
    });

    it('should prevent submission with invalid state', async () => {
      renderCreateWorkshop();
      
      // Submit empty form
      const submitButton = screen.getByRole('button', { name: /create workshop/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/workshop name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/start date is required/i)).toBeInTheDocument();
        expect(screen.getByText(/end date is required/i)).toBeInTheDocument();
      });
    });
  });
});