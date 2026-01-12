import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Skeleton, CardSkeleton, ListSkeleton } from '../Skeleton';

describe('Skeleton', () => {
  it('should render with rectangular variant by default', () => {
    const { container } = render(<Skeleton />);

    const skeleton = container.firstChild;
    expect(skeleton).toHaveClass('rounded-lg');
    expect(skeleton).toHaveClass('animate-pulse');
  });

  it('should render with text variant', () => {
    const { container } = render(<Skeleton variant="text" />);

    const skeleton = container.firstChild;
    expect(skeleton).toHaveClass('rounded');
    expect(skeleton).toHaveClass('h-4');
  });

  it('should render with circular variant', () => {
    const { container } = render(<Skeleton variant="circular" />);

    const skeleton = container.firstChild;
    expect(skeleton).toHaveClass('rounded-full');
  });

  it('should apply custom width and height', () => {
    const { container } = render(<Skeleton width={100} height={50} />);

    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton.style.width).toBe('100px');
    expect(skeleton.style.height).toBe('50px');
  });

  it('should apply string width and height', () => {
    const { container } = render(<Skeleton width="50%" height="2rem" />);

    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton.style.width).toBe('50%');
    expect(skeleton.style.height).toBe('2rem');
  });

  it('should render multiple lines', () => {
    const { container } = render(<Skeleton lines={3} />);

    const lines = container.querySelectorAll('.animate-pulse');
    expect(lines.length).toBe(3);
  });

  it('should make last line shorter when multiple lines', () => {
    const { container } = render(<Skeleton lines={3} />);

    const lines = container.querySelectorAll('.animate-pulse');
    const lastLine = lines[2] as HTMLElement;
    expect(lastLine.style.width).toBe('75%');
  });
});

describe('CardSkeleton', () => {
  it('should render card structure', () => {
    const { container } = render(<CardSkeleton />);

    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('p-4');
    expect(wrapper).toHaveClass('border');
    expect(wrapper).toHaveClass('rounded-lg');
  });
});

describe('ListSkeleton', () => {
  it('should render 5 items by default', () => {
    const { container } = render(<ListSkeleton />);

    const items = container.querySelectorAll('.flex.items-center.gap-4');
    expect(items.length).toBe(5);
  });

  it('should render custom number of items', () => {
    const { container } = render(<ListSkeleton count={3} />);

    const items = container.querySelectorAll('.flex.items-center.gap-4');
    expect(items.length).toBe(3);
  });
});
