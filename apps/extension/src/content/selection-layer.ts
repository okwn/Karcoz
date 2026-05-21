export interface SelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SelectionLayer {
  startSelection(clientX: number, clientY: number): void;
  updateSelection(clientX: number, clientY: number): void;
  endSelection(): SelectionRect | null;
  cancel(): void;
  onSelectionComplete(callback: (rect: SelectionRect) => void): void;
  onSelectionCancel(callback: () => void): void;
}

export function createSelectionLayer(): SelectionLayer {
  let startX = 0;
  let startY = 0;
  let currentX = 0;
  let currentY = 0;
  let isSelecting = false;
  let overlay: HTMLDivElement | null = null;
  let selectionBox: HTMLDivElement | null = null;
  let onCompleteCallback: ((rect: SelectionRect) => void) | null = null;
  let onCancelCallback: (() => void) | null = null;

  function createOverlay(): void {
    overlay = document.createElement('div');
    overlay.className = 'kcz-selection-overlay';
    document.body.appendChild(overlay);

    selectionBox = document.createElement('div');
    selectionBox.className = 'kcz-selection-box';
    selectionBox.style.display = 'none';
    document.body.appendChild(selectionBox);
  }

  function removeOverlay(): void {
    overlay?.remove();
    selectionBox?.remove();
    overlay = null;
    selectionBox = null;
  }

  function updateSelectionBox(): void {
    if (!selectionBox) return;

    const x = Math.min(startX, currentX);
    const y = Math.min(startY, currentY);
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);

    selectionBox.style.left = `${x}px`;
    selectionBox.style.top = `${y}px`;
    selectionBox.style.width = `${width}px`;
    selectionBox.style.height = `${height}px`;
    selectionBox.style.display = width > 0 && height > 0 ? 'block' : 'none';
  }

  function handleMouseMove(e: MouseEvent): void {
    if (!isSelecting) return;
    currentX = e.clientX;
    currentY = e.clientY;
    updateSelectionBox();
  }

  function handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      cancel();
    }
  }

  function handleMouseUp(e: MouseEvent): void {
    if (!isSelecting) return;
    isSelecting = false;

    const rect: SelectionRect = {
      x: Math.min(startX, currentX),
      y: Math.min(startY, currentY),
      width: Math.abs(currentX - startX),
      height: Math.abs(currentY - startY),
    };

    if (rect.width < 10 || rect.height < 10) {
      cancel();
      return;
    }

    cleanup();
    onCompleteCallback?.(rect);
  }

  function cleanup(): void {
    isSelecting = false;
    removeOverlay();
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.removeEventListener('keydown', handleKeyDown);
  }

  function cancel(): void {
    cleanup();
    onCancelCallback?.();
  }

  return {
    startSelection(clientX: number, clientY: number): void {
      startX = clientX;
      startY = clientY;
      currentX = clientX;
      currentY = clientY;
      isSelecting = true;

      createOverlay();

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('keydown', handleKeyDown);
    },

    updateSelection(clientX: number, clientY: number): void {
      currentX = clientX;
      currentY = clientY;
      updateSelectionBox();
    },

    endSelection(): SelectionRect | null {
      if (!isSelecting) return null;

      const rect: SelectionRect = {
        x: Math.min(startX, currentX),
        y: Math.min(startY, currentY),
        width: Math.abs(currentX - startX),
        height: Math.abs(currentY - startY),
      };

      cleanup();

      if (rect.width < 10 || rect.height < 10) {
        return null;
      }

      onCompleteCallback?.(rect);
      return rect;
    },

    cancel(): void {
      cancel();
    },

    onSelectionComplete(callback: (rect: SelectionRect) => void): void {
      onCompleteCallback = callback;
    },

    onSelectionCancel(callback: () => void): void {
      onCancelCallback = callback;
    },
  };
}