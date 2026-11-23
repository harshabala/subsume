import { useEffect, useRef, useState } from 'preact/hooks';
import '../styles/guided-tour.css';

export interface GuidedTourStep {
  id: 'save' | 'library' | 'search' | 'stats';
  title: string;
  lead: string;
  description: string;
  actionLabel?: string;
  actionPage?: 'search' | 'library' | 'stats';
  icon: string;
}

export const GUIDED_TOUR_STEPS: GuidedTourStep[] = [
  {
    id: 'save',
    title: 'Save a title',
    lead: 'Inscribe films, series, and books into your journal',
    description:
      'Record any title that stayed with you. Add personal reflections, memorable lines, or ratings from the quick-capture dock, search, or directly while browsing.',
    actionLabel: 'Try Search',
    actionPage: 'search',
    icon: '✦',
  },
  {
    id: 'library',
    title: 'Find it in your library',
    lead: 'Hardcover spines, cinematic cards, and format filters',
    description:
      'Your collection is preserved with hardcover book spines, poster cards, and format tabs. Everything you save stays local, obfuscated on disk, and private.',
    actionLabel: 'Open Library',
    actionPage: 'library',
    icon: '☵',
  },
  {
    id: 'search',
    title: 'Fast, private search',
    lead: 'Instant offline lookup across your memory and open catalogues',
    description:
      'Search across your own reflections in milliseconds. Look up new works via Open Library and open data sources with zero API keys required.',
    icon: '⌕',
  },
  {
    id: 'stats',
    title: 'See your stats & milestones',
    lead: 'Genuine hours, pages turned, and your emotional climate',
    description:
      'Explore milestones computed honestly from what you save—hours of cinema watched, pages read, and seasonal reflections without inflated vanity metrics.',
    actionLabel: 'View Stats',
    actionPage: 'stats',
    icon: '☼',
  },
];

interface GuidedTourProps {
  onDismiss: () => void;
  onNavigate?: (page: 'search' | 'library' | 'stats' | 'home') => void;
}

export function GuidedTour({ onDismiss, onNavigate }: GuidedTourProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const nextButtonRef = useRef<HTMLButtonElement>(null);

  const step = GUIDED_TOUR_STEPS[currentStepIndex] ?? GUIDED_TOUR_STEPS[0]!;
  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === GUIDED_TOUR_STEPS.length - 1;

  useEffect(() => {
    nextButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onDismiss();
      } else if (e.key === 'ArrowRight' && !isLast) {
        e.preventDefault();
        setCurrentStepIndex((prev) => Math.min(prev + 1, GUIDED_TOUR_STEPS.length - 1));
      } else if (e.key === 'ArrowLeft' && !isFirst) {
        e.preventDefault();
        setCurrentStepIndex((prev) => Math.max(prev - 1, 0));
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFirst, isLast, onDismiss]);

  const handleNext = () => {
    if (isLast) {
      onDismiss();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (!isFirst) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleAction = () => {
    if (step.actionPage && onNavigate) {
      onNavigate(step.actionPage);
    }
  };

  return (
    <div
      ref={containerRef}
      className="guided-tour-overlay"
      role="region"
      aria-label="Subsume guided tour"
      data-testid="guided-tour-dialog"
    >
      <div className="guided-tour-card">
        <div className="guided-tour-header">
          <div className="guided-tour-badge">
            <span className="guided-tour-icon" aria-hidden="true">
              {step.icon}
            </span>
            <span className="guided-tour-step-counter">
              Step {currentStepIndex + 1} of {GUIDED_TOUR_STEPS.length}
            </span>
          </div>

          <button
            type="button"
            className="guided-tour-skip-btn"
            onClick={onDismiss}
            aria-label="Skip guided tour"
          >
            Skip guide
          </button>
        </div>

        <div className="guided-tour-body">
          <h2 className="guided-tour-title">{step.title}</h2>
          <p className="guided-tour-lead">{step.lead}</p>
          <p className="guided-tour-description">{step.description}</p>

          {step.actionLabel && onNavigate && (
            <div className="guided-tour-action-row">
              <button
                type="button"
                className="btn-sanctuary-primary guided-tour-action-btn"
                onClick={handleAction}
              >
                {step.actionLabel}
              </button>
            </div>
          )}
        </div>

        <div className="guided-tour-footer">
          <div className="guided-tour-dots" aria-hidden="true">
            {GUIDED_TOUR_STEPS.map((s, idx) => (
              <span
                key={s.id}
                className={`guided-tour-dot ${
                  idx === currentStepIndex
                    ? 'active'
                    : idx < currentStepIndex
                    ? 'completed'
                    : ''
                }`}
              />
            ))}
          </div>

          <div className="guided-tour-nav-buttons">
            {!isFirst && (
              <button
                type="button"
                className="btn-sanctuary-restraint guided-tour-back-btn"
                onClick={handleBack}
              >
                Back
              </button>
            )}

            <button
              ref={nextButtonRef}
              type="button"
              className="btn-sanctuary-primary guided-tour-next-btn"
              onClick={handleNext}
            >
              {isLast ? 'Finish tour' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
