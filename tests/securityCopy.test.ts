import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { GUIDED_TOUR_STEPS } from '@/ui/components/GuidedTour';

describe('SEC-SS-01: storage security copy accuracy', () => {
  it('GuidedTour step 2 copy does not claim data is encrypted on disk', () => {
    const step2 = GUIDED_TOUR_STEPS.find((s) => s.id === 'library');
    expect(step2).toBeDefined();
    expect(step2!.description).not.toContain('encrypted');
    expect(step2!.description).toContain('obfuscated on disk');
  });

  it('README accurately states keys are obfuscated on disk', () => {
    const readme = fs.readFileSync(path.resolve(__dirname, '../README.md'), 'utf-8');
    expect(readme).toContain('obfuscated on disk');
  });
});
