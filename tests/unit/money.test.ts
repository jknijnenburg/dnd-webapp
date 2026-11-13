import { describe, expect, it } from "vitest";
import { copperToAmountString, formatPrice, parsePriceToCopper } from "@/lib/money";

describe("money (integer copper)", () => {
  it("parses whole and decimal amounts exactly", () => {
    expect(parsePriceToCopper("12", "gp")).toBe(1200);
    expect(parsePriceToCopper("2,5", "gp")).toBe(250);
    expect(parsePriceToCopper("0.01", "gp")).toBe(1);
    expect(parsePriceToCopper("0.1", "gp")).toBe(10);
    expect(parsePriceToCopper("0.3", "gp")).toBe(30); // 0.1 * 3 would drift with floats
    expect(parsePriceToCopper("1.5", "sp")).toBe(15);
    expect(parsePriceToCopper("3", "ep")).toBe(150);
    expect(parsePriceToCopper("0.5", "ep")).toBe(25);
    expect(parsePriceToCopper("1.234", "pp")).toBe(1234);
    expect(parsePriceToCopper("7", "cp")).toBe(7);
    expect(parsePriceToCopper("0", "gp")).toBe(0);
  });

  it("rejects malformed input and amounts below one copper", () => {
    for (const bad of ["", "abc", "-1", "1.2.3", "1e3", " ", "1,", ".5"]) {
      expect(parsePriceToCopper(bad, "gp")).toBeNull();
    }
    expect(parsePriceToCopper("0.001", "gp")).toBeNull();
    expect(parsePriceToCopper("0.5", "cp")).toBeNull();
    expect(parsePriceToCopper("0.01", "ep")).toBeNull();
    expect(parsePriceToCopper("0.05", "sp")).toBeNull();
  });

  it("round-trips through the form representation", () => {
    for (const copper of [0, 1, 5, 10, 25, 99, 100, 250, 1234, 100000, 1999999]) {
      for (const currency of ["cp", "sp", "ep", "gp", "pp"] as const) {
        const text = copperToAmountString(copper, currency);
        const parsed = parsePriceToCopper(text, currency);
        // ep cannot represent every copper amount with 2 decimals -> must refuse rather than round.
        if (parsed !== null) expect(parsed).toBe(copper);
        else expect(currency).toBe("ep");
      }
    }
    expect(copperToAmountString(250, "gp")).toBe("2,5");
    expect(copperToAmountString(1200, "gp")).toBe("12");
  });

  it("formats prices for display", () => {
    expect(formatPrice(0)).toBe("kostenlos");
    expect(formatPrice(5000, "gp")).toBe("50 GM");
    expect(formatPrice(150000, "gp")).toBe("1.500 GM");
    expect(formatPrice(5, "cp")).toBe("5 KM");
    expect(formatPrice(250, "gp")).toBe("2 GM 5 SM");
    expect(formatPrice(1234, "pp")).toBe("12 GM 3 SM 4 KM");
    expect(formatPrice(3000, "pp")).toBe("3 PM");
  });
});
