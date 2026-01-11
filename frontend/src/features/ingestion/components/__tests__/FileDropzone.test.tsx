import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileDropzone } from '../FileDropzone';

describe('FileDropzone', () => {
  it('should render upload prompt when no file selected', () => {
    render(
      <FileDropzone onFileSelect={vi.fn()} selectedFile={null} />,
    );

    expect(screen.getByText(/drag & drop your file/i)).toBeInTheDocument();
    expect(screen.getByText(/or click to browse/i)).toBeInTheDocument();
  });

  it('should show selected file name when file is provided', () => {
    const mockFile = new File(['test content'], 'test-document.md', {
      type: 'text/markdown',
    });

    render(
      <FileDropzone onFileSelect={vi.fn()} selectedFile={mockFile} />,
    );

    expect(screen.getByText('test-document.md')).toBeInTheDocument();
  });

  it('should display file size when file is selected', () => {
    const content = 'x'.repeat(1024); // 1KB
    const mockFile = new File([content], 'large-document.md', {
      type: 'text/markdown',
    });

    render(
      <FileDropzone onFileSelect={vi.fn()} selectedFile={mockFile} />,
    );

    expect(screen.getByText(/1\.0 KB/)).toBeInTheDocument();
  });

  it('should display error message when error prop is provided', () => {
    render(
      <FileDropzone
        onFileSelect={vi.fn()}
        selectedFile={null}
        error="Upload failed"
      />,
    );

    expect(screen.getByText('Upload failed')).toBeInTheDocument();
  });

  it('should be disabled when disabled prop is true', () => {
    render(
      <FileDropzone
        onFileSelect={vi.fn()}
        selectedFile={null}
        disabled={true}
      />,
    );

    const dropzone = screen.getByText(/drag & drop your file/i).closest('div');
    expect(dropzone).toHaveClass('opacity-50');
  });

  it('should call onFileSelect when file is dropped', async () => {
    const user = userEvent.setup();
    const onFileSelect = vi.fn();

    render(
      <FileDropzone onFileSelect={onFileSelect} selectedFile={null} />,
    );

    const file = new File(['# Test'], 'test.md', { type: 'text/markdown' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    await user.upload(input, file);

    expect(onFileSelect).toHaveBeenCalledWith(file);
  });
});
