import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';
import { storageService } from '../services/storageService';

describe('End-to-End User Facing Browser Interaction Test Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    storageService.resetToDefaults();
  });

  it('Executes the entire user journey: setup, judge scoring, live matrix tracking, and staff final confirmation', async () => {
    render(<App />);

    // 1. Verify Coordinator Admin View loaded by default
    expect(screen.getByRole('button', { name: /Admin/i })).toBeInTheDocument();
    expect(screen.getAllByText('Round 1: Pitch Booths').length).toBeGreaterThan(0);
    expect(screen.getByDisplayValue('Clarity of Business Idea')).toBeInTheDocument();

    // 2. Open Round to LIVE in Admin (MSP-32)
    window.confirm = () => true; // Auto-confirm live modal
    const openRoundBtn = screen.getByText('Open Round (LIVE)');
    fireEvent.click(openRoundBtn);

    // Verify rubric locks
    await waitFor(() => {
      expect(screen.getByText(/Live: Locked/i)).toBeInTheDocument();
    });

    // 3. Switch to "Judge Scoring" Tab (MSP-21, MSP-22, MSP-27, MSP-29)
    const judgeTabBtn = screen.getByRole('button', { name: /Judge Scoring/i });
    fireEvent.click(judgeTabBtn);

    // Verify prominent team name is displayed (MSP-21)
    expect(screen.getByText(/AgroPulse Sensors/i)).toBeInTheDocument();
    expect(screen.getAllByText(/What You're Listening For:/i).length).toBe(5);

    // 4. Test Pitch Timer controls (MSP-25)
    expect(screen.getByText('3:00')).toBeInTheDocument();
    const qaTimerBtn = screen.getByRole('button', { name: /3m Q&A/i });
    fireEvent.click(qaTimerBtn);
    expect(screen.getByText('3:00')).toBeInTheDocument();

    // 5. Submit a Score as Justice Payne
    // Click quick preset buttons for criteria
    const quick10Buttons = screen.getAllByRole('button', { name: '10' });
    expect(quick10Buttons.length).toBeGreaterThan(0);
    fireEvent.click(quick10Buttons[0]); // Category 1 = 10 pts

    // Fill feedback
    const workedWellInput = screen.getByPlaceholderText(/Specific strength, persuasive market data/i);
    fireEvent.change(workedWellInput, { target: { value: 'Incredible customer validation and demo.' } });

    // Submit score
    const submitBtn = screen.getByRole('button', { name: /Submit Score/i });
    fireEvent.click(submitBtn);

    // 6. Verify Confirmation Receipt (MSP-23)
    await waitFor(() => {
      expect(screen.getByText(/Score Confirmed \(MSP-23\)/i)).toBeInTheDocument();
    });

    // 7. Verify Auto-Advance to Next Team is available
    expect(screen.getByText(/Score Next: HealthConnect Mobile/i)).toBeInTheDocument();

    // 8. Switch to "Live Results" Tab (MSP-05, MSP-06, MSP-19, MSP-34)
    const liveResultsTabBtn = screen.getByRole('button', { name: /Live Results/i });
    fireEvent.click(liveResultsTabBtn);

    // Verify Live Submission Matrix (MSP-05)
    await waitFor(() => {
      expect(screen.getByText(/Judge Submission Matrix by Team/i)).toBeInTheDocument();
    });

    // Verify AgroPulse Sensors has Justice Payne's score recorded
    expect(screen.getAllByText('AgroPulse Sensors').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Missing/i).length).toBeGreaterThan(0); // Shows missing judges

    // 9. Open Audit Trail for AgroPulse (MSP-06)
    const auditButtons = screen.getAllByRole('button', { name: /Audit/i });
    fireEvent.click(auditButtons[0]);

    // Verify Audit Modal details
    await waitFor(() => {
      expect(screen.getByText(/Audit Trail & Score Breakdown/i)).toBeInTheDocument();
      expect(screen.getByText(/Judge: Justice Payne/i)).toBeInTheDocument();
      expect(screen.getByText(/Incredible customer validation and demo/i)).toBeInTheDocument();
    });

    // Close Audit View
    const closeAuditBtn = screen.getByRole('button', { name: /Close Audit View/i });
    fireEvent.click(closeAuditBtn);

    // 10. Staff Review & Confirmation Checkpoint (MSP-34)
    const reviewConfirmBtn = screen.getByRole('button', { name: /Review & Confirm Results/i });
    fireEvent.click(reviewConfirmBtn);

    // Verify Finalize Modal
    expect(screen.getByText(/Confirm & Lock Final Results \(MSP-34\)/i)).toBeInTheDocument();
    const confirmOfficialBtn = screen.getByRole('button', { name: /Confirm Official Results/i });
    fireEvent.click(confirmOfficialBtn);

    // Verify Finalized badge appears
    await waitFor(() => {
      expect(screen.getByText(/Confirmed Final by/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Steph Baggage/i).length).toBeGreaterThanOrEqual(2);
    });

    // 11. Test Regional Bonus Panel (MSP-35)
    const adminTabBtn = screen.getByRole('button', { name: /Admin/i });
    fireEvent.click(adminTabBtn);

    // Select "Black Belt" as winning region
    const regionSelect = screen.getByDisplayValue(/No Winning Region Designated/i);
    fireEvent.change(regionSelect, { target: { value: 'Black Belt' } });

    expect(screen.getByText(/Bonus Active:/i)).toBeInTheDocument();
    expect(screen.getAllByText(/\+5 pts to black belt/i).length).toBeGreaterThanOrEqual(2);

    // Verify on Live Results tab that +5 bonus is reflected in leaderboard
    fireEvent.click(screen.getByRole('button', { name: /Live Results/i }));
    await waitFor(() => {
      expect(screen.getAllByText(/\+5 pts/i).length).toBeGreaterThan(0);
    });

    // 12. Test Rubric Templates Manager (MSP-01)
    const templatesTabBtn = screen.getByRole('button', { name: /Templates/i });
    fireEvent.click(templatesTabBtn);

    // Verify pre-built templates appear
    expect(screen.getByText(/Official MCC-BP 5-Category Template/i)).toBeInTheDocument();
    expect(screen.getByText(/IA-EH 100-Point Weighted Template/i)).toBeInTheDocument();

    // Test Save Custom Template modal
    const saveTemplateBtn = screen.getByRole('button', { name: /Save Current Setup as Template/i });
    fireEvent.click(saveTemplateBtn);

    expect(screen.getByText(/Save As Reusable Template/i)).toBeInTheDocument();
    const templateNameInput = screen.getByPlaceholderText(/e\.g\. Magic City Classic 2027 Standard/i);
    fireEvent.change(templateNameInput, { target: { value: 'Collegiate Spring Showcase 2026' } });

    const submitTemplateBtn = screen.getByRole('button', { name: /Save Template/i });
    fireEvent.click(submitTemplateBtn);

    // Verify new template appears in the list
    await waitFor(() => {
      expect(screen.getByText('Collegiate Spring Showcase 2026')).toBeInTheDocument();
    });
  });
});
