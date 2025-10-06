import { useState, ReactNode } from 'react';
import { Archive, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { hapticLight } from '@/lib/haptics';

interface SwipeableListItemProps {
  children: ReactNode;
  onDelete?: () => void;
  onArchive?: () => void;
  className?: string;
}

/**
 * List item with swipe-to-reveal actions
 * Swipe left to reveal delete, swipe right to reveal archive
 */
export function SwipeableListItem({
  children,
  onDelete,
  onArchive,
  className,
}: SwipeableListItemProps) {
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [offset, setOffset] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);

  const minSwipeDistance = 50;
  const actionWidth = 80;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(0);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const currentTouch = e.targetTouches[0].clientX;
    setTouchEnd(currentTouch);
    
    const distance = touchStart - currentTouch;
    setOffset(-distance);
  };

  const onTouchEnd = () => {
    if (!touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && onDelete) {
      setOffset(-actionWidth);
      setIsRevealed(true);
      hapticLight();
    } else if (isRightSwipe && onArchive) {
      setOffset(actionWidth);
      setIsRevealed(true);
      hapticLight();
    } else {
      setOffset(0);
      setIsRevealed(false);
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete();
      setOffset(0);
      setIsRevealed(false);
    }
  };

  const handleArchive = () => {
    if (onArchive) {
      onArchive();
      setOffset(0);
      setIsRevealed(false);
    }
  };

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Left action (archive) */}
      {onArchive && (
        <button
          onClick={handleArchive}
          className="absolute left-0 top-0 bottom-0 w-20 bg-blue-500 flex items-center justify-center"
        >
          <Archive className="h-5 w-5 text-white" />
        </button>
      )}

      {/* Right action (delete) */}
      {onDelete && (
        <button
          onClick={handleDelete}
          className="absolute right-0 top-0 bottom-0 w-20 bg-destructive flex items-center justify-center"
        >
          <Trash2 className="h-5 w-5 text-white" />
        </button>
      )}

      {/* Main content */}
      <div
        className="bg-background relative transition-transform duration-200 select-none"
        style={{ transform: `translateX(${offset}px)` }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
