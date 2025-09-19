import React, { type ReactNode, useLayoutEffect, useRef, useCallback } from 'react';
// FIXED: Use dynamic import to handle ES module compatibility
let Lenis: any = null;

// ============================================================================
// SCROLL STACK ITEM COMPONENT
// ============================================================================
// This component wraps each card in the scroll stack
// You can customize the card appearance by modifying the className and styles

export interface ScrollStackItemProps {
  itemClassName?: string;  // Additional CSS classes for the card
  children: ReactNode;     // Content to display inside the card
}

export const ScrollStackItem: React.FC<ScrollStackItemProps> = ({ children, itemClassName = '' }) => (
  <div
    className={`scroll-stack-card scroll-stack-card-demo ${itemClassName}`.trim()}
    style={{
      marginBottom: '200px',                    // Space between cards
      willChange: 'transform, filter',          // Optimize for animations
      transformOrigin: 'center top',            // Transform from top center
      backfaceVisibility: 'hidden',             // Hide back face for 3D effect
      transform: 'translate3d(0px, 0px, 0px) scale(1) rotate(0deg)', // Initial transform
      perspective: '1000px'                     // 3D perspective for depth
    }}
  >
    {children}
  </div>
);

// ============================================================================
// SCROLL STACK PROPS INTERFACE
// ============================================================================
// These props control the stacking behavior and animation
// Modify these values to change how the cards stack and animate

interface ScrollStackProps {
  className?: string;           // Additional CSS classes for the container
  children: ReactNode;          // ScrollStackItem components to stack
  
  // STACKING BEHAVIOR - Control how cards stack
  itemDistance?: number;        // Distance between cards when not stacking (default: 100px)
  itemStackDistance?: number;   // Distance between cards when stacking (default: 30px)
  stackPosition?: string;       // When stacking starts as % of viewport (default: "20%")
  scaleEndPosition?: string;    // When scaling ends as % of viewport (default: "10%")
  
  // SCALING BEHAVIOR - Control card size changes
  itemScale?: number;           // Scale increment per card (default: 0.03)
  baseScale?: number;           // Base scale for first card (default: 0.85)
  scaleDuration?: number;       // Duration of scaling animation (default: 0.5s)
  
  // VISUAL EFFECTS - Control rotation and blur
  rotationAmount?: number;      // Rotation amount per card in degrees (default: 0)
  blurAmount?: number;          // Blur amount for stacked cards (default: 0)
  
  // SCROLL BEHAVIOR
  useWindowScroll?: boolean;    // Use window scroll vs container scroll (default: false)
  onStackComplete?: () => void; // Callback when all cards are stacked
}

// ============================================================================
// MAIN SCROLL STACK COMPONENT
// ============================================================================
// This component creates the scrollable container and manages card animations

const ScrollStack: React.FC<ScrollStackProps> = ({
  children,
  className = '',
  itemDistance = 100,        // Space between cards when not stacking
  itemScale = 0.03,          // Scale increment per card
  itemStackDistance = 30,    // Space between cards when stacking
  stackPosition = '20%',     // When stacking starts (% of viewport)
  scaleEndPosition = '10%',  // When scaling ends (% of viewport)
  baseScale = 0.85,          // Base scale for first card
  scaleDuration = 0.5,       // Duration of scaling animation
  rotationAmount = 0,        // Rotation amount per card
  blurAmount = 0,            // Blur amount for stacked cards
  useWindowScroll = false,   // Use container scroll for proper stacking
  onStackComplete
}) => {
  // ============================================================================
  // REFS AND STATE MANAGEMENT
  // ============================================================================
  const scrollerRef = useRef<HTMLDivElement>(null);           // Container element
  const stackCompletedRef = useRef(false);                    // Track if stacking is complete
  const animationFrameRef = useRef<number | null>(null);      // Animation frame ID
  const lenisRef = useRef<any | null>(null);                  // Lenis smooth scroll instance
  const cardsRef = useRef<HTMLElement[]>([]);                 // Array of card elements
  const lastTransformsRef = useRef(new Map<number, any>());   // Cache last transforms for optimization
  const isUpdatingRef = useRef(false);                        // Prevent concurrent updates
  

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================
  // These functions help calculate positions and progress for animations

  // Calculate progress between start and end positions (0 to 1)
  const calculateProgress = useCallback((scrollTop: number, start: number, end: number) => {
    if (scrollTop < start) return 0;
    if (scrollTop > end) return 1;
    return (scrollTop - start) / (end - start);
  }, []);

  // Convert percentage strings to pixel values
  const parsePercentage = useCallback((value: string | number, containerHeight: number) => {
    if (typeof value === 'string' && value.includes('%')) {
      return (parseFloat(value) / 100) * containerHeight;
    }
    return parseFloat(value as string);
  }, []);

  // Get current scroll data (either window or container scroll)
  const getScrollData = useCallback(() => {
    if (useWindowScroll) {
      return {
        scrollTop: window.scrollY,
        containerHeight: window.innerHeight,
        scrollContainer: document.documentElement
      };
    } else {
      const scroller = scrollerRef.current;
      return {
        scrollTop: scroller ? scroller.scrollTop : 0,
        containerHeight: scroller ? scroller.clientHeight : 0,
        scrollContainer: scroller
      };
    }
  }, [useWindowScroll]);

  // Get element's position relative to scroll container
  const getElementOffset = useCallback(
    (element: HTMLElement) => {
      if (useWindowScroll) {
        const rect = element.getBoundingClientRect();
        return rect.top + window.scrollY;
      } else {
        return element.offsetTop;
      }
    },
    [useWindowScroll]
  );

  // ============================================================================
  // CARD TRANSFORM CALCULATION
  // ============================================================================
  // This is the main function that calculates and applies transforms to each card
  // Modify this section to change how cards animate and stack

  const updateCardTransforms = useCallback(() => {
    if (!cardsRef.current.length || isUpdatingRef.current) return;

    isUpdatingRef.current = true;

    // Get current scroll position and container dimensions
    const { scrollTop, containerHeight } = getScrollData();
    
    // Convert percentage positions to pixel values
    const stackPositionPx = parsePercentage(stackPosition, containerHeight);    // When stacking starts
    const scaleEndPositionPx = parsePercentage(scaleEndPosition, containerHeight); // When scaling ends

    // Find the end element to determine when stacking is complete
    const endElement = useWindowScroll
      ? (document.querySelector('.scroll-stack-end') as HTMLElement | null)
      : (scrollerRef.current?.querySelector('.scroll-stack-end') as HTMLElement | null);

    const endElementTop = endElement ? getElementOffset(endElement) : 0;

    // ============================================================================
    // CARD ANIMATION LOOP
    // ============================================================================
    // This loop processes each card and calculates its transform
    // Each card gets positioned, scaled, rotated, and blurred based on scroll position

    cardsRef.current.forEach((card, i) => {
      if (!card) return;

      const cardTop = getElementOffset(card);
      
      // Calculate trigger points for this card
      const triggerStart = cardTop - stackPositionPx - itemStackDistance * i;  // When scaling starts
      const triggerEnd = cardTop - scaleEndPositionPx;                         // When scaling ends
      const pinStart = cardTop - stackPositionPx - itemStackDistance * i;      // When pinning starts
      const pinEnd = endElementTop - containerHeight / 2;                      // When pinning ends

      // ============================================================================
      // SCALING CALCULATION
      // ============================================================================
      // Calculate how much this card should be scaled based on scroll progress
      const scaleProgress = calculateProgress(scrollTop, triggerStart, triggerEnd);
      const targetScale = baseScale + i * itemScale;  // Each card gets progressively smaller
      const scale = 1 - scaleProgress * (1 - targetScale);  // Interpolate from 1 to targetScale
      
      // ============================================================================
      // ROTATION CALCULATION
      // ============================================================================
      // Apply rotation based on scroll progress and card index
      const rotation = rotationAmount ? i * rotationAmount * scaleProgress : 0;

      // ============================================================================
      // BLUR CALCULATION
      // ============================================================================
      // Apply blur to cards that are behind the top card in the stack
      let blur = 0;
      if (blurAmount) {
        let topCardIndex = 0;
        // Find which card is currently on top
        for (let j = 0; j < cardsRef.current.length; j++) {
          const jCardTop = getElementOffset(cardsRef.current[j]);
          const jTriggerStart = jCardTop - stackPositionPx - itemStackDistance * j;
          if (scrollTop >= jTriggerStart) {
            topCardIndex = j;
          }
        }

        // Apply blur based on depth in stack
        if (i < topCardIndex) {
          const depthInStack = topCardIndex - i;
          blur = Math.max(0, depthInStack * blurAmount);
        }
      }

      // ============================================================================
      // POSITION CALCULATION (PINNING)
      // ============================================================================
      // Calculate vertical position - this creates the stacking effect
      let translateY = 0;
      const isPinned = scrollTop >= pinStart && scrollTop <= pinEnd;
      
      if (isPinned) {
        // When pinned, cards move with scroll to create stacking effect
        translateY = scrollTop - cardTop + stackPositionPx + itemStackDistance * i;
      } else if (scrollTop > pinEnd) {
        // When past pin end, cards stay in final stacked position
        translateY = pinEnd - cardTop + stackPositionPx + itemStackDistance * i;
      }

      // ============================================================================
      // TRANSFORM APPLICATION
      // ============================================================================
      // Apply the calculated transforms to the card element
      const newTransform = {
        translateY: Math.round(translateY * 100) / 100,    // Round for performance
        scale: Math.round(scale * 1000) / 1000,            // Round for performance
        rotation: Math.round(rotation * 100) / 100,        // Round for performance
        blur: Math.round(blur * 100) / 100                 // Round for performance
      };

      // Check if transform has changed to avoid unnecessary DOM updates
      const lastTransform = lastTransformsRef.current.get(i);
      const hasChanged =
        !lastTransform ||
        Math.abs(lastTransform.translateY - newTransform.translateY) > 0.1 ||
        Math.abs(lastTransform.scale - newTransform.scale) > 0.001 ||
        Math.abs(lastTransform.rotation - newTransform.rotation) > 0.1 ||
        Math.abs(lastTransform.blur - newTransform.blur) > 0.1;

      if (hasChanged) {
        // Apply CSS transforms
        const transform = `translate3d(0, ${newTransform.translateY}px, 0) scale(${newTransform.scale}) rotate(${newTransform.rotation}deg)`;
        const filter = newTransform.blur > 0 ? `blur(${newTransform.blur}px)` : '';

        card.style.transform = transform;
        card.style.filter = filter;

        // Cache the transform for next frame
        lastTransformsRef.current.set(i, newTransform);
      }

      // ============================================================================
      // STACK COMPLETION DETECTION
      // ============================================================================
      // Check if this is the last card and if stacking is complete
      if (i === cardsRef.current.length - 1) {
        const isInView = scrollTop >= pinStart && scrollTop <= pinEnd;
        if (isInView && !stackCompletedRef.current) {
          stackCompletedRef.current = true;
          onStackComplete?.();  // Call the completion callback
        } else if (!isInView && stackCompletedRef.current) {
          stackCompletedRef.current = false;
        }
      }
    });

    isUpdatingRef.current = false;
  }, [
    // Dependencies for the updateCardTransforms function
    itemScale,
    itemStackDistance,
    stackPosition,
    scaleEndPosition,
    baseScale,
    rotationAmount,
    blurAmount,
    useWindowScroll,
    onStackComplete,
    calculateProgress,
    parsePercentage,
    getScrollData,
    getElementOffset
  ]);

  // ============================================================================
  // SCROLL EVENT HANDLERS
  // ============================================================================
  // These functions handle scroll events and trigger card updates

  const handleScroll = useCallback(() => {
    updateCardTransforms();
  }, [updateCardTransforms]);

  const handleNativeScroll = useCallback(() => {
    updateCardTransforms();
  }, [updateCardTransforms]);

  // ============================================================================
  // LENIS SMOOTH SCROLL SETUP
  // ============================================================================
  // This function sets up smooth scrolling using the Lenis library
  // Falls back to native scroll if Lenis fails to load

  const setupLenis = useCallback(async () => {
    // Try to load Lenis dynamically (ES module compatibility)
    if (!Lenis) {
      try {
        const LenisModule = await import('lenis');
        Lenis = LenisModule.default;
      } catch (error) {
        console.error('Failed to load Lenis, using native scroll:', error);
        // Fallback to native scroll listeners
        if (useWindowScroll) {
          window.addEventListener('scroll', handleNativeScroll, { passive: true });
        } else {
          const scroller = scrollerRef.current;
          if (scroller) {
            scroller.addEventListener('scroll', handleNativeScroll, { passive: true });
          }
        }
        return;
      }
    }

    // Set up Lenis for window scroll (not recommended for stacking)
    if (useWindowScroll) {
      const lenis = new Lenis({
        duration: 1.2,                                                    // Animation duration
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(3, -10 * t)), // Easing function
        smoothWheel: true,                                                // Smooth mouse wheel
        touchMultiplier: 2,                                               // Touch sensitivity
        infinite: false,                                                  // No infinite scroll
        wheelMultiplier: 1,                                               // Wheel speed
        lerp: 0.1,                                                        // Linear interpolation
        syncTouch: true,                                                  // Sync touch events
        syncTouchLerp: 0.075                                              // Touch interpolation
      });

      lenis.on('scroll', handleScroll);

      // Start the animation loop
      const raf = (time: number) => {
        lenis.raf(time);
        animationFrameRef.current = requestAnimationFrame(raf);
      };
      animationFrameRef.current = requestAnimationFrame(raf);

      lenisRef.current = lenis;
      return lenis;
    } else {
      // Set up Lenis for container scroll (recommended for stacking)
      const scroller = scrollerRef.current;
      if (!scroller) return;

      const lenis = new Lenis({
        wrapper: scroller,                                                // Container element
        content: scroller.querySelector('.scroll-stack-inner') as HTMLElement, // Content element
        duration: 1.2,                                                    // Animation duration
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Easing function
        smoothWheel: true,                                                // Smooth mouse wheel
        touchMultiplier: 2,                                               // Touch sensitivity
        infinite: false,                                                  // No infinite scroll
        gestureOrientation: 'vertical',                                   // Vertical gestures only
        wheelMultiplier: 1,                                               // Wheel speed
        lerp: 0.1,                                                        // Linear interpolation
        syncTouch: true,                                                  // Sync touch events
        syncTouchLerp: 0.075                                              // Touch interpolation
      });

      lenis.on('scroll', handleScroll);

      // Start the animation loop
      const raf = (time: number) => {
        lenis.raf(time);
        animationFrameRef.current = requestAnimationFrame(raf);
      };
      animationFrameRef.current = requestAnimationFrame(raf);

      lenisRef.current = lenis;
      return lenis;
    }
  }, [handleScroll, useWindowScroll]);

  // ============================================================================
  // COMPONENT INITIALIZATION
  // ============================================================================
  // This effect runs when the component mounts and sets up all the animations

  useLayoutEffect(() => {
    if (!useWindowScroll && !scrollerRef.current) return;

    // Find all card elements
    const cards = Array.from(
      useWindowScroll
        ? document.querySelectorAll('.scroll-stack-card')
        : (scrollerRef.current?.querySelectorAll('.scroll-stack-card') ?? [])
    ) as HTMLElement[];
    cardsRef.current = cards;
    const transformsCache = lastTransformsRef.current;

    // ============================================================================
    // CARD STYLING SETUP
    // ============================================================================
    // Apply initial styles and spacing to each card
    cards.forEach((card, i) => {
      if (i < cards.length - 1) {
        card.style.marginBottom = `${itemDistance}px`;  // Space between cards
      }
      card.style.willChange = 'transform, filter';       // Optimize for animations
      card.style.transformOrigin = 'center top';         // Transform from top center
      card.style.backfaceVisibility = 'hidden';          // Hide back face for 3D effect
      card.style.transform = 'translate3d(0px, 0px, 0px) scale(1) rotate(0deg)'; // Initial transform
      card.style.perspective = '1000px';                 // 3D perspective for depth
    });

    // Set up smooth scrolling and start animations
    setupLenis().catch(console.error);
    updateCardTransforms();

    // ============================================================================
    // CLEANUP FUNCTION
    // ============================================================================
    // This function runs when the component unmounts to clean up resources
    return () => {
      // Cancel animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      // Destroy Lenis instance
      if (lenisRef.current) {
        lenisRef.current.destroy();
      }
      
      // Remove scroll event listeners
      if (useWindowScroll) {
        window.removeEventListener('scroll', handleNativeScroll);
      } else {
        const scroller = scrollerRef.current;
        if (scroller) {
          scroller.removeEventListener('scroll', handleNativeScroll);
        }
      }
      
      // Reset all state
      stackCompletedRef.current = false;
      cardsRef.current = [];
      transformsCache.clear();
      isUpdatingRef.current = false;
    };
  }, [
    // Dependencies for the useLayoutEffect
    itemDistance,
    itemScale,
    itemStackDistance,
    stackPosition,
    scaleEndPosition,
    baseScale,
    scaleDuration,
    rotationAmount,
    blurAmount,
    useWindowScroll,
    onStackComplete,
    setupLenis,
    updateCardTransforms,
    handleNativeScroll
  ]);

  // ============================================================================
  // COMPONENT RENDER
  // ============================================================================
  // This is the JSX that renders the scroll stack container

  return (
    <div
      className={`scroll-stack-container ${className}`.trim()}
      ref={scrollerRef}
    >
      <div className="scroll-stack-inner">
        {children}
        <div className="scroll-stack-end" />  {/* End marker for stacking detection */}
      </div>
    </div>
  );
};

export default ScrollStack;