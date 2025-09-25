// Recipe instruction formatting utilities

/**
 * Formats recipe instructions into numbered steps
 * @param {string} instructions - Raw instructions text
 * @returns {string} Formatted instructions with numbered steps
 */
export function formatInstructionsToNumberedSteps(instructions) {
  if (!instructions || typeof instructions !== 'string') {
    return instructions;
  }

  // If already numbered, return as-is
  if (isAlreadyNumbered(instructions)) {
    return instructions;
  }

  // Split into logical steps and format
  const steps = parseInstructionSteps(instructions);
  return formatStepsWithNumbers(steps);
}

/**
 * Check if instructions are already numbered
 * @param {string} instructions
 * @returns {boolean}
 */
function isAlreadyNumbered(instructions) {
  const lines = instructions.split('\n').filter(line => line.trim());
  let numberedCount = 0;

  for (const line of lines.slice(0, 5)) { // Check first 5 lines
    if (/^\s*\d+\./.test(line.trim())) {
      numberedCount++;
    }
  }

  // If more than half of the first few lines are numbered, consider it already formatted
  return numberedCount >= Math.min(3, Math.ceil(lines.length / 2));
}

/**
 * Parse instructions into logical steps
 * @param {string} instructions
 * @returns {Array<string>}
 */
function parseInstructionSteps(instructions) {
  // First, clean up double periods and normalize spacing
  let cleanInstructions = instructions
    .replace(/\.{2,}/g, '.') // Replace multiple periods with single period
    .replace(/\s+/g, ' ')     // Normalize multiple spaces to single space
    .trim();

  // Split by sentence-ending patterns that indicate step boundaries
  const stepSeparators = [
    /\.\s+(?=[A-Z])/g,  // Period followed by space and capital letter
    /\.\s*\n/g,         // Period followed by newline
    /\n\s*(?=[A-Z])/g,  // Newline followed by capital letter
    /\.\s+(?=Add|Mix|Stir|Cook|Heat|Place|Serve|Season|Chop|Dice|Slice|Combine|Pour|Bring|Remove|Cover|Uncover|Bake|Preheat|While)/g, // Period before cooking verbs
  ];

  let steps = [cleanInstructions];

  // Apply each separator pattern
  for (const separator of stepSeparators) {
    const newSteps = [];
    for (const step of steps) {
      newSteps.push(...step.split(separator));
    }
    steps = newSteps;
  }

  // Clean up and filter steps
  return steps
    .map(step => step.trim())
    .filter(step => step.length > 10) // Filter out very short fragments
    .map(step => {
      // Remove existing numbering if present
      return step.replace(/^\d+\.\s*/, '');
    })
    .map(step => {
      // Ensure step ends with period
      if (!step.endsWith('.') && !step.endsWith('!') && !step.endsWith('?')) {
        return step + '.';
      }
      return step;
    });
}

/**
 * Format steps with numbers and descriptions
 * @param {Array<string>} steps
 * @returns {string}
 */
function formatStepsWithNumbers(steps) {
  if (steps.length === 0) return '';

  const formattedSteps = steps.map((step, index) => {
    const stepNumber = index + 1;
    const boldLabel = getBoldLabelForStep(step, stepNumber);

    if (boldLabel) {
      return `${stepNumber}. **${boldLabel}**: ${step}`;
    } else {
      return `${stepNumber}. ${step}`;
    }
  });

  return formattedSteps.join('\n\n');
}

/**
 * Generate descriptive labels for steps
 * @param {string} step
 * @param {number} stepNumber
 * @returns {string|null}
 */
function getBoldLabelForStep(step, stepNumber) {
  const stepLower = step.toLowerCase();

  // Cooking method patterns
  if (stepLower.includes('brown') || stepLower.includes('sauté') || stepLower.includes('fry')) {
    return 'Brown the meat' || 'Sauté ingredients' || 'Cook';
  }
  if (stepLower.includes('preheat') || stepLower.includes('heat oven')) {
    return 'Preheat oven';
  }
  if (stepLower.includes('boil') || (stepLower.includes('bring') && stepLower.includes('water'))) {
    return 'Boil water';
  }
  if (stepLower.includes('mix') || stepLower.includes('combine') || stepLower.includes('blend')) {
    return 'Mix ingredients';
  }
  if ((stepLower.includes('add') && stepLower.includes('onion')) || stepLower.includes('garlic')) {
    return 'Add aromatics';
  }
  if (stepLower.includes('season') || stepLower.includes('salt') || stepLower.includes('pepper')) {
    return 'Season';
  }
  if (stepLower.includes('simmer') || (stepLower.includes('cook') && stepLower.includes('low'))) {
    return 'Simmer';
  }
  if (stepLower.includes('layer') || stepLower.includes('assemble')) {
    return 'Layer ingredients';
  }
  if (stepLower.includes('bake') || stepLower.includes('oven')) {
    return 'Bake';
  }
  if (stepLower.includes('rest') || stepLower.includes('cool') || stepLower.includes('let')) {
    return 'Rest and serve';
  }
  if (stepLower.includes('serve') || stepLower.includes('cut') || stepLower.includes('slice')) {
    return 'Serve';
  }

  // Fallback generic labels
  if (stepNumber <= 3) return 'Prepare';
  if (stepNumber <= 6) return 'Cook';
  if (stepNumber <= 10) return 'Assemble';
  return 'Finish';
}

/**
 * Helper function to format recipe instructions for display
 * @param {string} instructions
 * @returns {string}
 */
export function formatRecipeInstructionsForDisplay(instructions) {
  const formatted = formatInstructionsToNumberedSteps(instructions);

  // Add helpful intro text
  const intro = "Here are the step-by-step instructions:\n\n";

  return intro + formatted;
}

/**
 * Extract cooking time from instructions
 * @param {string} instructions
 * @returns {string|null}
 */
export function extractCookingTimeFromInstructions(instructions) {
  if (!instructions) return null;

  const timePatterns = [
    /(\d+)\s*(?:hours?|hrs?)/gi,
    /(\d+)\s*(?:minutes?|mins?)/gi,
    /(\d+)-(\d+)\s*(?:minutes?|mins?)/gi,
    /bake\s+for\s+(\d+)\s*(?:minutes?|mins?)/gi,
    /cook\s+for\s+(\d+)\s*(?:minutes?|mins?)/gi,
  ];

  const times = [];
  for (const pattern of timePatterns) {
    const matches = instructions.matchAll(pattern);
    for (const match of matches) {
      times.push(match[0]);
    }
  }

  return times.length > 0 ? times[0] : null;
}

export default {
  formatInstructionsToNumberedSteps,
  formatRecipeInstructionsForDisplay,
  extractCookingTimeFromInstructions
};