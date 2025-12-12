/**
 * Overlay Manager
 * 
 * Utility functions for managing the drop zone overlay mask
 * that provides visual feedback during drag operations.
 */

interface OverlayConfig {
    color: string;
    top: string;
    height: string;
}

/**
 * Calculate overlay position based on drop zone and mode
 */
export function calculateOverlayPosition(
    calculatedDropZone: 'before' | 'after' | 'on',
    dropOption: string,
    allowDropOn: boolean,
    itemHeight: number
): { top: string; height: string } {
    let top = '0';
    let height = '100%';
    
    if (dropOption === 'auto') {
        // Auto mode: show overlay only on the specific zone
        if (allowDropOn) {
            // 3-zone mode
            const thirdHeight = itemHeight / 3;
            if (calculatedDropZone === 'before') {
                top = '0';
                height = `${thirdHeight}px`;
            } else if (calculatedDropZone === 'on') {
                top = `${thirdHeight}px`;
                height = `${thirdHeight}px`;
            } else { // after
                top = `${thirdHeight * 2}px`;
                height = `${thirdHeight}px`;
            }
        } else {
            // 2-zone mode
            const halfHeight = itemHeight / 2;
            if (calculatedDropZone === 'before') {
                top = '0';
                height = `${halfHeight}px`;
            } else { // after
                top = `${halfHeight}px`;
                height = `${halfHeight}px`;
            }
        }
    }
    
    return { top, height };
}

/**
 * Get overlay color based on drop zone
 */
export function getOverlayColor(
    calculatedDropZone: 'before' | 'after' | 'on',
    dropBeforeColor?: { value?: string },
    dropOnColor?: { value?: string },
    dropAfterColor?: { value?: string }
): string {
    if (calculatedDropZone === 'before') {
        return dropBeforeColor?.value || '#e3f2fd';
    } else if (calculatedDropZone === 'on') {
        return dropOnColor?.value || '#c8e6c9';
    } else {
        return dropAfterColor?.value || '#fff9c4';
    }
}

/**
 * Create a new overlay element
 */
export function createOverlayElement(target: HTMLElement): HTMLElement {
    const overlay = document.createElement('div');
    overlay.className = 'drop-overlay-mask';
    overlay.style.cssText = `
        position: absolute;
        left: 0;
        right: 0;
        pointer-events: none;
        z-index: 9999;
        border-radius: 4px;
        transition: top 0.15s ease-out, height 0.15s ease-out, background-color 0.15s ease-out, opacity 0.15s ease-out;
        opacity: 0;
    `;
    target.style.position = 'relative';
    target.appendChild(overlay);
    
    // Trigger reflow to enable transition
    overlay.offsetHeight;
    
    return overlay;
}

/**
 * Update overlay appearance
 */
export function updateOverlay(
    overlay: HTMLElement,
    config: OverlayConfig
): void {
    overlay.style.top = config.top;
    overlay.style.height = config.height;
    overlay.style.backgroundColor = config.color;
    overlay.style.opacity = '0.7';
}

/**
 * Fade out and remove overlay
 */
export function removeOverlay(overlay: HTMLElement): void {
    overlay.style.opacity = '0';
    setTimeout(() => {
        if (overlay.parentNode) {
            overlay.remove();
        }
    }, 150); // Match transition duration
}

/**
 * Remove all overlays except those in the specified target
 */
export function removeOtherOverlays(target: HTMLElement): void {
    document.querySelectorAll('.drop-overlay-mask').forEach(overlay => {
        if (!target.contains(overlay)) {
            overlay.remove();
        }
    });
}

/**
 * Remove all overlays from the page
 */
export function removeAllOverlays(): void {
    document.querySelectorAll('.drop-overlay-mask').forEach(overlay => overlay.remove());
}

/**
 * Handle drag over event for an item with overlay management
 */
export function handleItemDragOver(
    target: HTMLElement,
    calculatedDropZone: 'before' | 'after' | 'on' | null,
    isDraggedOver: boolean,
    dropOption: string,
    allowDropOn: boolean,
    dropBeforeColor: any,
    dropOnColor: any,
    dropAfterColor: any
): void {
    // Remove overlays from other items
    removeOtherOverlays(target);
    
    // Only show overlay if drop is allowed
    if (calculatedDropZone && isDraggedOver) {
        let overlay = target.querySelector('.drop-overlay-mask') as HTMLElement;
        
        // Get overlay color based on drop zone
        const overlayColor = getOverlayColor(
            calculatedDropZone,
            dropBeforeColor,
            dropOnColor,
            dropAfterColor
        );
        
        // Calculate position based on drop zone and mode
        const rect = target.getBoundingClientRect();
        const { top, height } = calculateOverlayPosition(
            calculatedDropZone,
            dropOption,
            allowDropOn,
            rect.height
        );
        
        // Create overlay if it doesn't exist
        if (!overlay) {
            overlay = createOverlayElement(target);
        }
        
        // Update overlay appearance with smooth transitions
        updateOverlay(overlay, { color: overlayColor, top, height });
    } else {
        // Fade out and remove overlay if drop not allowed or no drop zone
        const overlay = target.querySelector('.drop-overlay-mask') as HTMLElement;
        if (overlay) {
            removeOverlay(overlay);
        }
    }
}
