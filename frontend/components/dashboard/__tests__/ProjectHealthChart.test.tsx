import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProjectHealthChart } from '../ProjectHealthChart';
import React from 'react';

describe('ProjectHealthChart', () => {
  it('renders progress percentage correctly', () => {
    render(<ProjectHealthChart todoPercent={75} qnaCount={5} crCount={2} overdueCount={1} />);
    expect(screen.getByText('75%')).toBeDefined();
  });

  it('renders overdue count correctly', () => {
    render(<ProjectHealthChart todoPercent={75} qnaCount={5} crCount={2} overdueCount={1} />);
    expect(screen.getByText('1')).toBeDefined();
    expect(screen.getByText(/overdue/i)).toBeDefined();
  });

  it('renders Q&A count correctly', () => {
    render(<ProjectHealthChart todoPercent={75} qnaCount={5} crCount={2} overdueCount={1} />);
    expect(screen.getByText('5')).toBeDefined();
  });
});
