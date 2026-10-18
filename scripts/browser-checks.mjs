// Small assertion helpers for optional visual-capture scripts; this is not a test runner.
const DEFAULT_TIMEOUT_MS = 5_000;

export async function waitForVisible(locator) {
  await locator.waitFor({ state: 'visible', timeout: DEFAULT_TIMEOUT_MS });
}

export async function waitForAttribute(page, selector, attribute, expected) {
  await page.waitForFunction(
    ({ selector, attribute, expected }) =>
      document.querySelector(selector)?.getAttribute(attribute) === expected,
    { selector, attribute, expected },
    { timeout: DEFAULT_TIMEOUT_MS },
  );
}

export async function waitForPageCondition(page, condition, argument) {
  await page.waitForFunction(condition, argument, { timeout: DEFAULT_TIMEOUT_MS });
}
