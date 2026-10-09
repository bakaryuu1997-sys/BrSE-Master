import { test, expect } from "vitest";
import { translateUi } from "../../lib/uiLanguage";

test("i18n key resolution test", () => {
  const viVal = translateUi("vi", "validation.backendName");
  const enVal = translateUi("en", "validation.backendName");
  const jaVal = translateUi("ja", "validation.backendName");

  console.log("====================================");
  console.log("VI backendName:", viVal);
  console.log("EN backendName:", enVal);
  console.log("JA backendName:", jaVal);
  console.log("====================================");

  expect(viVal).not.toBe("validation.backendName");
  expect(enVal).not.toBe("validation.backendName");
  expect(jaVal).not.toBe("validation.backendName");
});
